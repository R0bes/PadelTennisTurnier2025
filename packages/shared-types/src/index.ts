import { z } from "zod";

export const PhaseSchema = z.enum([
  "registration",
  "team_setup",
  "swiss_rounds",
  "ko_bracket",
  "summary",
]);

export type Phase = z.infer<typeof PhaseSchema>;

export const PlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
});

export type Player = z.infer<typeof PlayerSchema>;

export const TournamentSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  players: z.array(PlayerSchema).optional(),
});

export type Tournament = z.infer<typeof TournamentSchema>;

export const TournamentStateSchema = z.object({
  id: z.string(),
  name: z.string(),
  phase: PhaseSchema,
  createdAt: z.string(),
  players: z.array(PlayerSchema),
  rounds: z.array(z.unknown()).optional(),
});

export type TournamentState = z.infer<typeof TournamentStateSchema>;

