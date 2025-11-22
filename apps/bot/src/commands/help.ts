import { Context, InlineKeyboard } from 'grammy';
import { isAdmin } from '../utils/adminManager.js';

export async function handleHelp(ctx: Context, context: string = 'general') {
  let message = '';
  const userId = ctx.from?.id;
  const keyboard = new InlineKeyboard();
  
  if (context === 'player' || context === 'general') {
    message = `📖 *Hilfe - Spieler-Befehle:*\n\n` +
      `*Registrierung:*\n` +
      `✅ /register - Als neuer Spieler anmelden\n` +
      `🔗 /link - Mit bestehendem Spieler verknüpfen\n\n` +
      `*Profil:*\n` +
      `👤 /myinfo - Eigene Spielerdaten anzeigen\n` +
      `🖼️ /avatar - Avatar auswählen/setzen\n\n` +
      `*Matches:*\n` +
      `📝 /reportmatch - Match-Ergebnis melden\n` +
      `📋 /confirmations - Ausstehende Bestätigungen\n\n` +
      `*Statistiken:*\n` +
      `📊 /stats - Persönliche Statistiken\n` +
      `🏆 /leaderboard - Spieler-Rangliste\n` +
      `🥇 /podium - Top 3 Spieler\n\n`;
    
    if (userId) {
      keyboard
        .text('👤 Meine Info', `action_myinfo_${userId}`)
        .text('📊 Meine Stats', `action_stats_${userId}`)
        .row()
        .text('🏆 Rangliste', `action_leaderboard_${userId}`)
        .text('📋 Bestätigungen', `action_confirmations_${userId}`)
        .row();
      
      if (await isAdmin(userId)) {
        keyboard.text('⚙️ Admin-Hilfe', 'help_admin').row();
      }
      
      keyboard.text('⬅️ Start', 'action_start');
    }
  } else if (context === 'admin') {
    message = `📖 *Hilfe - Admin-Befehle:*\n\n` +
      `*Tournament-Verwaltung:*\n` +
      `📊 /tournament - Tournament-Übersicht\n` +
      `⚙️ /phase <phase> - Phase ändern\n` +
      `👥 /teams - Teams anzeigen\n\n` +
      `*Kommunikation:*\n` +
      `📢 /broadcast <nachricht> - Nachricht an alle senden\n\n` +
      `*Admin-Verwaltung:*\n` +
      `➕ /addadmin <user_id> - Admin hinzufügen\n` +
      `➖ /removeadmin <user_id> - Admin entfernen\n` +
      `📋 /listadmins - Admin-Liste anzeigen\n\n` +
      `*Konflikte:*\n` +
      `⚠️ /disputes - Widersprüchliche Ergebnisse\n\n`;
    
    if (userId) {
      keyboard
        .text('📊 Tournament', `action_tournament_${userId}`)
        .text('⚙️ Phase ändern', `action_phase_${userId}`)
        .row()
        .text('👥 Teams', `action_teams_${userId}`)
        .text('📢 Broadcast', `action_broadcast_${userId}`)
        .row()
        .text('👤 Spieler-Hilfe', 'help_player')
        .text('⬅️ Start', 'action_start');
    }
  } else {
    message = `📖 *Verfügbare Befehle:*\n\n` +
      `*Allgemein:*\n` +
      `/start - Bot starten\n` +
      `/help - Diese Hilfe anzeigen\n` +
      `/status - Tournament-Status anzeigen\n\n` +
      `*Spieler:*\n` +
      `/register - Als neuer Spieler anmelden\n` +
      `/myinfo - Eigene Spielerdaten anzeigen\n` +
      `/stats - Persönliche Statistiken\n` +
      `/leaderboard - Rangliste anzeigen\n\n` +
      `*Admin:*\n` +
      `/tournament - Tournament-Übersicht\n` +
      `/phase <phase> - Phase ändern\n` +
      `/broadcast <nachricht> - Nachricht senden\n\n`;
    
    if (userId) {
      keyboard
        .text('👤 Spieler-Hilfe', 'help_player')
        .text('⚙️ Admin-Hilfe', 'help_admin')
        .row()
        .text('⬅️ Start', 'action_start');
    }
  }
  
  message += `\n*Tipp:* Verwende die Buttons für schnelle Aktionen! 👆`;

  await ctx.reply(message, { 
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
}

