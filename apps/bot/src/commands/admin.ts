import { Context } from 'grammy';
import { getTournamentState, setPhase, getActiveTournament } from '../api/client.js';
import { formatTournamentStatus, formatTeamList, formatPhaseList } from '../utils/formatters.js';
import { isAdmin, addAdmin, removeAdmin, listAdmins } from '../utils/adminManager.js';
import type { Phase } from '@tournament-app/shared-types';

async function getTournamentIdOrActive(args: string[]): Promise<string> {
  const tournamentId = args[1];
  if (tournamentId) {
    return tournamentId;
  }
  // Get active tournament if no ID provided
  const activeTournament = await getActiveTournament();
  return activeTournament.id;
}

export async function handleTournament(ctx: Context) {
  if (!(await isAdmin(ctx.from?.id))) {
    await ctx.reply('❌ Du hast keine Berechtigung für diesen Befehl. Nur Admins können diesen Befehl verwenden.');
    return;
  }

  const args = ctx.message?.text?.split(' ') || [];

  try {
    const tournamentId = await getTournamentIdOrActive(args);
    const state = await getTournamentState(tournamentId);
    const message = formatTournamentStatus(state);
    
    // Add action buttons
    const { InlineKeyboard } = await import('grammy');
    const { createAdminActionButtons } = await import('../utils/keyboards.js');
    const userId = ctx.from?.id;
    if (userId) {
      const keyboard = createAdminActionButtons(userId);
      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handlePhase(ctx: Context) {
  if (!(await isAdmin(ctx.from?.id))) {
    await ctx.reply('❌ Du hast keine Berechtigung für diesen Befehl. Nur Admins können Phasen ändern.');
    return;
  }

  const args = ctx.message?.text?.split(' ') || [];
  const phase = args[1] as Phase;

  if (!phase) {
    const { InlineKeyboard } = await import('grammy');
    const { createPhaseButtons } = await import('../utils/keyboards.js');
    const userId = ctx.from?.id;
    
    if (userId) {
      const keyboard = createPhaseButtons(userId);
      await ctx.reply(
        '⚙️ *Phase ändern*\n\n' +
        'Wähle eine Phase:\n\n' +
        formatPhaseList(),
        {
          parse_mode: 'Markdown',
          reply_markup: keyboard,
        }
      );
    } else {
      await ctx.reply('❌ Bitte gib eine Phase an:\n/phase <phase>\n\n' + formatPhaseList());
    }
    return;
  }

  try {
    const tournamentId = await getTournamentIdOrActive(args);
    const oldState = await getTournamentState(tournamentId);
    const newState = await setPhase(tournamentId, phase);
    
    // Send automatic broadcasts for phase transitions
    await sendPhaseTransitionBroadcast(ctx, oldState.phase, newState.phase, newState);
    
    const message = `✅ Phase erfolgreich geändert!\n\n${formatTournamentStatus(newState)}`;
    
    // Add action buttons
    const { InlineKeyboard } = await import('grammy');
    const { createAdminActionButtons } = await import('../utils/keyboards.js');
    const userId = ctx.from?.id;
    if (userId) {
      const keyboard = createAdminActionButtons(userId);
      await ctx.reply(message, { 
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

/**
 * Send broadcast for phase transitions
 */
async function sendPhaseTransitionBroadcast(
  ctx: Context,
  oldPhase: Phase,
  newPhase: Phase,
  tournamentState: any
): Promise<void> {
  let broadcastMessage = '';

  // Tournament start (swiss phase)
  if (oldPhase !== 'swiss' && newPhase === 'swiss') {
    broadcastMessage =
      `🏆 *Turnier gestartet!*\n\n` +
      `Tournament: *${tournamentState.name}*\n\n` +
      `Die Swiss-Runden beginnen jetzt!\n` +
      `Viel Erfolg allen Teilnehmern! 🎾`;
  }
  // KO Phase start (Quarterfinals)
  else if (oldPhase !== 'ko' && newPhase === 'ko') {
    broadcastMessage =
      `🏆 *Viertelfinale startet!*\n\n` +
      `Tournament: *${tournamentState.name}*\n\n` +
      `Die KO-Phase beginnt mit den Viertelfinals!\n` +
      `Viel Erfolg! 🎾`;
  }

  if (broadcastMessage) {
    try {
      const { broadcastMessage: broadcastApi } = await import('../api/client.js');
      const userId = ctx.from?.id;
      if (!userId) return;

      const result = await broadcastApi(
        tournamentState.id,
        broadcastMessage,
        String(userId)
      );

      // Send to all recipients
      const botApi = ctx.api;
      let sentCount = 0;

      for (const recipient of result.recipients) {
        try {
          let telegramUserId: number | null = null;
          if (recipient.telegramUsername.startsWith('user_')) {
            telegramUserId = parseInt(recipient.telegramUsername.replace('user_', ''), 10);
          }

          if (telegramUserId && !isNaN(telegramUserId)) {
            await botApi.sendMessage(telegramUserId, broadcastMessage, {
              parse_mode: 'Markdown',
            });
            sentCount++;
          }
        } catch (error) {
          console.error(`Failed to send broadcast to ${recipient.telegramUsername}:`, error);
        }
      }

      console.log(`Phase transition broadcast sent to ${sentCount} players`);
    } catch (error) {
      console.error('Error sending phase transition broadcast:', error);
    }
  }
}

export async function handleTeams(ctx: Context) {
  if (!(await isAdmin(ctx.from?.id))) {
    await ctx.reply('❌ Du hast keine Berechtigung für diesen Befehl. Nur Admins können diesen Befehl verwenden.');
    return;
  }

  const args = ctx.message?.text?.split(' ') || [];

  try {
    const tournamentId = await getTournamentIdOrActive(args);
    const state = await getTournamentState(tournamentId);
    if (!state.teams || state.teams.length === 0) {
      await ctx.reply('Keine Teams vorhanden.');
      return;
    }

    const message = formatTeamList(state.teams, state.players);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleAddAdmin(ctx: Context) {
  if (!(await isAdmin(ctx.from?.id))) {
    await ctx.reply('❌ Du hast keine Berechtigung für diesen Befehl. Nur Admins können Admins hinzufügen.');
    return;
  }

  const args = ctx.message?.text?.split(' ') || [];
  const userIdStr = args[1];

  if (!userIdStr) {
    await ctx.reply('❌ Bitte gib eine User-ID an:\n/addadmin <user_id>');
    return;
  }

  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    await ctx.reply('❌ Ungültige User-ID. Bitte gib eine gültige Zahl an.');
    return;
  }

  try {
    const added = await addAdmin(userId);
    if (added) {
      await ctx.reply(`✅ Admin mit ID ${userId} wurde erfolgreich hinzugefügt.`);
    } else {
      await ctx.reply(`ℹ️ User mit ID ${userId} ist bereits ein Admin.`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleRemoveAdmin(ctx: Context) {
  if (!(await isAdmin(ctx.from?.id))) {
    await ctx.reply('❌ Du hast keine Berechtigung für diesen Befehl. Nur Admins können Admins entfernen.');
    return;
  }

  const args = ctx.message?.text?.split(' ') || [];
  const userIdStr = args[1];

  if (!userIdStr) {
    await ctx.reply('❌ Bitte gib eine User-ID an:\n/removeadmin <user_id>');
    return;
  }

  const userId = parseInt(userIdStr, 10);
  if (isNaN(userId)) {
    await ctx.reply('❌ Ungültige User-ID. Bitte gib eine gültige Zahl an.');
    return;
  }

  try {
    const removed = await removeAdmin(userId);
    if (removed) {
      await ctx.reply(`✅ Admin mit ID ${userId} wurde erfolgreich entfernt.`);
    } else {
      await ctx.reply(`ℹ️ User mit ID ${userId} ist kein Admin.`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleListAdmins(ctx: Context) {
  if (!(await isAdmin(ctx.from?.id))) {
    await ctx.reply('❌ Du hast keine Berechtigung für diesen Befehl. Nur Admins können die Admin-Liste anzeigen.');
    return;
  }

  try {
    const admins = await listAdmins();
    if (admins.length === 0) {
      await ctx.reply('ℹ️ Keine Admins vorhanden.');
      return;
    }

    const adminList = admins.map(id => `• ${id}`).join('\n');
    await ctx.reply(`📋 **Admin-Liste:**\n\n${adminList}`, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

/**
 * Handle /broadcast command - send message to all players
 */
export async function handleBroadcast(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId || !(await isAdmin(userId))) {
    await ctx.reply('❌ Du hast keine Berechtigung für diesen Befehl.');
    return;
  }

  const args = ctx.message?.text?.split(' ') || [];
  const message = args.slice(1).join(' ').trim();

  if (!message) {
    await ctx.reply('❌ Bitte gib eine Nachricht an:\n/broadcast <nachricht>');
    return;
  }

  try {
    const { getActiveTournament, broadcastMessage } = await import('../api/client.js');
    const tournamentState = await getActiveTournament();

    const result = await broadcastMessage(
      tournamentState.id,
      message,
      String(userId)
    );

    // Send message to all recipients via bot API
    const botApi = ctx.api;

    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of result.recipients) {
      try {
        // Extract user ID from telegramUsername (format: "user_123456789")
        let telegramUserId: number | null = null;
        if (recipient.telegramUsername.startsWith('user_')) {
          telegramUserId = parseInt(recipient.telegramUsername.replace('user_', ''), 10);
        }

        if (telegramUserId && !isNaN(telegramUserId)) {
          await botApi.sendMessage(
            telegramUserId,
            `📢 *Broadcast vom Admin*\n\n${message}`,
            { parse_mode: 'Markdown' }
          );
          sentCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        console.error(`Failed to send broadcast to ${recipient.telegramUsername}:`, error);
      }
    }

    await ctx.reply(
      `✅ Broadcast gesendet!\n\n` +
      `📤 Gesendet: ${sentCount}\n` +
      `❌ Fehler: ${failedCount}\n` +
      `📊 Gesamt: ${result.recipientsCount}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

