import type { Team, Player } from '@tournament-app/shared-types';
import PlayerGhostCard from './PlayerGhostCard';

interface TeamGhostCardProps {
  team: Team;
  size?: 'default' | 'compact';
  players?: Player[];
}

export default function TeamGhostCard({
  team,
  size = 'default',
  players = [],
}: TeamGhostCardProps) {
  const isCompact = size === 'compact';

  return (
    <div className="relative">
      {/* NO layoutId - this is a ghost, should not animate */}
      <div
        className={`bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 transition-all ${
          isCompact ? 'p-3' : 'p-4'
        }`}
      >
        <h3 className={`font-semibold text-slate-400 ${isCompact ? 'text-base mb-2' : 'text-lg mb-3'}`}>
          {team.name}
        </h3>
        {players.length > 0 ? (
          <div className="space-y-2">
            {players.slice(0, 2).map((player) => {
              const isDummy = player.name === 'DummyPlayer';
              if (isDummy) {
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 bg-gray-100 border border-dashed border-gray-300 rounded-md opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-500 font-semibold text-xs">
                        ?
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-500 italic">
                      {player.name}
                    </span>
                  </div>
                );
              }
              return (
                <PlayerGhostCard
                  key={player.id}
                  player={player}
                  size="compact"
                />
              );
            })}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="flex items-center gap-2 p-2 bg-gray-100 border border-dashed border-gray-300 rounded-md opacity-50"
              >
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                  <span className="text-gray-500 font-semibold text-xs">
                    ?
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-500 italic">
                  DummyPlayer
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-400 font-bold text-xs">T</span>
            </div>
            <span className={`text-slate-400 font-semibold truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
              {team.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

