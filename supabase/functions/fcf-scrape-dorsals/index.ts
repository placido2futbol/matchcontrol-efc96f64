import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { sameTeam, parseActa } from '../_shared/fcfActa.ts';

/**
 * Collects shirt numbers for one team from its played match reports on the
 * new fcf.cat site.
 *  - Club category URL (/clubs/{club}/categories/{team}) -> /api/clubs/{club}/team/{team}
 *  - Any other URL -> group fixtures (grupId from the URL or from clubUrl)
 */

const UA = { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' };

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getJson(url: string): Promise<any | null> {
  try {
    const r = await fetch(url, { headers: UA });
    if (!r.ok) return null;
    return await r.json();
  } catch (_e) {
    return null;
  }
}

const isPlayed = (f: any) => f?.CODACTA && String(f.CERRADA) === '1' && f.GOLES_CASA != null;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const teamPageUrl: string = String(body?.teamPageUrl ?? '');
    const clubUrl: string = String(body?.clubUrl ?? '');
    const teamName: string = String(body?.teamName ?? '');

    // fixtures with the side our team plays on
    let fixtures: Array<{ acta: string; side: 'home' | 'away' }> = [];

    const cat = teamPageUrl.match(/clubs\/(\d+)\/categories\/(\d+)/);
    if (cat) {
      const data = await getJson(`https://www.fcf.cat/api/clubs/${cat[1]}/team/${cat[2]}`);
      const matches: any[] = data?.data?.matches ?? [];
      fixtures = matches.filter(isPlayed).map((m) => ({
        acta: String(m.CODACTA),
        side: String(m.CODEQUIPO_CASA) === cat[2] ? 'home' : 'away',
      }));
    } else {
      const grup = (teamPageUrl.match(/grupId=(\d+)/) ?? clubUrl.match(/grupId=(\d+)/))?.[1];
      if (!grup) {
        return jsonResp({ success: false, error: "No s'ha pogut identificar el grup FCF d'aquest equip. Revisa la URL FCF." });
      }
      const data = await getJson(`https://www.fcf.cat/api/competition/partidos?grupId=${grup}`);
      const list: any[] = data ? (Array.isArray(data) ? data : Object.values(data).flat() as any[]) : [];
      for (const f of list) {
        if (!isPlayed(f)) continue;
        if (sameTeam(String(f.NOMBRE_CASA), teamName)) fixtures.push({ acta: String(f.CODACTA), side: 'home' });
        else if (sameTeam(String(f.NOMBRE_FUERA), teamName)) fixtures.push({ acta: String(f.CODACTA), side: 'away' });
      }
    }

    if (!fixtures.length) {
      return jsonResp({ success: false, error: "Encara no hi ha actes jugades d'aquest equip a la FCF." });
    }

    // newest first, cap to keep it fast
    fixtures = fixtures.slice(-20).reverse();
    const dorsals: Record<string, string> = {};

    for (let i = 0; i < fixtures.length; i += 5) {
      const batch = fixtures.slice(i, i + 5);
      const results = await Promise.allSettled(batch.map(async (f) => {
        const url = `https://www.fcf.cat/ca/competicio/acta/${f.acta}`;
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!res.ok) return null;
        const parsed = parseActa(await res.text(), url);
        if (!parsed) return null;
        return f.side === 'home' ? parsed.homePlayers : parsed.awayPlayers;
      }));
      for (const r of results) {
        if (r.status !== 'fulfilled' || !r.value) continue;
        for (const p of r.value) {
          // newest acta wins: only set if not already known
          if (p.dorsal && !dorsals[p.name]) dorsals[p.name] = p.dorsal;
        }
      }
    }

    return jsonResp({
      success: true,
      actasScraped: fixtures.length,
      teams: [{
        teamName: teamName || 'EQUIP',
        players: Object.entries(dorsals).map(([name, dorsal]) => ({ name, dorsal })),
      }],
    });
  } catch (e) {
    console.error('fcf-scrape-dorsals error', e);
    return jsonResp({ success: false, error: (e as Error).message });
  }
});
