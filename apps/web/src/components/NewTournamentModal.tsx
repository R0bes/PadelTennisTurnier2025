import { motion, AnimatePresence } from 'framer-motion';

interface NewTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  name: string;
  onNameChange: (name: string) => void;
  isLoading: boolean;
}

export default function NewTournamentModal({
  isOpen,
  onClose,
  onSubmit,
  name,
  onNameChange,
  isLoading,
}: NewTournamentModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Neues Turnier starten
              </h2>
              <p className="text-gray-600 mb-4">
                Ein neues Turnier wird erstellt. Das aktuelle Turnier wird
                ersetzt.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onSubmit();
                }}
              >
                <div className="mb-4">
                  <label
                    htmlFor="tournament-name"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Turniername
                  </label>
                  <input
                    id="tournament-name"
                    type="text"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="z.B. Sommer Turnier 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNameChange('');
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={!name.trim() || isLoading}
                    className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Erstelle...' : 'Neues Turnier starten'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

