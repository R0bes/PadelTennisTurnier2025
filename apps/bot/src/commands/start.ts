import { Context } from 'grammy';

export async function handleStart(ctx: Context) {
  const username = ctx.from?.username;
  
  let message = `👋 Willkommen beim Tournament Bot!\n\n`;
  
  if (username) {
    message += `Du bist als @${username} angemeldet.\n\n`;
    message += `Um am Turnier teilzunehmen:\n`;
    message += `/register <name> - Als neuer Spieler anmelden\n`;
    message += `/link - Mit bestehendem Spieler verknüpfen\n\n`;
  } else {
    message += `⚠️ Du hast keinen Telegram-Username. Bitte setze einen in deinen Telegram-Einstellungen.\n\n`;
  }
  
  message += `Verwende /help für eine Übersicht aller Befehle.`;

  await ctx.reply(message);
}

