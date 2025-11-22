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

// Generate team name from verb + noun combination
// Uses a deterministic algorithm to ensure all teams get unique names
export function generateTeamName(index: number): string {
  const verbs = [
    'Flying', 'Raging', 'Thunder', 'Swift', 'Mighty', 'Bold', 'Fierce', 'Wild',
    'Storm', 'Blazing', 'Rapid', 'Steel', 'Golden', 'Silver', 'Crimson', 'Royal',
    'Elite', 'Prime', 'Apex', 'Nova', 'Vortex', 'Titan', 'Phoenix', 'Dragon',
    'Eagle', 'Shark', 'Wolf', 'Lion', 'Tiger', 'Falcon', 'Blade', 'Shadow',
    'Fire', 'Ice', 'Wind', 'Earth', 'Light', 'Dark', 'Red', 'Blue'
  ];
  
  const nouns = [
    'Aces', 'Strikers', 'Warriors', 'Champions', 'Legends', 'Titans', 'Giants', 'Eagles',
    'Sharks', 'Wolves', 'Lions', 'Tigers', 'Falcons', 'Hawks', 'Panthers', 'Jaguars',
    'Rockets', 'Stars', 'Flames', 'Lightning', 'Thunder', 'Storm', 'Tornado', 'Hurricane',
    'Blazers', 'Rangers', 'Raiders', 'Crushers', 'Destroyers', 'Dominators', 'Vikings',
    'Knights', 'Gladiators', 'Spartans', 'Samurai', 'Ninjas', 'Pirates', 'Rebels', 'Heroes'
  ];
  
  const totalCombinations = verbs.length * nouns.length;
  const normalizedIndex = index % totalCombinations;
  
  // Generate all possible combinations deterministically
  // Then select one based on index using a shuffle pattern
  // This ensures each team gets a unique combination until all are used
  
  // Create a deterministic shuffle pattern using a prime number
  // This ensures we don't get sequential combinations like "Flying Aces", "Raging Aces", etc.
  const shufflePrime = 17; // Prime number for better distribution
  const shuffledIndex = (normalizedIndex * shufflePrime) % totalCombinations;
  
  // Convert shuffled index back to verb/noun indices
  const verbIndex = shuffledIndex % verbs.length;
  const nounIndex = Math.floor(shuffledIndex / verbs.length) % nouns.length;
  
  // If we've used all combinations, add a number suffix to make it unique
  if (index >= totalCombinations) {
    const cycle = Math.floor(index / totalCombinations);
    return `${verbs[verbIndex]} ${nouns[nounIndex]} ${cycle + 1}`;
  }
  
  return `${verbs[verbIndex]} ${nouns[nounIndex]}`;
}

// Generate avatar URL for dummy players (deterministic based on player ID)
// Using "bottts" style for a more "dummy" look
export function getDummyAvatarUrl(playerId: string): string {
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(playerId)}`;
}
