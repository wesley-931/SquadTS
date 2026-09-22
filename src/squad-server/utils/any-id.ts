import { playerIdNames } from '../../core/id-parser.js';

export interface Player {
  steamID?: string;
  eosID?: string;
  name?: string;
  playercontroller?: string;
  suffix?: string;
  teamID?: number;
  squadID?: number | null;
  [key: string]: unknown;
}

/**
 * Check if given ID belongs to a player.
 */
export function isPlayerID(anyID: string, player: Player): boolean {
  for (const idName of playerIdNames) {
    if (player[idName] === anyID) return true;
  }
  return false;
}

/**
 * Filter out players matching given IDs.
 */
export function anyIDsToPlayers(anyIDs: string[], players: Player[]): Player[] {
  const result: Player[] = [];
  for (const player of players) {
    for (const idName of playerIdNames) {
      if (
        player[idName] &&
        anyIDs.includes(player[idName] as string) &&
        !result.includes(player)
      ) {
        result.push(player);
        break;
      }
    }
  }
  return result;
}

/**
 * Find player by any of its IDs.
 */
export function anyIDToPlayer(
  anyID: string,
  players: Player[],
): Player | undefined {
  for (const player of players) {
    if (isPlayerID(anyID, player)) return player;
  }
  return undefined;
}
