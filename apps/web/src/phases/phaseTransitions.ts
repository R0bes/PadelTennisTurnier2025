import toast from 'react-hot-toast';
import type { Phase, TournamentState } from '@tournament-app/shared-types';
import { setPhase, getTournamentState } from '../api/tournamentApi';
import type { PhaseTransitionHandler } from './PhaseInterface';

// Generic transition handler for most phases - just changes the phase
async function genericPhaseTransition(
  tournamentId: string,
  targetPhase: Phase
): Promise<TournamentState> {
  await setPhase(tournamentId, targetPhase);
  return await getTournamentState(tournamentId);
}

// Special transition handler for team phase - just changes the phase
// Teams will be created in the background by the TeamPhase component
async function teamPhaseTransition(currentState: TournamentState): Promise<TournamentState | null> {
  try {
    await setPhase(currentState.id, 'team');
    return await getTournamentState(currentState.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to transition to team phase';
    toast.error(message);
    throw error;
  }
}

// Create transition handlers for all phases
export const phaseTransitionHandlers: Record<Phase, PhaseTransitionHandler> = {
  initial: async (currentState) => {
    try {
      return await genericPhaseTransition(currentState.id, 'initial');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transition to initial phase';
      toast.error(message);
      throw error;
    }
  },
  player: async (currentState) => {
    try {
      return await genericPhaseTransition(currentState.id, 'player');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transition to player phase';
      toast.error(message);
      throw error;
    }
  },
  team: teamPhaseTransition,
  swiss: async (currentState) => {
    try {
      return await genericPhaseTransition(currentState.id, 'swiss');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transition to swiss phase';
      toast.error(message);
      throw error;
    }
  },
  ko: async (currentState) => {
    try {
      return await genericPhaseTransition(currentState.id, 'ko');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transition to KO phase';
      toast.error(message);
      throw error;
    }
  },
  summary: async (currentState) => {
    try {
      return await genericPhaseTransition(currentState.id, 'summary');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to transition to summary phase';
      toast.error(message);
      throw error;
    }
  },
};
