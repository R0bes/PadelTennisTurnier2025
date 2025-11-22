import { Bot } from 'grammy';
import { config } from './config.js';
import { setupErrorHandler } from './middleware/errorHandler.js';
import { handleStart } from './commands/start.js';
import { handleHelp } from './commands/help.js';
import { handleMyInfo, handleLink, handleRegister, handleRegisterConfirm, handleRegisterCancel, handleAvatar, handleAvatarTelegram, handleAvatarStyle, handleAvatarSetStyle, handleAvatarUrl, handleAvatarSkip } from './commands/player.js';
import { handleTournament, handlePhase, handleTeams, handleAddAdmin, handleRemoveAdmin, handleListAdmins } from './commands/admin.js';

const bot = new Bot(config.botToken);

// Setup error handler
setupErrorHandler(bot);

// Commands
bot.command('start', handleStart);
bot.command('help', handleHelp);

// Player commands
bot.command('myinfo', handleMyInfo);
bot.command('link', handleLink);
bot.command('register', handleRegister);
bot.command('avatar', handleAvatar);

// Admin commands
bot.command('tournament', handleTournament);
bot.command('phase', handlePhase);
bot.command('teams', handleTeams);
bot.command('addadmin', handleAddAdmin);
bot.command('removeadmin', handleRemoveAdmin);
bot.command('listadmins', handleListAdmins);

// Status command (for all users)
bot.command('status', async (ctx) => {
  try {
    const { getActiveTournament } = await import('./api/client.js');
    const { formatTournamentStatus } = await import('./utils/formatters.js');
    const state = await getActiveTournament();
    const message = formatTournamentStatus(state);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
});


// Callback handlers for register confirmation
bot.callbackQuery(/^register_confirm_/, async (ctx) => {
  // Extract player name from the original message
  const messageText = ctx.callbackQuery.message?.text || '';
  // Try to extract name from markdown format: "als *Name* registrieren"
  let playerName = messageText.match(/als \*([^*]+)\* registrieren/i)?.[1];
  
  // If not found, try plain text format
  if (!playerName) {
    playerName = messageText.match(/als (.+?) registrieren/i)?.[1];
  }
  
  // Fallback to Telegram name
  if (!playerName) {
    const firstName = ctx.from?.first_name || '';
    const lastName = ctx.from?.last_name || '';
    playerName = [firstName, lastName].filter(Boolean).join(' ').trim();
  }
  
  if (playerName) {
    await handleRegisterConfirm(ctx, playerName);
  } else {
    await ctx.answerCallbackQuery('Fehler: Name nicht gefunden');
  }
});

bot.callbackQuery(/^register_cancel_/, async (ctx) => {
  await handleRegisterCancel(ctx);
});

// Avatar callback handlers
bot.callbackQuery(/^avatar_telegram_/, async (ctx) => {
  await handleAvatarTelegram(ctx);
});

bot.callbackQuery(/^avatar_style_/, async (ctx) => {
  await handleAvatarStyle(ctx);
});

bot.callbackQuery(/^avatar_set_(.+?)_(\d+)_(\d+)$/, async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^avatar_set_(.+?)_/);
  const style = match ? match[1] : 'avataaars';
  await handleAvatarSetStyle(ctx, style);
});

bot.callbackQuery(/^avatar_url_/, async (ctx) => {
  await handleAvatarUrl(ctx);
});

bot.callbackQuery(/^avatar_skip_/, async (ctx) => {
  await handleAvatarSkip(ctx);
});

// Start notification service
let notificationInterval: NodeJS.Timeout | null = null;
bot.start().then(() => {
  console.log('Bot is running...');
  
  // Start notification service (check every 30 seconds)
  const { startNotificationService } = await import('./services/notificationService.js');
  notificationInterval = startNotificationService(bot, 30);
  console.log('Notification service started (checking every 30 seconds)');
}).catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down...');
  if (notificationInterval) {
    const { stopNotificationService } = require('./services/notificationService.js');
    stopNotificationService(notificationInterval);
  }
  bot.stop();
  process.exit(0);
});

