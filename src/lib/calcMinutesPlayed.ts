import { MatchEvent } from '@/components/match/EventLog';
import { MatchPlayer } from '@/components/match/PlayerRow';

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
  if (!playerName) return 0;

  const MAX_MINUTES = 90;
  const totalMinutes = Math.min(Math.floor(totalSeconds / 60), MAX_MINUTES);

  // Extract sub events relevant to this player
  const subEvents = events
    .filter(e => e.type === 'substitution')
    .sort((a, b) => a.minute - b.minute);

  // Build timeline of "in" and "out" moments (in seconds)
  const timeline: { type: 'in' | 'out'; second: number }[] = [];

  if (isStarter) {
    timeline.push({ type: 'in', second: 0 });
  }

  for (const ev of subEvents) {
    const details = ev.details || '';
    // Check if player goes out
    if (details.includes(`Sale ${playerName}`)) {
      timeline.push({ type: 'out', second: ev.minute });
    }
    // Check if player comes in
    if (details.includes(`Entra ${playerName}`)) {
      timeline.push({ type: 'in', second: ev.minute });
    }
  }

  if (timeline.length === 0) return 0;

  // Build intervals from timeline
  let totalPlayed = 0;
  let currentIn: number | null = null;

  for (const entry of timeline) {
    if (entry.type === 'in') {
      if (currentIn === null) {
        currentIn = entry.second;
      }
    } else if (entry.type === 'out') {
      if (currentIn !== null) {
        totalPlayed += entry.second - currentIn;
        currentIn = null;
      }
    }
  }

  // If player is still on the field, close interval at end of match
  if (currentIn !== null) {
    totalPlayed += totalSeconds - currentIn;
  }

  const minutes = Math.floor(totalPlayed / 60);
  return Math.min(minutes, MAX_MINUTES);
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
