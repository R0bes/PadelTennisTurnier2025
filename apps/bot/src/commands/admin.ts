import { Context } from 'grammy';
import { getTournamentState, setPhase, getActiveTournament } from '../api/client.js';
import { formatTournamentStatus, formatTeamList, formatPhaseList } from '../utils/formatters.js';
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

