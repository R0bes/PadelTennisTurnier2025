import type {
  TournamentState,
  Phase,
  Player,
  Team,
} from '@tournament-app/shared-types';
import { TournamentStateSchema, PlayerSchema } from '@tournament-app/shared-types';
import { config } from '../config.js';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

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

