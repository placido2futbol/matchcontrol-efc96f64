const UNITS = ['zero', 'u', 'dos', 'tres', 'quatre', 'cinc', 'sis', 'set', 'vuit', 'nou', 'deu',
  'onze', 'dotze', 'tretze', 'catorze', 'quinze', 'setze', 'disset', 'divuit', 'dinou'];
const TENS = ['', '', 'vint', 'trenta', 'quaranta', 'cinquanta', 'seixanta', 'setanta', 'vuitanta', 'noranta'];

/** Converts 0-99 to Catalan words ("21" -> "vint-i-u"). Falls back to the raw text. */
export function catalanNumber(raw: string): string {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || n < 0 || n > 99) return raw;
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10), u = n % 10;
  if (u === 0) return TENS[t];
  return t === 2 ? `vint-i-${UNITS[u]}` : `${TENS[t]}-${UNITS[u]}`;
}

const VOWEL = /[aeiouàèéíòóúAEIOUÀÈÉÍÒÓÚ]/;

/** Stretches the first vowel of a word: "deu" -> "deeeeu". */
export function stretch(word: string, times = 4): string {
  const i = word.search(VOWEL);
  return i < 0 ? word : word.slice(0, i + 1) + word[i].repeat(times) + word.slice(i + 1);
}

/** "MARTÍNEZ LÓPEZ, JORDI" -> "Jordi Martínez López" */
export function displayName(name: string): string {
  const parts = name.includes(',') ? name.split(',').map(s => s.trim()).reverse().join(' ') : name.trim();
  return parts.toLowerCase().replace(/(^|\s|-)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());
}

export const LINEUP_INTRO =
  "Senyores i senyors, afició del Sant Pau! Prepareu-vos perquè arriba l'onze titular del nostre equip! Som-hi, Sant Pau!";
export const LINEUP_OUTRO = 'I aquest és el nostre onze titular! Som-hi, Sant Pau! A per la victòria!';

export function playerLine(name: string, dorsal: string, style = 'stadium'): string {
  const words = displayName(name).split(/\s+/).slice(0, 2);
  const shout = style === 'stadium' ? words.map(w => stretch(w, 3).toUpperCase()).join(' ') : words.join(' ');
  const d = dorsal?.trim();
  const number = style === 'stadium' ? stretch(catalanNumber(d)) : catalanNumber(d);
  return d ? `Amb el dorsal número ${number}... ${shout}!` : `I també... ${shout}!`;
}

export function buildLineupScript(players: { playerName: string; dorsal: string }[], style = 'stadium'): string[] {
  const lines = players.filter(p => p.playerName?.trim()).map(p => playerLine(p.playerName, p.dorsal, style));
  return [LINEUP_INTRO, ...lines, LINEUP_OUTRO];
}

export interface LineupTemplates {
  intro: string; starter: string; sub: string;
  coach: string; coachName: string;
  delegate: string; delegateName: string;
  outro: string;
}

export const DEFAULT_TEMPLATES: LineupTemplates = {
  intro: LINEUP_INTRO,
  starter: 'Amb el dorsal número {dorsal}... {nombre}!',
  sub: 'A la banqueta, amb el dorsal {dorsal}... {nombre}!',
  coach: 'I a la banda, el nostre entrenador... {nombre}!',
  coachName: '',
  delegate: 'I la nostra delegada... {nombre}!',
  delegateName: '',
  outro: 'Aquest és el nostre equip! Som-hi, Sant Pau! A per la victòria!',
};

export type SegmentBlock = 'intro' | 'starter' | 'sub' | 'coach' | 'delegate' | 'outro';
export interface Segment { block: SegmentBlock; text: string }

export function fillTemplate(tpl: string, name: string, dorsal: string, style = 'stadium'): string {
  const words = displayName(name).split(/\s+/).slice(0, 2);
  const nombre = style === 'stadium' ? words.map(w => stretch(w, 3).toUpperCase()).join(' ') : words.join(' ');
  const d = dorsal?.trim();
  if (!d && tpl.includes('{dorsal}')) return `I també... ${nombre}!`;
  const num = d ? (style === 'stadium' ? stretch(catalanNumber(d)) : catalanNumber(d)) : '';
  return tpl.split('{nombre}').join(nombre).split('{dorsal}').join(num);
}

/** Intro → starters → subs → coach → delegate → outro. Empty blocks are skipped. */
export function buildAnnouncement(
  starters: { playerName: string; dorsal: string }[],
  subs: { playerName: string; dorsal: string }[],
  t: LineupTemplates, style = 'stadium',
): Segment[] {
  const out: Segment[] = [];
  if (t.intro.trim()) out.push({ block: 'intro', text: t.intro.trim() });
  starters.filter(p => p.playerName?.trim()).forEach(p => out.push({ block: 'starter', text: fillTemplate(t.starter, p.playerName, p.dorsal, style) }));
  subs.filter(p => p.playerName?.trim()).forEach(p => out.push({ block: 'sub', text: fillTemplate(t.sub, p.playerName, p.dorsal, style) }));
  if (t.coachName.trim() && t.coach.trim()) out.push({ block: 'coach', text: fillTemplate(t.coach, t.coachName, '', style) });
  if (t.delegateName.trim() && t.delegate.trim()) out.push({ block: 'delegate', text: fillTemplate(t.delegate, t.delegateName, '', style) });
  if (t.outro.trim()) out.push({ block: 'outro', text: t.outro.trim() });
  return out;
}
