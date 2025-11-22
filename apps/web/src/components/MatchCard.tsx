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
  phase?: 'swiss' | 'ko';
  roundNumber?: number; // For round-specific layoutId in Swiss rounds
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
  roundNumber,
}: MatchCardProps) {
  const isMatchSetup = phase === 'swiss';
  const playerLayout = isMatchSetup ? 'vertical' : 'horizontal';
  const showInitials = isMatchSetup;
  const isDone = state === 'done';
  const isReady = state === 'ready';
  const isIdle = state === 'idle';

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 20, damping: 15, mass: 2 }}
      className={`rounded-md p-2 pt-4 border-2 transition-all shadow-sm relative w-full min-w-[280px] ${
        isIdle
          ? 'bg-retro-brown-100 border-retro-brown-400 opacity-60'
          : isReady
          ? 'bg-retro-yellow-200 border-retro-yellow-500 shadow-xl ring-2 ring-retro-yellow-400 animate-pulse'
          : isDone
          ? 'bg-retro-beige-50 border-retro-brown-400'
          : 'bg-retro-brown-50 border-dashed border-retro-brown-400'
      } ${className}`}
    >
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full flex items-center justify-center text-sm font-bold shadow-lg whitespace-nowrap z-10 ${
          isReady
            ? 'bg-retro-yellow-500 text-retro-brown-900 ring-2 ring-retro-yellow-400 animate-pulse'
            : isDone
            ? 'bg-retro-brown-600 text-white'
            : isIdle
            ? 'bg-retro-brown-500 text-retro-brown-200'
            : 'bg-retro-brown-500 text-white'
        }`}
      >
        {matchNumber}
        {isReady && (
          <span className="ml-1.5 text-xs">▶</span>
        )}
      </div>
      {isMatchSetup ? (
        // Phase 3: Teams nebeneinander, ohne "vs"
        <div className="space-y-2">
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
                  roundNumber={roundNumber}
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
                  roundNumber={roundNumber}
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
          
          {/* Results section - always show, with placeholder if no results */}
          <div className="pt-2 border-t border-retro-brown-300">
            <div className="text-center space-y-1">
              {score ? (
                <>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {score.split(',').map((set, idx) => (
                      <span key={idx} className="text-sm font-bold text-retro-brown-800">
                        {set.trim()}
                      </span>
                    ))}
                  </div>
                  {duration && (
                    <div>
                      <span className="text-xs text-retro-brown-600 font-semibold">Dauer: {duration}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs text-retro-brown-400 italic">—</div>
                  <div className="text-xs text-retro-brown-400 italic">—</div>
                </div>
              )}
            </div>
          </div>
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
                roundNumber={roundNumber}
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
              className={`text-sm font-retro font-bold uppercase tracking-wider ${
                isIdle
                  ? 'text-retro-brown-400'
                  : isReady
                  ? 'text-retro-yellow-600'
                  : isDone
                  ? 'text-retro-brown-600'
                  : 'text-retro-brown-400'
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
                roundNumber={roundNumber}
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

          {/* Results section - always show, with placeholder if no results */}
          <div className="pt-2 border-t border-retro-brown-300 mt-2">
            <div className="text-center space-y-1">
              {score ? (
                <>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {score.split(',').map((set, idx) => (
                      <span key={idx} className="text-sm font-bold text-retro-brown-800">
                        {set.trim()}
                      </span>
                    ))}
                  </div>
                  {duration && (
                    <div>
                      <span className="text-xs text-retro-brown-600 font-semibold">Dauer: {duration}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-1">
                  <div className="text-xs text-retro-brown-400 italic">—</div>
                  {!isIdle && (
                    <div className="text-xs text-retro-brown-400 italic">—</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

