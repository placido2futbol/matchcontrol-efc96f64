const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MatchPlayer {
  name: string;
  dorsal: string;
  isStarter: boolean;
}

interface MatchData {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: MatchPlayer[];
  awayPlayers: MatchPlayer[];
  score: string;
  actaUrl: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { teamPageUrl, homeTeamName, awayTeamName } = await req.json();

    if (!teamPageUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Se requiere URL del equipo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract team slug and season from URL
    const teamSlug = teamPageUrl.split('/').pop();
    const seasonMatch = teamPageUrl.match(/equip\/(\d{4})/);
    const season = seasonMatch ? seasonMatch[1] : '2526';

    // Fetch calendar page
    const calendarUrl = `https://www.fcf.cat/calendari-equip/${season}/futbol-11/quarta-catalana/grup-28/${teamSlug}`;
    console.log(`Fetching calendar: ${calendarUrl}`);

    const calResponse = await fetch(calendarUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const calHtml = await calResponse.text();

    // Find the acta URL for the specific match
    // Look for a row that contains both team names and has an acta link
    const actaRegex = /href="(https:\/\/www\.fcf\.cat\/acta\/[^"]+)"/g;
    const actaUrls: string[] = [];
    let match;
    while ((match = actaRegex.exec(calHtml)) !== null) {
      actaUrls.push(match[1]);
    }

    if (actaUrls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontraron actas' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find the matching acta by checking each one
    let matchData: MatchData | null = null;

    for (const actaUrl of actaUrls) {
      try {
        console.log(`Checking acta: ${actaUrl}`);
        const actaResponse = await fetch(actaUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const actaHtml = await actaResponse.text();

        // Extract team names from acta
        const titleMatch = actaHtml.match(/class="apex"[^>]*>([^<]+)/);
        if (!titleMatch) continue;

        const titleParts = titleMatch[1].split(' - ');
        if (titleParts.length < 2) continue;

        const actaHomeTeam = titleParts[0].trim();
        const actaAwayTeam = titleParts.slice(1).join(' - ').trim();

        // Check if this is the match we're looking for
        const homeMatch = normalizeTeamName(actaHomeTeam).includes(normalizeTeamName(homeTeamName || '')) ||
                         normalizeTeamName(homeTeamName || '').includes(normalizeTeamName(actaHomeTeam));
        const awayMatch = normalizeTeamName(actaAwayTeam).includes(normalizeTeamName(awayTeamName || '')) ||
                         normalizeTeamName(awayTeamName || '').includes(normalizeTeamName(actaAwayTeam));

        if (homeMatch && awayMatch) {
          // Found our match! Extract players
          const sections = actaHtml.split('col-md-4 p-0_ml');
          
          const homePlayers = sections.length >= 2 ? extractPlayersFromSection(sections[1]) : [];
          const awayPlayers = sections.length >= 4 ? extractPlayersFromSection(sections[3]) : [];

          // Extract score
          const scoreMatch = actaHtml.match(/acta-marcador[^>]*>\s*<span>\s*(\d+\s*-\s*\d+)\s*<\/span>/);
          const score = scoreMatch ? scoreMatch[1].replace(/\s/g, '') : '';

          matchData = {
            homeTeamName: actaHomeTeam,
            awayTeamName: actaAwayTeam,
            homePlayers,
            awayPlayers,
            score,
            actaUrl,
          };

          console.log(`Found match: ${actaHomeTeam} vs ${actaAwayTeam}`);
          break;
        }
      } catch (e) {
        console.error(`Error processing acta ${actaUrl}:`, e);
      }
    }

    if (!matchData) {
      return new Response(
        JSON.stringify({ success: false, error: 'No se encontró el acta para este partido' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, matchData }),
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

function normalizeTeamName(name: string): string {
  return name.toUpperCase()
    .replace(/[,.']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractPlayersFromSection(sectionHtml: string): MatchPlayer[] {
  const players: MatchPlayer[] = [];
  
  // Check if we're in Titulars or Suplents section
  const titularsMatch = sectionHtml.indexOf('Titulars');
  const suplentsMatch = sectionHtml.indexOf('Suplents');
  
  // Extract titulars
  let titularsSection = sectionHtml;
  if (suplentsMatch > 0) {
    titularsSection = sectionHtml.substring(0, suplentsMatch);
  }
  
  const titularRegex = /num-samarreta-acta2">\s*(\d+)\s*<\/span>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g;
  let match;
  while ((match = titularRegex.exec(titularsSection)) !== null) {
    players.push({
      name: match[2].trim(),
      dorsal: match[1].trim(),
      isStarter: true,
    });
  }
  
  // Extract suplents if present
  if (suplentsMatch > 0) {
    const suplentsSection = sectionHtml.substring(suplentsMatch);
    const suplentRegex = /num-samarreta-acta2">\s*(\d+)\s*<\/span>[\s\S]*?<a[^>]*>([^<]+)<\/a>/g;
    while ((match = suplentRegex.exec(suplentsSection)) !== null) {
      players.push({
        name: match[2].trim(),
        dorsal: match[1].trim(),
        isStarter: false,
      });
    }
  }

  return players;
}
