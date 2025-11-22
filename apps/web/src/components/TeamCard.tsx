import { motion } from 'framer-motion';
import type { Team, Player } from '@tournament-app/shared-types';
import PlayerCard from './PlayerCard';

interface TeamCardProps {
  team: Team;
  size?: 'default' | 'compact' | 'match';
  players?: Player[];
  isWinner?: boolean;
  isLoser?: boolean;
}

export default function TeamCard({
  team,
  size = 'default',
  players = [],
  isWinner = false,
  isLoser = false,
}: TeamCardProps) {
  const isCompact = size === 'compact';
  const isMatch = size === 'match';

  return (
    <motion.div
      layout
      layoutId={`team-${team.id}`}
      transition={{ type: 'spring', stiffness: 30, damping: 25, mass: 2.5 }}
      className="relative"
    >
      {isMatch ? (
        // Match size - very compact for match cards
        <div className={`rounded p-1.5 border-2 transition-all ${
          isWinner
            ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-400'
            : isLoser
            ? 'bg-gradient-to-r from-red-50 to-red-100 border-red-400'
            : 'bg-gradient-to-r from-gray-50 to-white border-gray-200 hover:border-gray-300'
        }`}>
          <div className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              isWinner
                ? 'bg-green-500'
                : isLoser
                ? 'bg-red-500'
                : 'bg-gray-400'
            }`}>
              <span className="text-white font-bold text-xs">T</span>
            </div>
            <span className={`text-xs font-semibold truncate ${
              isWinner
                ? 'text-green-900'
                : isLoser
                ? 'text-red-900'
                : 'text-gray-900'
            }`}>
              {team.name}
            </span>
          </div>
        </div>
      ) : (
        // Default/Compact size - full team card with players
        <div
          className={`bg-gradient-to-br from-green-50 to-white rounded-lg border-2 border-gray-200 hover:border-green-400 hover:shadow-md transition-all ${
            isCompact ? 'p-3' : 'p-4'
          }`}
        >
          <h3 className={`font-semibold text-gray-800 ${isCompact ? 'text-base mb-2' : 'text-lg mb-3'}`}>
            {team.name}
          </h3>
          {players.length > 0 ? (
            <div className="space-y-2">
              {players.slice(0, 2).map((player) => {
                const isDummy = player.name === 'DummyPlayer';
                if (isDummy) {
                  return (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 p-2 bg-gray-100 border border-dashed border-gray-300 rounded-md"
                    >
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-500 font-semibold text-xs">
                          ?
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-500 italic">
                        {player.name}
                      </span>
                    </div>
                  );
                }
                return (
                  <PlayerCard
                    key={player.id}
                    player={player}
                    size="compact"
                  />
                );
              })}
              {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                  className="flex items-center gap-2 p-2 bg-gray-100 border border-dashed border-gray-300 rounded-md"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-500 font-semibold text-xs">
                      ?
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-500 italic">
                    DummyPlayer
                  </span>
                </div>
              ))}
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
      )}
    </motion.div>
  );
}

