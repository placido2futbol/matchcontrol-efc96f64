import { describe, it, expect } from 'vitest';
import { buildLineupScript, catalanNumber, LINEUP_INTRO, LINEUP_OUTRO } from '@/lib/lineupSpeech';
import { LINEUP_VOICES, resolveLineupVoice } from '../../supabase/functions/_shared/lineupVoice';

describe('lineup speech', () => {
  it('offers distinct male and female voices', () => {
    expect(LINEUP_VOICES.map(v => v.id)).toEqual(['Fenrir', 'Charon', 'Orus', 'Enceladus', 'Iapetus', 'Kore', 'Aoede', 'Leda', 'Callirrhoe', 'Autonoe']);
    expect(resolveLineupVoice('Aoede', 'natural').voice.id).toBe('Aoede');
  });
  it('uses the selected style and a safe default', () => {
    expect(resolveLineupVoice('Kore', 'radio').style.id).toBe('radio');
    expect(resolveLineupVoice('invalid', 'invalid').voice.id).toBe('Fenrir');
  });
  it('natural and radio styles do not stretch player names or dorsals', () => {
    for (const style of ['natural', 'radio']) {
      expect(buildLineupScript([{ playerName: 'MARTÍNEZ, JORDI', dorsal: '10' }], style)[1])
        .toBe('Amb el dorsal número deu... Jordi Martínez!');
    }
  });
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

import { buildAnnouncement, DEFAULT_TEMPLATES } from '@/lib/lineupSpeech';
describe('full announcement', () => {
  it('orders intro, starters, subs, coach, delegate, outro and fills variables', () => {
    const t = { ...DEFAULT_TEMPLATES, coachName: 'Pere', delegateName: 'Anna', sub: 'Suplent {dorsal} {nombre}' };
    const s = buildAnnouncement([{ playerName: 'JORDI', dorsal: '10' }], [{ playerName: 'PAU', dorsal: '7' }], t, 'natural');
    expect(s.map(x => x.block)).toEqual(['intro', 'starter', 'sub', 'coach', 'delegate', 'outro']);
    expect(s[2].text).toBe('Suplent set Pau');
  });
});
