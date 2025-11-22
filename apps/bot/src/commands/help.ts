import { Context } from 'grammy';

export async function handleHelp(ctx: Context) {
  const message = `📖 *Verfügbare Befehle:*\n\n` +
    `*Allgemein:*\n` +
    `/start - Bot starten\n` +
    `/help - Diese Hilfe anzeigen\n` +
    `/status - Tournament-Status anzeigen\n\n` +
    `*Spieler:*\n` +
    `/register - Als neuer Spieler anmelden (verwendet deinen Telegram-Namen)\n` +
    `/register <name> - Als neuer Spieler mit eigenem Namen anmelden\n` +
    `/link - Mit bestehendem Spieler verknüpfen\n` +
    `/avatar - Avatar auswählen/setzen\n` +
    `/avatar <url> - Avatar-URL direkt setzen\n` +
    `/myinfo - Eigene Spielerdaten anzeigen\n\n` +
    `*Admin:*\n` +
    `/tournament - Tournament-Übersicht\n` +
    `/phase <phase> - Phase ändern\n` +
    `/teams - Teams anzeigen\n` +
    `/addadmin <user_id> - Admin hinzufügen\n` +
    `/removeadmin <user_id> - Admin entfernen\n` +
    `/listadmins - Admin-Liste anzeigen\n\n` +
    `*Hinweis:* Alle Befehle verwenden automatisch das aktive Tournament. Für Admin-Befehle ist aktuell keine Authentifizierung erforderlich.`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

