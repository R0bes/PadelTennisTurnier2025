import { z } from "zod";

export const PhaseSchema = z.enum([
  "initial",
  "player",
  "team",
  "swiss",
  "ko",
  "summary",
]);

export type Phase = z.infer<typeof PhaseSchema>;

// Phase enum with numeric values representing the order
export enum PhaseEnum {
  Initial = 0,
  Player = 1,
  Team = 2,
  Swiss = 3,
  KO = 4,
  Summary = 5,
}

// Mapping from Phase string to PhaseEnum
export const PhaseToEnum: Record<Phase, PhaseEnum> = {
  initial: PhaseEnum.Initial,
  player: PhaseEnum.Player,
  team: PhaseEnum.Team,
  swiss: PhaseEnum.Swiss,
  ko: PhaseEnum.KO,
  summary: PhaseEnum.Summary,
};

// Mapping from PhaseEnum to Phase string
export const EnumToPhase: Record<PhaseEnum, Phase> = {
  [PhaseEnum.Initial]: "initial",
  [PhaseEnum.Player]: "player",
  [PhaseEnum.Team]: "team",
  [PhaseEnum.Swiss]: "swiss",
  [PhaseEnum.KO]: "ko",
  [PhaseEnum.Summary]: "summary",
};

// Helper function to get phase number
export function getPhaseNumber(phase: Phase): number {
  return PhaseToEnum[phase];
}

// Helper function to get phase from number
export function getPhaseFromNumber(phaseNumber: number): Phase | null {
  return EnumToPhase[phaseNumber as PhaseEnum] || null;
}

// Phase order array (ordered by PhaseEnum values)
export const PHASE_ORDER: Phase[] = [
  'initial',
  'player',
  'team',
  'swiss',
  'ko',
  'summary',
];

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  teamId: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
});

export type Player = z.infer<typeof PlayerSchema>;

export const TournamentSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  players: z.array(PlayerSchema).optional(),
});

export type Tournament = z.infer<typeof TournamentSchema>;

export const TeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  tournamentId: z.string(),
  playerIds: z.array(z.string()),
  createdAt: z.string(),
});
export type Team = z.infer<typeof TeamSchema>;

export const TournamentStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: PhaseSchema,
  createdAt: z.string(),
  players: z.array(PlayerSchema),
  teams: z.array(TeamSchema).optional(),
  rounds: z.array(z.unknown()).optional(),
});

export type TournamentState = z.infer<typeof TournamentStateSchema>;

