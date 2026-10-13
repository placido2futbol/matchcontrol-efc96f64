import { playingTimeSeconds } from './playingTime';

/**
 * Recalculate minutes played from DB-stored events where minute is already in minutes.
 * Supports multiple in/out cycles (re-entry).
 * 
 * Logic:
 * - If player has NO sub events mentioning them → played full match
 * - If player has sub events, build intervals from "Entra"/"Sale" markers
 * - A player who only has "Sale" events started at minute 0 (was original starter)
 * - A player who only has "Entra" events played from entry until end (or next "Sale")
 */
export function calcMinutesFromDbEvents(
  playerName: string,
  isStarter: boolean,
  events: { event_type: string; details: string | null; minute: number; team_side: string; player_name?: string | null }[],
  totalSeconds: number
): number {
  return Math.floor(playingTimeSeconds(playerName, isStarter, events.map(event => ({
    type: event.event_type,
    time: event.minute * 60,
    playerName: event.player_name,
    details: event.details,
  })), totalSeconds) / 60);
}
