import { Bot } from 'grammy';
import { config } from './config.js';
import { setupErrorHandler } from './middleware/errorHandler.js';
import { handleStart } from './commands/start.js';
import { handleHelp } from './commands/help.js';
import { handleMyInfo, handleLink, handleRegister, handleRegisterConfirm, handleRegisterCancel, handleAvatar, handleAvatarTelegram, handleAvatarStyle, handleAvatarSetStyle, handleAvatarUrl, handleAvatarSkip } from './commands/player.js';
import { handleTournament, handlePhase, handleTeams, handleAddAdmin, handleRemoveAdmin, handleListAdmins, handleBroadcast } from './commands/admin.js';
import { handleStats, handleLeaderboard, handlePodium } from './commands/stats.js';
import { handleReportMatch, handleReportMatchScore, handleScoreInput, handleSubmitResult, handleConfirmations, handleConfirmResult, handleDisputes, handleResolveDispute } from './commands/match.js';

const bot = new Bot(config.botToken);

// Setup error handler
setupErrorHandler(bot);

// Commands
bot.command('start', handleStart);
bot.command('help', (ctx) => {
  const args = ctx.message?.text?.split(' ') || [];
  const context = args[1] || 'general';
  return handleHelp(ctx, context);
});

// Player commands
bot.command('myinfo', handleMyInfo);
bot.command('link', handleLink);
bot.command('register', handleRegister);
bot.command('avatar', handleAvatar);
bot.command('reportmatch', handleReportMatch);
bot.command('confirmations', handleConfirmations);
bot.command('stats', handleStats);
bot.command('leaderboard', (ctx) => handleLeaderboard(ctx, 'players'));
bot.command('teamleaderboard', (ctx) => handleLeaderboard(ctx, 'teams'));
bot.command('podium', (ctx) => handlePodium(ctx, 'players'));
bot.command('teampodium', (ctx) => handlePodium(ctx, 'teams'));

// Admin commands
bot.command('tournament', handleTournament);
bot.command('phase', handlePhase);
bot.command('teams', handleTeams);
bot.command('addadmin', handleAddAdmin);
bot.command('removeadmin', handleRemoveAdmin);
bot.command('listadmins', handleListAdmins);
bot.command('disputes', handleDisputes);
bot.command('broadcast', handleBroadcast);

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
  
  // Fallback to Telegram first name or username
  if (!playerName) {
    playerName = ctx.from?.first_name || ctx.from?.username || '';
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

// Match result callbacks
bot.callbackQuery(/^report_match_(.+?)_(\d+)$/, async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^report_match_(.+?)_(\d+)$/);
  if (match) {
    await handleReportMatchScore(ctx, match[1]);
  }
});

bot.callbackQuery(/^winner_(.+?)_(.+?)_(.+?)_(\d+)$/, async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^winner_(.+?)_(.+?)_(.+?)_(\d+)$/);
  if (match) {
    await handleSubmitResult(ctx, match[1], match[3], match[2]);
  }
});

bot.callbackQuery(/^confirm_(.+?)_(\d+)$/, async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^confirm_(.+?)_(\d+)$/);
  if (match) {
    await handleConfirmResult(ctx, match[1], true);
  }
});

bot.callbackQuery(/^dispute_(.+?)_(\d+)$/, async (ctx) => {
  const match = ctx.callbackQuery.data.match(/^dispute_(.+?)_(\d+)$/);
  if (match) {
    await handleConfirmResult(ctx, match[1], false);
  }
});

// Action button handlers
bot.callbackQuery(/^action_start$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleStart(ctx);
});

bot.callbackQuery(/^action_myinfo_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleMyInfo(ctx);
});

bot.callbackQuery(/^action_stats_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleStats(ctx);
});

bot.callbackQuery(/^action_leaderboard_(players|teams|\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.callbackQuery.data.match(/^action_leaderboard_(.+)$/);
  const type = match && (match[1] === 'players' || match[1] === 'teams') ? match[1] : 'players';
  await handleLeaderboard(ctx, type as 'players' | 'teams');
});

bot.callbackQuery(/^action_teamleaderboard_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleLeaderboard(ctx, 'teams');
});

bot.callbackQuery(/^action_podium_(players|teams)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.callbackQuery.data.match(/^action_podium_(.+)$/);
  const type = (match?.[1] || 'players') as 'players' | 'teams';
  await handlePodium(ctx, type);
});

bot.callbackQuery(/^action_confirmations_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleConfirmations(ctx);
});

bot.callbackQuery(/^action_reportmatch_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleReportMatch(ctx);
});

bot.callbackQuery(/^action_register_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleRegister(ctx);
});

bot.callbackQuery(/^action_link_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleLink(ctx);
});

bot.callbackQuery(/^action_tournament_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleTournament(ctx);
});

bot.callbackQuery(/^action_phase_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handlePhase(ctx);
});

bot.callbackQuery(/^action_teams_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await handleTeams(ctx);
});

bot.callbackQuery(/^action_broadcast_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply('📢 Bitte gib deine Nachricht ein:\n/broadcast <nachricht>');
});

bot.callbackQuery(/^action_admin_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const { createAdminActionButtons } = await import('./utils/keyboards.js');
  const userId = ctx.from?.id;
  if (userId) {
    const keyboard = createAdminActionButtons(userId);
    await ctx.reply('⚙️ *Admin-Menü*\n\nWähle eine Aktion:', {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  }
});

// Phase selection buttons
bot.callbackQuery(/^phase_(player|team|swiss|ko|summary)_(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.callbackQuery.data.match(/^phase_(.+?)_(\d+)$/);
  if (match) {
    const phase = match[1] as any;
    // Simulate command with phase argument
    if (ctx.message && 'text' in ctx.message) {
      (ctx.message as any).text = `/phase ${phase}`;
    }
    await handlePhase(ctx);
  }
});

// Help button handlers
bot.callbackQuery(/^help_(general|player|admin|register|confirmations|match|stats)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const match = ctx.callbackQuery.data.match(/^help_(.+)$/);
  const context = match?.[1] || 'general';
  await handleHelp(ctx, context);
});

// Start notification service
let notificationInterval: NodeJS.Timeout | null = null;
bot.start().then(async () => {
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

