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

export function playerLine(name: string, dorsal: string): string {
  const shout = displayName(name).split(/\s+/).slice(0, 2).map(w => stretch(w, 3).toUpperCase()).join(' ');
  const d = dorsal?.trim();
  return d ? `Amb el dorsal número ${stretch(catalanNumber(d))}... ${shout}!` : `I també... ${shout}!`;
}

export function buildLineupScript(players: { playerName: string; dorsal: string }[]): string[] {
  const lines = players.filter(p => p.playerName?.trim()).map(p => playerLine(p.playerName, p.dorsal));
  return [LINEUP_INTRO, ...lines, LINEUP_OUTRO];
}
