import { useState, useEffect, useMemo, useRef } from 'react';
import { LayoutGroup, AnimatePresence, motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Zap, Play, Square, ArrowRight, FastForward } from 'lucide-react';
import type { TournamentState, Team } from '@tournament-app/shared-types';
import { isDummyPlayer } from '@tournament-app/shared-utils';
import MatchCard from '../components/MatchCard';
import MatchResultModal from '../components/MatchResultModal';
import LiveMatchOverlay from '../components/LiveMatchOverlay';
import type { PhaseConfig, PhaseViewElement } from './PhaseInterface';
import PhaseViewRenderer from './PhaseViewRenderer';

interface SwissPhaseProps {
  tournamentState: TournamentState;
  teams: Team[];
  matchResults: Record<string, { score: string; winner: string | null; duration?: string }>;
  onMatchResultUpdate: (results: Record<string, { score: string; winner: string | null; duration?: string }>) => void;
  matchDurationMinutes?: number;
}

export default function SwissPhase({
  tournamentState,
  teams,
  matchResults,
  onMatchResultUpdate,
  matchDurationMinutes = 10,
}: SwissPhaseProps) {
  const [matchesReady, setMatchesReady] = useState(false);

  // Set matchesReady when phase changes to swiss
  useEffect(() => {
    if (tournamentState.phase === 'swiss' && !matchesReady) {
      setMatchesReady(true);
    } else if (tournamentState.phase !== 'swiss') {
      setMatchesReady(false);
    }
  }, [tournamentState.phase, matchesReady]);

  // Check if a team has dummy players
  const teamHasDummyPlayers = useMemo(() => {
    const dummyTeamIds = new Set<string>();
    tournamentState.players.forEach((player) => {
      if (isDummyPlayer(player) && player.teamId) {
        dummyTeamIds.add(player.teamId);
      }
    });
    return dummyTeamIds;
  }, [tournamentState.players]);

  // Generate Swiss rounds with results
  const swissMatches = useMemo(() => {
    if (!tournamentState || teams.length < 2) return {};
    
    const allRounds: Record<number, Array<{ team1: Team | null; team2: Team | null; score?: string; filled?: boolean; winner?: Team | null }>> = {};
    const numMatches = Math.ceil(teams.length / 2);
    const seed = tournamentState?.id || '';
    
    // Separate teams with dummy players from regular teams
    const regularTeams: Team[] = [];
    const dummyTeams: Team[] = [];
    
    teams.forEach((team) => {
      if (teamHasDummyPlayers.has(team.id)) {
        dummyTeams.push(team);
      } else {
        regularTeams.push(team);
      }
    });
    
    // Shuffle regular teams
    const shuffledRegularTeams = [...regularTeams].sort((a, b) => {
      const hashA = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hashB = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return hashA - hashB;
    });
    
    // Combine: regular teams first, dummy teams at the end
    const shuffledTeams = [...shuffledRegularTeams, ...dummyTeams];
    
    const firstRoundMatches: Array<{ team1: Team | null; team2: Team | null; score?: string; filled?: boolean; winner?: Team | null }> = [];
    
    if (tournamentState.phase === 'team' || tournamentState.phase === 'swiss') {
      const allTeamsForRound = [...shuffledTeams];
      const matchIndices = Array.from({ length: numMatches }, (_, i) => i);
      const shuffledMatchIndices = [...matchIndices].sort((a, b) => {
        const hashA = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + a;
        const hashB = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + b;
        return hashA - hashB;
      });
      
      for (let i = 0; i < numMatches; i++) {
        firstRoundMatches.push({
          team1: null,
          team2: null,
          filled: false,
        });
      }
      
      if (tournamentState.phase === 'swiss' && matchesReady) {
        let teamIndex = 0;
        const lastMatchIndex = numMatches - 1;
        
        for (const matchIdx of shuffledMatchIndices) {
          // Skip the last match - it will be handled separately for dummy teams
          if (matchIdx === lastMatchIndex) {
            continue;
          }
          
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
          
          const matchKey = `swiss-1-${matchIdx + 1}`;
          const result = matchResults[matchKey];
          if (result) {
            firstRoundMatches[matchIdx].score = result.score;
            firstRoundMatches[matchIdx].winner = result.winner ? teams.find(t => t.id === result.winner) || null : null;
          }
        }
        
        // Handle last match: assign remaining teams (should be dummy teams)
        // Put dummy teams in the last match, and they automatically lose
        const lastMatch = firstRoundMatches[lastMatchIndex];
        if (teamIndex < allTeamsForRound.length) {
          lastMatch.team1 = allTeamsForRound[teamIndex];
          teamIndex++;
        }
        if (teamIndex < allTeamsForRound.length) {
          lastMatch.team2 = allTeamsForRound[teamIndex];
          teamIndex++;
        }
        
        if (lastMatch.team1 && lastMatch.team2) {
          lastMatch.filled = true;
          
          // Automatically mark dummy teams as losers
          const lastMatchKey = `swiss-1-${lastMatchIndex + 1}`;
          const existingResult = matchResults[lastMatchKey];
          
          if (!existingResult) {
            // Determine winner: the team without dummy players wins
            const team1HasDummy = teamHasDummyPlayers.has(lastMatch.team1.id);
            const team2HasDummy = teamHasDummyPlayers.has(lastMatch.team2.id);
            
            if (team1HasDummy && !team2HasDummy) {
              // Team2 wins
              lastMatch.winner = lastMatch.team2;
              lastMatch.score = '0-6, 0-6';
            } else if (team2HasDummy && !team1HasDummy) {
              // Team1 wins
              lastMatch.winner = lastMatch.team1;
              lastMatch.score = '6-0, 6-0';
            } else if (team1HasDummy && team2HasDummy) {
              // Both have dummy players - team1 wins by default
              lastMatch.winner = lastMatch.team1;
              lastMatch.score = '6-0, 6-0';
            } else {
              // Neither has dummy players - should not happen in last match, but handle it
              lastMatch.winner = lastMatch.team1;
              lastMatch.score = '6-0, 6-0';
            }
          } else {
            // Result already exists
            lastMatch.score = existingResult.score;
            lastMatch.winner = existingResult.winner ? teams.find(t => t.id === existingResult.winner) || null : null;
          }
        }
      }
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
    
    // Swiss-Pairing for rounds 2 and 3
    // Only fill rounds if previous round is complete
    for (let round = 2; round <= 3; round++) {
      const previousRound = round - 1;
      const previousRoundMatches = allRounds[previousRound];
      
      // Check if previous round is complete
      const previousRoundComplete = previousRoundMatches?.every((match, idx) => {
        if (!match.team1 || !match.team2) return false; // Empty matches mean round not started
        const matchKey = `swiss-${previousRound}-${idx + 1}`;
        const result = matchResults[matchKey];
        return !!(result && result.score && result.winner);
      });
      
      // If previous round is not complete, create empty matches
      if (!previousRoundComplete) {
        const emptyMatches: Array<{ team1: Team | null; team2: Team | null; score?: string; filled?: boolean; winner?: Team | null }> = [];
        for (let i = 0; i < numMatches; i++) {
          emptyMatches.push({
            team1: null,
            team2: null,
            filled: false,
          });
        }
        allRounds[round] = emptyMatches;
        continue;
      }
      
      // Calculate team statistics from previous round
      const teamStats = new Map<string, { wins: number; losses: number; points: number }>();
      
      // Initialize all teams with 0 stats
      teams.forEach((team) => {
        teamStats.set(team.id, { wins: 0, losses: 0, points: 0 });
      });
      
      // Calculate stats from previous round matches
      if (previousRoundMatches) {
        previousRoundMatches.forEach((match, idx) => {
          if (!match.team1 || !match.team2) return;
          
          const matchKey = `swiss-${previousRound}-${idx + 1}`;
          const result = matchResults[matchKey];
          
          if (result && result.winner) {
            const winnerId = result.winner;
            const loserId = winnerId === match.team1.id ? match.team2.id : match.team1.id;
            
            const winnerStats = teamStats.get(winnerId);
            const loserStats = teamStats.get(loserId);
            
            if (winnerStats) {
              winnerStats.wins++;
              winnerStats.points += 3;
            }
            if (loserStats) {
              loserStats.losses++;
              loserStats.points += 1;
            }
          }
        });
      }
      
      // Sort teams by performance (wins, then points, then by ID for determinism)
      const sortedTeams = [...teams].sort((a, b) => {
        const statsA = teamStats.get(a.id) || { wins: 0, losses: 0, points: 0 };
        const statsB = teamStats.get(b.id) || { wins: 0, losses: 0, points: 0 };
        
        // First: separate dummy teams from regular teams
        const aIsDummy = teamHasDummyPlayers.has(a.id);
        const bIsDummy = teamHasDummyPlayers.has(b.id);
        
        if (aIsDummy && !bIsDummy) return 1; // Dummy teams go to the end
        if (!aIsDummy && bIsDummy) return -1;
        
        // Then: sort by wins (descending)
        if (statsB.wins !== statsA.wins) {
          return statsB.wins - statsA.wins;
        }
        
        // Then: sort by points (descending)
        if (statsB.points !== statsA.points) {
          return statsB.points - statsA.points;
        }
        
        // Finally: deterministic sort by ID
        return a.id.localeCompare(b.id);
      });
      
      // Create matches for this round using Swiss pairing
      const roundMatches: Array<{ team1: Team | null; team2: Team | null; score?: string; filled?: boolean; winner?: Team | null }> = [];
      
      // Pair teams: 1st vs 2nd, 3rd vs 4th, etc.
      for (let i = 0; i < numMatches; i++) {
        const team1 = sortedTeams[i * 2] || null;
        const team2 = sortedTeams[i * 2 + 1] || null;
        
        const matchKey = `swiss-${round}-${i + 1}`;
        const result = matchResults[matchKey];
        
        roundMatches.push({
          team1,
          team2,
          filled: !!(team1 && team2),
          score: result?.score,
          winner: result?.winner ? teams.find(t => t.id === result.winner) || null : null,
        });
      }
      
      allRounds[round] = roundMatches;
    }
    
    return allRounds;
  }, [teams, tournamentState, matchResults, matchesReady, teamHasDummyPlayers]);

  // Automatically save results for dummy team matches
  useEffect(() => {
    if (!swissMatches || !matchesReady || tournamentState.phase !== 'swiss') return;
    
    const numMatches = Math.ceil(teams.length / 2);
    const lastMatchIndex = numMatches - 1;
    const lastMatchKey = `swiss-1-${lastMatchIndex + 1}`;
    const lastMatch = swissMatches[1]?.[lastMatchIndex];
    
    // Check if this is a dummy team match that needs automatic result
    if (lastMatch && lastMatch.team1 && lastMatch.team2 && !matchResults[lastMatchKey]) {
      const team1HasDummy = teamHasDummyPlayers.has(lastMatch.team1.id);
      const team2HasDummy = teamHasDummyPlayers.has(lastMatch.team2.id);
      
      // Only auto-save if at least one team has dummy players
      if (team1HasDummy || team2HasDummy) {
        let winner: Team | null = null;
        let score = '';
        
        if (team1HasDummy && !team2HasDummy) {
          // Team2 wins
          winner = lastMatch.team2;
          score = '0-6, 0-6';
        } else if (team2HasDummy && !team1HasDummy) {
          // Team1 wins
          winner = lastMatch.team1;
          score = '6-0, 6-0';
        } else if (team1HasDummy && team2HasDummy) {
          // Both have dummy players - team1 wins by default
          winner = lastMatch.team1;
          score = '6-0, 6-0';
        }
        
        if (winner) {
          const updatedResults = {
            ...matchResults,
            [lastMatchKey]: { 
              score, 
              winner: winner.id, 
              duration: '0:00' 
            },
          };
          onMatchResultUpdate(updatedResults);
        }
      }
    }
  }, [swissMatches, matchesReady, tournamentState.phase, matchResults, teamHasDummyPlayers, teams.length, onMatchResultUpdate]);

  // Find next match key
  const nextMatchKey = useMemo(() => {
    if (!swissMatches) return null;
    for (const [roundNum, matches] of Object.entries(swissMatches)) {
      for (let idx = 0; idx < matches.length; idx++) {
        const match = matches[idx];
        const matchKey = `swiss-${roundNum}-${idx + 1}`;
        const result = matchResults[matchKey];
        // Match is available if it has both teams and no complete result
        if (match.team1 && match.team2 && !(result && result.score && result.winner)) {
          return matchKey;
        }
      }
    }
    return null;
  }, [swissMatches, matchResults]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [roundTransitionKey, setRoundTransitionKey] = useState(0);
  const [currentMatch, setCurrentMatch] = useState<{
    matchKey: string;
    team1: Team | null;
    team2: Team | null;
    score: string;
    winner: Team | null;
  } | null>(null);

  // Timer state
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(matchDurationMinutes * 60); // in seconds, countdown
  const [currentMatchKey, setCurrentMatchKey] = useState<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const MATCH_DURATION = matchDurationMinutes * 60; // Convert minutes to seconds


  // Get current match teams for overlay
  const currentMatchTeams = useMemo(() => {
    if (!currentMatchKey || !swissMatches) return { team1: null, team2: null };
    
    for (const [roundNum, matches] of Object.entries(swissMatches)) {
      for (let idx = 0; idx < matches.length; idx++) {
        const matchKey = `swiss-${roundNum}-${idx + 1}`;
        if (matchKey === currentMatchKey) {
          const match = matches[idx];
          return { team1: match.team1, team2: match.team2 };
        }
      }
    }
    return { team1: null, team2: null };
  }, [currentMatchKey, swissMatches]);

  // Timer functions
  const startTimer = () => {
    if (!nextMatchKey) {
      toast.error('Kein Match verfügbar');
      return;
    }

    if (isTimerRunning) {
      toast('Timer läuft bereits', { icon: 'ℹ️' });
      return;
    }

    setCurrentMatchKey(nextMatchKey);
    setIsTimerRunning(true);
    setIsTimerPaused(false);
    setTimeRemaining(MATCH_DURATION);

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (isTimerPaused) return prev;
        const newTime = prev - 1;
        // Timer can go negative, no auto-stop
        return newTime;
      });
    }, 1000);
  };

  const pauseTimer = () => {
    setIsTimerPaused(true);
  };

  const resumeTimer = () => {
    setIsTimerPaused(false);
  };

  // Generate automatic result (Team1 wins 6-4, 6-4 by default)
  const generateAutomaticResult = (team1: Team, team2: Team): { score: string; winner: Team } => {
    // Simple deterministic result based on team IDs
    const team1Hash = team1.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const team2Hash = team2.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Team with higher hash wins (deterministic but fair)
    const team1Wins = team1Hash > team2Hash;
    
    if (team1Wins) {
      return {
        score: '6-4, 6-4',
        winner: team1,
      };
    } else {
      return {
        score: '4-6, 4-6',
        winner: team2,
      };
    }
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsTimerRunning(false);
    setIsTimerPaused(false);
    
    // Generate automatic result and open confirmation modal
    if (currentMatchKey) {
      // Find the match
      let matchToOpen: { team1: Team | null; team2: Team | null } | null = null;
      for (const [roundNum, matches] of Object.entries(swissMatches || {})) {
        for (let idx = 0; idx < matches.length; idx++) {
          const matchKey = `swiss-${roundNum}-${idx + 1}`;
          if (matchKey === currentMatchKey) {
            matchToOpen = matches[idx];
            break;
          }
        }
        if (matchToOpen) break;
      }

      if (matchToOpen && matchToOpen.team1 && matchToOpen.team2) {
        // Generate automatic result
        const result = generateAutomaticResult(matchToOpen.team1, matchToOpen.team2);
        setCurrentMatch({
          matchKey: currentMatchKey,
          team1: matchToOpen.team1,
          team2: matchToOpen.team2,
          score: result.score,
          winner: result.winner,
        });
        setIsModalOpen(true);
      }
    }

    setCurrentMatchKey(null);
    setTimeRemaining(matchDurationMinutes * 60);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Format time as MM:SS (supports negative values)
  const formatTime = (seconds: number): string => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    const sign = isNegative ? '-' : '';
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Check if all matches in current round are completed
  const currentRound = useMemo(() => {
    if (!swissMatches) return null;
    
    // Find the first round with incomplete matches
    for (const [roundNum, matches] of Object.entries(swissMatches).sort(([a], [b]) => Number(a) - Number(b))) {
      for (let idx = 0; idx < matches.length; idx++) {
        const matchKey = `swiss-${roundNum}-${idx + 1}`;
        const match = matches[idx];
        const result = matchResults[matchKey];
        // Match is incomplete if it has both teams but no complete result
        if (match.team1 && match.team2 && !(result && result.score && result.winner)) {
          return roundNum;
        }
      }
    }
    return null;
  }, [swissMatches, matchResults]);

  const allMatchesInCurrentRoundCompleted = useMemo(() => {
    if (!swissMatches) return false;
    
    // Determine which round to check
    // If currentRound is null, it means all matches in all rounds are complete
    // In that case, we should check if we can proceed to the next round
    // For now, we'll check round 1 if currentRound is null (most common case)
    const roundNumbers = Object.keys(swissMatches).map(Number).sort((a, b) => a - b);
    if (roundNumbers.length === 0) return false;
    
    // If currentRound is null, check round 1 (assuming we want to go to round 2)
    // Otherwise check the currentRound
    const roundToCheck = currentRound ? Number(currentRound) : roundNumbers[0];
    
    const roundMatches = swissMatches[roundToCheck];
    if (!roundMatches) return false;

    const allCompleted = roundMatches.every((match, idx) => {
      // Skip matches without both teams
      if (!match.team1 || !match.team2) {
        return true; // Consider empty matches as "completed" (not relevant)
      }
      
      const matchKey = `swiss-${roundToCheck}-${idx + 1}`;
      const result = matchResults[matchKey];
      
      // Match is completed if it has a complete result (score and winner)
      return !!(result && result.score && result.winner);
    });
    
    return allCompleted;
  }, [swissMatches, currentRound, matchResults]);

  // Simulate next match
  const handleSimulateNextMatch = () => {
    if (!nextMatchKey || !swissMatches) {
      toast.error('Kein Match verfügbar');
      return;
    }

    // Find the match
    let matchToSimulate: { team1: Team | null; team2: Team | null } | null = null;
    for (const [roundNum, matches] of Object.entries(swissMatches)) {
      for (let idx = 0; idx < matches.length; idx++) {
        const matchKey = `swiss-${roundNum}-${idx + 1}`;
        if (matchKey === nextMatchKey) {
          matchToSimulate = matches[idx];
          break;
        }
      }
      if (matchToSimulate) break;
    }

    if (!matchToSimulate || !matchToSimulate.team1 || !matchToSimulate.team2) {
      toast.error('Match nicht gefunden oder unvollständig');
      return;
    }

    // Check if match already has a result
    const existingResult = matchResults[nextMatchKey];
    if (existingResult && existingResult.score && existingResult.winner) {
      toast.error('Dieses Match ist bereits abgeschlossen');
      return;
    }

    // Generate automatic result
    const { score, winner } = generateAutomaticResult(matchToSimulate.team1, matchToSimulate.team2);
    
    const updatedResults = {
      ...matchResults,
      [nextMatchKey]: {
        score,
        winner: winner.id,
        duration: `${matchDurationMinutes}:00`,
      },
    };

    onMatchResultUpdate(updatedResults);
    toast.success(`Match ${nextMatchKey} simuliert: ${winner.name} gewinnt ${score}`);
  };

  // Handle next round
  const handleNextRound = () => {
    if (!allMatchesInCurrentRoundCompleted) {
      toast.error('Nicht alle Matches dieser Runde sind abgeschlossen');
      return;
    }

    // Find next round
    if (!swissMatches) return;
    const roundNumbers = Object.keys(swissMatches).map(Number).sort((a, b) => a - b);
    
    // If currentRound is null, it means all matches are complete, so we're on the last completed round
    // In that case, we want to go to the next round (if it exists)
    // Otherwise, use currentRound
    const currentRoundNum = currentRound ? Number(currentRound) : (roundNumbers.length > 0 ? roundNumbers[0] : null);
    
    if (currentRoundNum === null) return;
    
    const currentIndex = roundNumbers.indexOf(currentRoundNum);
    if (currentIndex < roundNumbers.length - 1) {
      // Trigger transition animation
      setRoundTransitionKey((prev) => prev + 1);
      
      // Small delay to allow transition to start
      setTimeout(() => {
        const nextRound = roundNumbers[currentIndex + 1];
        toast.success(`Runde ${nextRound} kann beginnen`);
      }, 200);
    } else {
      toast('Alle Runden sind abgeschlossen', { icon: '✅' });
    }
  };

  // Handle confirm from modal
  const handleConfirmResult = () => {
    if (!currentMatch) return;

    const duration = formatTime(matchDurationMinutes * 60 - timeRemaining);

    // Update match results - this will automatically update the match card state to 'done'
    const updatedResults = {
      ...matchResults,
      [currentMatch.matchKey]: { 
        score: currentMatch.score, 
        winner: currentMatch.winner?.id || null, 
        duration 
      },
    };
    
    onMatchResultUpdate(updatedResults);

    toast.success(`Match abgeschlossen: ${currentMatch.winner?.name} gewinnt ${currentMatch.score}`);
    setIsModalOpen(false);
    setCurrentMatch(null);
    
    // The nextMatchKey will automatically update because matchResults changed
    // This will make the next match card yellow (ready state)
  };

  // Swiss Tournament View Component
  const SwissTournamentView = ({ 
    tournamentState, 
    teams, 
    swissMatches, 
    matchResults, 
    nextMatchKey,
    isTimerRunning,
    timeRemaining,
    matchDurationMinutes,
    currentRound,
    onStartTimer,
    onStopTimer,
    allMatchesInCurrentRoundCompleted,
    onNextRound,
    onSimulateNextMatch,
    roundTransitionKey,
  }: any) => {
    const isTimeNegative = timeRemaining < 0;
    
    // Determine which teams are in which rounds for transition animations
    const teamsInRounds = useMemo(() => {
      if (!swissMatches) return new Map<string, Set<number>>();
      
      const teamRoundMap = new Map<string, Set<number>>();
      
      Object.entries(swissMatches).forEach(([roundNum, matches]) => {
        const typedMatches = matches as any[];
        typedMatches.forEach((match) => {
          if (match.team1) {
            const rounds = teamRoundMap.get(match.team1.id) || new Set<number>();
            rounds.add(Number(roundNum));
            teamRoundMap.set(match.team1.id, rounds);
          }
          if (match.team2) {
            const rounds = teamRoundMap.get(match.team2.id) || new Set<number>();
            rounds.add(Number(roundNum));
            teamRoundMap.set(match.team2.id, rounds);
          }
        });
      });
      
      return teamRoundMap;
    }, [swissMatches]);
    
    // Check if a team is transitioning from one round to another
    const isTeamTransitioning = (teamId: string, currentRoundNum: number) => {
      const rounds = teamsInRounds.get(teamId);
      if (!rounds) return false;
      
      // Team is transitioning if it's in current round AND in next round
      const nextRoundNum = currentRoundNum + 1;
      return rounds.has(currentRoundNum) && rounds.has(nextRoundNum);
    };
    
    return (
    <LayoutGroup>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Tournament Matches
          </h2>
          
          {/* Timer Display */}
          {isTimerRunning && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${
              isTimeNegative
                ? 'bg-red-100 border-red-500 animate-pulse'
                : 'bg-purple-100 border-purple-300'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                isTimeNegative
                  ? 'bg-red-600 animate-pulse'
                  : 'bg-red-500 animate-pulse'
              }`}></div>
              <span className={`text-lg font-mono font-bold ${
                isTimeNegative
                  ? 'text-red-600'
                  : 'text-purple-800'
              }`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {nextMatchKey && !isTimerRunning && (
              <button
                onClick={onStartTimer}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-semibold flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Match starten
              </button>
            )}
            
            {isTimerRunning && (
              <button
                onClick={onStopTimer}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-semibold flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Match stoppen
              </button>
            )}

            {swissMatches && Object.keys(swissMatches).length > 0 && (
              <button
                onClick={onNextRound}
                disabled={!allMatchesInCurrentRoundCompleted}
                className={`px-5 py-3 rounded-lg font-bold text-base flex items-center gap-2 shadow-lg transition-all ${
                  allMatchesInCurrentRoundCompleted
                    ? 'bg-blue-500 text-white hover:bg-blue-600 cursor-pointer hover:shadow-xl'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-60'
                }`}
                title={
                  allMatchesInCurrentRoundCompleted
                    ? 'Zur nächsten Runde wechseln'
                    : 'Alle Matches dieser Runde müssen abgeschlossen sein'
                }
              >
                <ArrowRight className="w-5 h-5" />
                Nächste Runde
              </button>
            )}

            {nextMatchKey && !isTimerRunning && (
              <button
                onClick={onSimulateNextMatch}
                className="px-5 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-bold text-base flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                title="Nächstes Match schnell simulieren"
              >
                <FastForward className="w-5 h-5" />
                Nächstes Match simulieren
              </button>
            )}
          </div>
        </div>

        {teams.length < 2 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800 text-sm">
              Need at least 2 teams to generate pairings.
            </p>
          </div>
        )}

        {/* Swiss Rounds */}
        {teams.length >= 2 && swissMatches && Object.keys(swissMatches).length > 0 && (
          <div className="mb-8 pb-8 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Swiss Rounds
            </h3>
            <AnimatePresence mode="wait">
              <div key={roundTransitionKey} className="space-y-4">
                {Object.entries(swissMatches)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([roundNum, matches]) => {
                    const typedMatches = matches as any[];
                    const isActiveRound = currentRound === roundNum;
                    return (
                      <motion.div
                        key={roundNum}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4, delay: Number(roundNum) * 0.1 }}
                        className={`rounded-xl p-5 shadow-lg transition-all ${
                          isActiveRound
                            ? 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 border-4 border-blue-500 ring-4 ring-blue-200'
                            : 'bg-gradient-to-br from-gray-50 to-white border-2 border-gray-400'
                        }`}
                      >
                      <h4 className={`text-2xl font-bold mb-4 text-center ${
                        isActiveRound
                          ? 'text-blue-700'
                          : 'text-gray-800'
                      }`}>
                        {isActiveRound && <span className="mr-2">▶</span>}
                        Round {roundNum}
                        {isActiveRound && <span className="ml-2 text-sm font-normal">(Aktive Runde)</span>}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
                        {typedMatches.map((match: any, idx: number) => {
                        const matchKey = `swiss-${roundNum}-${idx + 1}`;
                        const result = matchResults[matchKey];
                        const isDone = !!(result && result.score && result.winner);
                        const isReady = nextMatchKey === matchKey && !isDone;
                        const roundNumInt = Number(roundNum);

                        const matchState: 'idle' | 'ready' | 'done' = isDone
                          ? 'done'
                          : isReady
                          ? 'ready'
                          : 'idle';
                        
                        // Check if teams are transitioning to next round
                        const team1Transitioning = match.team1 ? isTeamTransitioning(match.team1.id, roundNumInt) : false;
                        const team2Transitioning = match.team2 ? isTeamTransitioning(match.team2.id, roundNumInt) : false;
                        const isMatchTransitioning = (team1Transitioning || team2Transitioning) && isDone;
                        
                        // Determine winner for match card
                        const winnerTeam = result?.winner ? teams.find((t: any) => t.id === result.winner) || null : null;

                        return (
                          <div key={idx} className="relative w-full h-full flex flex-col">
                            <MatchCard
                              matchNumber={`${roundNum}-${idx + 1}`}
                              team1={match.team1}
                              team2={match.team2}
                              players={tournamentState.players}
                              score={result?.score}
                              duration={result?.duration}
                              winner={winnerTeam}
                              state={isMatchTransitioning ? 'done' : matchState}
                              phase="swiss"
                              roundNumber={roundNumInt}
                              isGhost={isMatchTransitioning}
                            />
                          </div>
                        );
                        })}
                      </div>
                      </motion.div>
                    );
                  })}
              </div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </LayoutGroup>
    );
  };

  if (!tournamentState.teams || tournamentState.teams.length === 0) {
    return null;
  }

  const phaseViews: PhaseViewElement[] = [
    {
      type: 'typingText',
      id: 'typing-text-matchmatching',
      text: 'Matchmatching gestartet ...',
      faded: (state) => state.phase !== 'swiss',
      showCursor: (state) => state.phase === 'swiss',
    },
    {
      type: 'view',
      component: SwissTournamentView,
      className: 'bg-white rounded-lg shadow-lg p-6',
    },
  ];

      return (
        <>
          <div id="phase-swiss">
            <PhaseViewRenderer
              elements={phaseViews}
              tournamentState={tournamentState}
            phaseProps={{
              teams,
              swissMatches,
              matchResults,
              nextMatchKey,
              isTimerRunning,
              timeRemaining,
              matchDurationMinutes,
              currentRound,
              onStartTimer: startTimer,
              onStopTimer: stopTimer,
              allMatchesInCurrentRoundCompleted,
              onNextRound: handleNextRound,
              onSimulateNextMatch: handleSimulateNextMatch,
              roundTransitionKey,
            }}
            />
          </div>

          {/* Live Match Overlay */}
          {isTimerRunning && currentMatchTeams.team1 && currentMatchTeams.team2 && (
            <LiveMatchOverlay
              isVisible={isTimerRunning}
              team1={currentMatchTeams.team1}
              team2={currentMatchTeams.team2}
              players={tournamentState.players}
              timeElapsed={timeRemaining}
              matchDurationSeconds={MATCH_DURATION}
              isPaused={isTimerPaused}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onStop={() => {
                // Just stop the timer - the modal will handle the rest
                stopTimer();
              }}
            />
          )}

          {/* Match Result Modal */}
          {currentMatch && currentMatch.team1 && currentMatch.team2 && (
            <MatchResultModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setCurrentMatch(null);
              }}
              team1={currentMatch.team1!}
              team2={currentMatch.team2!}
              score={currentMatch.score || ''}
              winner={currentMatch.winner || null}
              duration={formatTime(matchDurationMinutes * 60 - timeRemaining)}
              onConfirm={handleConfirmResult}
            />
          )}
        </>
      );
}

// Phase configuration
export const swissPhaseConfig: PhaseConfig = {
  id: 'swiss',
  title: 'Swiss Rounds',
  description: 'Swiss-Runden werden gespielt',
  backgroundColor: 'bg-gradient-to-br from-retro-yellow-50/80 via-retro-yellow-100/90 to-retro-beige-50/80',
  nextPhase: 'ko',
  requiresTeams: true,
  requiresMatches: true,
};

