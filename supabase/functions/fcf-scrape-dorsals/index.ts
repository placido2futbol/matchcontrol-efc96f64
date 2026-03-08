const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // If a team page URL is provided, derive the calendar URL and scrape it
    if (teamPageUrl && teamPageUrl.includes('fcf.cat/equip/')) {
      try {
        // Convert team page URL to calendar URL
        // From: https://www.fcf.cat/equip/2526/4cat/sant-pau-dordal-ue-a
        // To:   https://www.fcf.cat/calendari-equip/2526/futbol-11/quarta-catalana/grup-28/sant-pau-dordal-ue-a
        const teamSlug = teamPageUrl.split('/').pop();
        const seasonMatch = teamPageUrl.match(/equip\/(\d{4})/);
        const season = seasonMatch ? seasonMatch[1] : '2526';
        
        // Try the calendar page first (has ALL matches)
        const calendarUrl = `https://www.fcf.cat/calendari-equip/${season}/futbol-11/quarta-catalana/grup-28/${teamSlug}`;
        console.log(`Fetching calendar: ${calendarUrl}`);
        
        const calResponse = await fetch(calendarUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const calHtml = await calResponse.text();
        
        // Extract all acta URLs from the calendar page
        const actaRegex = /href="(https:\/\/www\.fcf\.cat\/acta\/[^"]+)"/g;
        let match;
        const found = new Set<string>();
        while ((match = actaRegex.exec(calHtml)) !== null) {
          found.add(match[1]);
        }
        
        // If calendar didn't work, fall back to team page
        if (found.size === 0) {
          console.log('Calendar empty, trying team page...');
          const pageResponse = await fetch(teamPageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          const pageHtml = await pageResponse.text();
          const actaRegex2 = /href="(https:\/\/www\.fcf\.cat\/acta\/[^"]+)"/g;
          let m;
          while ((m = actaRegex2.exec(pageHtml)) !== null) {
            found.add(m[1]);
          }
        }
        
        urls = [...urls, ...found];
        console.log(`Found ${found.size} acta URLs total`);
      } catch (e) {
        console.error('Error fetching team/calendar page:', e);
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
    console.log(`Scraping ${urls.length} actas...`);

    // Aggregate dorsals from all actas
    const dorsalMap: Record<string, Record<string, string>> = {};

    // Process actas in parallel (batches of 5 to avoid overload)
    for (let i = 0; i < urls.length; i += 5) {
      const batch = urls.slice(i, i + 5);
      const results = await Promise.allSettled(
        batch.map(async (url) => {
          if (!url.includes('fcf.cat/acta/')) return;
          console.log(`Scraping acta: ${url}`);
          const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
          });
          const html = await response.text();
          return parseActa(html);
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          for (const team of result.value) {
            if (!dorsalMap[team.teamName]) {
              dorsalMap[team.teamName] = {};
            }
            for (const p of team.players) {
              if (p.dorsal) {
                dorsalMap[team.teamName][p.name] = p.dorsal;
              }
            }
          }
        }
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

  const titleMatch = html.match(/class="apex"[^>]*>([^<]+)/);
  if (!titleMatch) return teams;

  const titleParts = titleMatch[1].split(' - ');
  if (titleParts.length < 2) return teams;

  const homeTeamName = titleParts[0].trim();
  const awayTeamName = titleParts.slice(1).join(' - ').trim();

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
