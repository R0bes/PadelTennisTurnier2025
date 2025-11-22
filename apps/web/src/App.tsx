import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, RotateCcw, Sparkles, Home } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Phase, TournamentState } from '@tournament-app/shared-types';
import {
  createTournament,
  getTournamentState,
  setPhase,
  registerPlayer,
} from './api/tournamentApi';
import TournamentPage from './pages/TournamentPage';
import { type RegistrationPageRef } from './pages/RegistrationPage';

const TOURNAMENT_ID_KEY = 'tournament-app:active-tournament-id';

function App() {
  const [tournamentState, setTournamentState] =
    useState<TournamentState | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('Padel Tennis Turnier 2025');
  const registrationPageRef = useRef<RegistrationPageRef>(null);

  // Load tournament on mount (only if exists in localStorage)
  useEffect(() => {
    const loadTournament = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to load existing tournament from localStorage
        const savedId = localStorage.getItem(TOURNAMENT_ID_KEY);
        if (savedId) {
          try {
            const state = await getTournamentState(savedId);
            setTournamentState(state);
            setIsLoading(false);
            return;
          } catch (err) {
            // Tournament not found, clear localStorage
            localStorage.removeItem(TOURNAMENT_ID_KEY);
          }
        }

        // No tournament found, don't create one automatically
        setIsLoading(false);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load tournament'
        );
        setIsLoading(false);
      }
    };

    loadTournament();
  }, []);

  // Refresh tournament state
  const refreshTournament = async () => {
    if (!tournamentState) return;

    try {
      const state = await getTournamentState(tournamentState.id);
      setTournamentState(state);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to refresh tournament';
      setError(message);
      toast.error(message);
    }
  };

  // Handle phase change
  const handlePhaseChange = async (newPhase: Phase) => {
    if (!tournamentState) return;

    try {
      const updated = await setPhase(tournamentState.id, newPhase);
      setTournamentState(updated);
      toast.success(
        `Tournament phase changed to ${newPhase.replace('_', ' ')}`
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to change phase';
      setError(message);
      toast.error(message);
    }
  };

  // Handle next phase shift
  const handleNextPhase = async () => {
    if (!tournamentState) return;
    
    const nextPhase = getNextPhase(tournamentState.phase);
    if (nextPhase) {
      await handlePhaseChange(nextPhase);
    }
  };


  // Quick add 26 fake players (streaming - one by one, simulating)
  const addFakePlayers = async (tournamentId: string, currentPlayerCount: number = 0) => {
    const fakeNames = [
      'Alice Johnson',
      'Bob Smith',
      'Charlie Brown',
      'Diana Prince',
      'Eve Wilson',
      'Frank Miller',
      'Grace Lee',
      'Henry Davis',
    ];

    try {
      // Add 26 players sequentially with delay (streaming/simulation effect)
      for (let i = 0; i < 26; i++) {
        const randomName =
          fakeNames[Math.floor(Math.random() * fakeNames.length)] +
          ` #${currentPlayerCount + i + 1}`;
        await registerPlayer(tournamentId, randomName);
        
        // Refresh after each player to show streaming effect (players "flying in")
        const currentState = await getTournamentState(tournamentId);
        setTournamentState(currentState);
        
        // Delay between players for simulation effect (200ms for smoother animation)
        if (i < 25) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      toast.success('26 players added successfully!');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to add players';
      toast.error(message);
    }
  };
  

  // Create new tournament
  const handleCreateTournament = async (name: string) => {
    try {
      const newTournament = await createTournament(name);
      localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
      setTournamentState(newTournament);
      setError(null);
      toast.success(`Tournament "${name}" created successfully!`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create tournament';
      setError(message);
      toast.error(message);
    }
  };

  // Start new tournament from scratch
  const handleStartNewTournament = async () => {
    if (!newTournamentName.trim()) {
      toast.error('Please enter a tournament name');
      return;
    }

    try {
      setIsLoading(true);
      const newTournament = await createTournament(newTournamentName.trim());
      localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
      setTournamentState(newTournament);
      setError(null);
      setShowNewTournamentModal(false);
      setNewTournamentName('Padel Tennis Turnier 2025');
      toast.success(`New tournament "${newTournamentName.trim()}" started!`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create tournament';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new tournament button click (opens modal)
  const handleNewTournamentClick = () => {
    setNewTournamentName('Padel Tennis Turnier 2025');
    setShowNewTournamentModal(true);
  };

  // Reset to initial state (create new tournament)
  const handleResetToInitial = async () => {
    try {
      setIsLoading(true);
      const newTournament = await createTournament('Padel Tennis Turnier 2025');
      localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
      setTournamentState(newTournament);
      setError(null);
      
      // Start streaming players after a short delay (so the empty tournament is visible first)
      setTimeout(async () => {
        await addFakePlayers(newTournament.id, 0);
        await refreshTournament();
      }, 500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create tournament';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error && !tournamentState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={handleNewTournamentClick}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-lg font-medium shadow-lg hover:shadow-xl transition-all mx-auto"
          >
            <RotateCcw className="w-5 h-5" />
            Create Turnier
          </button>
        </div>
      </div>
    );
  }

  if (!tournamentState) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tournament App</h1>
            <p className="text-gray-600 mb-8">Start a new tournament to begin</p>
            <button
              onClick={handleNewTournamentClick}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-lg font-medium shadow-lg hover:shadow-xl transition-all mx-auto"
            >
              <RotateCcw className="w-5 h-5" />
              Create Turnier
            </button>
          </div>
        </div>
        
        {/* New Tournament Modal */}
        <AnimatePresence>
          {showNewTournamentModal && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-50"
                onClick={() => setShowNewTournamentModal(false)}
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
                    Geben Sie einen Namen für das neue Turnier ein.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleStartNewTournament();
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
                        value={newTournamentName}
                        onChange={(e) => setNewTournamentName(e.target.value)}
                        placeholder="z.B. Sommer Turnier 2024"
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewTournamentModal(false);
                          setNewTournamentName('');
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                      >
                        Abbrechen
                      </button>
                      <button
                        type="submit"
                        disabled={!newTournamentName.trim() || isLoading}
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
      </>
    );
  }

  const currentPhase = tournamentState.phase;

  const getNextPhase = (current: Phase): Phase | null => {
    const transitions: Record<Phase, Phase | null> = {
      registration: 'swiss_rounds',
      team_setup: 'swiss_rounds',
      match_setup: 'swiss_rounds',
      swiss_rounds: 'ko_bracket',
      ko_bracket: 'summary',
      summary: null,
    };
    return transitions[current] || null;
  };

  // Get background color based on phase
  const getPhaseBackground = (phase: Phase): string => {
    switch (phase) {
      case 'registration':
        return 'bg-blue-50';
      case 'team_setup':
        return 'bg-green-50';
      case 'match_setup':
        return 'bg-indigo-50';
      case 'swiss_rounds':
        return 'bg-purple-50';
      case 'ko_bracket':
        return 'bg-orange-50';
      case 'summary':
        return 'bg-yellow-50';
      default:
        return 'bg-gray-50';
    }
  };

  const phaseBackground = getPhaseBackground(currentPhase);

  return (
    <motion.div 
      className={`min-h-screen transition-colors duration-500 ${phaseBackground}`}
      initial={false}
      animate={{ backgroundColor: phaseBackground }}
    >
      <nav className="sticky top-0 z-50 bg-white shadow-md border-b">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Trophy className="w-6 h-6 text-blue-600" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  {tournamentState.name}
                </h1>
                <span className="text-xs text-gray-500 capitalize flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  {currentPhase.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={handleResetToInitial}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Neues Turnier starten"
              >
                <Home className="w-4 h-4" />
                Reset
              </button>
              {isAdmin && tournamentState && (
                <button
                  onClick={handleNextPhase}
                  disabled={!getNextPhase(currentPhase) || isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Zur nächsten Phase wechseln"
                >
                  Phase Shift
                  <span>→</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-8">
        <TournamentPage
          ref={registrationPageRef}
          tournamentState={tournamentState}
          isAdmin={isAdmin}
          onRefresh={refreshTournament}
        />
      </main>

      {/* New Tournament Modal */}
      <AnimatePresence>
        {showNewTournamentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              onClick={() => setShowNewTournamentModal(false)}
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
                    handleStartNewTournament();
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
                      value={newTournamentName}
                      onChange={(e) => setNewTournamentName(e.target.value)}
                      placeholder="z.B. Sommer Turnier 2024"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-3 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTournamentModal(false);
                        setNewTournamentName('');
                      }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={!newTournamentName.trim() || isLoading}
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
    </motion.div>
  );
}

export default App;
