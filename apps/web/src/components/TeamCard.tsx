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
}

export default function TeamCard({
  team,
  size = 'default',
  players = [],
  isWinner = false,
  isLoser = false,
  playerLayout = 'vertical',
  showInitials = false,
}: TeamCardProps) {
  const isCompact = size === 'compact' || size === 'match';
  const isHorizontalPlayers = playerLayout === 'horizontal';

  return (
    <motion.div
      layout
      layoutId={`team-${team.id}`}
      transition={{ type: 'spring', stiffness: 30, damping: 25, mass: 2.5 }}
      className={`relative ${isCompact ? 'h-full' : ''}`}
    >
      <div
        className={`bg-gradient-to-br from-green-50 to-white rounded-lg border-2 ${
          isWinner
            ? 'border-green-400'
            : isLoser
            ? 'border-red-400'
            : 'border-gray-200 hover:border-green-400'
        } hover:shadow-md transition-all ${
          isCompact ? 'p-2.5 h-full flex flex-col' : 'p-3'
        }`}
      >
        <h3 className={`font-semibold text-gray-800 text-center break-words ${isCompact ? 'text-base mb-2' : 'text-lg mb-3'}`}>
          {team.name}
        </h3>
        {players.length > 0 ? (
          <div className={`${isHorizontalPlayers ? 'flex gap-2 justify-center' : 'space-y-2'} ${isCompact ? 'flex-1' : ''}`}>
            {players.slice(0, 2).map((player) => {
              return (
                <PlayerCard
                  key={player.id}
                  player={player}
                  size="default"
                  layout={isHorizontalPlayers ? 'horizontal' : 'vertical'}
                  showInitials={showInitials}
                />
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
                <PlayerCard
                  key={`empty-${index}`}
                  player={placeholderPlayer}
                  size="default"
                  layout={isHorizontalPlayers ? 'horizontal' : 'vertical'}
                  showInitials={showInitials}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className={`text-gray-800 font-semibold truncate ${isCompact ? 'text-xs' : 'text-sm'}`}>
              {team.name}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

