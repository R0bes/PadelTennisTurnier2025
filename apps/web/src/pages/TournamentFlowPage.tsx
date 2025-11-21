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
  const rounds: Array<{ round: string; matches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null }> }> = [];
  let currentRound = seededTeams;
  
  // Quarterfinals (8 teams → 4 winners)
  if (currentRound.length === 8) {
    const matches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null }> = [];
    const semifinalists: (Team | null)[] = [];
    
    for (let i = 0; i < currentRound.length; i += 2) {
      const team1 = currentRound[i];
      const team2 = currentRound[i + 1];
      matches.push({ team1, team2 });
      // Winner advances (placeholder)
      semifinalists.push(team1 || team2);
    }
    
    rounds.push({ round: 'Quarterfinals', matches });
    currentRound = semifinalists;
  }
  
  // Semifinals (4 teams → 2 winners)
  if (currentRound.length === 4) {
    const matches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null }> = [];
    const finalists: (Team | null)[] = [];
    
    for (let i = 0; i < currentRound.length; i += 2) {
      const team1 = currentRound[i];
      const team2 = currentRound[i + 1];
      matches.push({ team1, team2 });
      // Winner advances (placeholder)
      finalists.push(team1 || team2);
    }
    
    rounds.push({ round: 'Semifinals', matches });
    currentRound = finalists;
  }
  
  // Final (2 teams → 1 winner)
  if (currentRound.length === 2) {
    const matches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null }> = [
      { team1: currentRound[0], team2: currentRound[1] }
    ];
    rounds.push({ round: 'Final', matches });
  }
  
  return rounds;
}

export default function TournamentFlowPage({
  tournamentState,
  isAdmin,
}: TournamentFlowPageProps) {
  const teams = tournamentState.teams || [];
  const currentPhaseIndex = phases.indexOf(tournamentState.phase);

  // Generate Swiss rounds automatically (always 3 rounds)
  const swissMatches = useMemo(() => {
    if (teams.length < 2) return {};
    
    const allRounds: Record<number, Array<{ team1: Team; team2: Team; score?: string }>> = {};
    // Generate exactly 3 rounds for Swiss system
    for (let round = 1; round <= 3; round++) {
      const pairs = generateTeamPairings(teams);
      allRounds[round] = pairs.map(([team1, team2]) => ({ team1, team2 }));
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
            <div className="space-y-6">
              {Object.entries(swissMatches)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([roundNum, matches]) => (
                  <div key={roundNum} className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border border-green-200">
                    <h4 className="text-md font-semibold text-gray-700 mb-3">
                      Round {roundNum}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {matches.map((match, idx) => (
                        <div
                          key={idx}
                          className="bg-white rounded-xl p-6 border-2 border-gray-300 hover:border-green-500 hover:shadow-xl transition-all shadow-lg"
                        >
                          <div className="space-y-4">
                            {/* Team 1 Card */}
                            <div className="bg-gradient-to-br from-green-50 to-white rounded-lg p-4 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                  <span className="text-white font-bold text-sm">1</span>
                                </div>
                                <div className="flex-1">
                                  <span className="text-base font-bold text-gray-900">
                                    {match.team1.name}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* VS Divider */}
                            <div className="flex items-center justify-center py-2">
                              <div className="flex-1 border-t-2 border-gray-300"></div>
                              <span className="px-4 text-sm font-bold text-gray-500 uppercase tracking-widest">vs</span>
                              <div className="flex-1 border-t-2 border-gray-300"></div>
                            </div>
                            
                            {/* Team 2 Card */}
                            <div className="bg-gradient-to-br from-blue-50 to-white rounded-lg p-4 border-2 border-blue-200 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
                                  <span className="text-white font-bold text-sm">2</span>
                                </div>
                                <div className="flex-1">
                                  <span className="text-base font-bold text-gray-900">
                                    {match.team2.name}
                                  </span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Score */}
                            {match.score && (
                              <div className="pt-3 border-t-2 border-gray-300">
                                <div className="text-center">
                                  <span className="text-2xl font-bold text-green-600">
                                    {match.score}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
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
              {koBracket.map((round, roundIdx) => (
                <div key={roundIdx}>
                  <h4 className="text-md font-semibold text-gray-700 mb-3">
                    {round.round}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {round.matches.map((match, matchIdx) => (
                      <div
                        key={matchIdx}
                        className="bg-white rounded-xl p-6 border-2 border-blue-300 shadow-lg hover:border-blue-500 hover:shadow-xl transition-all"
                      >
                        <div className="space-y-4">
                          {/* Team 1 Card */}
                          <div
                            className={`rounded-lg p-4 border-2 shadow-md transition-all ${
                              match.winner === match.team1
                                ? 'bg-gradient-to-br from-green-100 to-green-50 border-green-400 shadow-green-200'
                                : match.team1
                                ? 'bg-gradient-to-br from-purple-50 to-white border-purple-200 hover:shadow-lg'
                                : 'bg-gray-100 border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                                match.winner === match.team1
                                  ? 'bg-green-500'
                                  : match.team1
                                  ? 'bg-purple-500'
                                  : 'bg-gray-400'
                              }`}>
                                <span className={`font-bold text-sm ${
                                  match.winner === match.team1 || match.team1
                                    ? 'text-white'
                                    : 'text-gray-600'
                                }`}>
                                  1
                                </span>
                              </div>
                              <div className="flex-1">
                                <span className={`text-base font-bold ${
                                  match.team1 ? 'text-gray-900' : 'text-gray-500 italic'
                                }`}>
                                  {match.team1?.name || 'Bye'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* VS Divider */}
                          <div className="flex items-center justify-center py-2">
                            <div className="flex-1 border-t-2 border-gray-300"></div>
                            <span className="px-4 text-sm font-bold text-gray-500 uppercase tracking-widest">vs</span>
                            <div className="flex-1 border-t-2 border-gray-300"></div>
                          </div>
                          
                          {/* Team 2 Card */}
                          <div
                            className={`rounded-lg p-4 border-2 shadow-md transition-all ${
                              match.winner === match.team2
                                ? 'bg-gradient-to-br from-green-100 to-green-50 border-green-400 shadow-green-200'
                                : match.team2
                                ? 'bg-gradient-to-br from-purple-50 to-white border-purple-200 hover:shadow-lg'
                                : 'bg-gray-100 border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${
                                match.winner === match.team2
                                  ? 'bg-green-500'
                                  : match.team2
                                  ? 'bg-purple-500'
                                  : 'bg-gray-400'
                              }`}>
                                <span className={`font-bold text-sm ${
                                  match.winner === match.team2 || match.team2
                                    ? 'text-white'
                                    : 'text-gray-600'
                                }`}>
                                  2
                                </span>
                              </div>
                              <div className="flex-1">
                                <span className={`text-base font-bold ${
                                  match.team2 ? 'text-gray-900' : 'text-gray-500 italic'
                                }`}>
                                  {match.team2?.name || 'Bye'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
