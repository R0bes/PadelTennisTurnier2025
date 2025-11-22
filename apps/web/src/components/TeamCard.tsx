import { motion } from 'framer-motion';
import type { Team, Player } from '@tournament-app/shared-types';
import PlayerCard from './PlayerCard';

interface TeamCardProps {
  team: Team;
  size?: 'default' | 'compact' | 'match';
  players?: Player[];
  isWinner?: boolean;
  isLoser?: boolean;
  playerLayout?: 'vertical' | 'horizontal';
  showInitials?: boolean;
  roundNumber?: number; // For round-specific layoutId in Swiss rounds
}

export default function TeamCard({
  team,
  size = 'default',
  players = [],
  isWinner = false,
  isLoser = false,
  playerLayout = 'vertical',
  showInitials = false,
  roundNumber,
}: TeamCardProps) {
  const isCompact = size === 'compact' || size === 'match';
  const isHorizontalPlayers = playerLayout === 'horizontal';
  
  // Use consistent layoutId for smooth transitions between rounds
  // Teams should transition directly from one round to the next
  const layoutId = `team-${team.id}`;

  return (
    <motion.div
      layout
      layoutId={layoutId}
      transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
      className={`relative z-10 ${isCompact ? 'h-full' : ''}`}
    >
      <div
        className={`${
          isWinner
            ? 'bg-gradient-to-br from-green-300 via-green-200 to-green-300'
            : isLoser
            ? 'bg-gradient-to-br from-red-300 via-red-200 to-red-300'
            : players.length > 0
            ? 'bg-gradient-to-br from-retro-beige-300 via-retro-beige-200 to-retro-beige-100'
            : 'bg-retro-brown-300'
        } rounded-lg border-2 ${
          isWinner
            ? 'border-green-700 shadow-lg'
            : isLoser
            ? 'border-red-700 shadow-md'
            : players.length > 0
            ? 'border-retro-brown-600 hover:border-retro-brown-700'
            : 'border-retro-brown-500'
        } hover:shadow-retro transition-all ${
          isCompact ? 'p-2 flex flex-col' : 'p-2.5 flex flex-col'
        } ${
          players.length > 0 && !isCompact
            ? isHorizontalPlayers 
              ? 'min-h-[180px]' 
              : 'min-h-[240px]'
            : isCompact
            ? 'min-h-[120px]'
            : 'min-h-[80px]'
        }`}
        style={{
          boxShadow: isWinner
            ? '0 5px 18px rgba(34, 197, 94, 0.5), inset 0 1px 0 rgba(255,255,255,0.8)'
            : isLoser
            ? '0 5px 18px rgba(239, 68, 68, 0.5), inset 0 1px 0 rgba(255,255,255,0.8)'
            : players.length > 0 
            ? '0 4px 12px rgba(95, 70, 56, 0.3), inset 0 1px 0 rgba(255,255,255,0.8)' 
            : '0 3px 8px rgba(95, 70, 56, 0.25)',
        }}
      >
        {players.length > 0 && (
          <h3 className={`font-retro font-bold text-retro-brown-900 text-center break-words uppercase tracking-wide flex-shrink-0 ${isCompact ? 'text-xl mb-1.5' : 'text-2xl mb-2'}`} style={{ textShadow: '0 1px 3px rgba(255,255,255,0.9)' }}>
            {team.name}
          </h3>
        )}
        {players.length > 0 ? (
          <div className={`${isHorizontalPlayers ? 'flex gap-1.5' : 'flex flex-col gap-1.5'} ${isCompact ? 'flex-1' : ''} ${isHorizontalPlayers ? 'items-stretch' : 'items-stretch'} min-h-0`}>
            {players.slice(0, 2).map((player) => {
              return (
                <div key={player.id} className={isHorizontalPlayers ? 'flex-1 min-w-0' : 'w-full'}>
                  <PlayerCard
                    player={player}
                    size="default"
                    layout={isHorizontalPlayers ? 'horizontal' : 'vertical'}
                    showInitials={showInitials}
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
                  <PlayerCard
                    player={placeholderPlayer}
                    size="default"
                    layout={isHorizontalPlayers ? 'horizontal' : 'vertical'}
                    showInitials={showInitials}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className={`${isCompact ? 'h-full' : 'min-h-[80px]'} flex items-center justify-center`}>
            {/* Empty state - no content */}
          </div>
        )}
      </div>
    </motion.div>
  );
}

