import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface TournamentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (swissMinutes: number, koMinutes: number) => void;
  defaultSwissMinutes?: number;
  defaultKoMinutes?: number;
  numTeams?: number;
}

export default function TournamentSettingsModal({
  isOpen,
  onClose,
  onSave,
  defaultSwissMinutes = 10,
  defaultKoMinutes = 10,
  numTeams = 0,
}: TournamentSettingsModalProps) {
  const [swissMinutes, setSwissMinutes] = useState(defaultSwissMinutes.toString());
  const [koMinutes, setKoMinutes] = useState(defaultKoMinutes.toString());

  // Format time helper
  const formatTime = (minutes: number): string => {
    if (minutes === 0) return '0 Min';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins > 0 ? `${mins}min` : ''}`.trim();
    }
    return `${mins}min`;
  };

  // Calculate total play time
  const calculatePlayTime = () => {
    const swiss = parseInt(swissMinutes, 10) || 0;
    const ko = parseInt(koMinutes, 10) || 0;
    
    if (numTeams === 0) {
      return { 
        total: 0, 
        swiss: 0, 
        ko: 0, 
        swissMatches: 0, 
        koMatches: 0,
        swissPerMatch: swiss,
        koPerMatch: ko
      };
    }
    
    // Swiss: 3 rounds, numMatches per round = Math.ceil(numTeams / 2)
    const numMatchesPerRound = Math.ceil(numTeams / 2);
    const swissMatches = 3 * numMatchesPerRound;
    const swissTime = swissMatches * swiss;
    
    // KO: Quarterfinals (4 matches), Semifinals (2 matches), Final (1 match) = 7 matches max
    // But depends on number of teams - if less than 8 teams, fewer matches
    let koMatches = 0;
    if (numTeams >= 8) {
      koMatches = 4 + 2 + 1; // QF + SF + F
    } else if (numTeams >= 4) {
      koMatches = 2 + 1; // SF + F
    } else if (numTeams >= 2) {
      koMatches = 1; // F only
    }
    const koTime = koMatches * ko;
    
    const totalTime = swissTime + koTime;
    
    return {
      total: totalTime,
      swiss: swissTime,
      ko: koTime,
      swissMatches,
      koMatches,
      swissPerMatch: swiss,
      koPerMatch: ko,
    };
  };

  const playTime = calculatePlayTime();

  const handleSave = () => {
    const swiss = parseInt(swissMinutes, 10);
    const ko = parseInt(koMinutes, 10);

    if (isNaN(swiss) || swiss < 1 || swiss > 60) {
      alert('Bitte geben Sie eine gültige Dauer für Swiss-Runden ein (1-60 Minuten).');
      return;
    }

    if (isNaN(ko) || ko < 1 || ko > 60) {
      alert('Bitte geben Sie eine gültige Dauer für KO-Runden ein (1-60 Minuten).');
      return;
    }

    onSave(swiss, ko);
    onClose();
  };

  const handleCancel = () => {
    setSwissMinutes(defaultSwissMinutes.toString());
    setKoMinutes(defaultKoMinutes.toString());
    onClose();
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
            onClick={handleCancel}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center"
          >
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gradient-to-br from-retro-beige-50 via-white to-retro-beige-100 rounded-lg shadow-retro border-2 border-retro-brown-300 p-6 w-full max-w-lg mx-4"
              style={{ boxShadow: '0 4px 15px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.5)' }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-retro font-bold text-retro-brown-800 uppercase tracking-wider">
                  Turnier-Einstellungen
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-retro-brown-400 hover:text-retro-brown-600 transition-colors"
                  title="Schließen"
                  aria-label="Schließen"
                  type="button"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Description */}
              <p className="text-retro-brown-700 mb-4 font-vintage text-sm">
                Bitte geben Sie die Match-Dauer für die verschiedenen Runden an:
              </p>

              {/* Swiss Rounds Duration */}
              <div className="mb-4">
                <label className="block text-sm font-retro font-bold text-retro-brown-700 mb-2 uppercase tracking-wide">
                  Swiss-Runden Dauer (Minuten)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={swissMinutes}
                    onChange={(e) => setSwissMinutes(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-retro-brown-300 rounded-lg focus:ring-2 focus:ring-retro-orange-500 focus:border-transparent bg-retro-beige-100 text-retro-brown-800 font-vintage"
                    placeholder="10"
                  />
                  <span className="text-retro-brown-600 font-vintage whitespace-nowrap text-sm">Minuten</span>
                </div>
                <p className="text-xs text-retro-brown-500 mt-1 font-vintage">
                  Empfohlen: 8-12 Minuten
                </p>
              </div>

              {/* KO Rounds Duration */}
              <div className="mb-4">
                <label className="block text-sm font-retro font-bold text-retro-brown-700 mb-2 uppercase tracking-wide">
                  KO-Runden Dauer (Minuten)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="60"
                    value={koMinutes}
                    onChange={(e) => setKoMinutes(e.target.value)}
                    className="w-full px-4 py-2 border-2 border-retro-brown-300 rounded-lg focus:ring-2 focus:ring-retro-orange-500 focus:border-transparent bg-retro-beige-100 text-retro-brown-800 font-vintage"
                    placeholder="10"
                  />
                  <span className="text-retro-brown-600 font-vintage whitespace-nowrap text-sm">Minuten</span>
                </div>
                <p className="text-xs text-retro-brown-500 mt-1 font-vintage">
                  Empfohlen: 8-12 Minuten
                </p>
              </div>

              {/* Play Time Calculation - Always visible */}
              <div className="mb-4 p-4 bg-gradient-to-br from-retro-beige-100 via-retro-beige-50 to-retro-beige-100 rounded-lg border-2 border-retro-brown-300 shadow-retro-sm">
                <h3 className="text-base font-retro font-bold text-retro-brown-800 mb-3 flex items-center gap-2 uppercase tracking-wider">
                  <span className="text-retro-orange-500 text-lg">⏱️</span>
                  Geschätzte Gesamtspielzeit
                </h3>
                {numTeams === 0 ? (
                  <p className="text-sm text-retro-brown-600 italic font-vintage">
                    Bitte erstellen Sie zuerst Teams, um die Spielzeit zu berechnen.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-retro-brown-700 font-vintage">Swiss-Runden:</span>
                      <span className="font-retro font-bold text-retro-brown-800 text-right">
                        {playTime.swissMatches} Matches × {playTime.swissPerMatch} Min
                        {playTime.swiss > 0 && (
                          <span className="text-retro-orange-600 ml-2">= {formatTime(playTime.swiss)}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-retro-brown-700 font-vintage">KO-Runden:</span>
                      <span className="font-retro font-bold text-retro-brown-800 text-right">
                        {playTime.koMatches} Matches × {playTime.koPerMatch} Min
                        {playTime.ko > 0 && (
                          <span className="text-retro-orange-600 ml-2">= {formatTime(playTime.ko)}</span>
                        )}
                      </span>
                    </div>
                    <div className="pt-2 mt-2 border-t-2 border-retro-brown-300 flex justify-between items-center">
                      <span className="text-retro-brown-800 font-retro font-bold text-base uppercase tracking-wider">Gesamtdauer:</span>
                      <span className="font-retro font-bold text-retro-orange-600 text-2xl">
                        {formatTime(playTime.total)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-2 border-2 border-retro-brown-300 rounded-lg text-retro-brown-700 hover:bg-retro-brown-100 transition-colors font-retro font-bold uppercase tracking-wider text-sm shadow-retro-sm"
                  style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}
                  title="Abbrechen"
                  aria-label="Abbrechen"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-retro-orange-500 text-white rounded-lg hover:bg-retro-orange-600 transition-colors font-retro font-bold uppercase tracking-wider text-sm shadow-retro"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                  title="OK"
                  aria-label="OK"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

