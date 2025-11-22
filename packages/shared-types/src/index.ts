import { z } from "zod";

export const PhaseSchema = z.enum([
  "registration",
  "team_setup",
  "match_setup",
  "swiss_rounds",
  "ko_bracket",
  "summary",
]);

export type Phase = z.infer<typeof PhaseSchema>;

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  teamId: z.string().nullable().optional(),
  telegramUsername: z.string().nullable().optional(),
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

