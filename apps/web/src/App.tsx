import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion';
import { Trophy, RotateCcw, Home, Users, Users2, Zap, Medal, Award, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Phase, TournamentState, Team } from '@tournament-app/shared-types';
import { generateKOBracket } from '@tournament-app/shared-utils';
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
  // Store match results: { 'swiss-1-1': { score: '6-4', winner: teamId }, 'ko-QF-1': { score: '6-3', winner: teamId } }
  const [matchResults, setMatchResults] = useState<Record<string, { score: string; winner: string | null }>>({});

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
        await handleAutoGenerateTeams();
        return; // handleAutoGenerateTeams already changes the phase
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

  // Handle next phase shift
  const handleNextPhase = async () => {
    if (!tournamentState) return;
    
    const nextPhase = getNextPhase(tournamentState.phase);
    if (nextPhase) {
      await handlePhaseChange(nextPhase);
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

  // Auto-generate teams
  const handleAutoGenerateTeams = async () => {
    if (!tournamentState) return;

    const unassignedPlayers = tournamentState.players.filter(
      (player) => player.name !== 'DummyPlayer'
    );

    if (unassignedPlayers.length === 0) {
      toast.error('No players available to create teams');
      return;
    }

    if (isGenerating) return;

    try {
      setIsGenerating(true);

      let numTeams = Math.ceil(unassignedPlayers.length / 2);
      if (numTeams % 2 !== 0) {
        numTeams += 1;
      }

      const shuffledPlayers = [...unassignedPlayers].sort(() => Math.random() - 0.5);

      const teamPromises = [];
      for (let i = 0; i < numTeams; i++) {
        teamPromises.push(
          createTeam(tournamentState.id, `Team ${i + 1}`)
        );
      }
      const createdTeams = await Promise.all(teamPromises);

      const assignPromises = [];
      let playerIndex = 0;
      const totalSlots = numTeams * 2;
      const dummyPlayersNeeded = Math.max(0, totalSlots - shuffledPlayers.length);
      
      // Create all dummy players first (in parallel)
      const dummyPlayerPromises = [];
      for (let i = 0; i < dummyPlayersNeeded; i++) {
        dummyPlayerPromises.push(registerPlayer(tournamentState.id, 'DummyPlayer'));
      }
      const dummyPlayers = await Promise.all(dummyPlayerPromises);
      
      // Assign real players and dummy players to teams
      let dummyPlayerIndex = 0;
      for (let i = 0; i < createdTeams.length; i++) {
        const team = createdTeams[i];
        for (let j = 0; j < 2; j++) {
          if (playerIndex < shuffledPlayers.length) {
            assignPromises.push(
              assignPlayerToTeam(tournamentState.id, team.id, shuffledPlayers[playerIndex].id)
            );
            playerIndex++;
          } else if (dummyPlayerIndex < dummyPlayers.length) {
            assignPromises.push(
              assignPlayerToTeam(tournamentState.id, team.id, dummyPlayers[dummyPlayerIndex].id)
            );
            dummyPlayerIndex++;
          }
        }
      }
      
      await Promise.all(assignPromises);

      await setPhase(tournamentState.id, 'team_setup');
      await refreshTournament();

      toast.success(
        `Created ${numTeams} teams${dummyPlayersNeeded > 0 ? ` with ${dummyPlayersNeeded} DummyPlayer(s)` : ''}!`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to generate teams';
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
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
      
      setTimeout(async () => {
        await addFakePlayers(newTournament.id);
      }, 500);
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
  const currentPhase = tournamentState?.phase || 'registration';
  
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
      if (tournamentState.phase === 'match_setup' || tournamentState.phase === 'swiss_rounds') {
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
  }, [teams, tournamentState, matchResults]);

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
    >
      <nav className="sticky top-0 z-50 bg-white shadow-md border-b">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Trophy className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {tournamentState.name}
                </h1>
                <span className="text-xs text-gray-500 capitalize flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  {currentPhase.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleResetToInitial}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Neues Turnier starten"
              >
                <Home className="w-4 h-4" />
                Reset
              </button>
              {isAdmin && tournamentState && (
                <>
                  {(currentPhase === 'swiss_rounds' || currentPhase === 'ko_bracket') && (
                    <button
                      onClick={handleNextMatch}
                      disabled={isLoading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Nächstes Match simulieren"
                    >
                      <Play className="w-4 h-4" />
                      Next Match
                    </button>
                  )}
                  <button
                    onClick={handleNextPhase}
                    disabled={!getNextPhase(currentPhase) || isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Zur nächsten Phase wechseln"
                  >
                    Phase Shift
                    <span>→</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-8">
        <LayoutGroup>
          <div className="space-y-8">
            {/* Registration Section */}
            {phasesReached.includes('registration') && (
              <motion.div
                id="phase-registration"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Registered Players ({tournamentState.players.length})
                    </h2>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
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
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        <AnimatePresence mode="popLayout">
                          {tournamentState.players.map((player) =>
                            player.teamId ? (
                              <PlayerGhostCard key={player.id} player={player} />
                            ) : (
                              <PlayerCard
                                key={player.id}
                                player={player}
                                isAdmin={isAdmin}
                                onDelete={handleDeletePlayer}
                                isDeleting={isDeleting === player.id}
                              />
                            )
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>

                  {/* Teams Section */}
                  {(tournamentState.phase === 'team_setup' || tournamentState.phase === 'match_setup' || tournamentState.phase === 'swiss_rounds' || tournamentState.phase === 'ko_bracket') && 
                   tournamentState.teams && 
                   tournamentState.teams.length > 0 && (
                    <motion.section
                      initial={{ opacity: 0, y: 40 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                          <Users2 className="w-5 h-5" />
                          Teams ({tournamentState.teams.length})
                        </h2>
                      </div>

                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                          <AnimatePresence mode="popLayout">
                            {tournamentState.teams.map((team) => {
                              const teamPlayers = tournamentState.players.filter((player) =>
                                team.playerIds.includes(player.id)
                              );

                              // Use TeamCard in team_setup, TeamGhostCard in later phases
                              if (tournamentState.phase === 'team_setup') {
                                return (
                                  <TeamCard
                                    key={team.id}
                                    team={team}
                                    players={teamPlayers}
                                  />
                                );
                              } else {
                                return (
                                  <TeamGhostCard
                                    key={team.id}
                                    team={team}
                                    players={teamPlayers}
                                  />
                                );
                              }
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                    </motion.section>
                  )}
                </div>
              </motion.div>
            )}

            {/* Matches Section - show empty structure in team_setup for transition */}
            {(phasesReached.includes('team_setup') || phasesReached.includes('match_setup') || phasesReached.includes('swiss_rounds')) && (
              <motion.div
                id="phase-swiss-rounds"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-8 pt-8 border-t-2 border-gray-200"
              >
                <LayoutGroup>
                  <div className="space-y-8">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                      <div className="mb-6">
                        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                          <Zap className="w-5 h-5" />
                          Tournament Matches
                        </h2>
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
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                                    Round {roundNum}
                                  </h4>
                                  <div className="flex gap-2">
                                    {matches.map((match, idx) => {
                                      const isFilled = !!(match.filled && match.team1 && match.team2);
                                      const isCompleted = !!(match.score !== undefined && match.score !== null);
                                      const winner = match.winner || null;
                                      
                                      return (
                                        <MatchCard
                                          key={idx}
                                          matchNumber={`${roundNum}-${idx + 1}`}
                                          team1={match.team1}
                                          team2={match.team2}
                                          players={tournamentState.players}
                                          score={match.score}
                                          winner={winner}
                                          isFilled={isFilled}
                                          isCompleted={isCompleted}
                                        />
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
                                      const isFilled = !!(match.team1 && match.team2);
                                      const isCompleted = !!(match.winner !== undefined && match.winner !== null);
                                      const matchNumber = `${roundShort}-${matchIdx + 1}`;
                                      
                                      return (
                                        <div key={matchIdx} className="relative" style={{ width: '240px', flexShrink: 0 }}>
                                          <MatchCard
                                            matchNumber={matchNumber}
                                            team1={match.team1}
                                            team2={match.team2}
                                            players={tournamentState.players}
                                            score={match.score}
                                            winner={match.winner || null}
                                            isFilled={isFilled}
                                            isCompleted={isCompleted}
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
                transition={{ duration: 0.3 }}
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
