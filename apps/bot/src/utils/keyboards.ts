import { InlineKeyboard } from 'grammy';

/**
 * Create a help button
 */
export function createHelpButton(context: string = 'general'): InlineKeyboard {
  return new InlineKeyboard().text('❓ Hilfe', `help_${context}`);
}

/**
 * Create common action buttons for players
 */
export function createPlayerActionButtons(userId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('📊 Meine Stats', `action_stats_${userId}`)
    .text('🏆 Rangliste', `action_leaderboard_${userId}`)
    .row()
    .text('📋 Bestätigungen', `action_confirmations_${userId}`)
    .text('📝 Ergebnis melden', `action_reportmatch_${userId}`)
    .row()
    .text('❓ Hilfe', `help_player`);
}

/**
 * Create common action buttons for admins
 */
export function createAdminActionButtons(userId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('📊 Tournament', `action_tournament_${userId}`)
    .text('⚙️ Phase ändern', `action_phase_${userId}`)
    .row()
    .text('👥 Teams', `action_teams_${userId}`)
    .text('📢 Broadcast', `action_broadcast_${userId}`)
    .row()
    .text('❓ Hilfe', `help_admin`);
}

/**
 * Create yes/no buttons (thumbs up/down)
 */
export function createYesNoButtons(
  action: string,
  userId: number,
  data?: string
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  const dataSuffix = data ? `_${data}` : '';
  
  keyboard
    .text('👍 Ja', `${action}_yes_${userId}${dataSuffix}`)
    .text('👎 Nein', `${action}_no_${userId}${dataSuffix}`);
  
  return keyboard;
}

/**
 * Create navigation buttons (back, help)
 */
export function createNavigationButtons(
  backAction?: string,
  helpContext: string = 'general'
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  
  if (backAction) {
    keyboard.text('⬅️ Zurück', backAction);
  }
  keyboard.text('❓ Hilfe', `help_${helpContext}`);
  
  return keyboard;
}

/**
 * Create quick action buttons for match results
 */
export function createMatchActionButtons(
  userId: number,
  matchKey: string
): InlineKeyboard {
  return new InlineKeyboard()
    .text('📝 Ergebnis melden', `report_match_${matchKey}_${userId}`)
    .row()
    .text('📊 Stats', `action_stats_${userId}`)
    .text('❓ Hilfe', `help_match`);
}

/**
 * Create phase selection buttons for admins
 */
export function createPhaseButtons(userId: number): InlineKeyboard {
  return new InlineKeyboard()
    .text('👥 Player', `phase_player_${userId}`)
    .text('👥 Team', `phase_team_${userId}`)
    .row()
    .text('🎾 Swiss', `phase_swiss_${userId}`)
    .text('🏆 KO', `phase_ko_${userId}`)
    .row()
    .text('📊 Summary', `phase_summary_${userId}`)
    .row()
    .text('⬅️ Zurück', `action_tournament_${userId}`)
    .text('❓ Hilfe', `help_admin`);
}

