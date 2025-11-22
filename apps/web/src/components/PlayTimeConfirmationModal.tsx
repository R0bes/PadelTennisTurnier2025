import { motion, AnimatePresence } from 'framer-motion';

interface PlayTimeConfirmationModalProps {
  isOpen: boolean;
  playTime: {
    total: number;
    swiss: number;
    ko: number;
    swissMatches: number;
    koMatches: number;
  };
  onConfirm: () => void;
}

export default function PlayTimeConfirmationModal({
  isOpen,
  playTime,
  onConfirm,
}: PlayTimeConfirmationModalProps) {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onConfirm}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"
            >
              {/* Header */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Geschätzte Spielzeit
                </h2>
              </div>

              {/* Play Time Display */}
              <div className="mb-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-200">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Swiss-Runden:</span>
                    <span className="font-semibold text-gray-800">
                      {playTime.swissMatches} Matches × {formatTime(playTime.swiss / playTime.swissMatches)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">KO-Runden:</span>
                    <span className="font-semibold text-gray-800">
                      {playTime.koMatches} Matches × {formatTime(playTime.ko / playTime.koMatches)}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-purple-200 flex justify-between items-center">
                    <span className="text-gray-700 font-semibold text-base">Gesamt:</span>
                    <span className="font-bold text-purple-700 text-2xl">
                      {formatTime(playTime.total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* OK Button */}
              <button
                onClick={onConfirm}
                className="w-full px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-semibold"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

