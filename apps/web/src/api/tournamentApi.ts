import type {
  TournamentState,
  Phase,
  Player,
  Team,
} from '@tournament-app/shared-types';
import { TournamentStateSchema, TeamSchema } from '@tournament-app/shared-types';

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
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = await response.json();
      errorMessage = error.error || errorMessage;
    } catch {
      // If response is not JSON, try to get text
      try {
        const text = await response.text();
        errorMessage = text || errorMessage;
      } catch {
        // Keep default error message
      }
    }
    throw new Error(errorMessage);
  }

  // Handle empty responses (e.g., 204 No Content)
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

export async function deletePlayer(
  tournamentId: string,
  playerId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tournaments/${tournamentId}/players/${playerId}`,
    {
      method: 'DELETE',
    }
  );

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
  // 204 No Content - no response body to parse
}

export async function createTeam(
  tournamentId: string,
  name: string
): Promise<Team> {
  const data = await fetchJson<Team>(
    `${API_BASE_URL}/tournaments/${tournamentId}/teams`,
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    }
  );

  TeamSchema.parse(data);
  return data;
}

export async function deleteTeam(
  tournamentId: string,
  teamId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tournaments/${tournamentId}/teams/${teamId}`,
    {
      method: 'DELETE',
    }
  );

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
  // 204 No Content - no response body to parse
}

export async function assignPlayerToTeam(
  tournamentId: string,
  teamId: string,
  playerId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tournaments/${tournamentId}/teams/${teamId}/assign-player`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ playerId }),
    }
  );

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
  // 204 No Content - no response body to parse
}

export async function unassignPlayer(
  tournamentId: string,
  playerId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tournaments/${tournamentId}/players/${playerId}/unassign`,
    {
      method: 'POST',
    }
  );

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
  // 204 No Content - no response body to parse
}

