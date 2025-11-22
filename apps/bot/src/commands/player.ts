import { Context } from 'grammy';
import { getTournamentState, getPlayerByTelegramUsername, getActiveTournament, registerPlayer, linkPlayerToTelegram } from '../api/client.js';
import { formatPlayerInfo } from '../utils/formatters.js';
import { normalizeTelegramUsername } from '../utils/linking.js';

async function getTournamentIdOrActive(args: string[]): Promise<string> {
  const tournamentId = args[1];
  if (tournamentId) {
    return tournamentId;
  }
  // Get active tournament if no ID provided
  const activeTournament = await getActiveTournament();
  return activeTournament.id;
}

export async function handleMyInfo(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Konnte deine Telegram-Daten nicht ermitteln.');
    return;
  }

  // Use username if available, otherwise use user ID
  const telegramIdentifier = ctx.from?.username 
    ? normalizeTelegramUsername(ctx.from.username)
    : `user_${userId}`;

  try {
    const tournamentId = await getTournamentIdOrActive(args);
    const state = await getTournamentState(tournamentId);
    
    // Try to find player by username or user ID
    const player = state.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username));
      }
    );

    if (!player) {
      await ctx.reply(`❌ Kein Spieler gefunden.\n\nVerwende /register <name> um dich anzumelden oder /link um dich zu verknüpfen.`);
      return;
    }

    const message = formatPlayerInfo(player, state.teams);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleLink(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Konnte deine Telegram-Daten nicht ermitteln.');
    return;
  }

  // Use username if available, otherwise use user ID
  const telegramIdentifier = ctx.from?.username 
    ? normalizeTelegramUsername(ctx.from.username)
    : `user_${userId}`;

  try {
    const tournamentId = await getTournamentIdOrActive(args);
    // Check if tournament exists
    const state = await getTournamentState(tournamentId);
    
    // Check if already linked
    const existingPlayer = state.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username));
      }
    );

    if (existingPlayer) {
      await ctx.reply(
        `✅ Du bist bereits mit diesem Tournament verknüpft!\n\n` +
        `Spieler: ${existingPlayer.name}\n` +
        `Verwende /myinfo um deine Daten anzuzeigen.`
      );
      return;
    }

    // Try to find player by name matching (use first_name or full name from Telegram)
    const firstName = ctx.from?.first_name;
    const lastName = ctx.from?.last_name;
    const fullName = firstName && lastName ? `${firstName} ${lastName}` : firstName;
    
    if (fullName) {
      // Try exact match first
      let playerByName = state.players.find(
        (p) => p.name.toLowerCase() === fullName.toLowerCase()
      );
      
      // If no exact match, try partial match
      if (!playerByName) {
        playerByName = state.players.find(
          (p) => p.name.toLowerCase().includes(firstName.toLowerCase()) ||
                 firstName.toLowerCase().includes(p.name.toLowerCase().split(' ')[0])
        );
      }

      if (playerByName) {
        // Link existing player
        await linkPlayerToTelegram(tournamentId, playerByName.id, telegramIdentifier);
        await ctx.reply(
          `✅ Du wurdest erfolgreich verknüpft!\n\n` +
          `Spieler: ${playerByName.name}\n` +
          `Verwende /myinfo um deine Daten anzuzeigen.`
        );
        return;
      }
    }

    // No matching player found - inform user
    await ctx.reply(
      `❌ Kein Spieler mit deinem Namen gefunden.\n\n` +
      `Verwende /register <name> um dich als neuer Spieler anzumelden.\n\n` +
      `Tournament: ${state.name}`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleRegister(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];
  let playerName = args.slice(1).join(' ').trim();

  // Use user ID as identifier (always available, even without username)
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Konnte deine Telegram-Daten nicht ermitteln.');
    return;
  }

  // If no name provided, use Telegram name as default
  if (!playerName || playerName.length === 0) {
    const firstName = ctx.from?.first_name || '';
    const lastName = ctx.from?.last_name || '';
    playerName = [firstName, lastName].filter(Boolean).join(' ').trim();
    
    if (!playerName) {
      await ctx.reply('❌ Bitte gib einen Namen an:\n/register <name>\n\nBeispiel: /register Max Mustermann');
      return;
    }
  }

  // Use username if available, otherwise use user ID
  const telegramIdentifier = ctx.from?.username 
    ? normalizeTelegramUsername(ctx.from.username)
    : `user_${userId}`;

  try {
    const activeTournament = await getActiveTournament();
    const tournamentId = activeTournament.id;

    // Check if already registered (by username or user ID)
    const existingPlayer = activeTournament.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username));
      }
    );

    if (existingPlayer) {
      await ctx.reply(
        `✅ Du bist bereits registriert!\n\n` +
        `Spieler: ${existingPlayer.name}\n` +
        `Verwende /myinfo um deine Daten anzuzeigen.`
      );
      return;
    }

    // Show confirmation with thumbs up/down buttons
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
      .text('👍 Ja, registrieren', `register_confirm_${userId}_${Date.now()}`)
      .text('👎 Nein, abbrechen', `register_cancel_${userId}_${Date.now()}`);

    await ctx.reply(
      `📝 Möchtest du dich als *${playerName}* registrieren?\n\n` +
      `Tournament: ${activeTournament.name}`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleRegisterConfirm(ctx: Context, playerName: string) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Konnte deine Telegram-Daten nicht ermitteln.');
    return;
  }

  // Use username if available, otherwise use user ID
  const telegramIdentifier = ctx.from?.username 
    ? normalizeTelegramUsername(ctx.from.username || '')
    : `user_${userId}`;

  try {
    const activeTournament = await getActiveTournament();
    const tournamentId = activeTournament.id;

    // Check if already registered
    const existingPlayer = activeTournament.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username || ''));
      }
    );

    if (existingPlayer) {
      await ctx.answerCallbackQuery('Du bist bereits registriert!');
      await ctx.editMessageText(
        `✅ Du bist bereits registriert!\n\n` +
        `Spieler: ${existingPlayer.name}\n` +
        `Verwende /myinfo um deine Daten anzuzeigen.`
      );
      return;
    }

    // Register new player
    const newPlayer = await registerPlayer(tournamentId, playerName.trim());
    
    // Link with Telegram identifier (username or user ID)
    await linkPlayerToTelegram(tournamentId, newPlayer.id, telegramIdentifier);

    await ctx.answerCallbackQuery('Erfolgreich registriert!');
    
    // Immediately ask for avatar selection
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
      .text('📷 Profilbild verwenden', `avatar_telegram_${userId}_${Date.now()}`)
      .row()
      .text('🎨 Avatar-Stil wählen', `avatar_style_${userId}_${Date.now()}`)
      .row()
      .text('⏭️ Später', `avatar_skip_${userId}_${Date.now()}`);

    await ctx.editMessageText(
      `✅ Erfolgreich registriert!\n\n` +
      `Spieler: ${newPlayer.name}\n` +
      `Tournament: ${activeTournament.name}\n\n` +
      `🖼️ Möchtest du jetzt ein Avatar auswählen?`,
      {
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.answerCallbackQuery('Fehler beim Registrieren');
    await ctx.editMessageText(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleRegisterCancel(ctx: Context) {
  await ctx.answerCallbackQuery('Registrierung abgebrochen');
  await ctx.editMessageText('❌ Registrierung abgebrochen.\n\nVerwende /register <name> um es erneut zu versuchen.');
}

export async function handleAvatar(ctx: Context) {
  const args = ctx.message?.text?.split(' ') || [];
  const avatarUrl = args.slice(1).join(' ').trim();

  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Konnte deine Telegram-Daten nicht ermitteln.');
    return;
  }

  // Use username if available, otherwise use user ID
  const telegramIdentifier = ctx.from?.username 
    ? normalizeTelegramUsername(ctx.from.username || '')
    : `user_${userId}`;

  try {
    const activeTournament = await getActiveTournament();
    const tournamentId = activeTournament.id;

    // Find player
    const player = activeTournament.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username || ''));
      }
    );

    if (!player) {
      await ctx.reply('❌ Du bist noch nicht registriert.\n\nVerwende /register um dich anzumelden.');
      return;
    }

    // If URL provided, use it
    if (avatarUrl) {
      try {
        new URL(avatarUrl);
      } catch {
        await ctx.reply('❌ Ungültige URL. Bitte gib eine gültige URL an.\n\nBeispiel: /avatar https://example.com/avatar.png');
        return;
      }

      const { setPlayerAvatar } = await import('../api/client.js');
      await setPlayerAvatar(tournamentId, player.id, avatarUrl);
      
      await ctx.reply(
        `✅ Avatar erfolgreich gesetzt!\n\n` +
        `Dein Avatar: ${avatarUrl}\n\n` +
        `Verwende /myinfo um deine Daten anzuzeigen.`
      );
      return;
    }

    // If no URL, show options
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
      .text('📷 Profilbild verwenden', `avatar_telegram_${userId}_${Date.now()}`)
      .row()
      .text('🎨 Avatar-Stil wählen', `avatar_style_${userId}_${Date.now()}`)
      .row()
      .text('🔗 URL eingeben', `avatar_url_${userId}_${Date.now()}`);

    await ctx.reply(
      `🖼️ *Avatar auswählen*\n\n` +
      `Wie möchtest du dein Avatar setzen?`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.reply(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleAvatarTelegram(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCallbackQuery('Fehler');
    return;
  }

  try {
    const activeTournament = await getActiveTournament();
    const tournamentId = activeTournament.id;
    const telegramIdentifier = ctx.from?.username 
      ? normalizeTelegramUsername(ctx.from.username || '')
      : `user_${userId}`;

    const player = activeTournament.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username || ''));
      }
    );

    if (!player) {
      await ctx.answerCallbackQuery('Spieler nicht gefunden');
      return;
    }

    // Get user profile photos
    const photos = await ctx.api.getUserProfilePhotos(userId, { limit: 1 });
    
    if (photos.total_count === 0) {
      await ctx.answerCallbackQuery('Kein Profilbild gefunden');
      // Show alternative options
      const { InlineKeyboard } = await import('grammy');
      const keyboard = new InlineKeyboard()
        .text('🎨 Avatar-Stil wählen', `avatar_style_${userId}_${Date.now()}`)
        .row()
        .text('⏭️ Später', `avatar_skip_${userId}_${Date.now()}`);
      
      await ctx.editMessageText(
        `❌ Du hast kein Profilbild in Telegram.\n\n` +
        `Möchtest du einen anderen Avatar wählen?`,
        { reply_markup: keyboard }
      );
      return;
    }

    // Get the largest photo
    const photo = photos.photos[0];
    const fileId = photo[photo.length - 1].file_id;
    const file = await ctx.api.getFile(fileId);
    const { config } = await import('../config.js');
    const fileUrl = `https://api.telegram.org/file/bot${config.botToken}/${file.file_path}`;

    const { setPlayerAvatar } = await import('../api/client.js');
    await setPlayerAvatar(tournamentId, player.id, fileUrl);

    await ctx.answerCallbackQuery('Avatar gesetzt!');
    await ctx.editMessageText(
      `✅ Alles fertig!\n\n` +
      `Spieler: ${player.name}\n` +
      `Avatar: Telegram-Profilbild\n` +
      `Tournament: ${activeTournament.name}\n\n` +
      `Verwende /myinfo um deine Daten anzuzeigen.`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.answerCallbackQuery('Fehler beim Setzen');
    await ctx.editMessageText(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleAvatarStyle(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCallbackQuery('Fehler');
    return;
  }

  try {
    const activeTournament = await getActiveTournament();
    const tournamentId = activeTournament.id;
    const telegramIdentifier = ctx.from?.username 
      ? normalizeTelegramUsername(ctx.from.username || '')
      : `user_${userId}`;

    const player = activeTournament.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username || ''));
      }
    );

    if (!player) {
      await ctx.answerCallbackQuery('Spieler nicht gefunden');
      return;
    }

    // Show avatar style options
    const { InlineKeyboard } = await import('grammy');
    const keyboard = new InlineKeyboard()
      .text('👤 Avataaars', `avatar_set_avataaars_${userId}_${Date.now()}`)
      .text('🤖 Bottts', `avatar_set_bottts_${userId}_${Date.now()}`)
      .row()
      .text('🎭 Personas', `avatar_set_personas_${userId}_${Date.now()}`)
      .text('🎨 Pixel Art', `avatar_set_pixel-art_${userId}_${Date.now()}`)
      .row()
      .text('🔄 Zufällig', `avatar_set_random_${userId}_${Date.now()}`);

    await ctx.answerCallbackQuery();
    await ctx.editMessageText(
      `🎨 *Avatar-Stil wählen*\n\n` +
      `Wähle einen Avatar-Stil:`,
      {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.answerCallbackQuery('Fehler');
    await ctx.editMessageText(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleAvatarSetStyle(ctx: Context, style: string) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCallbackQuery('Fehler');
    return;
  }

  try {
    const activeTournament = await getActiveTournament();
    const tournamentId = activeTournament.id;
    const telegramIdentifier = ctx.from?.username 
      ? normalizeTelegramUsername(ctx.from.username || '')
      : `user_${userId}`;

    const player = activeTournament.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username || ''));
      }
    );

    if (!player) {
      await ctx.answerCallbackQuery('Spieler nicht gefunden');
      return;
    }

    let avatarUrl: string;
    const styleNames: Record<string, string> = {
      'avataaars': 'Avataaars',
      'bottts': 'Bottts',
      'personas': 'Personas',
      'pixel-art': 'Pixel Art',
      'random': 'Zufällig',
    };
    
    if (style === 'random') {
      // Generate random seed
      const randomSeed = Math.random().toString(36).substring(7);
      avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(randomSeed)}`;
    } else {
      // Use player ID as seed for deterministic avatars
      avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(player.id)}`;
    }

    const { setPlayerAvatar } = await import('../api/client.js');
    await setPlayerAvatar(tournamentId, player.id, avatarUrl);

    await ctx.answerCallbackQuery('Avatar gesetzt!');
    await ctx.editMessageText(
      `✅ Alles fertig!\n\n` +
      `Spieler: ${player.name}\n` +
      `Avatar: ${styleNames[style] || style}\n` +
      `Tournament: ${activeTournament.name}\n\n` +
      `Verwende /myinfo um deine Daten anzuzeigen.`
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.answerCallbackQuery('Fehler beim Setzen');
    await ctx.editMessageText(`❌ Fehler: ${errorMessage}`);
  }
}

export async function handleAvatarUrl(ctx: Context) {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `🔗 *Avatar-URL eingeben*\n\n` +
    `Sende eine Nachricht mit:\n` +
    `/avatar <url>\n\n` +
    `Beispiel:\n` +
    `/avatar https://example.com/my-avatar.png`,
    { parse_mode: 'Markdown' }
  );
}

export async function handleAvatarSkip(ctx: Context) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.answerCallbackQuery('Fehler');
    return;
  }

  try {
    const activeTournament = await getActiveTournament();
    const telegramIdentifier = ctx.from?.username 
      ? normalizeTelegramUsername(ctx.from.username || '')
      : `user_${userId}`;

    const player = activeTournament.players.find(
      (p) => {
        const playerTelegram = (p as any).telegramUsername;
        return playerTelegram === telegramIdentifier || 
               playerTelegram === `user_${userId}` ||
               (ctx.from?.username && playerTelegram === normalizeTelegramUsername(ctx.from.username || ''));
      }
    );

    if (player) {
      await ctx.answerCallbackQuery('Avatar-Auswahl übersprungen');
      await ctx.editMessageText(
        `✅ Registrierung abgeschlossen!\n\n` +
        `Spieler: ${player.name}\n` +
        `Tournament: ${activeTournament.name}\n\n` +
        `Du kannst später mit /avatar ein Avatar auswählen.\n\n` +
        `Verwende /myinfo um deine Daten anzuzeigen.`
      );
    } else {
      await ctx.answerCallbackQuery('Spieler nicht gefunden');
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
    await ctx.answerCallbackQuery('Fehler');
    await ctx.editMessageText(`❌ Fehler: ${errorMessage}`);
  }
}

