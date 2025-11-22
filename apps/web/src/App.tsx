import { useState, useEffect } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Phase, TournamentState } from '@tournament-app/shared-types';
import { getPhaseNumber, PhaseEnum } from '@tournament-app/shared-types';
import {
  createTournament,
  getTournamentState,
} from './api/tournamentApi';
import { usePhaseManager } from './phases/PhaseManager';
import InitialPhase from './phases/1_InitialPhase';
import PlayerPhase from './phases/2_PlayerPhase';
import TeamPhase from './phases/3_TeamPhase';
import SwissPhase from './phases/4_SwissPhase';
import KOPhase from './phases/5_KOPhase';
import SummaryPhase from './phases/6_SummaryPhase';
import BaseButton from './components/BaseButton';
import TournamentSettingsModal from './components/TournamentSettingsModal';

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
  // Tournament settings: match durations in minutes
  const [swissMatchDuration, setSwissMatchDuration] = useState<number | null>(null);
  const [koMatchDuration, setKoMatchDuration] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

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
    
    // Check if settings are configured before transitioning from team to swiss phase
    if (tournamentState.phase === 'team') {
      if (swissMatchDuration === null || koMatchDuration === null) {
        setShowSettingsModal(true);
        return;
      }
    }
    
    const nextPhase = phaseManager.getNextPhase();
    if (nextPhase) {
      setPhaseButtonClicked(tournamentState.phase);
      await phaseManager.handlePhaseChange(nextPhase);
    }
  };

  // Handle settings save
  const handleSettingsSave = (swissMinutes: number, koMinutes: number) => {
    setSwissMatchDuration(swissMinutes);
    setKoMatchDuration(koMinutes);
    setShowSettingsModal(false);
    // Continue with phase transition
    if (tournamentState) {
      const nextPhase = phaseManager.getNextPhase();
      if (nextPhase) {
        setPhaseButtonClicked(tournamentState.phase);
        phaseManager.handlePhaseChange(nextPhase);
      }
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

  // Handle create tournament (called from InitialPhase)
  const handleCreateTournament = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const newTournament = await createTournament('Padel Tennis Turnier 2025');
      localStorage.setItem(TOURNAMENT_ID_KEY, newTournament.id);
      setTournamentState(newTournament);
      toast.success(`New tournament "Padel Tennis Turnier 2025" started!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create tournament';
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
  
  // Get gradient colors for smooth transitions
  const getGradientColors = (phase: Phase) => {
    switch (phase) {
      case 'initial':
        return {
          from: 'rgba(255, 247, 237, 0.8)', // retro-orange-50
          via: 'rgba(253, 249, 240, 0.9)', // retro-beige-100
          to: 'rgba(255, 247, 237, 0.8)', // retro-orange-50
        };
      case 'player':
        return {
          from: 'rgba(240, 249, 255, 0.8)', // retro-blue-50
          via: 'rgba(224, 242, 254, 0.9)', // retro-blue-100
          to: 'rgba(240, 249, 255, 0.8)', // retro-blue-50
        };
      case 'team':
        return {
          from: 'rgba(250, 245, 255, 0.8)', // retro-purple-50
          via: 'rgba(243, 232, 255, 0.9)', // retro-purple-100
          to: 'rgba(250, 245, 255, 0.8)', // retro-purple-50
        };
      case 'swiss':
        return {
          from: 'rgba(254, 252, 232, 0.8)', // retro-yellow-50
          via: 'rgba(254, 249, 195, 0.9)', // retro-yellow-100
          to: 'rgba(253, 249, 240, 0.8)', // retro-beige-50
        };
      case 'ko':
        return {
          from: 'rgba(236, 254, 255, 0.8)', // retro-cyan-50
          via: 'rgba(207, 250, 254, 0.9)', // retro-cyan-100
          to: 'rgba(240, 249, 255, 0.8)', // retro-blue-50
        };
      case 'summary':
        return {
          from: 'rgba(255, 251, 235, 0.8)', // retro-gold-50
          via: 'rgba(255, 236, 179, 0.9)', // retro-gold-100
          to: 'rgba(253, 249, 240, 0.8)', // retro-beige-50
        };
      default:
        return {
          from: 'rgba(253, 249, 240, 0.8)',
          via: 'rgba(253, 249, 240, 0.9)',
          to: 'rgba(253, 249, 240, 0.8)',
        };
    }
  };
  
  const gradientColors = getGradientColors(currentPhase);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error && !tournamentState) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-purple-100 flex items-center justify-center">
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


  return (
    <div className="min-h-screen relative" style={{ minHeight: '100vh' }}>
      {/* Animated gradient background */}
      <motion.div
        className="fixed inset-0 -z-10"
        initial={false}
        animate={{
          background: `linear-gradient(to bottom right, ${gradientColors.from}, ${gradientColors.via}, ${gradientColors.to})`,
        }}
        transition={{ duration: 1.2, ease: 'easeInOut' }}
        style={{ minHeight: '100vh' }}
      />
      
      {/* Base beige background */}
      <div className="fixed inset-0 -z-20 bg-retro-beige-100" style={{ minHeight: '100vh' }} />
      
      <motion.div 
        className="relative min-h-screen"
        initial={false}
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
            <InitialPhase
              onNextPhase={handleNextPhase}
              onReset={handleResetToInitial}
              onCreate={handleCreateTournament}
              isLoading={isLoading}
              tournamentState={tournamentState}
            />

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
                  matchDurationMinutes={swissMatchDuration || 10}
                />
              )}

            {/* KO Bracket Phase */}
            {tournamentState && currentPhaseNumber >= PhaseEnum.KO && (
              <KOPhase
                tournamentState={tournamentState}
                teams={tournamentState.teams || []}
                matchResults={matchResults}
                onMatchResultUpdate={setMatchResults}
                matchDurationMinutes={koMatchDuration || 10}
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

      {/* Tournament Settings Modal */}
      <TournamentSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSettingsSave}
        defaultSwissMinutes={swissMatchDuration || 10}
        defaultKoMinutes={koMatchDuration || 10}
        numTeams={tournamentState?.teams?.length || 0}
      />
      </motion.div>
    </div>
  );
}

export default App;
