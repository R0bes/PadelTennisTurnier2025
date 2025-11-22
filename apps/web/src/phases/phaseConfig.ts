import type { Phase } from '@tournament-app/shared-types';
import { initialPhaseConfig } from './1_InitialPhase';
import { playerPhaseConfig } from './2_PlayerPhase';
import { teamPhaseConfig } from './3_TeamPhase';
import { swissPhaseConfig } from './4_SwissPhase';
import { koPhaseConfig } from './5_KOPhase';
import { summaryPhaseConfig } from './6_SummaryPhase';
import type { PhaseConfig } from './PhaseInterface';

// Aggregate all phase configurations
export const PHASE_CONFIGS: Record<Phase, PhaseConfig> = {
  initial: initialPhaseConfig,
  player: playerPhaseConfig,
  team: teamPhaseConfig,
  swiss: swissPhaseConfig,
  ko: koPhaseConfig,
  summary: summaryPhaseConfig,
};

export function getPhaseConfig(phase: Phase): PhaseConfig {
  return PHASE_CONFIGS[phase];
}

export function getNextPhase(currentPhase: Phase): Phase | null {
  return PHASE_CONFIGS[currentPhase]?.nextPhase || null;
}

export function formatPhaseName(phase: Phase): string {
  return phase.replace(/_/g, ' ');
}
