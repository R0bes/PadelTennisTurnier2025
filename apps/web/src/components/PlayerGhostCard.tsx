import type { Player } from '@tournament-app/shared-types';
import { getPlayerCardStyles } from './playerCardStyles';

interface PlayerGhostCardProps {
  player: Player;
  size?: 'default' | 'compact';
  layout?: 'vertical' | 'horizontal';
  showInitials?: boolean;
}

// Generate DiceBear avatar URL based on player ID (deterministic)
const getAvatarUrl = (playerId: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
};

// Helper function to get initials from a name in format "X. X."
const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0].toUpperCase()}. ${parts[parts.length - 1][0].toUpperCase()}.`;
  }
  // Single name: take first two letters
  if (name.length >= 2) {
    return `${name[0].toUpperCase()}. ${name[1].toUpperCase()}.`;
  }
  return name[0].toUpperCase() + '.';
};

export default function PlayerGhostCard({
  player,
  size = 'default',
  layout = 'vertical',
  showInitials = false,
}: PlayerGhostCardProps) {
  const isCompact = size === 'compact';
  const isHorizontal = layout === 'horizontal';
  const avatarUrl = getAvatarUrl(player.id);
  const styles = getPlayerCardStyles(isCompact, isHorizontal);
  const displayName = showInitials ? getInitials(player.name) : player.name;

  return (
    <div className="relative">
      <div
        className={`bg-slate-50/60 rounded-lg border-2 border-dashed border-slate-300 transition-all ${styles.padding} h-full ${
          isHorizontal 
            ? `flex flex-row items-center ${styles.gap}` 
            : 'flex flex-col items-center justify-center text-center'
        }`}
      >
        <div
          className={`rounded-full overflow-hidden bg-slate-200 flex items-center justify-center shadow-sm flex-shrink-0 ${styles.avatarSize} ${styles.avatarMargin || ''}`}
        >
          <img
            src={avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover opacity-50"
            loading="lazy"
          />
        </div>
        <span
          className={`text-slate-400 font-semibold truncate ${
            isHorizontal ? 'flex-1 text-left' : 'w-full'
          } ${styles.textSize}`}
        >
          {displayName}
        </span>
      </div>
    </div>
  );
}

