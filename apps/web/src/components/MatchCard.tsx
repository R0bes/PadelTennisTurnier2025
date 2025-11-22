import { motion } from 'framer-motion';
import type { Team, Player } from '@tournament-app/shared-types';
import TeamCard from './TeamCard';

interface MatchCardProps {
  matchNumber: string;
  team1: Team | null;
  team2: Team | null;
  players: Player[];
  score?: string;
  duration?: string;
  winner?: Team | null;
  state: 'idle' | 'ready' | 'done';
  className?: string;
  phase?: 'match_setup' | 'swiss_rounds' | 'ko_bracket';
}

export default function MatchCard({
  matchNumber,
  team1,
  team2,
  players,
  score,
  duration,
  winner,
  state,
  className = '',
  phase,
}: MatchCardProps) {
  const isMatchSetup = phase === 'match_setup';
  const playerLayout = isMatchSetup ? 'vertical' : 'horizontal';
  const showInitials = isMatchSetup;
  const isDone = state === 'done';
  const isReady = state === 'ready';
  const isIdle = state === 'idle';

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 200, damping: 20, mass: 1 }}
      className={`rounded-md p-2 pt-4 border-2 transition-all shadow-sm relative w-full min-w-[280px] ${
        isIdle
          ? 'bg-gray-50 border-gray-300 opacity-50'
          : isReady
          ? 'bg-yellow-100 border-yellow-400 shadow-xl ring-2 ring-yellow-300 animate-pulse'
          : isDone
          ? 'bg-white border-gray-200'
          : 'bg-gray-50 border-dashed border-gray-300'
      } ${className}`}
    >
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full flex items-center justify-center text-sm font-bold shadow-lg whitespace-nowrap z-10 ${
          isReady
            ? 'bg-yellow-500 text-white ring-2 ring-yellow-300 animate-pulse'
            : isDone
            ? 'bg-gray-500 text-white'
            : isIdle
            ? 'bg-gray-400 text-gray-200'
            : 'bg-gray-400 text-white'
        }`}
      >
        {matchNumber}
        {isReady && (
          <span className="ml-1.5 text-xs">▶</span>
        )}
      </div>
      {isMatchSetup ? (
        // Phase 3: Teams nebeneinander, ohne "vs"
        <div className="flex gap-2 items-stretch">
          {team1 ? (
            <div className="flex-1 min-w-0">
              <TeamCard
                team={team1}
                size="match"
                players={players.filter((player) => team1.playerIds.includes(player.id))}
                isWinner={isDone && winner === team1}
                isLoser={isDone && winner !== team1 && winner !== null}
                playerLayout={playerLayout}
                showInitials={showInitials}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0 rounded p-1.5 border bg-gray-100 border-dashed border-gray-300 flex items-center justify-center min-h-[80px]">
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

          {team2 ? (
            <div className="flex-1 min-w-0">
              <TeamCard
                team={team2}
                size="match"
                players={players.filter((player) => team2.playerIds.includes(player.id))}
                isWinner={isDone && winner === team2}
                isLoser={isDone && winner !== team2 && winner !== null}
                playerLayout={playerLayout}
                showInitials={showInitials}
              />
            </div>
          ) : (
            <div className="flex-1 min-w-0 rounded p-1.5 border bg-gray-100 border-dashed border-gray-300 flex items-center justify-center min-h-[80px]">
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
        </div>
      ) : (
        // Phase 4+: Teams übereinander mit "vs"
        <div className="space-y-1.5">
          {team1 ? (
            <div className="min-h-[80px]">
              <TeamCard
                team={team1}
                size="match"
                players={players.filter((player) => team1.playerIds.includes(player.id))}
                isWinner={isDone && winner === team1}
                isLoser={isDone && winner !== team1 && winner !== null}
                playerLayout={playerLayout}
                showInitials={showInitials}
              />
            </div>
          ) : (
            <div className="rounded p-1.5 border bg-gray-100 border-dashed border-gray-300 min-h-[80px] flex items-center justify-center">
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
                isIdle
                  ? 'text-gray-300'
                  : isReady
                  ? 'text-yellow-600'
                  : isDone
                  ? 'text-gray-500'
                  : 'text-gray-300'
              }`}
            >
              vs
            </span>
          </div>

          {team2 ? (
            <div className="min-h-[80px]">
              <TeamCard
                team={team2}
                size="match"
                players={players.filter((player) => team2.playerIds.includes(player.id))}
                isWinner={isDone && winner === team2}
                isLoser={isDone && winner !== team2 && winner !== null}
                playerLayout={playerLayout}
                showInitials={showInitials}
              />
            </div>
          ) : (
            <div className="rounded p-1.5 border bg-gray-100 border-dashed border-gray-300 min-h-[80px] flex items-center justify-center">
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

          {isDone && score && (
            <div className="pt-2 border-t border-gray-200 mt-2">
              <div className="text-center space-y-1">
                <div>
                  <span className="text-lg font-bold text-gray-800">{score}</span>
                </div>
                {duration && (
                  <div>
                    <span className="text-xs text-gray-500">Dauer: {duration}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

