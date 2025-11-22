import { Bot } from 'grammy';
import { getActiveTournament, broadcastMessage } from '../api/client.js';
import { config } from '../config.js';

/**
 * Check KO round completion and send broadcasts
 * This should be called periodically or after match results are confirmed
 */
export async function checkKORoundCompletion(bot: Bot): Promise<void> {
  try {
    const tournamentState = await getActiveTournament();
    
    if (tournamentState.phase !== 'ko') {
      return;
    }

    // Get all matches and their results
    const { getReadyMatches } = await import('../api/client.js');
    const readyMatches = await getReadyMatches(tournamentState.id);
    
    if (readyMatches.length === 0) {
      return;
    }

    const roundNames: Record<string, string> = {
      'Quarterfinals': 'QF',
      'Semifinals': 'SF',
      'Final': 'F',
    };

    const roundOrder = ['Quarterfinals', 'Semifinals', 'Final'];
    
    // Check each round
    for (let i = 0; i < roundOrder.length - 1; i++) {
      const currentRound = roundOrder[i];
      const nextRound = roundOrder[i + 1];
      
      const currentRoundMatches = readyMatches.filter(
        m => m.phase === 'ko' && m.round === currentRound
      );

      // Check if all matches in current round have results
      // This is simplified - in reality, we'd check the database for confirmed results
      // For now, we'll check if there are any ready matches in the next round
      const nextRoundMatches = readyMatches.filter(
        m => m.phase === 'ko' && m.round === nextRound
      );

      // If next round has ready matches and current round doesn't, current round is complete
      if (nextRoundMatches.length > 0 && currentRoundMatches.length === 0) {
        let broadcastMsg = '';
        
        if (nextRound === 'Semifinals') {
          broadcastMsg =
            `🏆 *Halbfinale startet!*\n\n` +
            `Tournament: *${tournamentState.name}*\n\n` +
            `Die Viertelfinals sind abgeschlossen!\n` +
            `Die Halbfinals beginnen jetzt! 🎾`;
        } else if (nextRound === 'Final') {
          broadcastMsg =
            `🏆 *Finale startet!*\n\n` +
            `Tournament: *${tournamentState.name}*\n\n` +
            `Die Halbfinals sind abgeschlossen!\n` +
            `Das große Finale beginnt jetzt! 🏆🎾`;
        }

        if (broadcastMsg) {
          await sendKORoundBroadcast(bot, tournamentState.id, broadcastMsg);
        }
      }
    }
  } catch (error) {
    console.error('Error checking KO round completion:', error);
  }
}

/**
 * Send broadcast for KO round start
 */
async function sendKORoundBroadcast(
  bot: Bot,
  tournamentId: string,
  message: string
): Promise<void> {
  try {
    const result = await broadcastMessage(tournamentId, message, 'system');

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of result.recipients) {
      try {
        let telegramUserId: number | null = null;
        if (recipient.telegramUsername.startsWith('user_')) {
          telegramUserId = parseInt(recipient.telegramUsername.replace('user_', ''), 10);
        }

        if (telegramUserId && !isNaN(telegramUserId)) {
          await bot.api.sendMessage(telegramUserId, message, {
            parse_mode: 'Markdown',
          });
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        console.error(`Failed to send KO round broadcast to ${recipient.telegramUsername}:`, error);
      }
    }

    console.log(`KO round broadcast sent to ${sentCount} players (${failedCount} failed)`);
  } catch (error) {
    console.error('Error sending KO round broadcast:', error);
  }
}

