import type { Player } from "@tournament-app/shared-types";

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

