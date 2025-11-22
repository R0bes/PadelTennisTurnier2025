import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type { Player } from '@tournament-app/shared-types';
import { getPlayerCardStyles } from './playerCardStyles';
import { getDummyAvatarUrl, isDummyPlayer } from '@tournament-app/shared-utils';

interface PlayerCardProps {
  player: Player;
  isAdmin?: boolean;
  onDelete?: (playerId: string, playerName: string) => void;
  isDeleting?: boolean;
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

export default function PlayerCard({
  player,
  isAdmin = false,
  onDelete,
  isDeleting = false,
  size = 'default',
  layout = 'vertical',
  showInitials = false,
}: PlayerCardProps) {
  const isCompact = size === 'compact';
  const isHorizontal = layout === 'horizontal';
  const isDummy = isDummyPlayer(player);
  const avatarUrl = isDummy ? getDummyAvatarUrl(player.id) : getAvatarUrl(player);
  const styles = getPlayerCardStyles(isCompact, isHorizontal);
  const displayName = showInitials ? getInitials(player.name) : player.name;

  return (
      <motion.div
        layout="position"
        layoutId={`player-${player.id}`}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        className={`relative z-50 ${isCompact ? 'group' : ''} w-full`}
        style={{ willChange: 'transform' }}
      >
      <div
        className={`bg-gradient-to-br from-retro-beige-300 via-retro-beige-200 to-retro-beige-100 rounded-lg border-2 border-retro-brown-600 hover:border-retro-orange-600 hover:shadow-retro transition-all ${styles.padding} h-full ${
          isHorizontal 
            ? `flex flex-row items-center ${styles.gap} min-h-[56px]` 
            : 'flex flex-col items-center justify-center text-center min-h-[90px]'
        }`}
        style={{
          boxShadow: '0 4px 12px rgba(95, 70, 56, 0.3), inset 0 1px 0 rgba(255,255,255,0.7)',
          width: '100%',
        }}
      >
        <div
          className={`rounded-full overflow-hidden bg-gradient-to-br from-retro-orange-600 to-retro-orange-800 flex items-center justify-center shadow-retro-sm flex-shrink-0 border-2 border-retro-brown-600 ${styles.avatarSize} ${styles.avatarMargin || ''}`}
        >
          <img
            src={avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover"
            loading="lazy"
            style={{ filter: 'sepia(30%) contrast(1.2) saturate(1.1)' }}
          />
        </div>
        <span
          className={`text-retro-brown-900 font-retro font-bold ${
            isHorizontal ? 'flex-1 text-center' : 'w-full text-center'
          } ${styles.textSize}`}
          style={{ textShadow: '0 1px 3px rgba(255,255,255,0.9)' }}
        >
          {displayName}
        </span>
        {isAdmin && onDelete && !isCompact && (
          <button
            onClick={() => onDelete(player.id, player.name)}
            disabled={isDeleting}
            className="absolute top-1 right-1 p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
            title="Delete player"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

