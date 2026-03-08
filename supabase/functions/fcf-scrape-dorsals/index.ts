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
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Se requiere un array de URLs de actas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Aggregate dorsals from all actas
    const dorsalMap: Record<string, Record<string, string>> = {}; // teamName -> { playerName -> dorsal }

    for (const url of urls) {
      if (!url.includes('fcf.cat/acta/')) continue;

      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const html = await response.text();

        // Extract both teams from the acta
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

    // Convert to array format
    const result: TeamDorsals[] = Object.entries(dorsalMap).map(([teamName, players]) => ({
      teamName,
      players: Object.entries(players).map(([name, dorsal]) => ({ name, dorsal })),
    }));

    return new Response(
      JSON.stringify({ success: true, teams: result }),
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

  // Extract team names from acta-title: "Acta | TEAM A - TEAM B"
  const titleMatch = html.match(/class="apex"[^>]*>([^<]+)/);
  if (!titleMatch) return teams;

  const titleParts = titleMatch[1].split(' - ');
  if (titleParts.length < 2) return teams;

  const homeTeamName = titleParts[0].trim();
  const awayTeamName = titleParts.slice(1).join(' - ').trim();

  // The HTML has two main col-md-4 sections with player tables
  // First one is home team, second one (after Àrbitres/Gols section) is away team
  
  // Split HTML into sections by col-md-4
  const sections = html.split('col-md-4 p-0_ml');
  
  // Section index 1 = home team, section index 3 = away team (index 2 is referees/goals middle column)
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
  
  // Match pattern: <span class="num-samarreta-acta2">DORSAL</span> ... player name in <a> tag
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
