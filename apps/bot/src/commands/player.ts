import { Context } from 'grammy';
import { getTournamentState, getPlayerByTelegramUsername, getActiveTournament, registerPlayer, linkPlayerToTelegram } from '../api/client.js';
import { formatPlayerInfo } from '../utils/formatters.js';
import { normalizeTelegramUsername } from '../utils/linking.js';

async function getTournamentIdOrActive(args: string[]): Promise<string> {
  const tournamentId = args[1];
  if (tournamentId) {
    return tournamentId;
  }
  // Get active tournament if no ID provided
  const activeTournament = await getActiveTournament();
  return activeTournament.id;
}

export async function handleMyInfo(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];

  // Debug: Log what's in ctx.from
  console.log('ctx.from:', JSON.stringify(ctx.from, null, 2));
  
  const username = ctx.from?.username;
  
  if (!username) {
    await ctx.reply(
      `⚠️ Du hast keinen öffentlichen Telegram-Username.\n\n` +
      `Bitte setze einen Username in deinen Telegram-Einstellungen:\n` +
      `1. Öffne Telegram\n` +
      `2. Gehe zu Einstellungen > Profil\n` +
      `3. Setze einen Benutzernamen`
    );
    return;
  }

  try {
    const tournamentId = await getTournamentIdOrActive(args);
    const normalizedUsername = normalizeTelegramUsername(username);
    const player = await getPlayerByTelegramUsername(tournamentId, normalizedUsername);

    if (!player) {
      await ctx.reply(`❌ Kein Spieler mit Telegram-Username @${username} gefunden.\n\nVerwende /link um dich zu verknüpfen.`);
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

  // Debug: Log what's in ctx.from
  console.log('ctx.from:', JSON.stringify(ctx.from, null, 2));
  
  const username = ctx.from?.username;
  
  if (!username) {
    await ctx.reply(
      `⚠️ Du hast keinen öffentlichen Telegram-Username.\n\n` +
      `Bitte setze einen Username in deinen Telegram-Einstellungen:\n` +
      `1. Öffne Telegram\n` +
      `2. Gehe zu Einstellungen > Profil\n` +
      `3. Setze einen Benutzernamen`
    );
    return;
  }

  try {
    const tournamentId = await getTournamentIdOrActive(args);
    // Check if tournament exists
    const state = await getTournamentState(tournamentId);

    const normalizedUsername = normalizeTelegramUsername(username);
    
    // Check if already linked
    const existingPlayer = state.players.find(
      (p) => (p as any).telegramUsername === normalizedUsername
    );

    if (existingPlayer) {
      await ctx.reply(
        `✅ Du bist bereits mit diesem Tournament verknüpft!\n\n` +
        `Spieler: ${existingPlayer.name}\n` +
        `Verwende /myinfo um deine Daten anzuzeigen.`
      );
      return;
    }

    // Try to find player by name matching username
    const playerByName = state.players.find(
      (p) => p.name.toLowerCase() === username.toLowerCase() || 
             p.name.toLowerCase().includes(username.toLowerCase())
    );

    if (playerByName) {
      // Link existing player
      await linkPlayerToTelegram(tournamentId, playerByName.id, normalizedUsername);
      await ctx.reply(
        `✅ Du wurdest erfolgreich verknüpft!\n\n` +
        `Spieler: ${playerByName.name}\n` +
        `Verwende /myinfo um deine Daten anzuzeigen.`
      );
      return;
    }

    // No matching player found - inform user
    await ctx.reply(
      `❌ Kein Spieler mit deinem Namen gefunden.\n\n` +
      `Verwende /register <name> um dich als neuer Spieler anzumelden.\n\n` +
      `Tournament: ${state.name}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleRegister(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];
  const playerName = args.slice(1).join(' ');

  if (!playerName || playerName.trim().length === 0) {
    await ctx.reply('❌ Bitte gib einen Namen an:\n/register <name>\n\nBeispiel: /register Max Mustermann');
    return;
  }

  // Debug: Log what's in ctx.from
  console.log('ctx.from:', JSON.stringify(ctx.from, null, 2));
  
  const username = ctx.from?.username;
  
  if (!username) {
    // If no username, use user ID as fallback (but this won't work for linking)
    const userId = ctx.from?.id;
    if (userId) {
      await ctx.reply(
        `⚠️ Du hast keinen öffentlichen Telegram-Username.\n\n` +
        `Bitte setze einen Username in deinen Telegram-Einstellungen:\n` +
        `1. Öffne Telegram\n` +
        `2. Gehe zu Einstellungen > Profil\n` +
        `3. Setze einen Benutzernamen\n\n` +
        `Alternativ kannst du dich manuell über die Web-Oberfläche anmelden.`
      );
      return;
    }
    await ctx.reply('❌ Konnte deine Telegram-Daten nicht ermitteln.');
    return;
  }

  try {
    const activeTournament = await getActiveTournament();
    const tournamentId = activeTournament.id;
    const normalizedUsername = normalizeTelegramUsername(username);

    // Check if already registered
    const existingPlayer = activeTournament.players.find(
      (p) => (p as any).telegramUsername === normalizedUsername
    );

    if (existingPlayer) {
      await ctx.reply(
        `✅ Du bist bereits registriert!\n\n` +
        `Spieler: ${existingPlayer.name}\n` +
        `Verwende /myinfo um deine Daten anzuzeigen.`
      );
      return;
    }

    // Register new player
    const newPlayer = await registerPlayer(tournamentId, playerName.trim());
    
    // Link with Telegram username
    await linkPlayerToTelegram(tournamentId, newPlayer.id, normalizedUsername);

    await ctx.reply(
      `✅ Erfolgreich registriert!\n\n` +
      `Spieler: ${newPlayer.name}\n` +
      `Tournament: ${activeTournament.name}\n\n` +
      `Verwende /myinfo um deine Daten anzuzeigen.`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

