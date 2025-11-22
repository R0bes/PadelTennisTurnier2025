import { Context } from 'grammy';

export async function handleHelp(ctx: Context) {
  const message = `📖 *Verfügbare Befehle:*\n\n` +
    `*Allgemein:*\n` +
    `/start - Bot starten\n` +
    `/help - Diese Hilfe anzeigen\n` +
    `/status <tournament-id> - Tournament-Status anzeigen\n\n` +
    `*Spieler:*\n` +
    `/myinfo <tournament-id> - Eigene Spielerdaten anzeigen\n` +
    `/link <tournament-id> - Mit Tournament verknüpfen\n\n` +
    `*Admin:*\n` +
    `/tournament <tournament-id> - Tournament-Übersicht\n` +
    `/phase <tournament-id> <phase> - Phase ändern\n` +
    `/teams <tournament-id> - Teams anzeigen\n\n` +
    `*Hinweis:* Für Admin-Befehle ist aktuell keine Authentifizierung erforderlich.`;

  await ctx.reply(message, { parse_mode: 'Markdown' });
}

