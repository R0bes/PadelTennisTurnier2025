import type { TournamentState } from '@tournament-app/shared-types';

interface SummaryPageProps {
  tournamentState: TournamentState;
  isAdmin: boolean;
}

export default function SummaryPage({
  tournamentState,
  isAdmin,
}: SummaryPageProps) {
  // Create simple podium from top 3 players (mock-based for now)
  const topPlayers = tournamentState.players.slice(0, 3);
  const podium = topPlayers.map((player, index) => ({
    position: index + 1,
    name: player.name,
    points: 15 - index * 3, // Mock points
  }));

  // Create standings from all players
  const standings = tournamentState.players.map((player, index) => ({
    rank: index + 1,
    name: player.name,
    wins: Math.max(0, 5 - index), // Mock wins
    losses: Math.min(5, index), // Mock losses
    points: Math.max(0, 15 - index * 2), // Mock points
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tournament Summary</h1>
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

      {/* Podium */}
      {podium.length >= 3 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Podium</h2>
          <div className="flex items-end justify-center gap-4">
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
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-2 ${
                    entry.position === 1
                      ? 'bg-yellow-400'
                      : entry.position === 2
                      ? 'bg-gray-300'
                      : 'bg-orange-400'
                  }`}
                >
                  {entry.position}
                </div>
                <div
                  className={`w-32 p-4 rounded-t-lg text-center ${
                    entry.position === 1
                      ? 'bg-yellow-400 h-32'
                      : entry.position === 2
                      ? 'bg-gray-300 h-24'
                      : 'bg-orange-400 h-20'
                  }`}
                >
                  <div className="font-semibold text-gray-800">
                    {entry.name}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {entry.points} pts
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Final Standings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
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
  );
}
