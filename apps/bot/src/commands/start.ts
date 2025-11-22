import { Context } from 'grammy';

export async function handleStart(ctx: Context) {
  let message = `👋 Willkommen beim Tournament Bot!\n\n`;
  
  // Try to get player info if already registered
  try {
    const { getActiveTournament } = await import('./api/client.js');
    const { normalizeTelegramUsername } = await import('./utils/linking.js');
    const userId = ctx.from?.id;
    
    if (userId) {
      const state = await getActiveTournament();
      const telegramIdentifier = ctx.from?.username 
        ? normalizeTelegramUsername(ctx.from.username)
        : `user_${userId}`;
      
      const player = state.players.find(
        (p) => {
          const playerTelegram = (p as any).telegramUsername;
          return playerTelegram === telegramIdentifier || 
                 playerTelegram === `user_${userId}` ||
                 (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username));
        }
      );
      
      if (player) {
        message += `Hallo ${player.name}! 👋\n\n`;
        message += `Du bist bereits registriert.\n`;
        message += `Verwende /myinfo um deine Daten anzuzeigen.\n\n`;
      } else {
        message += `Um am Turnier teilzunehmen:\n`;
        message += `/register - Als neuer Spieler anmelden\n`;
        message += `/link - Mit bestehendem Spieler verknüpfen\n\n`;
      }
    } else {
      message += `Um am Turnier teilzunehmen:\n`;
      message += `/register - Als neuer Spieler anmelden\n`;
      message += `/link - Mit bestehendem Spieler verknüpfen\n\n`;
    }
  } catch (error) {
    // If error, just show default message
    message += `Um am Turnier teilzunehmen:\n`;
    message += `/register - Als neuer Spieler anmelden\n`;
    message += `/link - Mit bestehendem Spieler verknüpfen\n\n`;
  }
  
  message += `Verwende /help für eine Übersicht aller Befehle.`;

  await ctx.reply(message);
}

