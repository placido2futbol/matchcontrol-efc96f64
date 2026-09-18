import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

/**
 * Next match lookup against the FCF public API.
 *
 * Real endpoints used by fcf.cat:
 *   /api/competition/temporadas
 *   /api/competition/disciplines
 *   /api/competition/competicions?disciplinaId=..&temporada=..
 *   /api/competition/grupos?competicioId=..
 *   /api/competition/partidos?grupId=..
 */

const SEASONS: Record<string, { fcfSeasonId: number; urlSeason: string }> = {
  '2026/27': { fcfSeasonId: 22, urlSeason: '2627' },
  '2025/26': { fcfSeasonId: 21, urlSeason: '2526' },
};
const DEFAULT_SEASON = '2026/27';
const PENDING_MESSAGE =
  'Calendari pendent de publicació per la FCF. Podràs autoemplenar el partit quan la federació publiqui la competició.';

const API = 'https://www.fcf.cat/api/competition';
const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

/** slug fragments found in legacy /equip/ URLs -> competition label fragment */
const COMP_SLUG_LABELS: Record<string, string> = {
  '4cat': 'quarta catalana',
  '3cat': 'tercera catalana',
  '2cat': 'segona catalana',
  '1cat': 'primera catalana',
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

async function apiGet(path: string): Promise<any | null> {
  try {
    const res = await fetch(`${API}/${path}`, { headers: UA });
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

/** All fixtures for a group, flattened from the { jornada: [...] } shape. */
async function fetchFixtures(groupId: string): Promise<any[] | null> {
  const data = await apiGet(`partidos?grupId=${groupId}`);
  if (!data) return null;
  const list = Array.isArray(data) ? data : Object.values(data).flat();
  return Array.isArray(list) ? list as any[] : null;
}

async function resolveGroupId(urls: string[], seasonId: number): Promise<string | null> {
  const direct = paramFrom(urls, 'grupId');
  if (direct) return direct;

  const parts = urls[0]?.split('?')[0].split('/').filter(Boolean) ?? [];
  const compFragment = COMP_SLUG_LABELS[parts.find(p => COMP_SLUG_LABELS[p]) ?? ''] ?? '';
  const groupSlug = parts.find(p => /^grup-\d+$/i.test(p)) ?? '';
  if (!compFragment) return null;

  const disciplinaId = paramFrom(urls, 'disciplinaId');
  let disciplineId = disciplinaId;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const teamPageUrl: string = body?.teamPageUrl ?? '';
    const clubUrl: string = body?.clubUrl ?? '';
    const teamName: string = body?.teamName ?? '';
    const seasonLabel: string = body?.season ?? DEFAULT_SEASON;
    const season = SEASONS[seasonLabel] ?? SEASONS[DEFAULT_SEASON];

    if (!teamPageUrl && !clubUrl) {
      return jsonResp({ success: false, error: 'Se requiere URL del equipo (fcf_url)' }, 400);
    }

    const urls = [clubUrl, teamPageUrl].filter(Boolean);
    const groupId = await resolveGroupId(urls, season.fcfSeasonId);
    if (!groupId) {
      return jsonResp({ success: false, pending: true, season: seasonLabel, error: PENDING_MESSAGE });
    }

    const fixtures = await fetchFixtures(groupId);
    if (!fixtures || !fixtures.length) {
      return jsonResp({ success: false, pending: true, season: seasonLabel, error: PENDING_MESSAGE });
    }

    // Team name to match against the fixtures list
    const slugParts = (teamPageUrl.split('?')[0].split('/').filter(Boolean).pop() ?? '').split('-');
    const nameTokens = norm(teamName).split(' ').filter(t => t.length > 3);
    const slugTokens = slugParts.filter(t => t.length > 3);
    const tokens = (nameTokens.length ? nameTokens : slugTokens).slice(0, 3);

    const matchesUs = (name: string) => {
      const n = norm(name);
      return tokens.length > 0 && tokens.every(t => n.includes(t));
    };

    const today = new Date().toISOString().slice(0, 10);
    const ours = fixtures
      .map((f: any) => {
        const start = String(f.COMIENZO1 ?? f.COMIENZO ?? '');
        return {
          home: String(f.NOMBRE_CASA ?? ''),
          away: String(f.NOMBRE_FUERA ?? ''),
          date: start.slice(0, 10) || null,
          time: start.slice(11, 16) || null,
          field: f.CAMPO ?? null,
          referee: f.ARBITRO ?? null,
          played: f.GOLES_CASA != null && f.GOLES_FUERA != null,
        };
      })
      .filter(f => matchesUs(f.home) || matchesUs(f.away))
      .filter(f => !f.played && (!f.date || f.date >= today))
      .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'));

    const next = ours[0];
    if (!next) {
      return jsonResp({
        success: false,
        season: seasonLabel,
        error: "No hi ha cap proper partit publicat per a aquest equip",
      }, 404);
    }

    const isHome = matchesUs(next.home);

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
