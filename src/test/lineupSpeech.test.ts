import { describe, it, expect } from 'vitest';
import { buildLineupScript, catalanNumber, LINEUP_INTRO, LINEUP_OUTRO } from '@/lib/lineupSpeech';

describe('lineup speech', () => {
  it('uses intro, one line per current player and outro', () => {
    const s = buildLineupScript([{ playerName: 'MARTÍNEZ, JORDI', dorsal: '10' }, { playerName: 'PERE SOLER', dorsal: '7' }]);
    expect(s).toHaveLength(4);
    expect(s[0]).toBe(LINEUP_INTRO);
    expect(s[3]).toBe(LINEUP_OUTRO);
    expect(s[1]).toContain('JOOOORDI');
    expect(s[1]).toContain('deeeeeu');
  });
  it('skips empty slots', () => {
    expect(buildLineupScript([{ playerName: '', dorsal: '3' }])).toHaveLength(2);
  });
  it('converts numbers to Catalan', () => {
    expect(catalanNumber('21')).toBe('vint-i-u');
    expect(catalanNumber('35')).toBe('trenta-cinc');
  });
});
