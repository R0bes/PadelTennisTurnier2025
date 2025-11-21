import type {
  TournamentState,
  Phase,
  Player,
} from '@tournament-app/shared-types';
import { TournamentStateSchema } from '@tournament-app/shared-types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function createTournament(
  name: string
): Promise<TournamentState> {
  const data = await fetchJson<TournamentState>(`${API_BASE_URL}/tournaments`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  // Validate response
  TournamentStateSchema.parse(data);
  return data;
}

export async function getTournamentState(
  id: string
): Promise<TournamentState> {
  const data = await fetchJson<TournamentState>(
    `${API_BASE_URL}/tournaments/${id}/state`
  );

  // Validate response
  TournamentStateSchema.parse(data);
  return data;
}

export async function registerPlayer(
  tournamentId: string,
  name: string
): Promise<Player> {
  const data = await fetchJson<Player>(
    `${API_BASE_URL}/tournaments/${tournamentId}/register-player`,
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    }
  );

  return data;
}

export async function setPhase(
  tournamentId: string,
  phase: Phase
): Promise<TournamentState> {
  const data = await fetchJson<TournamentState>(
    `${API_BASE_URL}/tournaments/${tournamentId}/phase`,
    {
      method: 'POST',
      body: JSON.stringify({ phase }),
    }
  );

  // Validate response
  TournamentStateSchema.parse(data);
  return data;
}

