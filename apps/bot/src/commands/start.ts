import { Context, InlineKeyboard } from 'grammy';

export async function handleStart(ctx: Context) {
  let message = `👋 Willkommen beim Tournament Bot!\n\n`;
  const userId = ctx.from?.id;
  
  // Try to get player info if already registered
  try {
    const { getActiveTournament } = await import('../api/client.js');
    const { normalizeTelegramUsername } = await import('../utils/linking.js');
    const { isAdmin } = await import('../utils/adminManager.js');
    
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
      
      const keyboard = new InlineKeyboard();
      
      if (player) {
        message += `Hallo ${player.name}! 👋\n\n`;
        message += `Du bist bereits registriert.\n\n`;
        message += `Was möchtest du tun?`;
        
        keyboard
          .text('👤 Meine Info', `action_myinfo_${userId}`)
          .text('📊 Meine Stats', `action_stats_${userId}`)
          .row()
          .text('🏆 Rangliste', `action_leaderboard_${userId}`)
          .text('📋 Bestätigungen', `action_confirmations_${userId}`)
          .row();
        
        if (await isAdmin(userId)) {
          keyboard.text('⚙️ Admin-Menü', `action_admin_${userId}`).row();
        }
        
        keyboard.text('❓ Hilfe', 'help_player');
      } else {
        message += `Um am Turnier teilzunehmen:\n\n`;
        message += `Was möchtest du tun?`;
        
        keyboard
          .text('✅ Registrieren', `action_register_${userId}`)
          .text('🔗 Verknüpfen', `action_link_${userId}`)
          .row()
          .text('❓ Hilfe', 'help_general');
      }
      
      await ctx.reply(message, { reply_markup: keyboard });
      return;
    }
  } catch (error) {
    // If error, just show default message
  }
  
  // Default message for users without ID
  message += `Um am Turnier teilzunehmen:\n`;
  message += `/register - Als neuer Spieler anmelden\n`;
  message += `/link - Mit bestehendem Spieler verknüpfen\n\n`;
  message += `Verwende /help für eine Übersicht aller Befehle.`;

  const keyboard = new InlineKeyboard().text('❓ Hilfe', 'help_general');
  await ctx.reply(message, { reply_markup: keyboard });
}

