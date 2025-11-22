import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import type { Player } from '@tournament-app/shared-types';

interface PlayerCardProps {
  player: Player;
  isAdmin?: boolean;
  onDelete?: (playerId: string, playerName: string) => void;
  isDeleting?: boolean;
  size?: 'default' | 'compact';
}

// Generate DiceBear avatar URL based on player ID (deterministic)
const getAvatarUrl = (playerId: string): string => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(playerId)}`;
};

export default function PlayerCard({
  player,
  isAdmin = false,
  onDelete,
  isDeleting = false,
  size = 'default',
}: PlayerCardProps) {
  const isCompact = size === 'compact';
  const avatarUrl = getAvatarUrl(player.id);

  return (
      <motion.div
        layout
        layoutId={`player-${player.id}`}
        transition={{ type: 'spring', stiffness: 30, damping: 25, mass: 2.5 }}
        className={`relative ${isCompact ? 'group' : ''}`}
      >
      <div
        className={`bg-gradient-to-br from-blue-50 to-white rounded-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all ${
          isCompact ? 'p-2' : 'p-3'
        } h-full flex flex-col items-center justify-center text-center`}
      >
        <div
          className={`rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm ${
            isCompact ? 'w-8 h-8 mb-1' : 'w-12 h-12 mb-2'
          }`}
        >
          <img
            src={avatarUrl}
            alt={player.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <span
          className={`text-gray-800 font-semibold truncate w-full ${
            isCompact ? 'text-xs' : 'text-sm'
          }`}
        >
          {player.name}
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

