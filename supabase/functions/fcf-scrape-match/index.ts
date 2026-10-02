import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { norm, sameTeam, parseActa } from '../_shared/fcfActa.ts';

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

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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
        return jsonResp({ success: false, error: 'Es requereix la URL FCF de l\'equip' }, 200);
      }
      const groupId = await resolveGroupId([clubUrl, teamPageUrl].filter(Boolean), season.fcfSeasonId);
      if (!groupId) {
        return jsonResp({ success: false, error: 'No s\'ha pogut identificar el grup a la FCF. Revisa la URL FCF del club.' }, 200);
      }
      const fixtures = await fetchFixtures(groupId);
      const candidates = fixtures.filter((f: any) => {
        const casa = String(f.NOMBRE_CASA ?? '');
        const fuera = String(f.NOMBRE_FUERA ?? '');
        const direct = sameTeam(casa, homeTeamName) && sameTeam(fuera, awayTeamName);
        const swapped = sameTeam(casa, awayTeamName) && sameTeam(fuera, homeTeamName);
        return (direct || swapped) && f.CODACTA;
      });
      const closed = (f: any) => String(f.CERRADA) === '1' || f.GOLES_CASA != null;
      const isDirect = (f: any) => sameTeam(String(f.NOMBRE_CASA ?? ''), homeTeamName);
      const fixture =
        candidates.find((f: any) => closed(f) && isDirect(f)) ??
        candidates.find(closed) ??
        candidates.find(isDirect) ??
        candidates[0];
      if (!fixture) {
        return jsonResp({
          success: false,
          error: 'No s\'ha trobat aquest partit al calendari de la FCF per a la temporada ' + seasonLabel,
        }, 200);
      }
      actaUrl = `https://www.fcf.cat/ca/competicio/acta/${fixture.CODACTA}`;
    }

    console.log('Fetching acta', actaUrl);
    const res = await fetch(actaUrl, { headers: UA });
    if (!res.ok) {
      return jsonResp({ success: false, error: `La FCF ha respost ${res.status} en obrir l'acta` }, 200);
    }
    const html = await res.text();
    const matchData = parseActa(html, actaUrl);

    if (!matchData || (!matchData.homePlayers.length && !matchData.awayPlayers.length)) {
      return jsonResp({
        success: false,
        error: 'L\'acta encara no té alineacions publicades per la federació.',
      }, 200);
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
