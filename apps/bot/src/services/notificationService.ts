import { Bot } from 'grammy';
import { getActiveTournament } from '../api/client.js';
import type { TournamentState, Team, Player } from '@tournament-app/shared-types';
import { normalizeTelegramUsername } from '../utils/linking.js';

export interface MatchInfo {
  matchKey: string;
  matchNumber: string;
  team1: Team | null;
  team2: Team | null;
  phase: 'swiss' | 'ko';
  round?: string;
}

export interface ReadyMatch extends MatchInfo {
  playerIds: string[];
  telegramUserIds: number[];
}

/**
 * Extract Telegram User IDs from players
 */
function extractTelegramUserIds(
  players: Player[],
  tournamentState: TournamentState
): Map<string, number> {
  const playerToTelegramId = new Map<string, number>();
  
  for (const player of players) {
    const telegramUsername = (player as any).telegramUsername;
    if (!telegramUsername) continue;
    
    // Extract user ID from telegramUsername format: "user_123456789" or "@username"
    if (telegramUsername.startsWith('user_')) {
      const userId = parseInt(telegramUsername.replace('user_', ''), 10);
      if (!isNaN(userId)) {
        playerToTelegramId.set(player.id, userId);
      }
    }
    // For username format, we'd need to look up the user ID from Telegram API
    // For now, we'll only support user_ format
  }
  
  return playerToTelegramId;
}

/**
 * Get all players from teams in a match
 */
function getPlayersFromMatch(
  match: MatchInfo,
  tournamentState: TournamentState
): Player[] {
  const playerIds = new Set<string>();
  
  if (match.team1) {
    const team1 = tournamentState.teams?.find(t => t.id === match.team1!.id);
    if (team1) {
      team1.playerIds.forEach(id => playerIds.add(id));
    }
  }
  
  if (match.team2) {
    const team2 = tournamentState.teams?.find(t => t.id === match.team2!.id);
    if (team2) {
      team2.playerIds.forEach(id => playerIds.add(id));
    }
  }
  
  return tournamentState.players.filter(p => playerIds.has(p.id));
}

/**
 * Get player names from team
 */
function getTeamPlayerNames(team: Team, tournamentState: TournamentState): string {
  const players = tournamentState.players.filter(p => team.playerIds.includes(p.id));
  return players.map(p => p.name).join(' & ') || team.name;
}

/**
 * Format match notification message
 */
function formatMatchNotification(
  match: ReadyMatch,
  tournamentState: TournamentState
): string {
  const team1Names = match.team1 
    ? getTeamPlayerNames(match.team1, tournamentState)
    : 'TBD';
    
  const team2Names = match.team2
    ? getTeamPlayerNames(match.team2, tournamentState)
    : 'TBD';
  
  let message = `🎾 *Du bist dran!*\n\n`;
  message += `Tournament: *${tournamentState.name}*\n`;
  message += `Match: *${match.matchNumber}*\n\n`;
  
  if (match.phase === 'swiss') {
    message += `Runde: ${match.round || '1'}\n\n`;
  } else if (match.phase === 'ko') {
    message += `Runde: ${match.round || 'Unknown'}\n\n`;
  }
  
  message += `*${team1Names}* vs *${team2Names}*\n\n`;
  message += `Viel Erfolg! 🏆`;
  
  return message;
}

/**
 * Send notification to a Telegram user
 */
async function sendNotification(
  bot: Bot,
  telegramUserId: number,
  message: string
): Promise<boolean> {
  try {
    await bot.api.sendMessage(telegramUserId, message, {
      parse_mode: 'Markdown',
    });
    return true;
  } catch (error) {
    console.error(`Failed to send notification to user ${telegramUserId}:`, error);
    return false;
  }
}

/**
 * Get ready matches from API
 */
export async function getReadyMatches(
  tournamentId: string
): Promise<ReadyMatch[]> {
  const { getReadyMatches: apiGetReadyMatches } = await import('../api/client.js');
  return await apiGetReadyMatches(tournamentId);
}

/**
 * Notify players about their ready matches
 */
export async function notifyPlayersAboutMatches(
  bot: Bot,
  tournamentState: TournamentState
): Promise<number> {
  const readyMatches = await getReadyMatches(tournamentState.id);
  
  if (readyMatches.length === 0) {
    return 0;
  }
  
  let notifiedCount = 0;
  const playerToTelegramId = extractTelegramUserIds(tournamentState.players, tournamentState);
  const notifiedMatches = new Set<string>(); // Track which matches we've already notified about
  
  for (const match of readyMatches) {
    // Skip if we've already notified about this match
    if (notifiedMatches.has(match.matchKey)) {
      continue;
    }
    
    const players = getPlayersFromMatch(match, tournamentState);
    
    for (const player of players) {
      const telegramUserId = playerToTelegramId.get(player.id);
      if (!telegramUserId) continue;
      
      const message = formatMatchNotification(
        {
          ...match,
          playerIds: players.map(p => p.id),
          telegramUserIds: players
            .map(p => playerToTelegramId.get(p.id))
            .filter((id): id is number => id !== undefined),
        },
        tournamentState
      );
      
      const sent = await sendNotification(bot, telegramUserId, message);
      if (sent) {
        notifiedCount++;
      }
    }
    
    // Mark this match as notified
    notifiedMatches.add(match.matchKey);
  }
  
  return notifiedCount;
}

/**
 * Start notification polling service
 * Checks for ready matches every N seconds
 */
export function startNotificationService(
  bot: Bot,
  intervalSeconds: number = 30
): NodeJS.Timeout {
  return setInterval(async () => {
    try {
      const tournamentState = await getActiveTournament();
      
      // Only check during swiss or ko phases
      if (tournamentState.phase !== 'swiss' && tournamentState.phase !== 'ko') {
        return;
      }
      
      await notifyPlayersAboutMatches(bot, tournamentState);
    } catch (error) {
      console.error('Error in notification service:', error);
    }
  }, intervalSeconds * 1000);
}

/**
 * Stop notification service
 */
export function stopNotificationService(intervalId: NodeJS.Timeout): void {
  clearInterval(intervalId);
}

