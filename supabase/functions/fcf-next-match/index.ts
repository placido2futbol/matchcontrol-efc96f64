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

    // Extract opponent + home/away + date/time from the row.
    // FCF repeats each team link twice (crest + name), so keep only unique slugs in display order.
    const orderedTeamSlugs = uniqueOrdered(
      Array.from(nextRow.matchAll(/href="https:\/\/www\.fcf\.cat\/(?:equip|calendari-equip)\/[^"]*\/([^\/"?#]+)"/g)).map(m => m[1])
    );
    if (orderedTeamSlugs.length < 2) {
      return jsonResp({ success: false, error: 'No se pudieron leer los equipos del próximo partido' }, 500);
    }
    const homeSlug = orderedTeamSlugs[0];
    const awaySlug = orderedTeamSlugs[1];
    const isHome = homeSlug === teamSlug;
    const opponentSlug = isHome ? awaySlug : homeSlug;

    // Opponent display name: anchor text inside .resultats-w-equip
    const opponentName = extractTeamName(nextRow, opponentSlug);

    // Date and time in row
    const dateMatch = nextRow.match(/(\d{2})-(\d{2})-(\d{4})/);
    const timeMatch = nextRow.match(/fs-17[^>]*>\s*(\d{1,2}:\d{2})/);
    const matchDate = dateMatch ? `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}` : null;
    const matchTime = timeMatch ? padTime(timeMatch[1]) : null;

    // 3) Field & referee come from the group results page for the actual selected-team match.
    // Do not guess jornada from the shortened team page; that page only lists upcoming games.
    console.log(`Fetching group results: ${groupBaseUrl}`);

    let field: string | null = null;
    let referee: string | null = null;

    try {
      const groupHtml = await (await fetch(groupBaseUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } })).text();
      let matchRow = findMatchRow(groupHtml, teamSlug, opponentSlug, dateMatch?.[0] || null);
      if (matchRow) {
        ({ field, referee } = extractFieldAndReferee(matchRow));
      }
    } catch (e) {
      console.error('Group results fetch error:', e);
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

function uniqueOrdered(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter(item => {
    if (seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function extractTeamName(row: string, slug: string): string {
  const teamNameRegex = new RegExp(
    `resultats-w-equip[^>]*>\\s*<a[^>]*href="[^"]*/${escapeRegex(slug)}"[^>]*>([^<]+)<`
  );
  const match = row.match(teamNameRegex) || row.match(new RegExp(`href="[^"]*/${escapeRegex(slug)}"[^>]*>([^<]+)<`));
  return match ? match[1].replace(/\\'/g, "'").replace(/\s+/g, ' ').trim() : '';
}

function findMatchRow(html: string, teamSlug: string, opponentSlug: string, displayDate: string | null): string | null {
  const tableRegex = /<table[^>]*class="[^"]*table_resultats[^"]*"[^>]*>([\s\S]*?)<\/table>/g;
  const rows: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(html)) !== null) rows.push(match[1]);

  return rows.find(row => {
    const slugs = uniqueOrdered(
      Array.from(row.matchAll(/href="https:\/\/www\.fcf\.cat\/(?:equip|calendari-equip)\/[^"]*\/([^\/"?#]+)"/g)).map(m => m[1])
    );
    const sameTeams = slugs.includes(teamSlug) && slugs.includes(opponentSlug);
    return sameTeams && (!displayDate || row.includes(displayDate));
  }) || rows.find(row => {
    const slugs = uniqueOrdered(
      Array.from(row.matchAll(/href="https:\/\/www\.fcf\.cat\/(?:equip|calendari-equip)\/[^"]*\/([^\/"?#]+)"/g)).map(m => m[1])
    );
    return slugs.includes(teamSlug) && slugs.includes(opponentSlug);
  }) || null;
}

function extractFieldAndReferee(row: string): { field: string | null; referee: string | null } {
  const fieldMatch = row.match(/href="https:\/\/www\.fcf\.cat\/camp\/\d+"[^>]*>([^<]+)</);
  const refereeMatch = row.match(/camp\.png[^>]*><\/a>\s*<br\s*\/?>\s*([^<]*?)\s*<img[^>]+xiulet\.png/);
  return {
    field: fieldMatch ? cleanHtmlText(fieldMatch[1]) : null,
    referee: refereeMatch && refereeMatch[1].trim() ? cleanHtmlText(refereeMatch[1]) : null,
  };
}

function cleanHtmlText(value: string): string {
  return value
    .replace(/\\'/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
