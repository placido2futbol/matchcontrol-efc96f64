import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Match report ("acta") importer for the NEW fcf.cat site (Next.js, 2026).
 *
 * The acta page is server-rendered; all data lives in the RSC flight payload
 * embedded in the HTML (self.__next_f.push([1,"..."])). We rebuild that payload,
 * resolve the "$Lxx" references and read the rendered values.
 *
 * Fixtures (and their CODACTA) come from the public API:
 *   /api/competition/partidos?grupId=..
 */

const SEASONS: Record<string, { fcfSeasonId: number }> = {
  '2026/27': { fcfSeasonId: 22 },
  '2025/26': { fcfSeasonId: 21 },
};
const DEFAULT_SEASON = '2026/27';

const API = 'https://www.fcf.cat/api/competition';
const UA = { 'User-Agent': 'Mozilla/5.0' };

const COMP_SLUG_LABELS: Record<string, string> = {
  '4cat': 'quarta catalana',
  '3cat': 'tercera catalana',
  '2cat': 'segona catalana',
  '1cat': 'primera catalana',
};

interface MatchPlayer { name: string; dorsal: string; isStarter: boolean }
interface MatchGoal { playerName: string; minute: number; type: 'normal' | 'penalty' | 'own'; teamSide: 'home' | 'away'; runningScore: string }
interface MatchCard { playerName: string; minute: number; cardType: 'yellow' | 'red'; teamSide: 'home' | 'away' }

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const norm = (s: string) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

function tokens(name: string): string[] {
  return norm(name).split(' ').filter((t) => t.length > 3).slice(0, 3);
}

function sameTeam(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return false;
  const na = norm(a);
  const nb = norm(b);
  return ta.every((t) => nb.includes(t)) || tb.every((t) => na.includes(t));
}

async function apiGet(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}/${path}`, { headers: { ...UA, Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch (_e) {
    return null;
  }
}

function paramFrom(urls: string[], key: string): string | null {
  for (const u of urls) {
    const m = u?.match(new RegExp(`[?&]${key}=([^&#]+)`));
    if (m) return m[1];
  }
  return null;
}

async function resolveGroupId(urls: string[], seasonId: number): Promise<string | null> {
  const direct = paramFrom(urls, 'grupId');
  if (direct) return direct;

  const parts = urls[0]?.split('?')[0].split('/').filter(Boolean) ?? [];
  const compFragment = COMP_SLUG_LABELS[parts.find((p) => COMP_SLUG_LABELS[p]) ?? ''] ?? '';
  const groupSlug = parts.find((p) => /^grup-\d+$/i.test(p)) ?? '';
  if (!compFragment) return null;

  let disciplineId = paramFrom(urls, 'disciplinaId');
  if (!disciplineId) {
    const disciplines = await apiGet('disciplines');
    const list = Array.isArray(disciplines) ? disciplines : [];
    const f11 = list.find((d: any) => norm(String(d.label ?? d.NOMBRE ?? '')).includes('futbol 11'));
    disciplineId = String(f11?.value ?? f11?.CODIGO ?? '') || null;
  }
  if (!disciplineId) return null;

  const comps = await apiGet(`competicions?disciplinaId=${disciplineId}&temporada=${seasonId}`);
  const compList = Array.isArray(comps) ? comps : [];
  const comp = compList.find((c: any) => norm(String(c.label ?? c.NOMBRE ?? '')).includes(compFragment));
  const compId = comp?.value ?? comp?.CODIGO;
  if (!compId) return null;

  const groups = await apiGet(`grupos?competicioId=${compId}`);
  const groupList = Array.isArray(groups) ? groups : [];
  const wanted = groupSlug.replace(/[^0-9]/g, '');
  const group =
    groupList.find((g: any) => norm(String(g.label ?? g.NOMBRE ?? '')).replace(/[^0-9]/g, '') === wanted) ??
    groupList[0];
  return group ? String(group.value ?? group.CODIGO) : null;
}

async function fetchFixtures(groupId: string): Promise<any[]> {
  const data = await apiGet(`partidos?grupId=${groupId}`);
  if (!data) return [];
  const list = Array.isArray(data) ? data : Object.values(data).flat();
  return Array.isArray(list) ? (list as any[]) : [];
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
  const flat = (s: string) => s.replace(/\\"/g, '"');

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

function parseActa(html: string, actaUrl: string) {
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
      const nameM = c.match(/line-clamp-1","children":\["([^"]+)"/);
      const minuteM = c.match(/"children":"\((\d+)'\)"/);
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

/* ------------------------------ handler ------------------------------ */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const teamPageUrl: string = body?.teamPageUrl ?? '';
    const clubUrl: string = body?.clubUrl ?? '';
    const homeTeamName: string = body?.homeTeamName ?? '';
    const awayTeamName: string = body?.awayTeamName ?? '';
    const seasonLabel: string = body?.season ?? DEFAULT_SEASON;
    const season = SEASONS[seasonLabel] ?? SEASONS[DEFAULT_SEASON];

    let actaUrl: string = body?.actaUrl ?? '';
    const directId = String(body?.actaId ?? '').trim();
    if (!actaUrl && directId) actaUrl = `https://www.fcf.cat/ca/competicio/acta/${directId}`;
    if (actaUrl && /\/acta\/(\d+)/.test(actaUrl)) {
      actaUrl = `https://www.fcf.cat/ca/competicio/acta/${actaUrl.match(/\/acta\/(\d+)/)![1]}`;
    }

    if (!actaUrl) {
      if (!teamPageUrl && !clubUrl) {
        return jsonResp({ success: false, error: 'Es requereix la URL FCF de l\'equip' }, 400);
      }
      const groupId = await resolveGroupId([clubUrl, teamPageUrl].filter(Boolean), season.fcfSeasonId);
      if (!groupId) {
        return jsonResp({ success: false, error: 'No s\'ha pogut identificar el grup a la FCF. Revisa la URL FCF del club.' }, 404);
      }
      const fixtures = await fetchFixtures(groupId);
      const fixture = fixtures.find((f: any) => {
        const casa = String(f.NOMBRE_CASA ?? '');
        const fuera = String(f.NOMBRE_FUERA ?? '');
        const direct = sameTeam(casa, homeTeamName) && sameTeam(fuera, awayTeamName);
        const swapped = sameTeam(casa, awayTeamName) && sameTeam(fuera, homeTeamName);
        return (direct || swapped) && f.CODACTA;
      });
      if (!fixture) {
        return jsonResp({
          success: false,
          error: 'No s\'ha trobat aquest partit al calendari de la FCF per a la temporada ' + seasonLabel,
        }, 404);
      }
      actaUrl = `https://www.fcf.cat/ca/competicio/acta/${fixture.CODACTA}`;
    }

    console.log('Fetching acta', actaUrl);
    const res = await fetch(actaUrl, { headers: UA });
    if (!res.ok) {
      return jsonResp({ success: false, error: `La FCF ha respost ${res.status} en obrir l'acta` }, 502);
    }
    const html = await res.text();
    const matchData = parseActa(html, actaUrl);

    if (!matchData || (!matchData.homePlayers.length && !matchData.awayPlayers.length)) {
      return jsonResp({
        success: false,
        error: 'L\'acta encara no té alineacions publicades per la federació.',
      }, 404);
    }

    // Keep the caller's home/away orientation
    if (homeTeamName && sameTeam(matchData.homeTeamName, awayTeamName) && sameTeam(matchData.awayTeamName, homeTeamName)) {
      const swapped = {
        ...matchData,
        homeTeamName: matchData.awayTeamName,
        awayTeamName: matchData.homeTeamName,
        homePlayers: matchData.awayPlayers,
        awayPlayers: matchData.homePlayers,
        score: matchData.score.split('-').reverse().join('-'),
        goals: matchData.goals.map((g) => ({ ...g, teamSide: g.teamSide === 'home' ? 'away' as const : 'home' as const })),
        cards: matchData.cards.map((c) => ({ ...c, teamSide: c.teamSide === 'home' ? 'away' as const : 'home' as const })),
      };
      return jsonResp({ success: true, matchData: swapped });
    }

    return jsonResp({ success: true, matchData });
  } catch (e) {
    console.error('fcf-scrape-match error', e);
    return jsonResp({ success: false, error: (e as Error).message }, 500);
  }
});
