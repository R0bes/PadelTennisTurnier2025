import { Bot } from 'grammy';
import { config } from './config.js';
import { setupErrorHandler } from './middleware/errorHandler.js';
import { handleStart } from './commands/start.js';
import { handleHelp } from './commands/help.js';
import { handleMyInfo, handleLink } from './commands/player.js';
import { handleTournament, handlePhase, handleTeams } from './commands/admin.js';

const bot = new Bot(config.botToken);

// Setup error handler
setupErrorHandler(bot);

// Commands
bot.command('start', handleStart);
bot.command('help', handleHelp);

// Player commands
bot.command('myinfo', handleMyInfo);
bot.command('link', handleLink);

// Admin commands
bot.command('tournament', handleTournament);
bot.command('phase', handlePhase);
bot.command('teams', handleTeams);

// Status command (for all users)
bot.command('status', async (ctx) => {
  const args = ctx.message?.text?.split(' ') || [];
  const tournamentId = args[1];

  if (!tournamentId) {
    await ctx.reply('❌ Bitte gib eine Tournament-ID an:\n/status <tournament-id>');
    return;
  }

  try {
    const { getTournamentState } = await import('./api/client.js');
    const { formatTournamentStatus } = await import('./utils/formatters.js');
    const state = await getTournamentState(tournamentId);
    const message = formatTournamentStatus(state);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
});

// Start bot
bot.start().then(() => {
  console.log('Bot is running...');
}).catch((error) => {
  console.error('Failed to start bot:', error);
  process.exit(1);
});

