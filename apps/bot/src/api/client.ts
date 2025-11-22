import type {
  TournamentState,
  Phase,
  Player,
  Team,
} from '@tournament-app/shared-types';
import { TournamentStateSchema, PlayerSchema } from '@tournament-app/shared-types';
import { config } from '../config.js';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  } catch (error) {
    // Handle network errors (connection refused, timeout, etc.)
    if (error instanceof TypeError) {
      throw new Error(`API-Verbindung fehlgeschlagen. Bitte stelle sicher, dass die API auf ${config.apiBaseUrl} läuft.`);
    }
    throw error;
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error: any = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
        // Keep default error message
      }
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    return {} as T;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getTournamentState(
  tournamentId: string
): Promise<TournamentState> {
  const data = await fetchJson<TournamentState>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/state`
  );
  TournamentStateSchema.parse(data);
  return data;
}

export async function setPhase(
  tournamentId: string,
  phase: Phase
): Promise<TournamentState> {
  const data = await fetchJson<TournamentState>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/phase`,
    {
      method: 'POST',
      body: JSON.stringify({ phase }),
    }
  );
  TournamentStateSchema.parse(data);
  return data;
}

export async function getPlayerByTelegramUsername(
  tournamentId: string,
  telegramUsername: string
): Promise<Player | null> {
  try {
    const state = await getTournamentState(tournamentId);
    const player = state.players.find(
      (p) => (p as any).telegramUsername === telegramUsername
    );
    return player || null;
  } catch (error) {
    return null;
  }
}

export async function linkPlayerToTelegram(
  tournamentId: string,
  playerId: string,
  telegramUsername: string
): Promise<Player> {
  const data = await fetchJson<Player>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/players/${playerId}/link-telegram`,
    {
      method: 'POST',
      body: JSON.stringify({ telegramUsername }),
    }
  );
  PlayerSchema.parse(data);
  return data;
}

export async function getActiveTournament(): Promise<TournamentState> {
  const data = await fetchJson<TournamentState>(
    `${config.apiBaseUrl}/tournaments/active`
  );
  TournamentStateSchema.parse(data);
  return data;
}

export async function registerPlayer(
  tournamentId: string,
  name: string
): Promise<Player> {
  const data = await fetchJson<Player>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/register-player`,
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    }
  );
  PlayerSchema.parse(data);
  return data;
}

export async function setPlayerAvatar(
  tournamentId: string,
  playerId: string,
  avatarUrl: string
): Promise<Player> {
  const data = await fetchJson<Player>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/players/${playerId}/avatar`,
    {
      method: 'POST',
      body: JSON.stringify({ avatarUrl }),
    }
  );
  PlayerSchema.parse(data);
  return data;
}

export interface ReadyMatch {
  matchKey: string;
  matchNumber: string;
  team1: { id: string; name: string; playerIds: string[] } | null;
  team2: { id: string; name: string; playerIds: string[] } | null;
  phase: 'swiss' | 'ko';
  round?: string;
  playerIds?: string[];
  telegramUserIds?: number[];
}

export async function getReadyMatches(
  tournamentId: string
): Promise<ReadyMatch[]> {
  const data = await fetchJson<ReadyMatch[]>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/ready-matches`
  );
  return data;
}

export interface MatchResultReport {
  id: string;
  matchKey: string;
  score: string;
  winnerId: string | null;
  status: 'pending' | 'confirmed' | 'disputed' | 'resolved';
  needsConfirmation: boolean;
  isDisputed: boolean;
}

export interface PendingConfirmation {
  resultId: string;
  matchKey: string;
  score: string;
  winnerId: string | null;
  reportedBy: string;
}

export async function reportMatchResult(
  tournamentId: string,
  matchKey: string,
  reportedBy: string,
  score: string,
  winnerId: string | null,
  duration?: string
): Promise<MatchResultReport> {
  const data = await fetchJson<MatchResultReport>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/report-result`,
    {
      method: 'POST',
      body: JSON.stringify({
        matchKey,
        reportedBy,
        score,
        winnerId,
        duration,
      }),
    }
  );
  return data;
}

export async function confirmMatchResult(
  tournamentId: string,
  resultId: string,
  confirmedBy: string,
  confirmed: boolean
): Promise<{ success: boolean; status: string }> {
  const data = await fetchJson<{ success: boolean; status: string }>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/results/${resultId}/confirm`,
    {
      method: 'POST',
      body: JSON.stringify({
        confirmedBy,
        confirmed,
      }),
    }
  );
  return data;
}

export async function resolveDisputedMatch(
  tournamentId: string,
  resultId: string,
  resolvedBy: string,
  score: string,
  winnerId: string | null
): Promise<{ success: boolean; status: string }> {
  const data = await fetchJson<{ success: boolean; status: string }>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/results/${resultId}/resolve`,
    {
      method: 'POST',
      body: JSON.stringify({
        resolvedBy,
        score,
        winnerId,
      }),
    }
  );
  return data;
}

export async function getPendingConfirmations(
  tournamentId: string,
  playerId: string
): Promise<PendingConfirmation[]> {
  const data = await fetchJson<PendingConfirmation[]>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/pending-confirmations?playerId=${playerId}`
  );
  return data;
}

export interface PlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  points: number;
}

export interface LeaderboardEntry {
  playerId?: string;
  playerName?: string;
  teamId?: string;
  teamName?: string;
  id?: string;
  name?: string;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  points: number;
}

export async function getPlayerStats(
  tournamentId: string,
  playerId: string
): Promise<PlayerStats> {
  const data = await fetchJson<PlayerStats>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/players/${playerId}/stats`
  );
  return data;
}

export async function getLeaderboard(
  tournamentId: string,
  type: 'players' | 'teams' = 'players'
): Promise<LeaderboardEntry[]> {
  const data = await fetchJson<LeaderboardEntry[]>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/leaderboard?type=${type}`
  );
  return data;
}

export async function getPodium(
  tournamentId: string,
  type: 'players' | 'teams' = 'players'
): Promise<Array<LeaderboardEntry & { position: number }>> {
  const data = await fetchJson<Array<LeaderboardEntry & { position: number }>>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/podium?type=${type}`
  );
  return data;
}

export async function broadcastMessage(
  tournamentId: string,
  message: string,
  sentBy: string
): Promise<{
  success: boolean;
  recipientsCount: number;
  recipients: Array<{ playerId: string; playerName: string; telegramUsername: string }>;
}> {
  const data = await fetchJson<{
    success: boolean;
    recipientsCount: number;
    recipients: Array<{ playerId: string; playerName: string; telegramUsername: string }>;
  }>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/broadcast`,
    {
      method: 'POST',
      body: JSON.stringify({ message, sentBy }),
    }
  );
  return data;
}

