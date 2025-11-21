import type { TournamentState } from '@tournament-app/shared-types';

interface TeamSetupPageProps {
  tournamentState: TournamentState;
  isAdmin: boolean;
}

export default function TeamSetupPage({
  tournamentState,
  isAdmin,
}: TeamSetupPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Setup</h1>
        <p className="mt-2 text-gray-600">
          Organize players into teams. Drag and drop functionality will be
          implemented here in the future.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800 text-sm">
          <strong>Note:</strong> Team setup will go here. Currently, tournament
          is in phase: <strong>{tournamentState.phase.replace('_', ' ')}</strong>
          .
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Registered Players ({tournamentState.players.length})
        </h2>
        {tournamentState.players.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No players registered yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tournamentState.players.map((player) => (
              <div
                key={player.id}
                className="bg-gray-50 p-3 rounded-md border border-gray-200"
              >
                <span className="text-gray-800 font-medium">{player.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
