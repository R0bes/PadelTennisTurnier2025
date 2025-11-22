import type { Player, Team } from "@tournament-app/shared-types";

export function simpleSwissPairing(
  players: Player[]
): Array<[Player, Player]> {
  // For now, just do a naive pairing as a placeholder.
  const pairs: Array<[Player, Player]> = [];
  const copy = [...players];
  while (copy.length >= 2) {
    const a = copy.shift()!;
    const b = copy.shift()!;
    pairs.push([a, b]);
  }
  return pairs;
}

// Generate KO bracket structure (Quarterfinals → Semifinals → Final only)
export function generateKOBracket(teams: Team[]) {
  const numTeams = teams.length;
  if (numTeams < 2) return null;
  
  let bracketSize = 8;
  if (numTeams < 4) {
    bracketSize = 4;
  }
  
  const seededTeams: (Team | null)[] = [...teams].slice(0, bracketSize);
  while (seededTeams.length < bracketSize) {
    seededTeams.push(null);
  }
  
  const rounds: Array<{ round: string; matches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null; filled?: boolean }> }> = [];
  
  const quarterfinalMatches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null; filled?: boolean }> = [];
  for (let i = 0; i < 4; i++) {
    quarterfinalMatches.push({ team1: null, team2: null, filled: false });
  }
  rounds.push({ round: 'Quarterfinals', matches: quarterfinalMatches });
  
  const semifinalMatches: Array<{ team1: Team | null; team2: Team | null; winner?: Team | null; filled?: boolean }> = [];
  for (let i = 0; i < 2; i++) {
    semifinalMatches.push({ team1: null, team2: null, filled: false });
  }
  rounds.push({ round: 'Semifinals', matches: semifinalMatches });
  
  rounds.push({ round: 'Final', matches: [{ team1: null, team2: null, filled: false }] });
  
  return rounds;
}

