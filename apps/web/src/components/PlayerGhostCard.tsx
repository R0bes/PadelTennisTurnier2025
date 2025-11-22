import type { Player } from '@tournament-app/shared-types';

interface PlayerGhostCardProps {
  player: Player;
  size?: 'default' | 'compact';
}

// Generate DiceBear avatar URL based on player ID (deterministic)
const getAvatarUrl = (playerId: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
};

export default function PlayerGhostCard({
  player,
  size = 'default',
}: PlayerGhostCardProps) {
  const isCompact = size === 'compact';
  const avatarUrl = getAvatarUrl(player.id);

  return (
    <div className="relative">
      <div
        className={`bg-slate-50/60 rounded-lg border-2 border-dashed border-slate-300 transition-all ${
          isCompact ? 'p-2' : 'p-3'
        } h-full flex flex-col items-center justify-center text-center`}
      >
        <div
          className={`rounded-full overflow-hidden bg-slate-200 flex items-center justify-center ${
            isCompact ? 'w-8 h-8 mb-1' : 'w-12 h-12 mb-2'
          }`}
        >
          <img
            src={avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover opacity-50"
            loading="lazy"
          />
        </div>
        <span
          className={`text-slate-400 font-semibold truncate w-full ${
            isCompact ? 'text-xs' : 'text-sm'
          }`}
        >
          {player.name}
        </span>
      </div>
    </div>
  );
}

