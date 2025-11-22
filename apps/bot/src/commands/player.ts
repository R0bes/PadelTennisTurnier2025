import { Context } from 'grammy';
import { getTournamentState, getPlayerByTelegramUsername } from '../api/client.js';
import { formatPlayerInfo } from '../utils/formatters.js';
import { normalizeTelegramUsername } from '../utils/linking.js';

export async function handleMyInfo(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];
  const tournamentId = args[1];

  if (!tournamentId) {
    await ctx.reply('❌ Bitte gib eine Tournament-ID an:\n/myinfo <tournament-id>');
    return;
  }

  const username = ctx.from?.username;
  if (!username) {
    await ctx.reply('❌ Du hast keinen Telegram-Username. Bitte setze einen in deinen Telegram-Einstellungen.');
    return;
  }

  try {
    const normalizedUsername = normalizeTelegramUsername(username);
    const player = await getPlayerByTelegramUsername(tournamentId, normalizedUsername);

    if (!player) {
      await ctx.reply(`❌ Kein Spieler mit Telegram-Username @${username} gefunden.\n\nVerwende /link <tournament-id> um dich zu verknüpfen.`);
      return;
    }

    const state = await getTournamentState(tournamentId);
    const message = formatPlayerInfo(player, state.teams);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleLink(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];
  const tournamentId = args[1];

  if (!tournamentId) {
    await ctx.reply('❌ Bitte gib eine Tournament-ID an:\n/link <tournament-id>');
    return;
  }

  const username = ctx.from?.username;
  if (!username) {
    await ctx.reply('❌ Du hast keinen Telegram-Username. Bitte setze einen in deinen Telegram-Einstellungen.');
    return;
  }

  try {
    // Check if tournament exists
    const state = await getTournamentState(tournamentId);

    // Try to find player by name matching username (simple approach for now)
    // In a real scenario, you might want to search by exact name or show a list
    const normalizedUsername = normalizeTelegramUsername(username);
    
    // Check if already linked
    const existingPlayer = state.players.find(
      (p) => (p as any).telegramUsername === normalizedUsername
    );

    if (existingPlayer) {
      await ctx.reply(
        `✅ Du bist bereits mit diesem Tournament verknüpft!\n\n` +
        `Spieler: ${existingPlayer.name}\n` +
        `Verwende /myinfo ${tournamentId} um deine Daten anzuzeigen.`
      );
      return;
    }

    // For now, inform user they need to link manually via API or web interface
    // Future: Could implement name matching or selection menu
    await ctx.reply(
      `✅ Tournament gefunden!\n\n` +
      `Um dich zu verknüpfen, muss dein Spielername mit deinem Telegram-Username verknüpft werden.\n\n` +
      `Dies kann aktuell über die Web-Oberfläche oder direkt über die API erfolgen.\n\n` +
      `Dein Username: @${username}\n` +
      `Tournament-ID: \`${tournamentId}\``,
      { parse_mode: 'Markdown' }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

