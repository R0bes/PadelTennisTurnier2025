import type { Team, Player } from '@tournament-app/shared-types';
import { getDummyAvatarUrl } from '@tournament-app/shared-utils';
import PlayerGhostCard from './PlayerGhostCard';

interface TeamGhostCardProps {
  team: Team;
  size?: 'default' | 'compact';
  players?: Player[];
  playerLayout?: 'vertical' | 'horizontal';
}

export default function TeamGhostCard({
  team,
  size = 'default',
  players = [],
  playerLayout = 'vertical',
}: TeamGhostCardProps) {
  const isCompact = size === 'compact';
  const isHorizontalPlayers = playerLayout === 'horizontal';

  return (
    <div className="relative">
      {/* NO layoutId - this is a ghost, should not animate */}
      <div
        className={`bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 transition-all ${
          isCompact ? 'p-3' : 'p-4'
        }`}
      >
        <h3 className={`font-semibold text-slate-400 text-center ${isCompact ? 'text-base mb-2' : 'text-lg mb-3'}`}>
          {team.name}
        </h3>
        {players.length > 0 ? (
          <div className={isHorizontalPlayers ? 'flex gap-2 justify-center' : 'space-y-2'}>
            {players.slice(0, 2).map((player) => {
              const isDummy = player.name === 'Dummy Player';
              if (isDummy) {
                const dummyAvatarUrl = getDummyAvatarUrl(player.id);
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 p-2 bg-gray-100 border border-dashed border-gray-300 rounded-md opacity-50"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <img
                        src={dummyAvatarUrl}
                        alt="Dummy Player"
                        className="w-full h-full object-cover opacity-60"
                        loading="lazy"
                      />
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
                  layout={isHorizontalPlayers ? 'horizontal' : 'vertical'}
                />
              );
            })}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, index) => {
              // Generate a deterministic ID for placeholder dummy
              const placeholderId = `dummy-placeholder-${team.id}-${index}`;
              const dummyAvatarUrl = getDummyAvatarUrl(placeholderId);
              return (
                <div
                  key={`empty-${index}`}
                  className="flex items-center gap-2 p-2 bg-gray-100 border border-dashed border-gray-300 rounded-md opacity-50"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <img
                      src={dummyAvatarUrl}
                      alt="Dummy Player"
                      className="w-full h-full object-cover opacity-60"
                      loading="lazy"
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-500 italic">
                    Dummy Player
                  </span>
                </div>
              );
            })}
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

