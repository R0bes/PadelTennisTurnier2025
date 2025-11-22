import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Pause, Play, Square, Plus, Minus } from 'lucide-react';
import type { Team } from '@tournament-app/shared-types';
import TeamCard from './TeamCard';

interface LiveMatchOverlayProps {
  isVisible: boolean;
  team1: Team | null;
  team2: Team | null;
  players: any[];
  timeElapsed: number; // Actually time remaining (countdown)
  matchDurationSeconds?: number;
  isPaused?: boolean;
  onClose?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: (scores: { team1Sets: number[]; team2Sets: number[] }) => void;
}

export default function LiveMatchOverlay({
  isVisible,
  team1,
  team2,
  players,
  timeElapsed,
  matchDurationSeconds,
  isPaused = false,
  onClose,
  onPause,
  onResume,
  onStop,
}: LiveMatchOverlayProps) {
  // Multiple sets for Padel Tennis (typically best of 3 sets)
  const [team1Sets, setTeam1Sets] = useState<number[]>([0, 0, 0]); // [Set 1, Set 2, Set 3]
  const [team2Sets, setTeam2Sets] = useState<number[]>([0, 0, 0]);
  
  const formatTime = (seconds: number): string => {
    const isNegative = seconds < 0;
    const absSeconds = Math.abs(seconds);
    const hours = Math.floor(absSeconds / 3600);
    const mins = Math.floor((absSeconds % 3600) / 60);
    const secs = absSeconds % 60;
    
    const sign = isNegative ? '-' : '';
    if (hours > 0) {
      return `${sign}${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${sign}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const isTimeNegative = timeElapsed < 0;

  if (!team1 || !team2) return null;

  const team1Players = players.filter((p) => team1.playerIds.includes(p.id));
  const team2Players = players.filter((p) => team2.playerIds.includes(p.id));

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
            onClick={onClose}
          >
            {/* Match Display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-4xl mx-4 relative"
            >
              {/* Close button */}
              {onClose && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                  <X className="w-6 h-6" />
                </button>
              )}

              {/* Timer and Controls */}
              <div className="text-center mb-8 space-y-4">
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full border-2 ${
                  isTimeNegative
                    ? 'bg-red-100 border-red-500 animate-pulse'
                    : 'bg-purple-100 border-purple-300'
                }`}>
                  {!isPaused && !isTimeNegative && <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>}
                  {!isPaused && isTimeNegative && <div className="w-4 h-4 bg-red-600 rounded-full animate-pulse"></div>}
                  {isPaused && <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>}
                  <span className={`text-3xl font-mono font-bold ${
                    isTimeNegative
                      ? 'text-red-600'
                      : 'text-purple-800'
                  }`}>
                    {formatTime(timeElapsed)}
                  </span>
                </div>
                
                {/* Control Buttons */}
                <div className="flex items-center justify-center gap-3">
                  {!isPaused ? (
                    <button
                      onClick={onPause}
                      className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold flex items-center gap-2"
                    >
                      <Pause className="w-4 h-4" />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={onResume}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Weiter
                    </button>
                  )}
                  <button
                    onClick={() => onStop?.({ team1Sets, team2Sets })}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold flex items-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    Stop
                  </button>
                </div>
              </div>

              {/* Teams with Scores */}
              <div className="relative grid grid-cols-2 gap-8 items-center">
                {/* Team 1 */}
                <div className="flex flex-col items-center">
                  <div className="w-full mb-4">
                    <TeamCard
                      team={team1}
                      players={team1Players}
                      playerLayout="vertical"
                      size="default"
                    />
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mb-4">{team1.name}</div>
                  
                  {/* Sets for Team 1 */}
                  <div className="space-y-3 w-full">
                    {team1Sets.map((setScore, setIndex) => (
                      <div key={setIndex} className="flex flex-col items-center gap-2 w-full">
                        <div className="text-sm font-semibold text-gray-600">Set {setIndex + 1}</div>
                        <div className="flex items-center justify-center gap-3 w-full">
                          <button
                            onClick={() => {
                              const newSets = [...team1Sets];
                              newSets[setIndex] = Math.max(0, newSets[setIndex] - 1);
                              setTeam1Sets(newSets);
                            }}
                            className="w-10 h-10 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center font-bold text-lg flex-shrink-0"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <div className="text-3xl font-bold text-gray-800 min-w-[50px] text-center">
                            {setScore}
                          </div>
                          <button
                            onClick={() => {
                              const newSets = [...team1Sets];
                              newSets[setIndex] = newSets[setIndex] + 1;
                              setTeam1Sets(newSets);
                            }}
                            className="w-10 h-10 rounded-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center font-bold text-lg flex-shrink-0"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VS Divider */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
                  <div className="bg-white rounded-full p-4 border-4 border-purple-300 shadow-lg">
                    <span className="text-3xl font-bold text-purple-600">VS</span>
                  </div>
                </div>

                {/* Team 2 */}
                <div className="flex flex-col items-center">
                  <div className="w-full mb-4">
                    <TeamCard
                      team={team2}
                      players={team2Players}
                      playerLayout="vertical"
                      size="default"
                    />
                  </div>
                  <div className="text-2xl font-bold text-gray-800 mb-4">{team2.name}</div>
                  
                  {/* Sets for Team 2 */}
                  <div className="space-y-3 w-full">
                    {team2Sets.map((setScore, setIndex) => (
                      <div key={setIndex} className="flex flex-col items-center gap-2 w-full">
                        <div className="text-sm font-semibold text-gray-600">Set {setIndex + 1}</div>
                        <div className="flex items-center justify-center gap-3 w-full">
                          <button
                            onClick={() => {
                              const newSets = [...team2Sets];
                              newSets[setIndex] = Math.max(0, newSets[setIndex] - 1);
                              setTeam2Sets(newSets);
                            }}
                            className="w-10 h-10 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center font-bold text-lg flex-shrink-0"
                          >
                            <Minus className="w-5 h-5" />
                          </button>
                          <div className="text-3xl font-bold text-gray-800 min-w-[50px] text-center">
                            {setScore}
                          </div>
                          <button
                            onClick={() => {
                              const newSets = [...team2Sets];
                              newSets[setIndex] = newSets[setIndex] + 1;
                              setTeam2Sets(newSets);
                            }}
                            className="w-10 h-10 rounded-full bg-green-500 text-white hover:bg-green-600 flex items-center justify-center font-bold text-lg flex-shrink-0"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Match Status */}
              <div className="mt-8 text-center">
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                  isPaused 
                    ? 'bg-yellow-100' 
                    : 'bg-green-100'
                }`}>
                  <div className={`w-3 h-3 rounded-full ${
                    isPaused 
                      ? 'bg-yellow-500' 
                      : 'bg-green-500 animate-pulse'
                  }`}></div>
                  <span className={`text-sm font-semibold ${
                    isPaused 
                      ? 'text-yellow-800' 
                      : 'text-green-800'
                  }`}>
                    {isPaused ? 'Pausiert' : 'Match läuft'}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

