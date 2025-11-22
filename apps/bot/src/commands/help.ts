import { Context } from 'grammy';

export async function handleHelp(ctx: Context) {
  const message = `📖 *Verfügbare Befehle:*\n\n` +
    `*Allgemein:*\n` +
    `/start - Bot starten\n` +
    `/help - Diese Hilfe anzeigen\n` +
    `/status - Tournament-Status anzeigen\n\n` +
    `*Spieler:*\n` +
    `/register <name> - Als neuer Spieler anmelden\n` +
    `/link - Mit bestehendem Spieler verknüpfen\n` +
    `/myinfo - Eigene Spielerdaten anzeigen\n\n` +
    `*Admin:*\n` +
    `/tournament - Tournament-Übersicht\n` +
    `/phase <phase> - Phase ändern\n` +
    `/teams - Teams anzeigen\n\n` +
    `*Hinweis:* Alle Befehle verwenden automatisch das aktive Tournament. Für Admin-Befehle ist aktuell keine Authentifizierung erforderlich.`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

