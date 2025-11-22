import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import type { Team } from '@tournament-app/shared-types';

interface MatchResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  team1: Team | null;
  team2: Team | null;
  score: string;
  winner: Team | null;
  duration?: string;
  onConfirm: () => void;
}

export default function MatchResultModal({
  isOpen,
  onClose,
  team1,
  team2,
  score,
  winner,
  duration,
  onConfirm,
}: MatchResultModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  if (!team1 || !team2) return null;

  const isTeam1Winner = winner?.id === team1.id;
  const isTeam2Winner = winner?.id === team2.id;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg mx-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                  Match abgeschlossen
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Schließen"
                  aria-label="Schließen"
                  type="button"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Result Display */}
              <div className="mb-6 space-y-4">
                {/* Team 1 */}
                <div
                  className={`p-5 rounded-xl border-4 transition-all ${
                    isTeam1Winner
                      ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500 shadow-lg'
                      : isTeam2Winner
                      ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className={`font-bold text-lg ${isTeam1Winner ? 'text-green-700' : isTeam2Winner ? 'text-red-600' : 'text-gray-800'}`}>
                      {team1.name}
                    </span>
                    {isTeam1Winner && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold text-sm">Gewinner</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="text-center py-2">
                  <div className="text-3xl font-bold text-gray-800 mb-1">{score}</div>
                  {duration && (
                    <div className="text-sm text-gray-500">Dauer: {duration}</div>
                  )}
                </div>

                {/* Team 2 */}
                <div
                  className={`p-5 rounded-xl border-4 transition-all ${
                    isTeam2Winner
                      ? 'bg-gradient-to-br from-green-50 to-green-100 border-green-500 shadow-lg'
                      : isTeam1Winner
                      ? 'bg-gradient-to-br from-red-50 to-red-100 border-red-400'
                      : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <span className={`font-bold text-lg ${isTeam2Winner ? 'text-green-700' : isTeam1Winner ? 'text-red-600' : 'text-gray-800'}`}>
                      {team2.name}
                    </span>
                    {isTeam2Winner && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-semibold text-sm">Gewinner</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                className="w-full px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all font-semibold text-lg shadow-lg flex items-center justify-center gap-2"
                title="Ergebnis übernehmen"
                aria-label="Ergebnis übernehmen"
              >
                <CheckCircle2 className="w-5 h-5" />
                Übernehmen
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

