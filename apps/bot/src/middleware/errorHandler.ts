import { Bot, Context } from 'grammy';

export function setupErrorHandler(bot: Bot) {
  bot.catch((err) => {
    const ctx = err.ctx;
    const error = err.error;

    console.error(`Error while handling update ${ctx.update.update_id}:`);
    console.error(error);

    // Try to send error message to user
    ctx.reply('❌ Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.').catch(() => {
      // Ignore if we can't send the message
    });
  });
}

