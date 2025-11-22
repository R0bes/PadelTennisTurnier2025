import { useState, useEffect } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { Trophy, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Phase, TournamentState } from '@tournament-app/shared-types';
import { getPhaseNumber, PhaseEnum } from '@tournament-app/shared-types';
import {
  createTournament,
  getTournamentState,
} from './api/tournamentApi';
import { usePhaseManager } from './phases/PhaseManager';
import { getPhaseConfig } from './phases/phaseConfig';
import InitialPhase from './phases/1_InitialPhase';
import PlayerPhase from './phases/2_PlayerPhase';
import TeamPhase from './phases/3_TeamPhase';
import SwissPhase from './phases/4_SwissPhase';
import KOPhase from './phases/5_KOPhase';
import SummaryPhase from './phases/6_SummaryPhase';
import BaseButton from './components/BaseButton';

const TOURNAMENT_ID_KEY = 'tournament-app:active-tournament-id';

function App() {
  const [tournamentState, setTournamentState] =
    useState<TournamentState | null>(null);
  const [isAdmin] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phaseButtonClicked, setPhaseButtonClicked] = useState<string | null>(null);
  const [previousPhase, setPreviousPhase] = useState<Phase | null>(null);
  // Store match results: { 'swiss-1-1': { score: '6-4', winner: teamId, duration: '45min' }, 'ko-QF-1': { score: '6-3', winner: teamId, duration: '38min' } }
  const [matchResults, setMatchResults] = useState<Record<string, { score: string; winner: string | null; duration?: string }>>({});

  // Load tournament on mount (only if exists in localStorage)
  useEffect(() => {
    const loadTournament = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const savedId = localStorage.getItem(TOURNAMENT_ID_KEY);
        if (savedId) {
          try {
            const state = await getTournamentState(savedId);
            setTournamentState(state);
            setIsLoading(false);
            return;
          } catch (err) {
            localStorage.removeItem(TOURNAMENT_ID_KEY);
          }
        }

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



  // Phase Manager - uses unified transition handlers
  const phaseManager = usePhaseManager({
    tournamentState,
    onStateUpdate: setTournamentState,
    onError: setError,
  });

  // Handle next phase shift
  const handleNextPhase = async () => {
    if (!tournamentState) return;
    
    const nextPhase = phaseManager.getNextPhase();
    if (nextPhase) {
      setPhaseButtonClicked(tournamentState.phase);
      await phaseManager.handlePhaseChange(nextPhase);
    }
  };

  // Reset to initial state - clears all tournament data
  const handleResetToInitial = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newTournament = await createTournament('Padel Tennis Turnier 2025');
      localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
      setTournamentState(newTournament);
      // Reset all related states
      setMatchResults({});
      setPhaseButtonClicked(null);
      setPreviousPhase(null);
      toast.success('Turnier wurde zurückgesetzt');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset tournament';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };


  // All hooks must be called before early returns (Rules of Hooks)
  const currentPhase: Phase = tournamentState?.phase || 'initial';
  const currentPhaseNumber = tournamentState ? getPhaseNumber(tournamentState.phase) : PhaseEnum.Initial;

  // Scroll to phase when it changes
  useEffect(() => {
    if (currentPhase && currentPhase !== previousPhase) {
      setPreviousPhase(currentPhase);
      const phaseElement = document.getElementById(`phase-${currentPhase}`);
      if (phaseElement) {
        phaseElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentPhase, previousPhase]);
  const phaseConfig = getPhaseConfig(currentPhase);
  const phaseBackground = phaseConfig.backgroundColor;

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
          <BaseButton
            text="Create Turnier"
            onClick={async () => {
              try {
                setIsLoading(true);
                const newTournament = await createTournament('Padel Tennis Turnier 2025');
                localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
                setTournamentState(newTournament);
                setError(null);
                toast.success(`New tournament "Padel Tennis Turnier 2025" started!`);
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to create tournament';
                setError(message);
                toast.error(message);
              } finally {
                setIsLoading(false);
              }
            }}
            color="orange"
            active={true}
            icon={RotateCcw}
            size="lg"
            className="shadow-lg hover:shadow-xl mx-auto"
          />
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
            <BaseButton
            text="Create Turnier"
            onClick={async () => {
              try {
                setIsLoading(true);
                const newTournament = await createTournament('Padel Tennis Turnier 2025');
                localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
                setTournamentState(newTournament);
                setError(null);
                toast.success(`New tournament "Padel Tennis Turnier 2025" started!`);
              } catch (err) {
                const message = err instanceof Error ? err.message : 'Failed to create tournament';
                setError(message);
                toast.error(message);
              } finally {
                setIsLoading(false);
              }
            }}
            color="orange"
            active={!isLoading}
            disabled={isLoading}
            icon={RotateCcw}
            size="lg"
            className="shadow-lg hover:shadow-xl mx-auto"
          />
        </div>
      </div>
      </>
    );
  }

  return (
    <motion.div 
      className={`min-h-screen transition-colors duration-500 ${phaseBackground}`}
      initial={false}
      animate={{ backgroundColor: phaseBackground }}
      style={{ minHeight: '100vh' }}
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 pt-20 pb-8 min-h-screen">
        <LayoutGroup>
          <div className="space-y-8">
            {/* Initial Phase - Always show Start/Reset button */}
            {tournamentState && currentPhaseNumber >= PhaseEnum.Initial && (
              <InitialPhase
                onNextPhase={handleNextPhase}
                onReset={handleResetToInitial}
                isLoading={isLoading}
                tournamentState={tournamentState}
              />
            )}

            {/* Player Phase */}
            {tournamentState && currentPhaseNumber >= PhaseEnum.Player && (
              <PlayerPhase
                tournamentState={tournamentState}
                isAdmin={isAdmin}
                onNextPhase={handleNextPhase}
                getNextPhase={() => phaseManager.getNextPhase()}
                isLoading={isLoading}
                onStateUpdate={setTournamentState}
              />
            )}

            {/* Team Phase */}
            {tournamentState && currentPhaseNumber >= PhaseEnum.Team && (
                <TeamPhase
                  tournamentState={tournamentState}
                  onNextPhase={handleNextPhase}
                  phaseButtonClicked={phaseButtonClicked}
                  getNextPhase={() => phaseManager.getNextPhase()}
                  isLoading={isLoading}
                  onStateUpdate={setTournamentState}
                />
              )}

            {/* Swiss Phase */}
            {tournamentState &&
              currentPhaseNumber >= PhaseEnum.Swiss &&
              tournamentState.teams &&
              tournamentState.teams.length > 0 && (
                <SwissPhase
                  tournamentState={tournamentState}
                  teams={tournamentState.teams}
                  matchResults={matchResults}
                  onMatchResultUpdate={setMatchResults}
                />
              )}

            {/* KO Bracket Phase */}
            {tournamentState && currentPhaseNumber >= PhaseEnum.KO && (
              <KOPhase
                tournamentState={tournamentState}
                teams={tournamentState.teams || []}
                matchResults={matchResults}
                onMatchResultUpdate={setMatchResults}
              />
            )}

            {/* Summary Phase */}
            {tournamentState && currentPhaseNumber >= PhaseEnum.Summary && (
              <SummaryPhase
                tournamentState={tournamentState}
              />
            )}
          </div>
        </LayoutGroup>
      </main>

    </motion.div>
  );
}

export default App;
