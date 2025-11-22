import type { Player } from '@tournament-app/shared-types';
import { getPlayerByTelegramUsername } from '../api/client.js';

export async function findPlayerByTelegramUsername(
  tournamentId: string,
  telegramUsername: string
): Promise<Player | null> {
  return await getPlayerByTelegramUsername(tournamentId, telegramUsername);
}

export function normalizeTelegramUsername(username: string): string {
  // Remove @ if present
  return username.replace(/^@/, '').toLowerCase();
}

