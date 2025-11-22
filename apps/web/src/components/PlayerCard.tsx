import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type { Player } from '@tournament-app/shared-types';
import { getPlayerCardStyles } from './playerCardStyles';
import { getDummyAvatarUrl } from '@tournament-app/shared-utils';

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
  const isDummy = player.name === 'Dummy Player';
  const avatarUrl = isDummy ? getDummyAvatarUrl(player.id) : getAvatarUrl(player);
  const styles = getPlayerCardStyles(isCompact, isHorizontal);
  const displayName = showInitials ? getInitials(player.name) : player.name;

  return (
      <motion.div
        layout
        layoutId={`player-${player.id}`}
        transition={{ type: 'spring', stiffness: 20, damping: 15, mass: 2 }}
        className={`relative ${isCompact ? 'group' : ''}`}
      >
      <div
        className={`bg-gradient-to-br from-blue-50 to-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all ${styles.padding} h-full ${
          isHorizontal 
            ? `flex flex-row items-center ${styles.gap}` 
            : 'flex flex-col items-center justify-center text-center'
        }`}
      >
        <div
          className={`rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0 ${styles.avatarSize} ${styles.avatarMargin || ''}`}
        >
          <img
            src={avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <span
          className={`text-gray-800 font-semibold truncate ${
            isHorizontal ? 'flex-1 text-left' : 'w-full'
          } ${styles.textSize}`}
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

