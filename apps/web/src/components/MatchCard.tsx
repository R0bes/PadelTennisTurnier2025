import { motion } from 'framer-motion';
import type { Team, Player } from '@tournament-app/shared-types';
import TeamCard from './TeamCard';

interface MatchCardProps {
  matchNumber: string;
  team1: Team | null;
  team2: Team | null;
  players: Player[];
  score?: string;
  winner?: Team | null;
  isFilled?: boolean;
  isCompleted?: boolean;
  className?: string;
}

export default function MatchCard({
  matchNumber,
  team1,
  team2,
  players,
  score,
  winner,
  isFilled = false,
  isCompleted = false,
  className = '',
}: MatchCardProps) {
  return (
    <motion.div
      layout
      className={`rounded-md p-2 border-2 transition-all shadow-sm relative flex-1 ${
        isFilled
          ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-md'
          : 'bg-gray-50 border-dashed border-gray-300'
      } ${className}`}
    >
      <div
        className={`absolute -top-1.5 -left-1.5 px-1.5 py-0.5 rounded-full flex items-center justify-center text-xs font-bold shadow-md whitespace-nowrap ${
          isCompleted
            ? 'bg-blue-500 text-white'
            : isFilled
            ? 'bg-gray-500 text-white'
            : 'bg-gray-400 text-white'
        }`}
      >
        {matchNumber}
      </div>
      <div className="space-y-1.5">
        {team1 ? (
          <TeamCard
            team={team1}
            size="match"
            players={players.filter((player) => team1.playerIds.includes(player.id))}
            isWinner={isCompleted && winner === team1}
            isLoser={isCompleted && winner !== team1 && winner !== null}
          />
        ) : (
          <div className="rounded p-1.5 border bg-gray-100 border-dashed border-gray-300">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-300">
                <span className="text-white font-bold text-xs">1</span>
              </div>
              <span className="text-xs font-semibold truncate text-gray-400 italic">
                —
              </span>
            </div>
          </div>
        )}

        <div className="text-center py-0.5">
          <span
            className={`text-xs font-bold ${
              isFilled ? 'text-gray-400' : 'text-gray-300'
            }`}
          >
            vs
          </span>
        </div>

        {team2 ? (
          <TeamCard
            team={team2}
            size="match"
            players={players.filter((player) => team2.playerIds.includes(player.id))}
            isWinner={isCompleted && winner === team2}
            isLoser={isCompleted && winner !== team2 && winner !== null}
          />
        ) : (
          <div className="rounded p-1.5 border bg-gray-100 border-dashed border-gray-300">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 bg-gray-300">
                <span className="text-white font-bold text-xs">2</span>
              </div>
              <span className="text-xs font-semibold truncate text-gray-400 italic">
                —
              </span>
            </div>
          </div>
        )}

        {score && (
          <div className="pt-1 border-t border-gray-200">
            <div className="text-center">
              <span className="text-sm font-bold text-blue-600">{score}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

