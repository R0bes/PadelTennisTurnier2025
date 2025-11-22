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
    await ctx.reply(message, { parse_mode: 'Markdown' });
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
    await ctx.reply('❌ Bitte gib eine Phase an:\n/phase <phase>\n\n' + formatPhaseList());
    return;
  }

  try {
    const tournamentId = await getTournamentIdOrActive(args);
    const state = await setPhase(tournamentId, phase);
    const message = `✅ Phase erfolgreich geändert!\n\n${formatTournamentStatus(state)}`;
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
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

