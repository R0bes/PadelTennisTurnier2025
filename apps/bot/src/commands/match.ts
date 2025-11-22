import { Context, InlineKeyboard } from 'grammy';
import {
  getActiveTournament,
  getReadyMatches,
  reportMatchResult,
  confirmMatchResult,
  resolveDisputedMatch,
  getPendingConfirmations,
} from '../api/client.js';
import { normalizeTelegramUsername } from '../utils/linking.js';
import { isAdmin } from '../utils/adminManager.js';

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
 * Get player's team
 */
function getPlayerTeam(tournamentState: any, playerId: string): any | null {
  if (!tournamentState.teams) return null;
  return tournamentState.teams.find((t: any) =>
    t.playerIds.includes(playerId)
  );
}

/**
 * Get matches for a player
 */
function getPlayerMatches(
  tournamentState: any,
  playerId: string
): Array<{ matchKey: string; matchNumber: string; team1: any; team2: any; phase: string; round?: string }> {
  const playerTeam = getPlayerTeam(tournamentState, playerId);
  if (!playerTeam) return [];

  // Get all ready matches
  // In a real implementation, we'd call the API
  // For now, we'll return matches where the player's team is involved
  return [];
}

/**
 * Handle /reportmatch command
 */
export async function handleReportMatch(ctx: Context) {
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

    // Get player's matches
    const readyMatches = await getReadyMatches(tournamentState.id);
    const playerTeam = getPlayerTeam(tournamentState, player.id);
    
    if (!playerTeam) {
      await ctx.reply('❌ Du bist keinem Team zugeordnet.');
      return;
    }

    // Filter matches where player's team is involved
    const playerMatches = readyMatches.filter(
      (m) =>
        (m.team1 && m.team1.id === playerTeam.id) ||
        (m.team2 && m.team2.id === playerTeam.id)
    );

    if (playerMatches.length === 0) {
      await ctx.reply('❌ Du hast aktuell keine Matches zum Melden.');
      return;
    }

    // Show matches to choose from
    const keyboard = new InlineKeyboard();
    playerMatches.forEach((match) => {
      const opponent = match.team1?.id === playerTeam.id ? match.team2 : match.team1;
      const matchLabel = `${match.matchNumber} vs ${opponent?.name || 'TBD'}`;
      keyboard.text(matchLabel, `report_match_${match.matchKey}_${userId}`);
      keyboard.row();
    });

    await ctx.reply(
      '📊 Wähle ein Match, für das du das Ergebnis melden möchtest:',
      { reply_markup: keyboard }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

/**
 * Handle match result reporting (score input)
 */
export async function handleReportMatchScore(ctx: Context, matchKey: string) {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `📊 *Ergebnis melden*\n\n` +
      `Match: ${matchKey}\n\n` +
      `Bitte sende das Ergebnis im Format:\n` +
      `\`6-4, 6-3\` (für zwei Sätze)\n` +
      `oder\n` +
      `\`6-4, 3-6, 6-2\` (für drei Sätze)\n\n` +
      `Beispiel: \`6-4, 6-3\``,
    { parse_mode: 'Markdown' }
  );
}

/**
 * Process score input and ask for winner
 */
export async function handleScoreInput(
  ctx: Context,
  matchKey: string,
  score: string
) {
  const userId = getTelegramUserId(ctx);
  if (!userId) {
    await ctx.reply('❌ Konnte deine Telegram-Daten nicht ermitteln.');
    return;
  }

  try {
    const tournamentState = await getActiveTournament();
    const player = getPlayerByTelegramId(tournamentState, userId);
    const playerTeam = getPlayerTeam(tournamentState, player.id);

    if (!player || !playerTeam) {
      await ctx.reply('❌ Spieler oder Team nicht gefunden.');
      return;
    }

    const readyMatches = await getReadyMatches(tournamentState.id);
    const match = readyMatches.find((m) => m.matchKey === matchKey);

    if (!match) {
      await ctx.reply('❌ Match nicht gefunden.');
      return;
    }

    const opponent = match.team1?.id === playerTeam.id ? match.team2 : match.team1;

    // Ask for winner
    const keyboard = new InlineKeyboard()
      .text(`🏆 ${playerTeam.name}`, `winner_${matchKey}_${playerTeam.id}_${score}_${userId}`)
      .row()
      .text(`🏆 ${opponent?.name || 'Gegner'}`, `winner_${matchKey}_${opponent?.id || ''}_${score}_${userId}`);

    await ctx.reply(
      `📊 Wer hat gewonnen?\n\n` +
        `Ergebnis: *${score}*`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

/**
 * Submit match result
 */
export async function handleSubmitResult(
  ctx: Context,
  matchKey: string,
  score: string,
  winnerId: string
) {
  const userId = getTelegramUserId(ctx);
  if (!userId) {
    await ctx.answerCallbackQuery('Fehler: User ID nicht gefunden');
    return;
  }

  try {
    const tournamentState = await getActiveTournament();
    const result = await reportMatchResult(
      tournamentState.id,
      matchKey,
      String(userId),
      score,
      winnerId
    );

    await ctx.answerCallbackQuery('✅ Ergebnis gemeldet!');

    // Notify opponent if confirmation is needed
    if (result.needsConfirmation) {
      const { notifyOpponentResultReported } = await import('../services/notificationService.js');
      const player = getPlayerByTelegramId(tournamentState, userId);
      if (player) {
        const playerTeam = getPlayerTeam(tournamentState, player.id);
        if (playerTeam) {
          await notifyOpponentResultReported(
            ctx.api as any, // Bot instance
            tournamentState,
            matchKey,
            playerTeam.id
          );
        }
      }

      const { InlineKeyboard } = await import('grammy');
      const { createPlayerActionButtons } = await import('../utils/keyboards.js');
      const keyboard = createPlayerActionButtons(userId);
      
      await ctx.editMessageText(
        `✅ *Ergebnis gemeldet!*\n\n` +
          `Match: ${matchKey}\n` +
          `Ergebnis: *${score}*\n\n` +
          `Das gegnerische Team wird zur Bestätigung aufgefordert.`,
        { 
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        }
      );
    } else if (result.isDisputed) {
      await ctx.editMessageText(
        `⚠️ *Widerspruch erkannt!*\n\n` +
          `Match: ${matchKey}\n` +
          `Ergebnis: *${score}*\n\n` +
          `Die Admins werden benachrichtigt und entscheiden über das Ergebnis.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.editMessageText(
        `✅ *Ergebnis bestätigt!*\n\n` +
          `Match: ${matchKey}\n` +
          `Ergebnis: *${score}*\n\n` +
          `Das Ergebnis wurde automatisch bestätigt.`,
        { parse_mode: 'Markdown' }
      );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.answerCallbackQuery('Fehler beim Melden');
    await ctx.editMessageText(`❌ Fehler: ${errorMessage}`);
  }
}

/**
 * Handle /confirmations command - show pending confirmations
 */
export async function handleConfirmations(ctx: Context) {
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

    const pending = await getPendingConfirmations(tournamentState.id, player.id);

    if (pending.length === 0) {
      const { InlineKeyboard } = await import('grammy');
      const { createPlayerActionButtons } = await import('../utils/keyboards.js');
      const keyboard = createPlayerActionButtons(userId);
      
      await ctx.reply('✅ Keine ausstehenden Bestätigungen.', {
        reply_markup: keyboard,
      });
      return;
    }

    let message = `📋 *Ausstehende Bestätigungen:*\n\n`;
    const keyboard = new InlineKeyboard();

    pending.forEach((confirmation, index) => {
      message += `${index + 1}. Match: *${confirmation.matchKey}*\n`;
      message += `   Ergebnis: *${confirmation.score}*\n\n`;

      keyboard
        .text(`👍 Bestätigen`, `confirm_${confirmation.resultId}_${userId}`)
        .text(`👎 Widersprechen`, `dispute_${confirmation.resultId}_${userId}`);
      keyboard.row();
    });
    
    // Add help button
    keyboard.text('❓ Hilfe', 'help_confirmations');

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
 * Handle confirmation/dispute
 */
export async function handleConfirmResult(
  ctx: Context,
  resultId: string,
  confirmed: boolean
) {
  const userId = getTelegramUserId(ctx);
  if (!userId) {
    await ctx.answerCallbackQuery('Fehler: User ID nicht gefunden');
    return;
  }

  try {
    const tournamentState = await getActiveTournament();
    const result = await confirmMatchResult(
      tournamentState.id,
      resultId,
      String(userId),
      confirmed
    );

    await ctx.answerCallbackQuery(
      confirmed ? 'Ergebnis bestätigt!' : 'Widerspruch gemeldet!'
    );

    // Check if KO round is completed after confirmation
    if (confirmed) {
      try {
        const tournamentState = await getActiveTournament();
        if (tournamentState.phase === 'ko') {
          const { Bot } = await import('grammy');
          const { config } = await import('../config.js');
          const bot = new Bot(config.botToken);
          const { checkKORoundCompletion } = await import('../services/koRoundBroadcast.js');
          // Check asynchronously without blocking
          checkKORoundCompletion(bot).catch(console.error);
        }
      } catch (error) {
        console.error('Error checking KO round completion:', error);
      }
    }

    const { InlineKeyboard } = await import('grammy');
    const { createPlayerActionButtons } = await import('../utils/keyboards.js');
    const keyboard = createPlayerActionButtons(userId);
    
    await ctx.editMessageText(
      confirmed
        ? `✅ *Ergebnis bestätigt!*\n\nDas Ergebnis wurde erfolgreich bestätigt.`
        : `⚠️ *Widerspruch gemeldet!*\n\nDie Admins werden benachrichtigt und entscheiden über das Ergebnis.`,
      { 
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.answerCallbackQuery('Fehler');
    await ctx.editMessageText(`❌ Fehler: ${errorMessage}`);
  }
}

/**
 * Handle /disputes command (admin only) - show disputed matches
 */
export async function handleDisputes(ctx: Context) {
  const userId = getTelegramUserId(ctx);
  if (!userId || !(await isAdmin(userId))) {
    await ctx.reply('❌ Du hast keine Berechtigung für diesen Befehl.');
    return;
  }

  // TODO: Implement API endpoint for getting disputed matches
  await ctx.reply('⚠️ Feature noch nicht implementiert.');
}

/**
 * Handle dispute resolution (admin only)
 */
export async function handleResolveDispute(
  ctx: Context,
  resultId: string,
  score: string,
  winnerId: string
) {
  const userId = getTelegramUserId(ctx);
  if (!userId || !(await isAdmin(userId))) {
    await ctx.answerCallbackQuery('Keine Berechtigung');
    return;
  }

  try {
    const tournamentState = await getActiveTournament();
    const result = await resolveDisputedMatch(
      tournamentState.id,
      resultId,
      String(userId),
      score,
      winnerId
    );

    await ctx.answerCallbackQuery('Widerspruch gelöst!');
    await ctx.editMessageText(
      `✅ *Widerspruch gelöst!*\n\n` +
        `Ergebnis: *${score}*\n` +
        `Gewinner: [Team ID]\n\n` +
        `Das Ergebnis wurde final festgelegt.`,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.answerCallbackQuery('Fehler');
    await ctx.editMessageText(`❌ Fehler: ${errorMessage}`);
  }
}

