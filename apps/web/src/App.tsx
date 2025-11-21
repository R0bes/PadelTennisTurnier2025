import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Trophy, Users, Settings, Eye, EyeOff, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Phase, TournamentState } from '@tournament-app/shared-types';
import {
  createTournament,
  getTournamentState,
  setPhase,
} from './api/tournamentApi';
import RegistrationPage from './pages/RegistrationPage';
import TournamentFlowPage from './pages/TournamentFlowPage';
import SummaryPage from './pages/SummaryPage';

const TOURNAMENT_ID_KEY = 'tournament-app:active-tournament-id';

function App() {
  const [tournamentState, setTournamentState] =
    useState<TournamentState | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');

  // Load or create tournament on mount
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
            // Tournament not found, create new one
            console.log('Saved tournament not found, creating new one');
          }
        }

        // Create new tournament
        const newTournament = await createTournament('Demo Tournament');
        localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
        setTournamentState(newTournament);
        toast.success('Demo tournament loaded');
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load tournament'
        );
      } finally {
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
      setNewTournamentName('');
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
            onClick={() => handleCreateTournament('Demo Tournament')}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create New Tournament
          </button>
        </div>
      </div>
    );
  }

  if (!tournamentState) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No Tournament</h1>
          <button
            onClick={() => handleCreateTournament('Demo Tournament')}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            Create Tournament
          </button>
        </div>
      </div>
    );
  }

  const currentPhase = tournamentState.phase;

  const pages = {
    registration: (
      <RegistrationPage
        tournamentState={tournamentState}
        isAdmin={isAdmin}
        onRefresh={refreshTournament}
      />
    ),
    team_setup: (
      <RegistrationPage
        tournamentState={tournamentState}
        isAdmin={isAdmin}
        onRefresh={refreshTournament}
      />
    ),
    swiss_rounds: (
      <TournamentFlowPage
        tournamentState={tournamentState}
        isAdmin={isAdmin}
      />
    ),
    ko_bracket: (
      <TournamentFlowPage
        tournamentState={tournamentState}
        isAdmin={isAdmin}
      />
    ),
    summary: (
      <SummaryPage tournamentState={tournamentState} isAdmin={isAdmin} />
    ),
  };

  const getNextPhase = (current: Phase): Phase | null => {
    const transitions: Record<Phase, Phase | null> = {
      registration: 'swiss_rounds',
      team_setup: 'swiss_rounds',
      swiss_rounds: 'ko_bracket',
      ko_bracket: 'summary',
      summary: null,
    };
    return transitions[current] || null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md border-b">
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
                onClick={() => setIsAdmin(!isAdmin)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  isAdmin
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {isAdmin ? (
                  <>
                    <Settings className="w-4 h-4" />
                    Admin
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    Public
                  </>
                )}
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setNewTournamentName(tournamentState.name);
                    setShowNewTournamentModal(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 text-sm font-medium shadow-sm hover:shadow transition-all"
                  title="Start new tournament"
                >
                  <RotateCcw className="w-4 h-4" />
                  New Tournament
                </button>
              )}
              {isAdmin && getNextPhase(currentPhase) && (
                <button
                  onClick={() => handlePhaseChange(getNextPhase(currentPhase)!)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium shadow-sm hover:shadow transition-all"
                >
                  Next Phase
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
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPhase}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {pages[currentPhase]}
          </motion.div>
        </AnimatePresence>
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
    </div>
  );
}

export default App;
