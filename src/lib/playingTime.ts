export interface PlayingTimeEvent {
  type: string;
  time: number;
  playerName?: string | null;
  details?: string | null;
}

function movement(event: PlayingTimeEvent) {
  if (event.type === 'substitution') {
    const match = /^Sale (.*?) \/ Entra (.*)$/.exec(event.details || '');
    return match ? { out: match[1].trim(), in: match[2].trim() } : null;
  }
  if (event.type === 'sub_in') return { out: '', in: event.playerName || '' };
  if (event.type === 'sub_out') return { out: event.playerName || '', in: '' };
  return null;
}

/** Reconstruct participation independently of the player's current field/bench slot. */
export function playingTimeSeconds(
  playerName: string,
  isStarter: boolean,
  events: PlayingTimeEvent[],
  totalSeconds: number,
): number {
  if (!playerName) return 0;
  const end = Math.max(0, Math.min(totalSeconds, 90 * 60));
  const ordered = [...events].sort((a, b) => a.time - b.time);
  const substitutions = ordered.flatMap(event => {
    const players = movement(event);
    return players ? [{ ...players, time: Math.max(0, Math.min(event.time, end)) }] : [];
  });
  const names = new Set(substitutions.flatMap(event => [event.out, event.in]).filter(Boolean));
  const active = new Map<string, boolean>();
  for (const name of names) {
    const first = substitutions.find(event => event.out === name || event.in === name);
    if (!first) continue;
    // A goal before the first recorded entry proves this player was already on the field.
    const scoredBefore = ordered.some(event => event.type === 'goal' && event.playerName === name && event.time < first.time);
    active.set(name, first.out === name || scoredBefore);
  }
  let enteredAt: number | null = active.has(playerName)
    ? (active.get(playerName) ? 0 : null)
    : (isStarter ? 0 : null);
  let played = 0;
  for (const event of substitutions) {
    let out = event.out;
    let incoming = event.in;
    // Older matches could record the arrows backwards. Reverse only when both
    // players' reconstructed participation proves that direction impossible.
    if (out && incoming && active.get(out) === false && active.get(incoming) === true) {
      [out, incoming] = [incoming, out];
    }
    if (out === playerName && enteredAt !== null) {
      played += event.time - enteredAt;
      enteredAt = null;
    }
    if (incoming === playerName && enteredAt === null) enteredAt = event.time;
    if (out) active.set(out, false);
    if (incoming) active.set(incoming, true);
  }
  if (enteredAt !== null) played += end - enteredAt;
  return Math.max(0, Math.min(played, end));
}