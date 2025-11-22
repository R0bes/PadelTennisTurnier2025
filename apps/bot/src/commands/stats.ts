import { Context } from 'grammy';
import {
  getActiveTournament,
  getPlayerStats,
  getLeaderboard,
  getPodium,
} from '../api/client.js';
import { normalizeTelegramUsername } from '../utils/linking.js';

/**
 * Get player's Telegram User ID
 */
function getTelegramUserId(ctx: Context): number | null {
  return ctx.from?.id || null;
}

/**
 * Get player from tournament state by Telegram User ID
 */
function getPlayerByTelegramId(
  tournamentState: any,
  telegramUserId: number
): any | null {
  const telegramIdentifier = `user_${telegramUserId}`;
  return tournamentState.players.find(
    (p: any) =>
      p.telegramUsername === telegramIdentifier ||
      p.telegramUsername?.endsWith(String(telegramUserId))
  );
}

/**
 * Handle /stats command - show personal statistics
 */
export async function handleStats(ctx: Context) {
  const userId = getTelegramUserId(ctx);
  if (!userId) {
    await ctx.reply('❌ Konnte deine Telegram-Daten nicht ermitteln.');
    return;
  }

  try {
    const tournamentState = await getActiveTournament();
    const player = getPlayerByTelegramId(tournamentState, userId);

    if (!player) {
      await ctx.reply(
        '❌ Du bist nicht registriert. Bitte verwende /register zuerst.'
      );
      return;
    }

    const stats = await getPlayerStats(tournamentState.id, player.id);

    const message =
      `📊 *Deine Statistiken*\n\n` +
      `👤 Spieler: *${stats.playerName}*\n` +
      `👥 Team: *${stats.teamName}*\n\n` +
      `📈 *Match-Statistiken:*\n` +
      `🎮 Gespielt: *${stats.matchesPlayed}*\n` +
      `✅ Gewonnen: *${stats.wins}*\n` +
      `❌ Verloren: *${stats.losses}*\n` +
      `📊 Gewinnrate: *${stats.winRate}%*\n` +
      `🏆 Punkte: *${stats.points}*\n\n` +
      `_Basierend auf bestätigten Match-Ergebnissen_`;

    // Add action buttons
    const { InlineKeyboard } = await import('grammy');
    const { createPlayerActionButtons } = await import('../utils/keyboards.js');
    const keyboard = createPlayerActionButtons(userId);

    await ctx.reply(message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

/**
 * Handle /leaderboard command - show leaderboard
 */
export async function handleLeaderboard(ctx: Context, type: 'players' | 'teams' = 'players') {
  try {
    const tournamentState = await getActiveTournament();
    const leaderboard = await getLeaderboard(tournamentState.id, type);

    if (leaderboard.length === 0) {
      await ctx.reply('📊 Noch keine Statistiken verfügbar.');
      return;
    }

    const typeLabel = type === 'players' ? 'Spieler' : 'Teams';
    let message = `🏆 *${typeLabel}-Rangliste*\n\n`;

    leaderboard.slice(0, 20).forEach((entry, index) => {
      const name = entry.playerName || entry.teamName || entry.name || 'Unbekannt';
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      
      message += `${medal} *${name}*\n`;
      message += `   📊 ${entry.matchesPlayed} Matches | `;
      message += `✅ ${entry.wins}W | `;
      message += `❌ ${entry.losses}L | `;
      message += `📈 ${entry.winRate}% | `;
      message += `🏆 ${entry.points} Pkt\n\n`;
    });

    if (leaderboard.length > 20) {
      message += `_Zeige Top 20 von ${leaderboard.length}_`;
    }

    // Add action buttons
    const { InlineKeyboard } = await import('grammy');
    const userId = ctx.from?.id || 0;
    const keyboard = new InlineKeyboard()
      .text('🏆 Podium', `action_podium_${type}`)
      .text('📊 Meine Stats', `action_stats_${userId}`)
      .row();
    
    if (type === 'players') {
      keyboard.text('👥 Team-Rangliste', `action_teamleaderboard_${userId}`);
    } else {
      keyboard.text('👤 Spieler-Rangliste', `action_leaderboard_${userId}`);
    }
    
    keyboard
      .row()
      .text('⬅️ Zurück', 'action_start')
      .text('❓ Hilfe', 'help_stats');

    await ctx.reply(message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

/**
 * Handle /podium command - show top 3
 */
export async function handlePodium(ctx: Context, type: 'players' | 'teams' = 'players') {
  try {
    const tournamentState = await getActiveTournament();
    const podium = await getPodium(tournamentState.id, type);

    if (podium.length === 0) {
      await ctx.reply('🏆 Noch keine Platzierungen verfügbar.');
      return;
    }

    const typeLabel = type === 'players' ? 'Spieler' : 'Teams';
    let message = `🏆 *Podium - Top 3 ${typeLabel}*\n\n`;

    podium.forEach((entry) => {
      const name = entry.playerName || entry.teamName || entry.name || 'Unbekannt';
      const medal =
        entry.position === 1
          ? '🥇'
          : entry.position === 2
          ? '🥈'
          : '🥉';

      message += `${medal} *Platz ${entry.position}: ${name}*\n`;
      message += `   📊 ${entry.matchesPlayed} Matches | `;
      message += `✅ ${entry.wins}W | `;
      message += `❌ ${entry.losses}L | `;
      message += `📈 ${entry.winRate}% | `;
      message +=       `🏆 ${entry.points} Pkt\n\n`;
    });

    // Add action buttons
    const { InlineKeyboard } = await import('grammy');
    const userId = ctx.from?.id || 0;
    const keyboard = new InlineKeyboard()
      .text('🏆 Rangliste', `action_leaderboard_${type}`)
      .text('📊 Meine Stats', `action_stats_${userId}`)
      .row()
      .text('⬅️ Zurück', 'action_start')
      .text('❓ Hilfe', 'help_stats');

    await ctx.reply(message, { 
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

