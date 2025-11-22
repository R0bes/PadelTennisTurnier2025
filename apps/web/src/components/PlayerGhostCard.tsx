import type { Player } from '@tournament-app/shared-types';
import { getPlayerCardStyles } from './playerCardStyles';
import { getDummyAvatarUrl, isDummyPlayer } from '@tournament-app/shared-utils';

interface PlayerGhostCardProps {
  player: Player;
  size?: 'default' | 'compact';
  layout?: 'vertical' | 'horizontal';
  showInitials?: boolean;
}

// Generate DiceBear avatar URL based on player ID (deterministic)
const getAvatarUrl = (player: Player): string => {
  // Use custom avatar URL if provided, otherwise generate from player ID
  if (player.avatarUrl) {
    return player.avatarUrl;
  }
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.id)}`;
};

// Helper function to get initials from a name (first 2 letters)
const getInitials = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.length >= 2) {
    return `${trimmed[0].toUpperCase()}${trimmed[1].toUpperCase()}`;
  }
  return trimmed[0]?.toUpperCase() || '';
};

export default function PlayerGhostCard({
  player,
  size = 'default',
  layout = 'vertical',
  showInitials = false,
}: PlayerGhostCardProps) {
  const isCompact = size === 'compact';
  const isHorizontal = layout === 'horizontal';
  const isDummy = isDummyPlayer(player);
  const avatarUrl = isDummy ? getDummyAvatarUrl(player.id) : getAvatarUrl(player);
  const styles = getPlayerCardStyles(isCompact, isHorizontal);
  const displayName = showInitials ? getInitials(player.name) : player.name;

  return (
    <div className="relative">
      <div
        className={`bg-retro-beige-200/40 rounded-lg border-2 border-dashed border-retro-brown-400/50 transition-all ${styles.padding} ${
          isHorizontal 
            ? `flex flex-row items-center ${styles.gap} h-[56px]` 
            : 'flex flex-col items-center justify-center text-center h-[90px]'
        }`}
      >
        <div
          className={`rounded-full overflow-hidden bg-retro-brown-300/50 flex items-center justify-center shadow-sm flex-shrink-0 border border-retro-brown-400/50 ${styles.avatarSize} ${styles.avatarMargin || ''}`}
        >
          <img
            src={avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover opacity-35"
            loading="lazy"
            style={{ filter: 'sepia(40%) grayscale(50%)' }}
          />
        </div>
        <span
          className={`text-retro-brown-600/60 font-retro font-semibold truncate ${
            isHorizontal ? 'flex-1 text-left' : 'w-full'
          } ${styles.textSize}`}
        >
          {displayName}
        </span>
      </div>
    </div>
  );
}

