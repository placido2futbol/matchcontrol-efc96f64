import { MatchEvent } from '@/components/match/EventLog';
import { MatchPlayer } from '@/components/match/PlayerRow';
import { playingTimeSeconds } from './playingTime';

/**
 * Calculate minutes played for a player based on substitution events.
 * Supports multiple in/out cycles (re-entry allowed).
 *
 * Events of type 'substitution' have details like:
 *   "Sale PlayerA / Entra PlayerB"
 *
 * @param playerName - The player's name
 * @param isStarter - Whether the player started the match
 * @param events - All match events for this team side
 * @param totalSeconds - Total elapsed seconds of the match
 * @returns Minutes played (capped at 90)
 */
export function calcMinutesPlayed(
  playerName: string,
  isStarter: boolean,
  events: MatchEvent[],
  totalSeconds: number
): number {
  return Math.floor(playingTimeSeconds(playerName, isStarter, events.map(event => ({
    ...event,
    time: event.minute,
  })), totalSeconds) / 60);
}

/**
 * Calculate minutes for all players on a given side.
 */
export function calcAllPlayersMinutes(
  players: MatchPlayer[],
  events: MatchEvent[],
  teamSide: 'home' | 'away',
  totalSeconds: number
): Map<number, number> {
  const sideEvents = events.filter(e => e.teamSide === teamSide);
  const result = new Map<number, number>();

  for (const p of players) {
    if (!p.playerName) continue;
    result.set(
      p.slotIndex,
      calcMinutesPlayed(p.playerName, p.isStarter, sideEvents, totalSeconds)
    );
  }

  return result;
}
