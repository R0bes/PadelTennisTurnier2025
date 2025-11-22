import type { TournamentState, Player, Team } from '@tournament-app/shared-types';

export function formatTournamentStatus(state: TournamentState): string {
  const phaseNames: Record<string, string> = {
    initial: 'Initial',
    player: 'Registrierung',
    team: 'Team-Aufstellung',
    swiss: 'Swiss-Runden',
    ko: 'K.O.-Phase',
    summary: 'Zusammenfassung',
  };

  let message = `🏆 *${state.name}*\n\n`;
  message += `📊 Phase: ${phaseNames[state.phase] || state.phase}\n`;
  message += `👥 Spieler: ${state.players.length}\n`;

  if (state.teams && state.teams.length > 0) {
    message += `⚽ Teams: ${state.teams.length}\n`;
  }

  return message;
}

export function formatPlayerInfo(player: Player, teams?: Team[]): string {
  let message = `👤 *${player.name}*\n\n`;
  message += `🆔 ID: \`${player.id}\`\n`;

  if (player.teamId && teams) {
    const team = teams.find((t) => t.id === player.teamId);
    if (team) {
      message += `⚽ Team: ${team.name}\n`;
    }
  } else {
    message += `⚽ Team: Kein Team zugewiesen\n`;
  }

  return message;
}

export function formatTeamList(teams: Team[], players: Player[]): string {
  if (teams.length === 0) {
    return 'Keine Teams vorhanden.';
  }

  let message = `⚽ *Teams:*\n\n`;
  for (const team of teams) {
    message += `*${team.name}*\n`;
    const teamPlayers = players.filter((p) => p.teamId === team.id);
    if (teamPlayers.length > 0) {
      message += teamPlayers.map((p) => `  • ${p.name}`).join('\n');
    } else {
      message += `  • (Keine Spieler)`;
    }
    message += '\n\n';
  }

  return message.trim();
}

export function formatPhaseList(): string {
  return `Verfügbare Phasen:
• \`initial\` - Initial
• \`player\` - Registrierung
• \`team\` - Team-Aufstellung
• \`swiss\` - Swiss-Runden
• \`ko\` - K.O.-Phase
• \`summary\` - Zusammenfassung`;
}

