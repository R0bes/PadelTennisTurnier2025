import { useMemo } from 'react';
import { Trophy, GitBranch, Zap } from 'lucide-react';
import type { Phase, TournamentState, Team } from '@tournament-app/shared-types';

interface TournamentFlowPageProps {
  tournamentState: TournamentState;
  isAdmin: boolean;
}

const phases: Phase[] = [
  'registration',
  'team_setup',
  'swiss_rounds',
  'ko_bracket',
  'summary',
];

// Generate round-robin pairings for teams
function generateTeamPairings(teams: Team[]): Array<[Team, Team]> {
  const pairs: Array<[Team, Team]> = [];
  const shuffled = [...teams].sort(() => Math.random() - 0.5);
  
  // If odd number of teams, one team gets a bye
  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) {
      pairs.push([shuffled[i], shuffled[i + 1]]);
    }
  }
  
  return pairs;
}

// Generate KO bracket structure (Quarterfinals → Semifinals → Final only)
function generateKOBracket(teams: Team[]) {
  const numTeams = teams.length;
  if (numTeams < 2) return null;
  
  // Only support brackets with 4, 8 teams (Quarterfinals start)
  // If more teams, take top 8; if less, fill with byes
  let bracketSize = 8;
  if (numTeams < 4) {
    bracketSize = 4;
  }
  
  // Seed teams (top teams, fill with byes if needed)
  const seededTeams = [...teams].slice(0, bracketSize);
  while (seededTeams.length < bracketSize) {
    seededTeams.push(null); // Bye
  }
  
  // Build bracket rounds: Quarterfinals → Semifinals → Final
  // Initially all matches are empty (null teams), will be filled round by round
  const rounds: Array<{ round: string; matches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null; filled?: boolean }> }> = [];
  
  // Quarterfinals (4 matches, initially empty)
  const quarterfinalMatches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null; filled?: boolean }> = [];
  for (let i = 0; i < 4; i++) {
    quarterfinalMatches.push({ team1: null, team2: null, filled: false });
  }
  rounds.push({ round: 'Quarterfinals', matches: quarterfinalMatches });
  
  // Semifinals (2 matches, initially empty)
  const semifinalMatches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null; filled?: boolean }> = [];
  for (let i = 0; i < 2; i++) {
    semifinalMatches.push({ team1: null, team2: null, filled: false });
  }
  rounds.push({ round: 'Semifinals', matches: semifinalMatches });
  
  // Final (1 match, initially empty)
  rounds.push({ round: 'Final', matches: [{ team1: null, team2: null, filled: false }] });
  
  return rounds;
}

export default function TournamentFlowPage({
  tournamentState,
  isAdmin,
}: TournamentFlowPageProps) {
  const teams = tournamentState.teams || [];
  const currentPhaseIndex = phases.indexOf(tournamentState.phase);

  // Generate Swiss rounds automatically (always 3 rounds)
  // Matches start empty and will be filled round by round
  const swissMatches = useMemo(() => {
    if (teams.length < 2) return {};
    
    const allRounds: Record<number, Array<{ team1: Team | null; team2: Team | null; score?: string; filled?: boolean }>> = {};
    // Generate exactly 3 rounds for Swiss system
    // Initially all matches are empty (null teams)
    const numMatches = Math.ceil(teams.length / 2);
    for (let round = 1; round <= 3; round++) {
      allRounds[round] = Array.from({ length: numMatches }, () => ({
        team1: null,
        team2: null,
        filled: false,
      }));
    }
    return allRounds;
  }, [teams]);

  // KO Bracket
  const koBracket = useMemo(() => generateKOBracket(teams), [teams]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="w-8 h-8" />
          Tournament Flow
        </h1>
        <p className="mt-2 text-gray-600">
          View the tournament progression through different phases. Current
          phase: <strong>{tournamentState.phase.replace('_', ' ')}</strong>
        </p>
      </div>

      {/* Phase Timeline */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Tournament Phases
        </h2>
        <div className="flex items-center justify-between">
          {phases.map((phase, index) => (
            <div key={phase} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold ${
                    index <= currentPhaseIndex
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="mt-2 text-xs text-gray-600 text-center capitalize">
                  {phase.replace('_', ' ')}
                </span>
              </div>
              {index < phases.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    index < currentPhaseIndex ? 'bg-blue-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tournament Matches - Swiss Rounds & KO Bracket */}
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
                        const isFilled = match.filled && match.team1 && match.team2;
                        return (
                          <div
                            key={idx}
                            className={`rounded-md p-2 border-2 transition-all shadow-sm relative flex-1 ${
                              isFilled
                                ? 'bg-white border-gray-200 hover:border-green-400 hover:shadow-md'
                                : 'bg-gray-50 border-dashed border-gray-300'
                            }`}
                          >
                            <div className={`absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full flex items-center justify-center text-xs font-bold shadow-md whitespace-nowrap ${
                              isFilled
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-400 text-white'
                            }`}>
                              {roundNum}-{idx + 1}
                            </div>
                            <div className="space-y-1.5">
                              {/* Team 1 Card */}
                              <div className={`rounded p-1.5 border transition-all ${
                                isFilled
                                  ? 'bg-gradient-to-r from-green-50 to-white border-green-200'
                                  : 'bg-gray-100 border-dashed border-gray-300'
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isFilled
                                      ? 'bg-green-500'
                                      : 'bg-gray-300'
                                  }`}>
                                    <span className="text-white font-bold text-xs">1</span>
                                  </div>
                                  <span className={`text-xs font-semibold truncate ${
                                    isFilled
                                      ? 'text-gray-900'
                                      : 'text-gray-400 italic'
                                  }`}>
                                    {match.team1?.name || '—'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* VS */}
                              <div className="text-center py-0.5">
                                <span className={`text-xs font-bold ${
                                  isFilled ? 'text-gray-400' : 'text-gray-300'
                                }`}>
                                  vs
                                </span>
                              </div>
                              
                              {/* Team 2 Card */}
                              <div className={`rounded p-1.5 border transition-all ${
                                isFilled
                                  ? 'bg-gradient-to-r from-blue-50 to-white border-blue-200'
                                  : 'bg-gray-100 border-dashed border-gray-300'
                              }`}>
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                    isFilled
                                      ? 'bg-blue-500'
                                      : 'bg-gray-300'
                                  }`}>
                                    <span className="text-white font-bold text-xs">2</span>
                                  </div>
                                  <span className={`text-xs font-semibold truncate ${
                                    isFilled
                                      ? 'text-gray-900'
                                      : 'text-gray-400 italic'
                                  }`}>
                                    {match.team2?.name || '—'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Score */}
                              {match.score && (
                                <div className="pt-1 border-t border-gray-200">
                                  <div className="text-center">
                                    <span className="text-sm font-bold text-green-600">
                                      {match.score}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* KO Bracket - Horizontal Rounds Layout */}
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
                    {/* Round Title */}
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">
                      {round.round}
                    </h4>
                    
                    {/* Matches in horizontal row */}
                    <div className="flex gap-2 relative justify-center">
                      {round.matches.map((match, matchIdx) => {
                        const isFilled = match.team1 && match.team2;
                        const matchNumber = `${roundShort}-${matchIdx + 1}`;
                        
                        return (
                          <div key={matchIdx} className="relative" style={{ width: '240px', flexShrink: 0 }}>
                            {/* Match Card */}
                            <div
                              className={`rounded-md p-2 border-2 shadow-sm transition-all relative ${
                                isFilled
                                  ? 'bg-white border-blue-200 hover:border-blue-400 hover:shadow-md'
                                  : 'bg-gray-50 border-dashed border-gray-300'
                              }`}
                            >
                              <div className={`absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full flex items-center justify-center text-xs font-bold shadow-md whitespace-nowrap ${
                                isFilled
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-400 text-white'
                              }`}>
                                {matchNumber}
                              </div>
                              <div className="space-y-1.5">
                                {/* Team 1 Card */}
                                <div
                                  className={`rounded p-1.5 border transition-all ${
                                    match.winner === match.team1
                                      ? 'bg-green-50 border-green-300'
                                      : isFilled && match.team1
                                      ? 'bg-gradient-to-r from-purple-50 to-white border-purple-200'
                                      : 'bg-gray-100 border-dashed border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      match.winner === match.team1
                                        ? 'bg-green-500'
                                        : isFilled && match.team1
                                        ? 'bg-purple-500'
                                        : 'bg-gray-300'
                                    }`}>
                                      <span className="font-bold text-xs text-white">
                                        1
                                      </span>
                                    </div>
                                    <span className={`text-xs font-semibold truncate ${
                                      match.team1
                                        ? match.winner === match.team1
                                          ? 'text-gray-900'
                                          : 'text-gray-900'
                                        : 'text-gray-400 italic'
                                    }`}>
                                      {match.team1?.name || '—'}
                                    </span>
                                  </div>
                                </div>
                                
                                {/* VS */}
                                <div className="text-center py-0.5">
                                  <span className={`text-xs font-bold ${
                                    isFilled ? 'text-gray-400' : 'text-gray-300'
                                  }`}>
                                    vs
                                  </span>
                                </div>
                                
                                {/* Team 2 Card */}
                                <div
                                  className={`rounded p-1.5 border transition-all ${
                                    match.winner === match.team2
                                      ? 'bg-green-50 border-green-300'
                                      : isFilled && match.team2
                                      ? 'bg-gradient-to-r from-purple-50 to-white border-purple-200'
                                      : 'bg-gray-100 border-dashed border-gray-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                      match.winner === match.team2
                                        ? 'bg-green-500'
                                        : isFilled && match.team2
                                        ? 'bg-purple-500'
                                        : 'bg-gray-300'
                                    }`}>
                                      <span className="font-bold text-xs text-white">
                                        2
                                      </span>
                                    </div>
                                    <span className={`text-xs font-semibold truncate ${
                                      match.team2
                                        ? match.winner === match.team2
                                          ? 'text-gray-900'
                                          : 'text-gray-900'
                                        : 'text-gray-400 italic'
                                    }`}>
                                      {match.team2?.name || '—'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Connection lines between rounds */}
                    {!isLastRound && nextRound && (
                      <div className="relative mt-4 mb-4" style={{ height: '60px' }}>
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
                          {round.matches.map((_, matchIdx) => {
                            const currentMatchCount = round.matches.length;
                            const nextMatchCount = nextRound.matches.length;
                            
                            // Calculate positions: matches are evenly spaced and centered
                            // For 4 matches: positions at ~12.5%, 37.5%, 62.5%, 87.5% (relative to content area)
                            // For 2 matches: positions at ~25%, 75%
                            // For 1 match: position at 50%
                            // Since content is centered, we need to map these to actual percentages
                            const matchRelativePos = (matchIdx + 0.5) / currentMatchCount; // 0 to 1
                            
                            // Map to percentage, accounting for centering
                            // Use a wider range to account for centering (e.g., 15% to 85% of container)
                            const currentXPercent = 15 + (matchRelativePos * 70);
                            
                            // Determine which next round match this connects to
                            let nextMatchIndices: number[] = [];
                            if (currentMatchCount === 4 && nextMatchCount === 2) {
                              // QF: matches 0,1 -> SF match 0; matches 2,3 -> SF match 1
                              nextMatchIndices = [Math.floor(matchIdx / 2)];
                            } else if (currentMatchCount === 2 && nextMatchCount === 1) {
                              // SF: both matches -> Final match 0
                              nextMatchIndices = [0];
                            } else {
                              nextMatchIndices = [Math.floor((matchIdx / currentMatchCount) * nextMatchCount)];
                            }
                            
                            return nextMatchIndices.map((nextIdx) => {
                              const nextMatchRelativePos = (nextIdx + 0.5) / nextMatchCount;
                              const nextXPercent = 15 + (nextMatchRelativePos * 70);
                              
                              return (
                                <g key={`${matchIdx}-${nextIdx}`}>
                                  {/* Vertical line down from current match center */}
                                  <line
                                    x1={`${currentXPercent}%`}
                                    y1="0%"
                                    x2={`${currentXPercent}%`}
                                    y2="40%"
                                    stroke="#9ca3af"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                  />
                                  {/* Horizontal line connecting to next match */}
                                  <line
                                    x1={`${currentXPercent}%`}
                                    y1="40%"
                                    x2={`${nextXPercent}%`}
                                    y2="40%"
                                    stroke="#9ca3af"
                                    strokeWidth="2"
                                    strokeDasharray="4 4"
                                  />
                                  {/* Vertical line down to next match */}
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
  );
}
