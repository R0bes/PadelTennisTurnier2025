import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { Trophy, RotateCcw, Users, Zap, Medal, Award, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Phase, TournamentState, Team } from '@tournament-app/shared-types';
import { generateKOBracket, generateTeamName } from '@tournament-app/shared-utils';
import {
  createTournament,
  getTournamentState,
  setPhase,
  registerPlayer,
  deletePlayer,
  createTeam,
  assignPlayerToTeam,
} from './api/tournamentApi';
import PlayerCard from './components/PlayerCard';
import PlayerGhostCard from './components/PlayerGhostCard';
import TeamCard from './components/TeamCard';
import TeamGhostCard from './components/TeamGhostCard';
import MatchCard from './components/MatchCard';
import NewTournamentModal from './components/NewTournamentModal';

const TOURNAMENT_ID_KEY = 'tournament-app:active-tournament-id';

function App() {
  const [tournamentState, setTournamentState] =
    useState<TournamentState | null>(null);
  const [isAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('Padel Tennis Turnier 2025');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [phaseButtonClicked, setPhaseButtonClicked] = useState<string | null>(null);
  const [matchesReady, setMatchesReady] = useState(false);
  // Store match results: { 'swiss-1-1': { score: '6-4', winner: teamId, duration: '45min' }, 'ko-QF-1': { score: '6-3', winner: teamId, duration: '38min' } }
  const [matchResults, setMatchResults] = useState<Record<string, { score: string; winner: string | null; duration?: string }>>({});
  const [displayedText, setDisplayedText] = useState('');
  const [textAnimationStarted, setTextAnimationStarted] = useState(false);

  // Load tournament on mount (only if exists in localStorage)
  useEffect(() => {
    const loadTournament = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const savedId = localStorage.getItem(TOURNAMENT_ID_KEY);
        if (savedId) {
          try {
            const state = await getTournamentState(savedId);
            setTournamentState(state);
            setIsLoading(false);
            return;
          } catch (err) {
            localStorage.removeItem(TOURNAMENT_ID_KEY);
          }
        }

        setIsLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load tournament'
        );
        setIsLoading(false);
      }
    };

    loadTournament();
  }, []);

  // Typing effect for "Die Anmeldung ist eröffnet ..."
  useEffect(() => {
    const fullText = 'Die Anmeldung ist eröffnet ...';
    if (tournamentState && tournamentState.phase === 'registration' && tournamentState.players.length > 0) {
      if (!textAnimationStarted) {
        // Start animation only once
        setTextAnimationStarted(true);
        setDisplayedText('');
        let currentIndex = 0;
        
        const typingInterval = setInterval(() => {
          if (currentIndex < fullText.length) {
            setDisplayedText(fullText.slice(0, currentIndex + 1));
            currentIndex++;
          } else {
            clearInterval(typingInterval);
          }
        }, 50); // 50ms per character

        return () => clearInterval(typingInterval);
      } else if (displayedText.length === 0) {
        // If animation was completed but text was reset, restore full text immediately
        setDisplayedText(fullText);
      }
    } else {
      // Reset when leaving registration phase or no players
      setDisplayedText('');
      setTextAnimationStarted(false);
    }
  }, [tournamentState?.phase, tournamentState?.players.length, textAnimationStarted]);

  // Refresh tournament state
  const refreshTournament = async () => {
    if (!tournamentState) return;

    try {
      const state = await getTournamentState(tournamentState.id);
      setTournamentState(state);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to refresh tournament';
      setError(message);
      toast.error(message);
    }
  };

  // Helper function for phase transitions
  const getNextPhase = (current: Phase): Phase | null => {
    const transitions: Record<Phase, Phase | null> = {
      registration: 'team_setup',
      team_setup: 'match_setup',
      match_setup: 'swiss_rounds',
      swiss_rounds: 'ko_bracket',
      ko_bracket: 'summary',
      summary: null,
    };
    return transitions[current] || null;
  };

  // Handle phase change
  const handlePhaseChange = async (newPhase: Phase) => {
    if (!tournamentState) return;

    try {
      // Auto-generate teams when transitioning from registration to team_setup
      if (tournamentState.phase === 'registration' && newPhase === 'team_setup') {
        await handlePhaseTransitionToTeams();
        return; // handlePhaseTransitionToTeams already changes the phase
      }

      // Two-stage transition from team_setup to match_setup
      if (tournamentState.phase === 'team_setup' && newPhase === 'match_setup') {
        await handlePhaseTransitionToMatches();
        return; // handlePhaseTransitionToMatches already changes the phase
      }

      const updated = await setPhase(tournamentState.id, newPhase);
      setTournamentState(updated);
      toast.success(
        `Tournament phase changed to ${newPhase.replace('_', ' ')}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to change phase';
      setError(message);
      toast.error(message);
    }
  };

  // Two-stage phase transition: first show empty teams, then assign players
  const handlePhaseTransitionToTeams = async () => {
    if (!tournamentState) return;

    const unassignedPlayers = tournamentState.players.filter(
      (player) => player.name !== 'Dummy Player'
    );

    if (unassignedPlayers.length === 0) {
      toast.error('No players available to create teams');
      return;
    }

    if (isGenerating) return;

    let loadingToast: string | undefined;
    try {
      setIsGenerating(true);
      
      // Show loading message
      loadingToast = toast.loading('Teams werden erstellt...', {
        duration: 5000,
      });

      // Calculate number of teams needed
      let numTeams = Math.ceil(unassignedPlayers.length / 2);
      if (numTeams % 2 !== 0) {
        numTeams += 1;
      }

      // Stage 1: Generate empty teams and change phase to show them
      const createdTeams = await generateTeams(tournamentState.id, numTeams);
      await setPhase(tournamentState.id, 'team_setup');
      await refreshTournament();

      // Wait a bit for the empty teams to render
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 2: Assign players to teams
      const totalSlots = numTeams * 2;
      const dummyPlayersNeeded = Math.max(0, totalSlots - unassignedPlayers.length);
      await assignPlayersToTeams(tournamentState.id, createdTeams, unassignedPlayers);

      // Final refresh to show players assigned to teams
      await refreshTournament();

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success(
        `${numTeams} Teams erstellt${dummyPlayersNeeded > 0 ? ` mit ${dummyPlayersNeeded} Dummy Player(s)` : ''}!`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate teams';
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Two-stage phase transition: first show empty match cards, then assign teams
  const handlePhaseTransitionToMatches = async () => {
    if (!tournamentState) return;

    if (isGenerating) return;

    let loadingToast: string | undefined;
    try {
      setIsGenerating(true);
      setMatchesReady(false);
      
      // Show loading message
      loadingToast = toast.loading('Matches werden erstellt...', {
        duration: 3000,
      });

      // Stage 1: Change phase to match_setup to show empty match cards
      await setPhase(tournamentState.id, 'match_setup');
      await refreshTournament();

            // Wait 1.5 seconds for empty match cards to render and be visible
            await new Promise(resolve => setTimeout(resolve, 1500));

      // Stage 2: Teams will be automatically assigned to matches by the useMemo
      // Just refresh to trigger the assignment
      setMatchesReady(true);
      await refreshTournament();

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success('Matches erfolgreich erstellt!');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate matches';
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle next phase shift
  const handleNextPhase = async () => {
    if (!tournamentState) return;
    
    // If in registration phase and no players yet, add fake players first
    if (tournamentState.phase === 'registration' && tournamentState.players.length === 0) {
      await addFakePlayers(tournamentState.id);
      await refreshTournament();
    }
    
    const nextPhase = getNextPhase(tournamentState.phase);
    if (nextPhase) {
      setPhaseButtonClicked(tournamentState.phase);
      await handlePhaseChange(nextPhase);
      // Button stays disabled after being clicked
    }
  };

  // Simulate next match
  const handleNextMatch = () => {
    if (!tournamentState) return;

    // Find next uncompleted match
    let nextMatch: { key: string; team1: Team | null; team2: Team | null; roundType: 'swiss' | 'ko'; roundNum: number | string; matchIdx: number } | null = null;

    // Check Swiss rounds first
    if (tournamentState.phase === 'swiss_rounds' && swissMatches) {
      for (const [roundNum, matches] of Object.entries(swissMatches)) {
        for (let idx = 0; idx < matches.length; idx++) {
          const match = matches[idx];
          const matchKey = `swiss-${roundNum}-${idx + 1}`;
          if (match.team1 && match.team2 && !matchResults[matchKey]) {
            nextMatch = { key: matchKey, team1: match.team1, team2: match.team2, roundType: 'swiss', roundNum: Number(roundNum), matchIdx: idx };
            break;
          }
        }
        if (nextMatch) break;
      }
    }

    // Check KO bracket if no Swiss match found
    if (!nextMatch && koBracket && (tournamentState.phase === 'swiss_rounds' || tournamentState.phase === 'ko_bracket')) {
      for (let roundIdx = 0; roundIdx < koBracket.length; roundIdx++) {
        const round = koBracket[roundIdx];
        const roundNames: Record<string, string> = {
          'Quarterfinals': 'QF',
          'Semifinals': 'SF',
          'Final': 'F'
        };
        const roundShort = roundNames[round.round] || round.round.charAt(0);
        
        for (let matchIdx = 0; matchIdx < round.matches.length; matchIdx++) {
          const match = round.matches[matchIdx];
          const matchKey = `ko-${roundShort}-${matchIdx + 1}`;
          if (match.team1 && match.team2 && !matchResults[matchKey]) {
            nextMatch = { key: matchKey, team1: match.team1, team2: match.team2, roundType: 'ko', roundNum: roundShort, matchIdx };
            break;
          }
        }
        if (nextMatch) break;
      }
    }

    if (!nextMatch) {
      toast.error('No matches available to simulate');
      return;
    }

    // Generate random score (Padel format: 6-4, 6-3, etc.)
    const scores = [0, 1, 2, 3, 4, 5, 6];
    const team1Score1 = scores[Math.floor(Math.random() * (scores.length - 1)) + 1]; // 1-6
    const team2Score1 = scores[Math.floor(Math.random() * (scores.length - 1)) + 1]; // 1-6
    const team1Score2 = scores[Math.floor(Math.random() * (scores.length - 1)) + 1]; // 1-6
    const team2Score2 = scores[Math.floor(Math.random() * (scores.length - 1)) + 1]; // 1-6

    // Determine winner (team with more sets won, or random if tie)
    let winner: Team | null = null;
    if (team1Score1 > team2Score1 && team1Score2 > team2Score2) {
      winner = nextMatch.team1;
    } else if (team2Score1 > team1Score1 && team2Score2 > team1Score2) {
      winner = nextMatch.team2;
    } else {
      // Random winner if sets are tied
      winner = Math.random() > 0.5 ? nextMatch.team1 : nextMatch.team2;
    }

    const score = `${team1Score1}-${team2Score1}, ${team1Score2}-${team2Score2}`;

    // Update match results
    setMatchResults(prev => ({
      ...prev,
      [nextMatch!.key]: { score, winner: winner?.id || null },
    }));

    // For KO bracket, advance winner to next round
    if (nextMatch.roundType === 'ko' && winner && koBracket) {
      const roundNames: Record<string, string> = {
        'Quarterfinals': 'QF',
        'Semifinals': 'SF',
        'Final': 'F'
      };
      const roundShort = nextMatch.roundNum as string;
      const currentRoundIdx = koBracket.findIndex(r => {
        const rShort = roundNames[r.round] || r.round.charAt(0);
        return rShort === roundShort;
      });
      
      if (currentRoundIdx >= 0 && currentRoundIdx < koBracket.length - 1) {
        const nextRound = koBracket[currentRoundIdx + 1];
        const nextMatchIdx = Math.floor(nextMatch.matchIdx / 2);
        if (nextRound && nextRound.matches[nextMatchIdx]) {
          // This will be handled by the useMemo when it recalculates
          // We need to update the bracket structure to advance the winner
          // For now, we'll just update the results and let the UI refresh
        }
      }
    }

    toast.success(`Match ${nextMatch.key} completed: ${winner?.name} wins ${score}`);
  };

  // Generate teams (create empty teams without players)
  const generateTeams = async (tournamentId: string, numTeams: number): Promise<Team[]> => {
    const teamPromises = [];
    for (let i = 0; i < numTeams; i++) {
      const teamName = generateTeamName(i);
      teamPromises.push(createTeam(tournamentId, teamName));
    }
    return await Promise.all(teamPromises);
  };

  // Assign players to teams (distribute players across teams)
  const assignPlayersToTeams = async (
    tournamentId: string,
    teams: Team[],
    players: Array<{ id: string; name: string }>
  ): Promise<void> => {
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const numTeams = teams.length;
    const totalSlots = numTeams * 2;
    const dummyPlayersNeeded = Math.max(0, totalSlots - shuffledPlayers.length);

    // Create all dummy players first (in parallel)
    const dummyPlayerPromises = [];
    for (let i = 0; i < dummyPlayersNeeded; i++) {
      dummyPlayerPromises.push(registerPlayer(tournamentId, 'Dummy Player'));
    }
    const dummyPlayers = await Promise.all(dummyPlayerPromises);

    // Assign real players and dummy players to teams
    const assignPromises = [];
    let playerIndex = 0;
    let dummyPlayerIndex = 0;

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      for (let j = 0; j < 2; j++) {
        if (playerIndex < shuffledPlayers.length) {
          assignPromises.push(
            assignPlayerToTeam(tournamentId, team.id, shuffledPlayers[playerIndex].id)
          );
          playerIndex++;
        } else if (dummyPlayerIndex < dummyPlayers.length) {
          assignPromises.push(
            assignPlayerToTeam(tournamentId, team.id, dummyPlayers[dummyPlayerIndex].id)
          );
          dummyPlayerIndex++;
        }
      }
    }

    await Promise.all(assignPromises);
  };


  // Quick add 26 fake players (streaming - one by one, simulating)
  const addFakePlayers = async (tournamentId: string) => {
    const firstNames = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry',
      'Iris', 'Jack', 'Kate', 'Liam', 'Mia', 'Noah', 'Olivia', 'Paul',
      'Quinn', 'Rachel', 'Sam', 'Tina', 'Uma', 'Victor', 'Wendy', 'Xavier',
      'Yara', 'Zoe'
    ];
    const lastNames = [
      'Anderson', 'Brown', 'Clark', 'Davis', 'Evans', 'Foster', 'Garcia', 'Harris',
      'Jackson', 'Kim', 'Lee', 'Martinez', 'Nguyen', 'O\'Connor', 'Patel', 'Quinn',
      'Rodriguez', 'Smith', 'Taylor', 'Upton', 'Vargas', 'Wilson', 'Xu', 'Young',
      'Zhang', 'Zimmerman'
    ];

    try {
      for (let i = 0; i < 26; i++) {
        const firstName = firstNames[i];
        const lastName = lastNames[i];
        const fullName = `${firstName} ${lastName}`;
        
        await registerPlayer(tournamentId, fullName);
        
        const currentState = await getTournamentState(tournamentId);
        setTournamentState(currentState);
        
        if (i < 25) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      toast.success('26 players added successfully!');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add players';
      toast.error(message);
    }
  };

  // Handle delete player
  const handleDeletePlayer = async (playerId: string, playerName: string) => {
    if (isDeleting || !tournamentState) return;

    try {
      setIsDeleting(playerId);
      await deletePlayer(tournamentState.id, playerId);
      toast.success(`Player "${playerName}" removed`);
      await refreshTournament();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to delete player';
      toast.error(message);
    } finally {
      setIsDeleting(null);
    }
  };

  // Start new tournament from scratch
  const handleStartNewTournament = async () => {
    if (!newTournamentName.trim()) {
      toast.error('Please enter a tournament name');
      return;
    }

    try {
      setIsLoading(true);
      const newTournament = await createTournament(newTournamentName.trim());
      localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
      setTournamentState(newTournament);
      setError(null);
      setShowNewTournamentModal(false);
      setNewTournamentName('Padel Tennis Turnier 2025');
      toast.success(`New tournament "${newTournamentName.trim()}" started!`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create tournament';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewTournamentClick = () => {
    setNewTournamentName('Padel Tennis Turnier 2025');
    setShowNewTournamentModal(true);
  };

  // Reset to initial state (create new tournament)
  const handleResetToInitial = async () => {
    try {
      setIsLoading(true);
      const newTournament = await createTournament('Padel Tennis Turnier 2025');
      localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
      setTournamentState(newTournament);
      setError(null);
      setPhaseButtonClicked(null);
      // Don't add fake players automatically - wait for Start button click
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create tournament';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // All hooks must be called before early returns (Rules of Hooks)
  const currentPhase: Phase = tournamentState?.phase || 'registration';
  
  // Get phase title for header
  const getPhaseTitle = (phase: Phase): string => {
    switch (phase) {
      case 'registration':
        return 'Anmeldung zum Turnier - letzte Chance!';
      case 'team_setup':
        return 'Teambuilding';
      case 'match_setup':
        return 'Matches';
      case 'swiss_rounds':
        return 'Swiss Rounds';
      case 'ko_bracket':
        return 'Knockout';
      case 'summary':
        return 'Summary';
    }
  };
  
  const phasesReached = useMemo(() => {
    if (!tournamentState) return [];
    const phaseOrder: Phase[] = ['registration', 'team_setup', 'match_setup', 'swiss_rounds', 'ko_bracket', 'summary'];
    const currentIndex = phaseOrder.indexOf(tournamentState.phase);
    return phaseOrder.slice(0, currentIndex + 1);
  }, [tournamentState]);

  const getPhaseBackground = (phase: Phase): string => {
    switch (phase) {
      case 'registration':
        return 'bg-blue-50';
      case 'team_setup':
        return 'bg-green-50';
      case 'match_setup':
        return 'bg-indigo-50';
      case 'swiss_rounds':
        return 'bg-purple-50';
      case 'ko_bracket':
        return 'bg-orange-50';
      case 'summary':
        return 'bg-yellow-50';
      default:
        return 'bg-gray-50';
    }
  };

  const phaseBackground = getPhaseBackground(currentPhase);
  const teams = tournamentState?.teams || [];

  // Generate Swiss rounds with results
  const swissMatches = useMemo(() => {
    if (!tournamentState || teams.length < 2) return {};
    
    const allRounds: Record<number, Array<{ team1: Team | null; team2: Team | null; score?: string; filled?: boolean; winner?: Team | null }>> = {};
    const numMatches = Math.ceil(teams.length / 2);
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    const firstRoundMatches: Array<{ team1: Team | null; team2: Team | null; score?: string; filled?: boolean; winner?: Team | null }> = [];
    // Show teams in matches starting from match_setup, but show empty structure from team_setup for transition
    if (tournamentState.phase === 'team_setup' || tournamentState.phase === 'match_setup' || tournamentState.phase === 'swiss_rounds') {
      // Create array of all teams and shuffle them for random placement
      const allTeamsForRound = [...shuffledTeams];
      
      // Create array of match indices and shuffle them for random placement
      const matchIndices = Array.from({ length: numMatches }, (_, i) => i);
      const shuffledMatchIndices = [...matchIndices].sort(() => Math.random() - 0.5);
      
      // Initialize all matches as empty
      for (let i = 0; i < numMatches; i++) {
        firstRoundMatches.push({
          team1: null,
          team2: null,
          filled: false,
        });
      }
      
      // Only place teams in matches if phase is match_setup or swiss_rounds (not in team_setup)
      // Also check matchesReady flag for controlled transition
      if ((tournamentState.phase === 'match_setup' || tournamentState.phase === 'swiss_rounds') && matchesReady) {
        // Place teams randomly in matches
        let teamIndex = 0;
        for (const matchIdx of shuffledMatchIndices) {
          if (teamIndex < allTeamsForRound.length) {
            firstRoundMatches[matchIdx].team1 = allTeamsForRound[teamIndex];
            teamIndex++;
          }
          if (teamIndex < allTeamsForRound.length) {
            firstRoundMatches[matchIdx].team2 = allTeamsForRound[teamIndex];
            teamIndex++;
          }
          if (firstRoundMatches[matchIdx].team1 && firstRoundMatches[matchIdx].team2) {
            firstRoundMatches[matchIdx].filled = true;
          }
          
          // Add result if exists
          const matchKey = `swiss-1-${matchIdx + 1}`;
          const result = matchResults[matchKey];
          if (result) {
            firstRoundMatches[matchIdx].score = result.score;
            firstRoundMatches[matchIdx].winner = result.winner ? teams.find(t => t.id === result.winner) || null : null;
          }
        }
      }
      // In team_setup, matches remain empty (for transition)
    } else {
      for (let i = 0; i < numMatches; i++) {
        firstRoundMatches.push({
          team1: null,
          team2: null,
          filled: false,
        });
      }
    }
    allRounds[1] = firstRoundMatches;
    
    for (let round = 2; round <= 3; round++) {
      allRounds[round] = Array.from({ length: numMatches }, (_, idx) => {
        const matchKey = `swiss-${round}-${idx + 1}`;
        const result = matchResults[matchKey];
        return {
          team1: null,
          team2: null,
          filled: false,
          score: result?.score,
          winner: result?.winner ? teams.find(t => t.id === result.winner) || null : null,
        };
      });
    }
    return allRounds;
  }, [teams, tournamentState, matchResults, matchesReady]);

  // Generate KO bracket with results
  const koBracket = useMemo(() => {
    const bracket = generateKOBracket(teams);
    if (!bracket) return null;
    
    // Add results to matches
    return bracket.map((round) => {
      const roundNames: Record<string, string> = {
        'Quarterfinals': 'QF',
        'Semifinals': 'SF',
        'Final': 'F'
      };
      const roundShort = roundNames[round.round] || round.round.charAt(0);
      
      return {
        ...round,
        matches: round.matches.map((match, matchIdx) => {
          const matchKey = `ko-${roundShort}-${matchIdx + 1}`;
          const result = matchResults[matchKey];
          return {
            ...match,
            score: result?.score,
            winner: result?.winner ? teams.find(t => t.id === result.winner) || null : match.winner,
          };
        }),
      };
    });
  }, [teams, matchResults]);

  // Find next match key
  const nextMatchKey = useMemo(() => {
    if (!tournamentState) return null;

    // Check Swiss rounds first
    if (tournamentState.phase === 'swiss_rounds' && swissMatches) {
      for (const [roundNum, matches] of Object.entries(swissMatches)) {
        for (let idx = 0; idx < matches.length; idx++) {
          const match = matches[idx];
          const matchKey = `swiss-${roundNum}-${idx + 1}`;
          if (match.team1 && match.team2 && !matchResults[matchKey]) {
            return matchKey;
          }
        }
      }
    }

    // Check KO bracket if no Swiss match found
    if (koBracket && (tournamentState.phase === 'swiss_rounds' || tournamentState.phase === 'ko_bracket')) {
      for (let roundIdx = 0; roundIdx < koBracket.length; roundIdx++) {
        const round = koBracket[roundIdx];
        const roundNames: Record<string, string> = {
          'Quarterfinals': 'QF',
          'Semifinals': 'SF',
          'Final': 'F'
        };
        const roundShort = roundNames[round.round] || round.round.charAt(0);
        
        for (let matchIdx = 0; matchIdx < round.matches.length; matchIdx++) {
          const match = round.matches[matchIdx];
          const matchKey = `ko-${roundShort}-${matchIdx + 1}`;
          if (match.team1 && match.team2 && !matchResults[matchKey]) {
            return matchKey;
          }
        }
      }
    }

    return null;
  }, [tournamentState, swissMatches, koBracket, matchResults]);

  // Summary data
  const topPlayers = tournamentState?.players.slice(0, 3) || [];
  const podium = topPlayers.map((player, index) => ({
    position: index + 1,
    name: player.name,
    points: 15 - index * 3,
  }));

  const standings = (tournamentState?.players || []).map((player, index) => ({
    rank: index + 1,
    name: player.name,
    wins: Math.max(0, 5 - index),
    losses: Math.min(5, index),
    points: Math.max(0, 15 - index * 2),
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error && !tournamentState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleNewTournamentClick}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-lg font-medium shadow-lg hover:shadow-xl transition-all mx-auto"
          >
            <RotateCcw className="w-5 h-5" />
            Create Turnier
          </button>
        </div>
      </div>
    );
  }

  if (!tournamentState) {
    return (
      <>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
            <Trophy className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tournament App</h1>
            <p className="text-gray-600 mb-8">Start a new tournament to begin</p>
          <button
              onClick={handleNewTournamentClick}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-lg font-medium shadow-lg hover:shadow-xl transition-all mx-auto"
          >
              <RotateCcw className="w-5 h-5" />
              Create Turnier
          </button>
        </div>
      </div>
        
        <NewTournamentModal
          isOpen={showNewTournamentModal}
          onClose={() => setShowNewTournamentModal(false)}
          onSubmit={handleStartNewTournament}
          name={newTournamentName}
          onNameChange={setNewTournamentName}
          isLoading={isLoading}
        />
      </>
    );
  }

  return (
    <motion.div 
      className={`min-h-screen transition-colors duration-500 ${phaseBackground}`}
      initial={false}
      animate={{ backgroundColor: phaseBackground }}
      style={{ minHeight: '100vh' }}
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

            <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 pt-20 pb-8 min-h-screen">
              <LayoutGroup>
                <div className="space-y-8">
                  {/* Start and Reset Buttons */}
                  {currentPhase === 'registration' && (
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-0.5 h-12 bg-gray-300 mb-4"></div>
                      <div className="flex items-center gap-4">
                        <button
                          onClick={handleNextPhase}
                          disabled={isLoading || tournamentState?.players.length > 0 || phaseButtonClicked === 'registration'}
                          className="px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-base font-medium shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Turnier starten"
                        >
                          Start
                        </button>
                        <button
                          onClick={handleResetToInitial}
                          disabled={isLoading}
                          className="flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Neues Turnier starten"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Reset Button for other phases */}
                  {currentPhase !== 'registration' && tournamentState && (
                    <div className="flex flex-col items-center mb-4">
                      <div className="w-0.5 h-12 bg-gray-300 mb-4"></div>
                      <button
                        onClick={handleResetToInitial}
                        disabled={isLoading}
                        className="flex items-center justify-center w-10 h-10 bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Neues Turnier starten"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  {/* Registration Section - only show after Start button is clicked */}
                  {phasesReached.includes('registration') && tournamentState && tournamentState.players.length > 0 && (
              <motion.div
                id="phase-registration"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              >
                <div className="space-y-6">
                  <div className="flex flex-col items-center justify-center mb-4">
                    {/* Vertical line above */}
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      transition={{ duration: 0.3, delay: 0 }}
                      className="w-0.5 h-12 bg-gray-300 mb-4"
                    ></motion.div>
                    
                    {/* Horizontal container with lines and text */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.2 }}
                      className="flex items-center gap-6"
                    >
                      {/* Left horizontal line */}
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                        className="w-24 h-0.5 bg-gray-300"
                      ></motion.div>
                      
                      {/* Text with typing effect */}
                      <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
                        {displayedText}
                        {displayedText.length > 0 && displayedText.length < 'Die Anmeldung ist eröffnet ...'.length && (
                          <span className="animate-pulse">|</span>
                        )}
                      </p>
                      
                      {/* Right horizontal line */}
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ duration: 0.3, delay: 0.4 }}
                        className="w-24 h-0.5 bg-gray-300"
                      ></motion.div>
                    </motion.div>
                    
                    {/* Vertical line below */}
                    <motion.div
                      initial={{ opacity: 0, scaleY: 0 }}
                      animate={{ opacity: 1, scaleY: 1 }}
                      transition={{ duration: 0.3, delay: 0.6 }}
                      className="w-0.5 h-12 bg-gray-300 mt-4"
                    ></motion.div>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.8 }}
                    className="bg-white rounded-lg shadow p-6 relative"
                  >
                    {tournamentState.players.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">
                          {isAdmin
                            ? 'No players registered yet. Add your first player above!'
                            : 'No players registered yet.'}
                        </p>
                      </div>
                    ) : (
                      <>
                        {phaseButtonClicked === 'registration' && (
                          <div className="flex justify-center mb-4">
                            <button
                              onClick={handleNextPhase}
                              disabled={!getNextPhase(currentPhase) || isLoading || tournamentState.players.length === 0}
                              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-base font-medium shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Zur nächsten Phase wechseln"
                            >
                              {tournamentState.players.length} {tournamentState.players.length === 1 ? 'Teilnehmer' : 'Teilnehmer'}
                            </button>
                          </div>
                        )}
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2">
                          <AnimatePresence mode="popLayout">
                            {tournamentState.players.map((player) =>
                              player.teamId ? (
                                <PlayerGhostCard key={player.id} player={player} layout="horizontal" />
                              ) : (
                                <PlayerCard
                                  key={player.id}
                                  player={player}
                                  isAdmin={isAdmin}
                                  onDelete={handleDeletePlayer}
                                  isDeleting={isDeleting === player.id}
                                  layout="horizontal"
                                />
                              )
                            )}
                          </AnimatePresence>
                        </div>
                      </>
                    )}
                  </motion.div>
                </div>
              </motion.div>
                  )}

                  {/* Teams Section */}
                  {(tournamentState.phase === 'team_setup' || tournamentState.phase === 'match_setup' || tournamentState.phase === 'swiss_rounds' || tournamentState.phase === 'ko_bracket') && 
                   tournamentState.teams && 
                   tournamentState.teams.length > 0 && (
                    <motion.section
                      initial={false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="mt-20"
                    >
                      <div className="bg-white rounded-lg shadow p-6 relative">
                        {tournamentState.phase === 'team_setup' ? (
                          <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-12">
                              <AnimatePresence mode="popLayout">
                                {tournamentState.teams.map((team) => {
                                  const teamPlayers = tournamentState.players.filter((player) =>
                                    team.playerIds.includes(player.id)
                                  );

                                  return (
                                    <TeamCard
                                      key={team.id}
                                      team={team}
                                      players={teamPlayers}
                                      playerLayout="horizontal"
                                    />
                                  );
                                })}
                              </AnimatePresence>
                            </div>
                            <div className="flex justify-center absolute bottom-0 left-0 right-0 -mb-6">
                              <button
                                onClick={handleNextPhase}
                                disabled={!getNextPhase(currentPhase) || isLoading || tournamentState.teams.length === 0 || phaseButtonClicked === 'team_setup'}
                                className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 text-base font-medium shadow-sm hover:shadow transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Zur nächsten Phase wechseln"
                              >
                                {tournamentState.teams.length} {tournamentState.teams.length === 1 ? 'Team' : 'Teams'}
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Keep TeamCards visible during transition - they will animate to MatchCards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-12">
                              <AnimatePresence mode="popLayout">
                                {tournamentState.teams.map((team) => {
                                  const teamPlayers = tournamentState.players.filter((player) =>
                                    team.playerIds.includes(player.id)
                                  );
                                  
                                  // Check if this team is actually rendered in a match card
                                  const isTeamInMatchCard = matchesReady && swissMatches && Object.values(swissMatches).some(round => 
                                    round.some(match => (match.team1?.id === team.id || match.team2?.id === team.id) && match.team1 !== null && match.team2 !== null)
                                  );
                                  
                                  // Show TeamCard if team is not yet in a match card (for animation)
                                  // Show GhostCard if team is already in a match card
                                  if (isTeamInMatchCard) {
                                    return (
                                      <TeamGhostCard
                                        key={team.id}
                                        team={team}
                                        players={teamPlayers}
                                        playerLayout="horizontal"
                                      />
                                    );
                                  }
                                  
                                  // Team not yet in match card, show normal card for animation
                                  return (
                                    <TeamCard
                                      key={team.id}
                                      team={team}
                                      players={teamPlayers}
                                      playerLayout="horizontal"
                                    />
                                  );
                                })}
                              </AnimatePresence>
                            </div>
                            {phaseButtonClicked === 'team_setup' && (
                              <div className="flex justify-center absolute bottom-0 left-0 right-0 -mb-6">
                                <button
                                  disabled={true}
                                  className="px-6 py-3 bg-green-500 text-white rounded-md text-base font-medium shadow-sm transition-all opacity-40 cursor-not-allowed"
                                  title="Zur nächsten Phase wechseln"
                                >
                                  {tournamentState.teams.length} {tournamentState.teams.length === 1 ? 'Team' : 'Teams'}
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </motion.section>
                  )}

            {/* Matches Section - only show from match_setup phase onwards */}
            {(phasesReached.includes('match_setup') || phasesReached.includes('swiss_rounds') || phasesReached.includes('ko_bracket')) && (
              <motion.div
                id="phase-swiss-rounds"
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mt-8 pt-8 border-t-2 border-gray-200"
              >
                <LayoutGroup>
                  <div className="space-y-8">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <div className="mb-6 flex items-center justify-between">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Tournament Matches
                        </h2>
                        <button
                          onClick={handleNextMatch}
                          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-base font-medium shadow-sm hover:shadow transition-all flex items-center gap-2"
                          title="Nächstes Match simulieren"
                        >
                          <Play className="w-5 h-5" />
                          <span>next Match</span>
                        </button>
                      </div>

                      {teams.length < 2 && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                          <p className="text-yellow-800 text-sm">
                            Need at least 2 teams to generate pairings.
                          </p>
                        </div>
                      )}

                      {/* Swiss Rounds */}
                      {teams.length >= 2 && Object.keys(swissMatches).length > 0 && (
                        <div className="mb-8 pb-8 border-b border-gray-200">
                          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Swiss Rounds
                          </h3>
                          <div className="space-y-4">
                            {Object.entries(swissMatches)
                              .sort(([a], [b]) => Number(a) - Number(b))
                              .map(([roundNum, matches]) => (
                                <div key={roundNum} className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border border-green-200">
                                  <h4 className="text-xl font-bold text-gray-800 mb-4 text-center">
                                    Round {roundNum}
                                  </h4>
                                  <div className="flex gap-4 justify-between flex-wrap">
                                    {matches.map((match, idx) => {
                                      const matchKey = `swiss-${roundNum}-${idx + 1}`;
                                      const result = matchResults[matchKey];
                                      const isDone = !!(result && result.score && result.winner);
                                      const isReady = nextMatchKey === matchKey && !isDone;
                                      
                                      // Determine match state
                                      const matchState: 'idle' | 'ready' | 'done' = isDone ? 'done' : isReady ? 'ready' : 'idle';
                                      
                                      return (
                                        <div key={idx} className="flex-1 min-w-[280px] max-w-[350px]">
                                          <MatchCard
                                            matchNumber={`${roundNum}-${idx + 1}`}
                                            team1={match.team1}
                                            team2={match.team2}
                                            players={tournamentState.players}
                                            score={result?.score}
                                            duration={result?.duration}
                                            winner={result?.winner ? teams.find(t => t.id === result.winner) || null : null}
                                            state={matchState}
                                            phase={tournamentState.phase === 'match_setup' ? 'match_setup' : tournamentState.phase === 'swiss_rounds' ? 'swiss_rounds' : 'ko_bracket'}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* KO Bracket */}
                      {koBracket && (
                        <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200">
                          <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Trophy className="w-4 h-4" />
                            Knockout Bracket
                          </h3>
                          <div className="space-y-6">
                            {koBracket.map((round, roundIdx) => {
                              const roundNames: Record<string, string> = {
                                'Quarterfinals': 'QF',
                                'Semifinals': 'SF',
                                'Final': 'F'
                              };
                              const roundShort = roundNames[round.round] || round.round.charAt(0);
                              const isLastRound = roundIdx === koBracket.length - 1;
                              const nextRound = koBracket[roundIdx + 1];
                              
                              return (
                                <div key={roundIdx} className="relative">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    {round.round}
                                  </h4>
                                  
                                  <div className="flex gap-2 relative justify-center">
                                    {round.matches.map((match, matchIdx) => {
                                      const matchNumber = `${roundShort}-${matchIdx + 1}`;
                                      const matchKey = `ko-${matchNumber}`;
                                      const result = matchResults[matchKey];
                                      const isDone = !!(result && result.score && result.winner);
                                      const isReady = nextMatchKey === matchKey && !isDone;
                                      
                                      // Determine match state
                                      const matchState: 'idle' | 'ready' | 'done' = isDone ? 'done' : isReady ? 'ready' : 'idle';

                                      return (
                                        <div key={matchIdx} className="relative" style={{ width: '280px', flexShrink: 0 }}>
                                          <MatchCard
                                            matchNumber={matchNumber}
                                            team1={match.team1}
                                            team2={match.team2}
                                            players={tournamentState.players}
                                            score={result?.score}
                                            duration={result?.duration}
                                            winner={result?.winner ? teams.find(t => t.id === result.winner) || null : null}
                                            state={matchState}
                                            phase={tournamentState.phase === 'match_setup' ? 'match_setup' : tournamentState.phase === 'swiss_rounds' ? 'swiss_rounds' : 'ko_bracket'}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  {!isLastRound && nextRound && (
                                    <div className="relative mt-4 mb-4" style={{ height: '60px' }}>
                                      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                                        {round.matches.map((_, matchIdx) => {
                                          const currentMatchCount = round.matches.length;
                                          const nextMatchCount = nextRound.matches.length;
                                          
                                          const matchRelativePos = (matchIdx + 0.5) / currentMatchCount;
                                          const currentXPercent = 15 + (matchRelativePos * 70);
                                          
                                          let nextMatchIndices: number[] = [];
                                          if (currentMatchCount === 4 && nextMatchCount === 2) {
                                            nextMatchIndices = [Math.floor(matchIdx / 2)];
                                          } else if (currentMatchCount === 2 && nextMatchCount === 1) {
                                            nextMatchIndices = [0];
                                          } else {
                                            nextMatchIndices = [Math.floor((matchIdx / currentMatchCount) * nextMatchCount)];
                                          }
                                          
                                          return nextMatchIndices.map((nextIdx) => {
                                            const nextMatchRelativePos = (nextIdx + 0.5) / nextMatchCount;
                                            const nextXPercent = 15 + (nextMatchRelativePos * 70);
                                            
                                            return (
                                              <g key={`${matchIdx}-${nextIdx}`}>
                                                <line
                                                  x1={`${currentXPercent}%`}
                                                  y1="0%"
                                                  x2={`${currentXPercent}%`}
                                                  y2="40%"
                                                  stroke="#9ca3af"
                                                  strokeWidth="2"
                                                  strokeDasharray="4 4"
                                                />
                                                <line
                                                  x1={`${currentXPercent}%`}
                                                  y1="40%"
                                                  x2={`${nextXPercent}%`}
                                                  y2="40%"
                                                  stroke="#9ca3af"
                                                  strokeWidth="2"
                                                  strokeDasharray="4 4"
                                                />
                                                <line
                                                  x1={`${nextXPercent}%`}
                                                  y1="40%"
                                                  x2={`${nextXPercent}%`}
                                                  y2="100%"
                                                  stroke="#9ca3af"
                                                  strokeWidth="2"
                                                  strokeDasharray="4 4"
                                                />
                                              </g>
                                            );
                                          });
                                        })}
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </LayoutGroup>
              </motion.div>
            )}

            {/* Summary Section */}
            {phasesReached.includes('summary') && (
              <motion.div
                id="phase-summary"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="mt-8 pt-8 border-t-2 border-gray-200"
              >
                <div className="space-y-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                      <Trophy className="w-8 h-8 text-yellow-500" />
                      Tournament Summary
                    </h1>
                    <p className="mt-2 text-gray-600">
                      Final results and standings of the tournament.
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Note:</strong> This is the summary view. It will later show
                      the full tournament story with detailed statistics and match history.
                    </p>
                  </div>

                  {podium.length >= 3 && (
                    <div className="bg-white rounded-lg shadow-lg p-8">
                      <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
                        <Medal className="w-5 h-5" />
                        Podium
                      </h2>
                      <div className="flex items-end justify-center gap-6">
                        {podium.map((entry) => (
                          <div
                            key={entry.position}
                            className={`flex flex-col items-center ${
                              entry.position === 1
                                ? 'order-2'
                                : entry.position === 2
                                ? 'order-1'
                                : 'order-3'
                            }`}
                          >
                            <div
                              className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-3 shadow-lg ${
                                entry.position === 1
                                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-500'
                                  : entry.position === 2
                                  ? 'bg-gradient-to-br from-gray-300 to-gray-400'
                                  : 'bg-gradient-to-br from-orange-400 to-orange-500'
                              }`}
                            >
                              {entry.position === 1 ? (
                                <Trophy className="w-10 h-10" />
                              ) : entry.position === 2 ? (
                                <Medal className="w-10 h-10" />
                              ) : (
                                <Award className="w-10 h-10" />
                              )}
                            </div>
                            <div
                              className={`w-36 p-4 rounded-t-xl text-center shadow-md ${
                                entry.position === 1
                                  ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 h-36'
                                  : entry.position === 2
                                  ? 'bg-gradient-to-br from-gray-300 to-gray-400 h-28'
                                  : 'bg-gradient-to-br from-orange-400 to-orange-500 h-24'
                              }`}
                            >
                              <div className="font-bold text-gray-900 text-lg">
                                {entry.name}
                              </div>
                              <div className="text-sm text-gray-700 mt-2 font-semibold">
                                {entry.points} pts
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Final Standings
                    </h2>
                    {standings.length === 0 ? (
                      <p className="text-gray-500 text-center py-8">
                        No players registered in this tournament.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Rank
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Player
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Wins
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Losses
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Points
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {standings.map((standing) => (
                              <tr key={standing.rank} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {standing.rank}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                                  {standing.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {standing.wins}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                  {standing.losses}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                  {standing.points}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
          </motion.div>
            )}
          </div>
        </LayoutGroup>
      </main>

      <NewTournamentModal
        isOpen={showNewTournamentModal}
        onClose={() => setShowNewTournamentModal(false)}
        onSubmit={handleStartNewTournament}
        name={newTournamentName}
        onNameChange={setNewTournamentName}
        isLoading={isLoading}
      />
    </motion.div>
  );
}

export default App;
