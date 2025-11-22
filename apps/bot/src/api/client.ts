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
      const error = await response.json();
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
}

export async function getReadyMatches(
  tournamentId: string
): Promise<ReadyMatch[]> {
  const data = await fetchJson<ReadyMatch[]>(
    `${config.apiBaseUrl}/tournaments/${tournamentId}/ready-matches`
  );
  return data;
}

