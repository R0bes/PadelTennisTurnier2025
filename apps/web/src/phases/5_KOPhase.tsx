import { useMemo } from 'react';
import { LayoutGroup } from 'framer-motion';
import toast from 'react-hot-toast';
import { Trophy, Play } from 'lucide-react';
import type { TournamentState, Team } from '@tournament-app/shared-types';
import { generateKOBracket } from '@tournament-app/shared-utils';
import MatchCard from '../components/MatchCard';
import type { PhaseConfig, PhaseViewElement } from './PhaseInterface';
import PhaseViewRenderer from './PhaseViewRenderer';

interface KOPhaseProps {
  tournamentState: TournamentState;
  teams: Team[];
  matchResults: Record<string, { score: string; winner: string | null; duration?: string }>;
  onMatchResultUpdate: (results: Record<string, { score: string; winner: string | null; duration?: string }>) => void;
}

export default function KOPhase({
  tournamentState,
  teams,
  matchResults,
  onMatchResultUpdate,
}: KOPhaseProps) {
  // Generate KO bracket with results and winner advancement
  const koBracket = useMemo(() => {
    const bracket = generateKOBracket(teams);
    if (!bracket) return null;
    
    const roundNames: Record<string, string> = {
      'Quarterfinals': 'QF',
      'Semifinals': 'SF',
      'Final': 'F'
    };
    
    const updatedBracket: typeof bracket = [];
    
    for (let roundIdx = 0; roundIdx < bracket.length; roundIdx++) {
      const round = bracket[roundIdx];
      const roundShort = roundNames[round.round] || round.round.charAt(0);
      
      if (roundIdx === 0) {
        const seededTeams = [...teams].slice(0, 8);
        updatedBracket.push({
          ...round,
          matches: round.matches.map((match, matchIdx) => {
            const team1 = seededTeams[matchIdx * 2] || null;
            const team2 = seededTeams[matchIdx * 2 + 1] || null;
            const matchKey = `ko-${roundShort}-${matchIdx + 1}`;
            const result = matchResults[matchKey];
            return {
              team1,
              team2,
              filled: !!(team1 && team2),
              score: result?.score,
              winner: result?.winner ? teams.find(t => t.id === result.winner) || null : match.winner,
            };
          }),
        });
      } else {
        const previousRound = updatedBracket[roundIdx - 1];
        updatedBracket.push({
          ...round,
          matches: round.matches.map((match, matchIdx) => {
            const previousMatch1Idx = matchIdx * 2;
            const previousMatch2Idx = matchIdx * 2 + 1;
            
            const prevRoundShort = roundNames[previousRound.round] || previousRound.round.charAt(0);
            const prevMatch1Key = `ko-${prevRoundShort}-${previousMatch1Idx + 1}`;
            const prevMatch2Key = `ko-${prevRoundShort}-${previousMatch2Idx + 1}`;
            
            const prevResult1 = matchResults[prevMatch1Key];
            const prevResult2 = matchResults[prevMatch2Key];
            
            const winner1 = prevResult1?.winner ? teams.find(t => t.id === prevResult1.winner) || null : null;
            const winner2 = prevResult2?.winner ? teams.find(t => t.id === prevResult2.winner) || null : null;
            
            const team1 = winner1 || match.team1;
            const team2 = winner2 || match.team2;
            
            const matchKey = `ko-${roundShort}-${matchIdx + 1}`;
            const result = matchResults[matchKey];
            
            return {
              team1,
              team2,
              filled: !!(team1 && team2),
              score: result?.score,
              winner: result?.winner ? teams.find(t => t.id === result.winner) || null : match.winner,
            };
          }),
        });
      }
    }
    
    return updatedBracket;
  }, [teams, matchResults]);

  // Find next match key
  const nextMatchKey = useMemo(() => {
    if (!koBracket) return null;
    const roundNames: Record<string, string> = {
      'Quarterfinals': 'QF',
      'Semifinals': 'SF',
      'Final': 'F'
    };
    
    for (let roundIdx = 0; roundIdx < koBracket.length; roundIdx++) {
      const round = koBracket[roundIdx];
      const roundShort = roundNames[round.round] || round.round.charAt(0);
      
      for (let matchIdx = 0; matchIdx < round.matches.length; matchIdx++) {
        const match = round.matches[matchIdx];
        const matchKey = `ko-${roundShort}-${matchIdx + 1}`;
        if (match.team1 && match.team2 && !matchResults[matchKey]) {
          return matchKey;
        }
      }
    }
    return null;
  }, [koBracket, matchResults]);

  // Handle next match
  const handleNextMatch = () => {
    if (!nextMatchKey || !koBracket) {
      toast.error('No matches available to simulate');
      return;
    }

    // Find the match
    let nextMatch: { team1: Team | null; team2: Team | null } | null = null;
    const roundNames: Record<string, string> = {
      'Quarterfinals': 'QF',
      'Semifinals': 'SF',
      'Final': 'F'
    };
    
    for (let roundIdx = 0; roundIdx < koBracket.length; roundIdx++) {
      const round = koBracket[roundIdx];
      const roundShort = roundNames[round.round] || round.round.charAt(0);
      
      for (let matchIdx = 0; matchIdx < round.matches.length; matchIdx++) {
        const matchKey = `ko-${roundShort}-${matchIdx + 1}`;
        if (matchKey === nextMatchKey) {
          nextMatch = round.matches[matchIdx];
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

  // KO Bracket View Component
  const KOBracketView = ({ tournamentState, teams, koBracket, matchResults, nextMatchKey, onNextMatch }: any) => (
    <LayoutGroup>
      <div className="space-y-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
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

          {/* KO Bracket */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border border-blue-200">
            <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Knockout Bracket
            </h3>
            <div className="space-y-6">
              {koBracket.map((round: any, roundIdx: number) => {
                const roundNames: Record<string, string> = {
                  Quarterfinals: 'QF',
                  Semifinals: 'SF',
                  Final: 'F',
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
                      {round.matches.map((match: any, matchIdx: number) => {
                          const matchNumber = `${roundShort}-${matchIdx + 1}`;
                          const matchKey = `ko-${matchNumber}`;
                          const result = matchResults[matchKey];
                          const isDone = !!(result && result.score && result.winner);
                          const isReady = nextMatchKey === matchKey && !isDone;

                          // Determine match state
                          const matchState: 'idle' | 'ready' | 'done' = isDone
                            ? 'done'
                            : isReady
                            ? 'ready'
                            : 'idle';

                          return (
                            <div
                              key={matchIdx}
                              className="relative"
                              style={{ width: '280px', flexShrink: 0 }}
                            >
                              <MatchCard
                                matchNumber={matchNumber}
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
                                phase="ko"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {!isLastRound && nextRound && (
                        <div
                          className="relative mt-4 mb-4"
                          style={{ height: '60px' }}
                        >
                          <svg
                            className="absolute inset-0 w-full h-full pointer-events-none"
                            style={{ overflow: 'visible' }}
                          >
                            {round.matches.map((_: any, matchIdx: number) => {
                              const currentMatchCount = round.matches.length;
                              const nextMatchCount = nextRound.matches.length;

                              const matchRelativePos = (matchIdx + 0.5) / currentMatchCount;
                              const currentXPercent = 15 + matchRelativePos * 70;

                              let nextMatchIndices: number[] = [];
                              if (currentMatchCount === 4 && nextMatchCount === 2) {
                                nextMatchIndices = [Math.floor(matchIdx / 2)];
                              } else if (currentMatchCount === 2 && nextMatchCount === 1) {
                                nextMatchIndices = [0];
                              } else {
                                nextMatchIndices = [
                                  Math.floor((matchIdx / currentMatchCount) * nextMatchCount),
                                ];
                              }

                              return nextMatchIndices.map((nextIdx) => {
                                const nextMatchRelativePos = (nextIdx + 0.5) / nextMatchCount;
                                const nextXPercent = 15 + nextMatchRelativePos * 70;

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
          </div>
        </div>
      </LayoutGroup>
  );

  if (!koBracket) {
    return null;
  }

  const phaseViews: PhaseViewElement[] = [
    {
      type: 'view',
      component: KOBracketView,
      className: 'mt-8 pt-8 border-t-2 border-gray-200',
    },
  ];

  return (
    <div id="phase-ko">
      <PhaseViewRenderer
        elements={phaseViews}
        tournamentState={tournamentState}
        phaseProps={{
          teams,
          koBracket,
          matchResults,
          nextMatchKey,
          onNextMatch: handleNextMatch,
        }}
      />
    </div>
  );
}

// Phase configuration
export const koPhaseConfig: PhaseConfig = {
  id: 'ko',
  title: 'Knockout',
  description: 'Knockout-Bracket wird gespielt',
  backgroundColor: 'bg-orange-50',
  nextPhase: 'summary',
  requiresTeams: true,
  requiresMatches: true,
};

