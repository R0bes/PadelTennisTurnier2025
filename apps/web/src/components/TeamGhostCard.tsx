import type { Team, Player } from '@tournament-app/shared-types';
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
        className={`bg-retro-beige-200/40 rounded-lg border-2 border-dashed border-retro-brown-400/50 transition-all ${
          isCompact ? 'p-3' : 'p-4'
        }`}
      >
        <h3 className={`font-retro font-semibold text-retro-brown-600/60 text-center uppercase tracking-wide ${isCompact ? 'text-base mb-2' : 'text-lg mb-3'}`}>
          {team.name}
        </h3>
        {players.length > 0 ? (
          <div className={`${isHorizontalPlayers ? 'flex gap-2' : 'flex flex-col gap-2'} ${isHorizontalPlayers ? 'items-stretch' : 'items-stretch'} min-h-0`}>
            {players.slice(0, 2).map((player) => {
              return (
                <div key={player.id} className={isHorizontalPlayers ? 'flex-1 min-w-0' : 'w-full'}>
                  <PlayerGhostCard
                    player={player}
                    size="default"
                    layout={isHorizontalPlayers ? 'horizontal' : 'vertical'}
                  />
                </div>
              );
            })}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, index) => {
              // Generate a placeholder dummy player object
              const placeholderId = `dummy-placeholder-${team.id}-${index}`;
              const placeholderPlayer: Player = {
                id: placeholderId,
                name: 'Dummy Player',
                teamId: team.id,
              };
              return (
                <div key={`empty-${index}`} className={isHorizontalPlayers ? 'flex-1 min-w-0' : 'w-full'}>
                  <PlayerGhostCard
                    player={placeholderPlayer}
                    size="default"
                    layout={isHorizontalPlayers ? 'horizontal' : 'vertical'}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-retro-brown-300/50 flex items-center justify-center flex-shrink-0 border border-retro-brown-400/50">
              <span className="text-retro-brown-600/60 font-retro font-bold text-xs">T</span>
            </div>
            <span className={`text-retro-brown-600/60 font-retro font-semibold truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
              {team.name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

