const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlayerDorsal {
  name: string;
  dorsal: string;
}

interface TeamDorsals {
  teamName: string;
  players: PlayerDorsal[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamPageUrl, actaUrls } = await req.json();

    let urls: string[] = actaUrls || [];

    // If a team page URL is provided, scrape it to find acta links
    if (teamPageUrl && teamPageUrl.includes('fcf.cat/equip/')) {
      try {
        const pageResponse = await fetch(teamPageUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const pageHtml = await pageResponse.text();

        // Extract acta URLs from the team page
        const actaRegex = /href="(https:\/\/www\.fcf\.cat\/acta\/[^"]+)"/g;
        let match;
        const found = new Set<string>();
        while ((match = actaRegex.exec(pageHtml)) !== null) {
          found.add(match[1]);
        }
        urls = [...urls, ...found];
        console.log(`Found ${found.size} acta URLs from team page`);
      } catch (e) {
        console.error('Error fetching team page:', e);
      }
    }

    if (urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontraron actas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Deduplicate
    urls = [...new Set(urls)];

    // Aggregate dorsals from all actas
    const dorsalMap: Record<string, Record<string, string>> = {};

    for (const url of urls) {
      if (!url.includes('fcf.cat/acta/')) continue;

      try {
        console.log(`Scraping acta: ${url}`);
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const html = await response.text();

        const teams = parseActa(html);
        for (const team of teams) {
          if (!dorsalMap[team.teamName]) {
            dorsalMap[team.teamName] = {};
          }
          for (const p of team.players) {
            if (p.dorsal) {
              dorsalMap[team.teamName][p.name] = p.dorsal;
            }
          }
        }
      } catch (e) {
        console.error(`Error fetching ${url}:`, e);
      }
    }

    const result: TeamDorsals[] = Object.entries(dorsalMap).map(([teamName, players]) => ({
      teamName,
      players: Object.entries(players).map(([name, dorsal]) => ({ name, dorsal })),
    }));

    return new Response(
      JSON.stringify({ success: true, teams: result, actasScraped: urls.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseActa(html: string): TeamDorsals[] {
  const teams: TeamDorsals[] = [];

  // Extract team names from acta-title
  const titleMatch = html.match(/class="apex"[^>]*>([^<]+)/);
  if (!titleMatch) return teams;

  const titleParts = titleMatch[1].split(' - ');
  if (titleParts.length < 2) return teams;

  const homeTeamName = titleParts[0].trim();
  const awayTeamName = titleParts.slice(1).join(' - ').trim();

  // Split HTML by col-md-4 sections
  const sections = html.split('col-md-4 p-0_ml');

  if (sections.length >= 2) {
    const homePlayers = extractPlayersFromSection(sections[1]);
    teams.push({ teamName: homeTeamName, players: homePlayers });
  }

  if (sections.length >= 4) {
    const awayPlayers = extractPlayersFromSection(sections[3]);
    teams.push({ teamName: awayTeamName, players: awayPlayers });
  }

  return teams;
}

function extractPlayersFromSection(sectionHtml: string): PlayerDorsal[] {
  const players: PlayerDorsal[] = [];
  const regex = /num-samarreta-acta2">\s*(\d+)\s*<\/span>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g;

  let match;
  while ((match = regex.exec(sectionHtml)) !== null) {
    const dorsal = match[1].trim();
    const name = match[2].trim();
    if (name && dorsal) {
      players.push({ name, dorsal });
    }
  }

  return players;
}
