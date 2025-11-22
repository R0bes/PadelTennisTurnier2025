import { useState, useEffect, useMemo } from 'react';
import { LayoutGroup } from 'framer-motion';
import toast from 'react-hot-toast';
import { Zap, Play } from 'lucide-react';
import type { TournamentState, Team } from '@tournament-app/shared-types';
import MatchCard from '../components/MatchCard';
import type { PhaseConfig, PhaseViewElement } from './PhaseInterface';
import PhaseViewRenderer from './PhaseViewRenderer';

interface SwissPhaseProps {
  tournamentState: TournamentState;
  teams: Team[];
  matchResults: Record<string, { score: string; winner: string | null; duration?: string }>;
  onMatchResultUpdate: (results: Record<string, { score: string; winner: string | null; duration?: string }>) => void;
}

export default function SwissPhase({
  tournamentState,
  teams,
  matchResults,
  onMatchResultUpdate,
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

  // Generate Swiss rounds with results
  const swissMatches = useMemo(() => {
    if (!tournamentState || teams.length < 2) return {};
    
    const allRounds: Record<number, Array<{ team1: Team | null; team2: Team | null; score?: string; filled?: boolean; winner?: Team | null }>> = {};
    const numMatches = Math.ceil(teams.length / 2);
    const seed = tournamentState?.id || '';
    const shuffledTeams = [...teams].sort((a, b) => {
      const hashA = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const hashB = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return hashA - hashB;
    });
    
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
          
          const matchKey = `swiss-1-${matchIdx + 1}`;
          const result = matchResults[matchKey];
          if (result) {
            firstRoundMatches[matchIdx].score = result.score;
            firstRoundMatches[matchIdx].winner = result.winner ? teams.find(t => t.id === result.winner) || null : null;
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

  // Find next match key
  const nextMatchKey = useMemo(() => {
    if (!swissMatches) return null;
    for (const [roundNum, matches] of Object.entries(swissMatches)) {
      for (let idx = 0; idx < matches.length; idx++) {
        const match = matches[idx];
        const matchKey = `swiss-${roundNum}-${idx + 1}`;
        if (match.team1 && match.team2 && !matchResults[matchKey]) {
          return matchKey;
        }
      }
    }
    return null;
  }, [swissMatches, matchResults]);

  // Handle next match
  const handleNextMatch = () => {
    if (!nextMatchKey || !swissMatches) {
      toast.error('No matches available to simulate');
      return;
    }

    // Find the match
    let nextMatch: { team1: Team | null; team2: Team | null } | null = null;
    for (const [roundNum, matches] of Object.entries(swissMatches)) {
      for (let idx = 0; idx < matches.length; idx++) {
        const matchKey = `swiss-${roundNum}-${idx + 1}`;
        if (matchKey === nextMatchKey) {
          nextMatch = matches[idx];
          break;
        }
      }
      if (nextMatch) break;
    }

    if (!nextMatch || !nextMatch.team1 || !nextMatch.team2) {
      toast.error('No matches available to simulate');
      return;
    }

    // Generate random score
    const scores = [0, 1, 2, 3, 4, 5, 6];
    const team1Score1 = scores[Math.floor(Math.random() * (scores.length - 1)) + 1];
    const team2Score1 = scores[Math.floor(Math.random() * (scores.length - 1)) + 1];
    const team1Score2 = scores[Math.floor(Math.random() * (scores.length - 1)) + 1];
    const team2Score2 = scores[Math.floor(Math.random() * (scores.length - 1)) + 1];

    let winner: Team | null = null;
    if (team1Score1 > team2Score1 && team1Score2 > team2Score2) {
      winner = nextMatch.team1;
    } else if (team2Score1 > team1Score1 && team2Score2 > team1Score2) {
      winner = nextMatch.team2;
    } else {
      winner = Math.random() > 0.5 ? nextMatch.team1 : nextMatch.team2;
    }

    const score = `${team1Score1}-${team2Score1}, ${team1Score2}-${team2Score2}`;

    onMatchResultUpdate({
      ...matchResults,
      [nextMatchKey]: { score, winner: winner?.id || null },
    });

    toast.success(`Match ${nextMatchKey} completed: ${winner?.name} wins ${score}`);
  };

  // Swiss Tournament View Component
  const SwissTournamentView = ({ tournamentState, teams, swissMatches, matchResults, nextMatchKey, onNextMatch }: any) => (
    <LayoutGroup>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Tournament Matches
          </h2>
          {nextMatchKey && (
            <button
              onClick={onNextMatch}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              next Match
            </button>
          )}
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
            <div className="space-y-4">
              {Object.entries(swissMatches)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([roundNum, matches]) => {
                  const typedMatches = matches as any[];
                  return (
                    <div
                      key={roundNum}
                      className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border border-green-200"
                    >
                      <h4 className="text-xl font-bold text-gray-800 mb-4 text-center">
                        Round {roundNum}
                      </h4>
                      <div className="flex gap-4 justify-between flex-wrap">
                        {typedMatches.map((match: any, idx: number) => {
                        const matchKey = `swiss-${roundNum}-${idx + 1}`;
                        const result = matchResults[matchKey];
                        const isDone = !!(result && result.score && result.winner);
                        const isReady = nextMatchKey === matchKey && !isDone;

                        const matchState: 'idle' | 'ready' | 'done' = isDone
                          ? 'done'
                          : isReady
                          ? 'ready'
                          : 'idle';

                        return (
                          <div key={idx} className="flex-1 min-w-[280px] max-w-[350px]">
                            <MatchCard
                              matchNumber={`${roundNum}-${idx + 1}`}
                              team1={match.team1}
                              team2={match.team2}
                              players={tournamentState.players}
                              score={result?.score}
                              duration={result?.duration}
                              winner={
                                result?.winner
                                  ? teams.find((t: any) => t.id === result.winner) || null
                                  : null
                              }
                              state={matchState}
                              phase="swiss"
                            />
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </LayoutGroup>
  );

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
    <div id="phase-swiss">
      <PhaseViewRenderer
        elements={phaseViews}
        tournamentState={tournamentState}
        phaseProps={{
          teams,
          swissMatches,
          matchResults,
          nextMatchKey,
          onNextMatch: handleNextMatch,
        }}
      />
    </div>
  );
}

// Phase configuration
export const swissPhaseConfig: PhaseConfig = {
  id: 'swiss',
  title: 'Swiss Rounds',
  description: 'Swiss-Runden werden gespielt',
  backgroundColor: 'bg-indigo-50',
  nextPhase: 'ko',
  requiresTeams: true,
  requiresMatches: true,
};

