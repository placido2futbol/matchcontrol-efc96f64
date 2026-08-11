import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Next match lookup against the FCF.
 *
 * The FCF relaunched its website: the old HTML pages (/equip/2526/...) are gone and
 * data now lives behind https://www.fcf.cat/api/competition/*.
 * While the federation has not published a season yet those endpoints return 500,
 * so we answer with `pending: true` and a friendly message instead of an error.
 */

const SEASONS: Record<string, { fcfSeasonId: number; urlSeason: string }> = {
  '2026/27': { fcfSeasonId: 22, urlSeason: '2627' },
  '2025/26': { fcfSeasonId: 21, urlSeason: '2526' },
};
const DEFAULT_SEASON = '2026/27';
const FUTBOL_11_KEYWORDS = ['futbol 11', 'futbol-11', 'f11'];
const PENDING_MESSAGE =
  'Calendari pendent de publicació per la FCF. Podràs autoemplenar el partit quan la federació publiqui la competició.';

const API = 'https://www.fcf.cat/api/competition';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

async function apiGet(path: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${API}/${path}`, { headers: UA });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data;
  } catch (_e) {
    return null;
  }
}

/** Try several plausible endpoint shapes for fixtures, the API is still moving. */
async function fetchFixtures(groupId: string): Promise<any[] | null> {
  const candidates = [
    `calendari?grupId=${groupId}`,
    `partits?grupId=${groupId}`,
    `jornades?grupId=${groupId}`,
    `resultats?grupId=${groupId}`,
  ];
  for (const c of candidates) {
    const data = await apiGet(c);
    if (data && data.length) return data;
  }
  return null;
}

function parseDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const dmy = raw.match(/(\d{2})[-/](\d{2})[-/](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const ymd = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return ymd[0];
  return null;
}

function parseTime(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.match(/(\d{2}):(\d{2})/);
  return t ? `${t[1]}:${t[2]}` : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const teamPageUrl: string = body?.teamPageUrl ?? '';
    const seasonLabel: string = body?.season ?? DEFAULT_SEASON;
    const season = SEASONS[seasonLabel] ?? SEASONS[DEFAULT_SEASON];

    if (!teamPageUrl || typeof teamPageUrl !== 'string') {
      return jsonResp({ success: false, error: 'Se requiere URL del equipo (fcf_url)' }, 400);
    }

    // Hints extracted from the stored team URL: competition slug, group and team slug.
    const parts = teamPageUrl.split('?')[0].split('/').filter(Boolean);
    const teamSlug = norm(parts[parts.length - 1] || '');
    const groupSlug = parts.find(p => /^grup-\d+$/i.test(p)) || '';
    const competitionSlug = parts.find(p =>
      /catalana|federacio|juvenil|cadet|infantil|elit|preferent/i.test(p),
    ) || '';

    // 1) Season availability
    const seasons = await apiGet('temporadas');
    if (!seasons) {
      return jsonResp({ success: false, pending: true, error: PENDING_MESSAGE });
    }

    // 2) Disciplines for the requested season — 500 while unpublished
    const disciplines = await apiGet(`disciplines?temporada=${season.fcfSeasonId}`);
    if (!disciplines || !disciplines.length) {
      return jsonResp({ success: false, pending: true, season: seasonLabel, error: PENDING_MESSAGE });
    }

    const discipline =
      disciplines.find((d: any) =>
        FUTBOL_11_KEYWORDS.some(k => String(d.label ?? '').toLowerCase().includes(k)),
      ) ?? disciplines[0];

    // 3) Competitions
    const competitions = await apiGet(
      `competicions?disciplinaId=${discipline.value}&temporada=${season.fcfSeasonId}`,
    );
    if (!competitions || !competitions.length) {
      return jsonResp({ success: false, pending: true, season: seasonLabel, error: PENDING_MESSAGE });
    }

    const competition =
      competitions.find((c: any) => competitionSlug && norm(String(c.label ?? '')) === norm(competitionSlug)) ??
      competitions.find((c: any) => competitionSlug && norm(String(c.label ?? '')).includes(norm(competitionSlug)));

    if (!competition) {
      return jsonResp({
        success: false,
        pending: true,
        season: seasonLabel,
        error: `No s'ha trobat la competició "${competitionSlug || 'desconeguda'}" a la temporada ${seasonLabel}. ${PENDING_MESSAGE}`,
      });
    }

    // 4) Groups
    const groups = await apiGet(`grupos?competicioId=${competition.value}&temporada=${season.fcfSeasonId}`);
    if (!groups || !groups.length) {
      return jsonResp({ success: false, pending: true, season: seasonLabel, error: PENDING_MESSAGE });
    }
    const group =
      groups.find((g: any) => groupSlug && norm(String(g.label ?? '')) === norm(groupSlug)) ??
      groups.find((g: any) => groupSlug && norm(String(g.label ?? '')).includes(norm(groupSlug).replace('grup-', ''))) ??
      groups[0];

    // 5) Fixtures
    const fixtures = await fetchFixtures(String(group.value));
    if (!fixtures) {
      return jsonResp({ success: false, pending: true, season: seasonLabel, error: PENDING_MESSAGE });
    }

    // 6) Next fixture of our team (no result yet, closest date)
    const today = new Date().toISOString().slice(0, 10);
    const ours = fixtures
      .map((f: any) => {
        const home = String(f.equipLocal ?? f.local ?? f.home ?? '');
        const away = String(f.equipVisitant ?? f.visitant ?? f.away ?? '');
        return {
          raw: f,
          home,
          away,
          date: parseDate(f.data ?? f.date ?? f.dataPartit),
          time: parseTime(f.hora ?? f.time ?? f.dataPartit),
          field: f.camp ?? f.field ?? null,
          referee: f.arbitre ?? f.referee ?? null,
          played: f.golsLocal != null && f.golsVisitant != null,
        };
      })
      .filter(f => norm(f.home).includes(teamSlug) || norm(f.away).includes(teamSlug) ||
        teamSlug.includes(norm(f.home)) || teamSlug.includes(norm(f.away)))
      .filter(f => !f.played && (!f.date || f.date >= today))
      .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));

    const next = ours[0];
    if (!next) {
      return jsonResp({
        success: false,
        season: seasonLabel,
        error: 'No hi ha cap proper partit publicat per a aquest equip',
      }, 404);
    }

    const isHome = norm(next.home).includes(teamSlug) || teamSlug.includes(norm(next.home));

    return jsonResp({
      success: true,
      season: seasonLabel,
      data: {
        opponent: isHome ? next.away : next.home,
        matchDate: next.date,
        matchTime: next.time,
        homeAway: isHome ? 'home' : 'away',
        field: next.field,
        referee: next.referee,
      },
    });
  } catch (e) {
    console.error('fcf-next-match error', e);
    return jsonResp({ success: false, error: (e as Error).message }, 500);
  }
});
