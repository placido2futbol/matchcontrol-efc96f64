const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface NextMatchData {
  opponent: string;
  matchDate: string | null; // YYYY-MM-DD
  matchTime: string | null; // HH:MM
  homeAway: 'home' | 'away';
  field: string | null;
  referee: string | null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamPageUrl } = await req.json();
    if (!teamPageUrl || typeof teamPageUrl !== 'string') {
      return jsonResp({ success: false, error: 'Se requiere URL del equipo (fcf_url)' }, 400);
    }

    // teamPageUrl examples:
    //  https://www.fcf.cat/equip/2526/4cat/sant-pau-dordal-ue-a
    //  https://www.fcf.cat/calendari-equip/2526/futbol-11/quarta-catalana/grup-28/sant-pau-dordal-ue-a
    let teamSlug = '';
    let equipUrl = teamPageUrl;
    if (teamPageUrl.includes('/equip/')) {
      teamSlug = teamPageUrl.split('/').pop() || '';
      equipUrl = teamPageUrl;
    } else if (teamPageUrl.includes('/calendari-equip/')) {
      teamSlug = teamPageUrl.split('/').pop() || '';
      // Build /equip/.. equivalent for richer parsing
      const seasonMatch = teamPageUrl.match(/\/(\d{4})\//);
      const season = seasonMatch ? seasonMatch[1] : '2526';
      equipUrl = `https://www.fcf.cat/equip/${season}/4cat/${teamSlug}`;
    }

    console.log(`Fetching equip page: ${equipUrl}`);
    const equipHtml = await (await fetch(equipUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();

    // 1) Find the group "resultats" link, e.g. https://www.fcf.cat/resultats/2526/futbol-11/quarta-catalana/grup-28
    const groupMatch = equipHtml.match(/href="(https:\/\/www\.fcf\.cat\/resultats\/\d+\/futbol-\d+\/[^"\/]+\/grup-\d+)"/);
    if (!groupMatch) {
      return jsonResp({ success: false, error: 'No se pudo determinar el grupo del equipo en FCF' }, 404);
    }
    const groupBaseUrl = groupMatch[1];

    // 2) Inspect equip page for matches list. A future match has bg-grey class on the <div> with date,
    //    a played match has bg-darkgrey + score "X - Y". Iterate match rows in order.
    //    Each match row is enclosed in a <table class="...table_resultats..."> ... </table>
    const tableRegex = /<table[^>]*class="[^"]*table_resultats[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
    const matchRows: string[] = [];
    let tm: RegExpExecArray | null;
    while ((tm = tableRegex.exec(equipHtml)) !== null) {
      matchRows.push(tm[1]);
    }
    console.log(`Found ${matchRows.length} match rows in equip page`);

    // Find first match row that is in the future (no result, has bg-grey + date)
    let nextRow: string | null = null;
    let playedCount = 0;
    for (const row of matchRows) {
      const isPlayed = /bg-darkgrey/.test(row); // played matches use bg-darkgrey + score
      if (isPlayed) {
        playedCount++;
        continue;
      }
      // future match: has bg-grey with a date pattern
      if (/bg-grey/.test(row) && /\d{2}-\d{2}-\d{4}/.test(row)) {
        nextRow = row;
        break;
      }
    }

    if (!nextRow) {
      return jsonResp({ success: false, error: 'No se encontró un próximo partido para este equipo' }, 404);
    }

    // Extract opponent + home/away + date/time from the row
    // Row structure: escut-home, name-home, resultat (date+time), name-away, escut-away
    // The team's slug appears either as home or away.
    const teamLinkRegex = new RegExp(`/equip/[^"]*/${escapeRegex(teamSlug)}"`, 'g');
    const teamLinkMatches = nextRow.match(teamLinkRegex) || [];
    // Determine home/away by position: find first /equip/ link in the row
    const allEquipLinks = Array.from(nextRow.matchAll(/href="(https:\/\/www\.fcf\.cat\/equip\/[^"]+)"/g)).map(m => m[1]);
    if (allEquipLinks.length < 2) {
      return jsonResp({ success: false, error: 'No se pudieron leer los equipos del próximo partido' }, 500);
    }
    const homeUrl = allEquipLinks[0];
    const awayUrl = allEquipLinks[1];
    const isHome = homeUrl.endsWith('/' + teamSlug);
    const opponentUrl = isHome ? awayUrl : homeUrl;
    const opponentSlug = opponentUrl.split('/').pop() || '';

    // Opponent display name: anchor text inside .resultats-w-equip
    const opponentNameRegex = new RegExp(
      `resultats-w-equip[^>]*>\\s*<a[^>]*href="${escapeRegex(opponentUrl)}"[^>]*>([^<]+)<`
    );
    let opponentName = '';
    const onm = nextRow.match(opponentNameRegex);
    if (onm) {
      opponentName = onm[1].replace(/\\'/g, "'").replace(/\s+/g, ' ').trim();
    } else {
      // fallback: any anchor pointing to opponentUrl
      const fallback = nextRow.match(new RegExp(`href="${escapeRegex(opponentUrl)}"[^>]*>([^<]+)<`));
      if (fallback) opponentName = fallback[1].trim();
    }

    // Date and time in row
    const dateMatch = nextRow.match(/(\d{2})-(\d{2})-(\d{4})/);
    const timeMatch = nextRow.match(/fs-17[^>]*>\s*(\d{1,2}:\d{2})/);
    const matchDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
    const matchTime = timeMatch ? padTime(timeMatch[1]) : null;

    // 3) Field & referee come from the group jornada page. Compute jornada index = playedCount + 1.
    const jornada = playedCount + 1;
    const jornadaUrl = `${groupBaseUrl}/jornada-${jornada}`;
    console.log(`Fetching jornada: ${jornadaUrl} (played=${playedCount})`);

    let field: string | null = null;
    let referee: string | null = null;

    try {
      const jornadaHtml = await (await fetch(jornadaUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
      const jTableRegex = /<table[^>]*class="[^"]*table_resultats[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
      let jt: RegExpExecArray | null;
      const candidateRows: string[] = [];
      while ((jt = jTableRegex.exec(jornadaHtml)) !== null) {
        candidateRows.push(jt[1]);
      }
      // Prefer the row that contains BOTH our team and the opponent (the actual match)
      let matchRow = candidateRows.find(r =>
        (r.includes(`/${teamSlug}"`) || r.includes(`/${teamSlug}\\"`)) &&
        (r.includes(`/${opponentSlug}"`) || r.includes(`/${opponentSlug}\\"`))
      );
      // Fallback: any row mentioning our team
      if (!matchRow) {
        matchRow = candidateRows.find(r => r.includes(`/${teamSlug}"`) || r.includes(`/${teamSlug}\\"`));
      }
      if (matchRow) {
        const fm = matchRow.match(/href="https:\/\/www\.fcf\.cat\/camp\/\d+"[^>]*>([^<]+)</);
        if (fm) field = fm[1].trim();
        const refm = matchRow.match(/camp\.png[^>]*><\/a>\s*<br>\s*([^<]+?)\s*<img[^>]+xiulet\.png/);
        if (refm) referee = refm[1].trim();
      }
    } catch (e) {
      console.error('Jornada fetch error:', e);
    }

    const data: NextMatchData = {
      opponent: opponentName || opponentSlug,
      matchDate,
      matchTime,
      homeAway: isHome ? 'home' : 'away',
      field,
      referee,
    };

    return jsonResp({ success: true, data });
  } catch (err) {
    console.error('Error:', err);
    return jsonResp({ success: false, error: (err as Error).message }, 500);
  }
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function padTime(t: string): string {
  const [h, m] = t.split(':');
  return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
