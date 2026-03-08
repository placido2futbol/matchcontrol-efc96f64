/**
 * Recalculate minutes played from DB-stored events where minute is already in minutes.
 * Supports multiple in/out cycles (re-entry).
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

  const timeline: { type: 'in' | 'out'; minute: number }[] = [];

  if (isStarter) {
    timeline.push({ type: 'in', minute: 0 });
  }

  for (const ev of subEvents) {
    const details = ev.details || '';
    if (details.includes(`Sale ${playerName}`)) {
      timeline.push({ type: 'out', minute: ev.minute });
    }
    if (details.includes(`Entra ${playerName}`)) {
      timeline.push({ type: 'in', minute: ev.minute });
    }
  }

  if (timeline.length === 0) return 0;

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

  if (currentIn !== null) {
    total += totalMinutes - currentIn;
  }

  return Math.min(Math.max(total, 0), MAX_MINUTES);
}
