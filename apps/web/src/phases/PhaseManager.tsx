import { useCallback } from 'react';
import toast from 'react-hot-toast';
import type { Phase, TournamentState } from '@tournament-app/shared-types';
import { getPhaseConfig, formatPhaseName } from './phaseConfig';
import { phaseTransitionHandlers } from './phaseTransitions';

export type { PhaseTransitionHandler } from './PhaseInterface';

export interface PhaseManagerConfig {
  tournamentState: TournamentState | null;
  onStateUpdate: (state: TournamentState) => void;
  onError: (error: string) => void;
}

export function usePhaseManager({
  tournamentState,
  onStateUpdate,
  onError,
}: PhaseManagerConfig) {
  const handlePhaseChange = useCallback(
    async (newPhase: Phase) => {
      if (!tournamentState) return;

      try {
        // Get the transition handler for the target phase
        const handler = phaseTransitionHandlers[newPhase];
        
        if (!handler) {
          const message = `No transition handler found for phase: ${newPhase}`;
          onError(message);
          toast.error(message);
          return;
        }

        // Execute the transition handler
        const result = await handler(tournamentState);
        
        if (result) {
          onStateUpdate(result);
          toast.success(`Tournament phase changed to ${formatPhaseName(newPhase)}`);
        } else {
          // Handler returned null, meaning it handled the transition internally
          // Still show success message
          toast.success(`Tournament phase changed to ${formatPhaseName(newPhase)}`);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to change phase';
        onError(message);
        toast.error(message);
      }
    },
    [tournamentState, onStateUpdate, onError]
  );

  const getNextPhase = useCallback((): Phase | null => {
    if (!tournamentState) return null;
    const config = getPhaseConfig(tournamentState.phase);
    return config.nextPhase;
  }, [tournamentState]);

  return {
    handlePhaseChange,
    getNextPhase,
    currentPhase: tournamentState?.phase || 'initial',
    phaseConfig: tournamentState ? getPhaseConfig(tournamentState.phase) : null,
  };
}
