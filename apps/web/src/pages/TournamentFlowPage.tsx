import { useState } from 'react';
import { Trophy, Users, GitBranch, Zap } from 'lucide-react';
import { simpleSwissPairing } from '@tournament-app/shared-utils';
import type { Phase, TournamentState } from '@tournament-app/shared-types';

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

const swissRounds = [
  {
    round: 1,
    matches: [
      { id: 'm1', player1: 'Alice Johnson', player2: 'Bob Smith', score: '2-1' },
      { id: 'm2', player1: 'Charlie Brown', player2: 'Diana Prince', score: '1-2' },
      { id: 'm3', player1: 'Eve Wilson', player2: 'Frank Miller', score: '2-0' },
    ],
  },
  {
    round: 2,
    matches: [
      { id: 'm4', player1: 'Alice Johnson', player2: 'Diana Prince', score: '2-1' },
      { id: 'm5', player1: 'Bob Smith', player2: 'Eve Wilson', score: '0-2' },
      { id: 'm6', player1: 'Charlie Brown', player2: 'Frank Miller', score: '1-2' },
    ],
  },
  {
    round: 3,
    matches: [
      { id: 'm7', player1: 'Alice Johnson', player2: 'Eve Wilson', score: '2-0' },
      { id: 'm8', player1: 'Diana Prince', player2: 'Frank Miller', score: '1-2' },
      { id: 'm9', player1: 'Bob Smith', player2: 'Charlie Brown', score: '2-1' },
    ],
  },
];

export default function TournamentFlowPage({
  tournamentState,
  isAdmin,
}: TournamentFlowPageProps) {
  const [pairings, setPairings] = useState<Array<[typeof tournamentState.players[0], typeof tournamentState.players[0]]>>([]);

  const generatePairings = () => {
    if (tournamentState.players.length >= 2) {
      const pairs = simpleSwissPairing(tournamentState.players);
      setPairings(pairs);
    }
  };

  const currentPhaseIndex = phases.indexOf(tournamentState.phase);
  const isSwissPhase = tournamentState.phase === 'swiss_rounds';
  const isKoPhase = tournamentState.phase === 'ko_bracket';

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

      {/* Swiss Rounds */}
      {isSwissPhase && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Swiss Rounds
            </h2>
            {tournamentState.players.length >= 2 && (
              <button
                onClick={generatePairings}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-all font-medium text-sm shadow-sm hover:shadow"
              >
                <Zap className="w-4 h-4" />
                Generate Pairings
              </button>
            )}
          </div>

          {pairings.length > 0 && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">
                Generated Pairings (using shared-utils):
              </h3>
              <ul className="space-y-1">
                {pairings.map(([p1, p2], idx) => (
                  <li key={idx} className="text-sm text-green-700">
                    {p1.name} vs {p2.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tournamentState.players.length < 2 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-yellow-800 text-sm">
                Need at least 2 players to generate pairings.
              </p>
            </div>
          )}

          <div className="space-y-6">
            {swissRounds.map((round) => (
              <div key={round.round}>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">
                  Round {round.round}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {round.matches.map((match) => (
                    <div
                      key={match.id}
                      className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-800">
                            {match.player1}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">vs</div>
                          <div className="text-sm font-medium text-gray-800">
                            {match.player2}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-blue-600 ml-4">
                          {match.score}
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

      {/* KO Bracket */}
      {isKoPhase && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Knockout Bracket
          </h2>
          <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-300 text-center">
            <p className="text-gray-500">
              KO Bracket visualization will be implemented here
            </p>
            <div className="mt-4 text-sm text-gray-400">
              (Quarterfinals → Semifinals → Final)
            </div>
          </div>
        </div>
      )}

      {!isSwissPhase && !isKoPhase && (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">
            Tournament flow content will appear when the tournament reaches the
            Swiss rounds or KO bracket phase.
          </p>
        </div>
      )}

      {/* Players List - Always visible in Public View */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Registered Players ({tournamentState.players.length})
        </h2>
        {tournamentState.players.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No players registered yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tournamentState.players.map((player) => (
              <div
                key={player.id}
                className="bg-gradient-to-br from-gray-50 to-white p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-sm">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-gray-800 font-medium">{player.name}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
