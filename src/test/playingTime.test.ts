import { describe, expect, it } from 'vitest';
import { calcMinutesPlayed } from '../lib/calcMinutesPlayed';
import { calcMinutesFromDbEvents } from '../lib/calcMinutesFromDbEvents';
import type { MatchEvent } from '../components/match/EventLog';

const sub = (minute: number, out: string, incoming: string): MatchEvent => ({
  minute: minute * 60, type: 'substitution', teamSide: 'home', playerName: incoming,
  details: `Sale ${out} / Entra ${incoming}`,
});
const db = (events: MatchEvent[]) => events.map(event => ({
  event_type: event.type, minute: event.minute / 60, team_side: event.teamSide,
  player_name: event.playerName, details: event.details || null,
}));

describe('actual playing time', () => {
  it('Isaac played 77 minutes, not the 13 minutes on the bench, despite a reversed recorded change', () => {
    const events: MatchEvent[] = [
      { minute: 8 * 60, type: 'goal', teamSide: 'home', playerName: 'MASSANA TOUS, ISAAC' },
      sub(77, 'RICO CASTAÑO, JUAN FERNANDO', 'MASSANA TOUS, ISAAC'),
    ];
    expect(calcMinutesPlayed('MASSANA TOUS, ISAAC', false, events, 5426)).toBe(77);
    expect(calcMinutesFromDbEvents('MASSANA TOUS, ISAAC', false, db(events), 5426)).toBe(77);
  });
  it('uses original participation rather than swapped starter slots for both players', () => {
    const events = [sub(77, 'Isaac', 'Rico')];
    expect(calcMinutesPlayed('Isaac', false, events, 5400)).toBe(77);
    expect(calcMinutesPlayed('Rico', true, events, 5400)).toBe(13);
    expect(calcMinutesFromDbEvents('Rico', true, db(events), 5400)).toBe(13);
  });
  it('adds each interval when a player re-enters', () => {
    const events = [sub(25, 'Isaac', 'Rico'), sub(62, 'Rico', 'Isaac'), sub(77, 'Isaac', 'Rico')];
    expect(calcMinutesPlayed('Isaac', false, events, 5400)).toBe(40);
    expect(calcMinutesFromDbEvents('Isaac', false, db(events), 5400)).toBe(40);
  });
  it('a bench card does not give an unused substitute a full match', () => {
    const events: MatchEvent[] = [{ minute: 1200, type: 'yellow', teamSide: 'home', playerName: 'Isaac' }];
    expect(calcMinutesFromDbEvents('Isaac', false, db(events), 5400)).toBe(0);
  });
});