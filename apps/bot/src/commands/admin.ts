import { Context } from 'grammy';
import { getTournamentState, setPhase } from '../api/client.js';
import { formatTournamentStatus, formatTeamList, formatPhaseList } from '../utils/formatters.js';
import type { Phase } from '@tournament-app/shared-types';

export async function handleTournament(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];
  const tournamentId = args[1];

  if (!tournamentId) {
    await ctx.reply('❌ Bitte gib eine Tournament-ID an:\n/tournament <tournament-id>');
    return;
  }

  try {
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
  const tournamentId = args[1];
  const phase = args[2] as Phase;

  if (!tournamentId || !phase) {
    await ctx.reply('❌ Bitte gib Tournament-ID und Phase an:\n/phase <tournament-id> <phase>\n\n' + formatPhaseList());
    return;
  }

  try {
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
  const tournamentId = args[1];

  if (!tournamentId) {
    await ctx.reply('❌ Bitte gib eine Tournament-ID an:\n/teams <tournament-id>');
    return;
  }

  try {
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

