import { useMemo } from 'react';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import type { TournamentState } from '@tournament-app/shared-types';
import type { PhaseConfig, PhaseViewElement } from './PhaseInterface';
import PhaseViewRenderer from './PhaseViewRenderer';

interface SummaryPhaseProps {
  tournamentState: TournamentState;
}

export default function SummaryPhase({
  tournamentState,
}: SummaryPhaseProps) {
  // Calculate summary data
  const podium = useMemo(() => {
    const topPlayers = tournamentState.players.slice(0, 3);
    return topPlayers.map((player, index) => ({
      position: index + 1,
      name: player.name,
      points: 15 - index * 3,
    }));
  }, [tournamentState.players]);

  const standings = useMemo(() => {
    return tournamentState.players.map((player, index) => ({
      rank: index + 1,
      name: player.name,
      wins: Math.max(0, 5 - index),
      losses: Math.min(5, index),
      points: Math.max(0, 15 - index * 2),
    }));
  }, [tournamentState.players]);
  // Summary View Component
  const SummaryView = ({ tournamentState, podium, standings }: any) => (
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
            {podium.map((entry: any) => (
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
                  <div className="font-bold text-gray-900 text-lg">{entry.name}</div>
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
                {standings.map((standing: any) => (
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
  );

  const phaseViews: PhaseViewElement[] = [
    {
      type: 'view',
      component: SummaryView,
      className: 'mt-8 pt-8 border-t-2 border-gray-200',
    },
  ];

  return (
    <div id="phase-summary">
      <PhaseViewRenderer
        elements={phaseViews}
        tournamentState={tournamentState}
        phaseProps={{ podium, standings }}
      />
    </div>
  );
}

// Phase configuration
export const summaryPhaseConfig: PhaseConfig = {
  id: 'summary',
  title: 'Summary',
  description: 'Turnier-Zusammenfassung und Ergebnisse',
  backgroundColor: 'bg-yellow-50',
  nextPhase: null,
  requiresTeams: true,
};

