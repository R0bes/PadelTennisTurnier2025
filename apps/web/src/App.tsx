import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Phase, TournamentState } from '@tournament-app/shared-types';
import {
  createTournament,
  getTournamentState,
  setPhase,
} from './api/tournamentApi';
import RegistrationPage from './pages/RegistrationPage';
import TeamSetupPage from './pages/TeamSetupPage';
import TournamentFlowPage from './pages/TournamentFlowPage';
import SummaryPage from './pages/SummaryPage';

const TOURNAMENT_ID_KEY = 'tournament-app:active-tournament-id';

function App() {
  const [tournamentState, setTournamentState] =
    useState<TournamentState | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setError(
        err instanceof Error ? err.message : 'Failed to refresh tournament'
      );
    }
  };

  // Handle phase change
  const handlePhaseChange = async (newPhase: Phase) => {
    if (!tournamentState) return;

    try {
      const updated = await setPhase(tournamentState.id, newPhase);
      setTournamentState(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to change phase'
      );
    }
  };

  // Create new tournament
  const handleCreateTournament = async (name: string) => {
    try {
      const newTournament = await createTournament(name);
      localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
      setTournamentState(newTournament);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create tournament'
      );
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
      <TeamSetupPage
        tournamentState={tournamentState}
        isAdmin={isAdmin}
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
      registration: 'team_setup',
      team_setup: 'swiss_rounds',
      swiss_rounds: 'ko_bracket',
      ko_bracket: 'summary',
      summary: null,
    };
    return transitions[current] || null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-lg font-semibold text-gray-900">
                {tournamentState.name}
              </h1>
              <span className="text-sm text-gray-500 capitalize">
                {currentPhase.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsAdmin(!isAdmin)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  isAdmin
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {isAdmin ? 'Admin View' : 'Public View'}
              </button>
              {isAdmin && getNextPhase(currentPhase) && (
                <button
                  onClick={() => handlePhaseChange(getNextPhase(currentPhase)!)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm font-medium"
                >
                  Next Phase →
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="max-w-7xl mx-auto">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
    </div>
  );
}

export default App;
