// Shared FCF acta (match report) parser for the Next.js fcf.cat site.

export interface MatchPlayer { name: string; dorsal: string; isStarter: boolean }
export interface MatchGoal { playerName: string; minute: number; type: 'normal' | 'penalty' | 'own'; teamSide: 'home' | 'away'; runningScore: string }
export interface MatchCard { playerName: string; minute: number; cardType: 'yellow' | 'red'; teamSide: 'home' | 'away' }

export const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function tokens(name: string): string[] {
  return norm(name).split(' ').filter((t) => t.length > 3).slice(0, 3);
}

export function sameTeam(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const na = norm(a);
  const nb = norm(b);
  return ta.every((t) => nb.includes(t)) || tb.every((t) => na.includes(t));
}

/* ------------------------- acta page parsing ------------------------- */

function jstr(escaped: string): string {
  try {
    return JSON.parse(`"${escaped}"`);
  } catch (_e) {
    return escaped;
  }
}

/** Rebuild the RSC payload and resolve "$Lxx" references. */
function buildFlight(html: string): { page: string; lineups: string } {
  const chunks: string[] = [];
  const pushRe = /self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g;
  let m: RegExpExecArray | null;
  while ((m = pushRe.exec(html)) !== null) {
    try {
      chunks.push(JSON.parse(m[1]));
    } catch (_e) { /* ignore malformed chunk */ }
  }
  const payload = chunks.join('');

  const entries: Array<{ id: string; start: number; markerStart: number }> = [];
  const idRe = /(?:^|\n)([0-9a-f]+):/g;
  let im: RegExpExecArray | null;
  while ((im = idRe.exec(payload)) !== null) {
    entries.push({ id: im[1], start: im.index + im[0].length, markerStart: im.index });
  }
  const map = new Map<string, string>();
  entries.forEach((e, i) => {
    const end = i + 1 < entries.length ? entries[i + 1].markerStart : payload.length;
    map.set(e.id, payload.slice(e.start, end));
  });

  const resolve = (id: string, depth = 0): string => {
    const v = map.get(id) ?? '';
    if (depth > 20) return v;
    return v.replace(/"\$L([0-9a-f]+)"/g, (_s, ref) => resolve(ref, depth + 1));
  };

  // Nested payload chunks arrive JSON-escaped; flatten so one regex set works.
  const flat = (s: string) => s.replace(/\\+"/g, '"');

  const page = flat(resolve('0'));
  let lineupsId = '';
  for (const [id, v] of map) {
    if (v.includes('"localName"')) { lineupsId = id; break; }
  }
  const lineups = lineupsId ? flat(resolve(lineupsId)) : page;
  return { page, lineups };
}

type RowEvent = { minute: number; kind: 'yellow' | 'red' | 'goal' | 'other' };

function rowEvents(segment: string): RowEvent[] {
  const events: RowEvent[] = [];
  const minuteRe = /"children":"(\d{1,3})['\u2019]"/g;
  let m: RegExpExecArray | null;
  const positions: Array<{ minute: number; at: number }> = [];
  while ((m = minuteRe.exec(segment)) !== null) {
    positions.push({ minute: parseInt(m[1], 10), at: m.index + m[0].length });
  }
  positions.forEach((p, i) => {
    let tail = segment.slice(p.at, i + 1 < positions.length ? positions[i + 1].at : p.at + 900);
    // never leak into the next card/section header
    const headerIdx = tail.indexOf('bg-[#E50011] p-3');
    if (headerIdx > 0) tail = tail.slice(0, headerIdx);
    let kind: RowEvent['kind'] = 'other';
    if (/bg-\[#FFEB3B\]/.test(tail)) kind = 'yellow';
    else if (/bg-\[#(E50011|D32F2F|F30000|FF0000|C62828)\]/.test(tail)) kind = 'red';
    else if (tail.includes('#00FF73')) kind = 'goal';
    events.push({ minute: p.minute, kind });
  });
  return events;
}

export function parseActa(html: string, actaUrl: string) {
  const { page, lineups } = buildFlight(html);

  const names = lineups.match(/"localName":"([^"]+)","visitorName":"([^"]+)"/);
  if (!names) return null;
  const homeTeamName = jstr(names[1]);
  const awayTeamName = jstr(names[2]);

  // section markers (Alineacions / Suplents / Equip Tècnic) in render order
  const markers: Array<{ at: number; label: string }> = [];
  const markerRe = /"children":"(Alineacions|Suplents|Equip T[^"]{0,8}cnic)"/g;
  let mm: RegExpExecArray | null;
  while ((mm = markerRe.exec(lineups)) !== null) {
    markers.push({ at: mm.index, label: mm[1].startsWith('Equip') ? 'staff' : mm[1] });
  }

  const homePlayers: MatchPlayer[] = [];
  const awayPlayers: MatchPlayer[] = [];
  const cards: MatchCard[] = [];
  const rowGoals: Array<{ playerName: string; minute: number; teamSide: 'home' | 'away' }> = [];

  const rowRe = /"className":"truncate[^"]*","children":"([^"]+)"/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(lineups)) !== null) {
    const name = jstr(rm[1]).trim();
    const at = rm.index;
    if (!name || /^jugador/i.test(name) || /^dorsal/i.test(name)) continue;

    let label = '';
    let alineacionsSeen = 0;
    for (const mk of markers) {
      if (mk.at > at) break;
      label = mk.label;
      if (mk.label === 'Alineacions') alineacionsSeen++;
    }
    if (label === 'staff' || !label) continue;

    const side: 'home' | 'away' = alineacionsSeen <= 1 ? 'home' : 'away';
    const before = lineups.slice(Math.max(0, at - 1500), at);
    const dorsalMatches = before.match(/"children":"(\d{1,2})"/g) ?? [];
    const dorsal = dorsalMatches.length
      ? (dorsalMatches[dorsalMatches.length - 1].match(/(\d{1,2})/)?.[1] ?? '')
      : '';

    let segment = lineups.slice(at, at + 4000);
    const rel = segment.slice(10).search(/"className":"truncate[^"]*","children":"/);
    if (rel >= 0) segment = segment.slice(0, rel + 10);

    const player: MatchPlayer = { name, dorsal, isStarter: label === 'Alineacions' };
    (side === 'home' ? homePlayers : awayPlayers).push(player);

    for (const ev of rowEvents(segment)) {
      if (ev.kind === 'yellow' || ev.kind === 'red') {
        cards.push({ playerName: name, minute: ev.minute, cardType: ev.kind, teamSide: side });
      } else if (ev.kind === 'goal') {
        rowGoals.push({ playerName: name, minute: ev.minute, teamSide: side });
      }
    }
  }

  // Goals table (gives penalty / own goal and the running score)
  const goals: MatchGoal[] = [];
  const golsIdx = page.indexOf('"children":"Gols"');
  if (golsIdx >= 0) {
    let seg = page.slice(golsIdx, golsIdx + 60000);
    const stop = seg.indexOf('"children":"Alineacions"');
    if (stop > 0) seg = seg.slice(0, stop);
    const parts = seg.split(/(?="children":"\d+ - \d+")/).slice(1);
    for (const c of parts) {
      const runningScore = c.match(/"children":"(\d+ - \d+)"/)?.[1]?.replace(/\s/g, '') ?? '';
      const nameM = c.match(/line-clamp-1[^"]*","children":\["([^"]+)"/) ?? c.match(/"nombre":"([^"]+)"/);
      const minuteM = c.match(/\((\d+)'\)/);
      const kindM = c.match(/"children":\["(GOL[^"]*)"," \(","([^"]+)","\)"\]/);
      if (!nameM || !minuteM) continue;
      const playerName = jstr(nameM[1]).trim();
      const scoringTeam = kindM ? jstr(kindM[2]) : '';
      const label = kindM ? kindM[1].toUpperCase() : 'GOL';
      const type: MatchGoal['type'] = label.includes('PENAL') ? 'penalty' : label.includes('PR') ? 'own' : 'normal';
      const teamSide: 'home' | 'away' = scoringTeam
        ? (sameTeam(scoringTeam, homeTeamName) ? 'home' : 'away')
        : (rowGoals.find((g) => g.playerName === playerName)?.teamSide ?? 'home');
      goals.push({ playerName, minute: parseInt(minuteM[1], 10), type, teamSide, runningScore });
    }
  }
  if (!goals.length && rowGoals.length) {
    for (const g of rowGoals) {
      goals.push({ ...g, type: 'normal', runningScore: '' });
    }
  }

  const homeGoals = goals.filter((g) => g.teamSide === 'home').length;
  const awayGoals = goals.filter((g) => g.teamSide === 'away').length;

  const dateRaw = page.match(/"children":\["Data",": ","([^"]+)"\]/)?.[1] ?? '';
  const timeRaw = page.match(/"children":\["Hora",": ","([^"]+)"/)?.[1] ?? '';
  const field = jstr(page.match(/"children":\["Estadi",": ","((?:[^"\\]|\\.)*)"/)?.[1] ?? '');

  let matchDate: string | null = null;
  const dm = dateRaw.match(/(\d{2})[./-](\d{2})[./-](\d{4})/);
  if (dm) matchDate = `${dm[3]}-${dm[2]}-${dm[1]}`;
  const tm = timeRaw.match(/(\d{1,2})[.:](\d{2})/);
  const matchTime = tm ? `${tm[1].padStart(2, '0')}:${tm[2]}` : null;

  return {
    homeTeamName,
    awayTeamName,
    homePlayers,
    awayPlayers,
    score: `${homeGoals}-${awayGoals}`,
    actaUrl,
    goals,
    cards,
    matchDate,
    matchTime,
    field: field || null,
  };
}

