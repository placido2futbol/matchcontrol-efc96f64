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
  events: { event_type: string; details: string | null; minute: number; team_side: string }[],
  totalSeconds: number
): number {
  if (!playerName) return 0;

  const MAX_MINUTES = 90;
  const totalMinutes = Math.min(Math.floor(totalSeconds / 60), MAX_MINUTES);

  const subEvents = events
    .filter(e => e.event_type === 'substitution')
    .sort((a, b) => a.minute - b.minute);

  // Check if this player appears in any substitution event
  const playerSubs = subEvents.filter(e => {
    const details = e.details || '';
    return details.includes(`Sale ${playerName}`) || details.includes(`Entra ${playerName}`);
  });

  // No sub events for this player → played full match or 0
  if (playerSubs.length === 0) {
    // If listed as a match player, they played the full match if no subs involve them
    // We assume all listed players participated; is_starter just indicates slot position
    return totalMinutes;
  }

  // Build timeline
  const timeline: { type: 'in' | 'out'; minute: number }[] = [];

  // Check if the first event for this player is a "Sale" → they started at min 0
  const firstEvent = playerSubs[0];
  const firstDetails = firstEvent.details || '';
  const firstIsSale = firstDetails.includes(`Sale ${playerName}`);
  
  if (firstIsSale) {
    // Player was on the field from the start
    timeline.push({ type: 'in', minute: 0 });
  }

  for (const ev of playerSubs) {
    const details = ev.details || '';
    if (details.includes(`Sale ${playerName}`)) {
      timeline.push({ type: 'out', minute: ev.minute });
    }
    if (details.includes(`Entra ${playerName}`)) {
      timeline.push({ type: 'in', minute: ev.minute });
    }
  }

  if (timeline.length === 0) return 0;

  // Calculate total from intervals
  let total = 0;
  let currentIn: number | null = null;

  for (const entry of timeline) {
    if (entry.type === 'in') {
      if (currentIn === null) currentIn = entry.minute;
    } else {
      if (currentIn !== null) {
        total += entry.minute - currentIn;
        currentIn = null;
      }
    }
  }

  // If still on field, close at end of match
  if (currentIn !== null) {
    total += totalMinutes - currentIn;
  }

  return Math.min(Math.max(total, 0), MAX_MINUTES);
}
