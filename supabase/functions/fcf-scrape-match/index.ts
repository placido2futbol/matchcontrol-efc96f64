const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface MatchPlayer {
  name: string;
  dorsal: string;
  isStarter: boolean;
}

interface MatchGoal {
  playerName: string;
  minute: number;
  type: 'normal' | 'penalty';
  teamSide: 'home' | 'away';
  runningScore: string;
}

interface MatchCard {
  playerName: string;
  minute: number;
  cardType: 'yellow' | 'red';
  teamSide: 'home' | 'away';
}

interface MatchData {
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: MatchPlayer[];
  awayPlayers: MatchPlayer[];
  score: string;
  actaUrl: string;
  goals: MatchGoal[];
  cards: MatchCard[];
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

    const teamSlug = teamPageUrl.split('/').pop();
    const seasonMatch = teamPageUrl.match(/equip\/(\d{4})/);
    const season = seasonMatch ? seasonMatch[1] : '2526';

    const calendarUrl = `https://www.fcf.cat/calendari-equip/${season}/futbol-11/quarta-catalana/grup-28/${teamSlug}`;
    console.log(`Fetching calendar: ${calendarUrl}`);

    const calResponse = await fetch(calendarUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const calHtml = await calResponse.text();

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

    let matchData: MatchData | null = null;

    for (const actaUrl of actaUrls) {
      try {
        console.log(`Checking acta: ${actaUrl}`);
        const actaResponse = await fetch(actaUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        const actaHtml = await actaResponse.text();

        const titleMatch = actaHtml.match(/class="apex"[^>]*>([^<]+)/);
        if (!titleMatch) continue;

        const titleParts = titleMatch[1].split(' - ');
        if (titleParts.length < 2) continue;

        const actaHomeTeam = titleParts[0].trim();
        const actaAwayTeam = titleParts.slice(1).join(' - ').trim();

        const homeMatch = normalizeTeamName(actaHomeTeam).includes(normalizeTeamName(homeTeamName || '')) ||
                         normalizeTeamName(homeTeamName || '').includes(normalizeTeamName(actaHomeTeam));
        const awayMatch = normalizeTeamName(actaAwayTeam).includes(normalizeTeamName(awayTeamName || '')) ||
                         normalizeTeamName(awayTeamName || '').includes(normalizeTeamName(actaAwayTeam));

        if (homeMatch && awayMatch) {
          const sections = actaHtml.split('col-md-4 p-0_ml');
          
          const homePlayers = sections.length >= 2 ? extractPlayersFromSection(sections[1]) : [];
          const awayPlayers = sections.length >= 4 ? extractPlayersFromSection(sections[3]) : [];

          // Extract score
          const scoreMatch = actaHtml.match(/acta-marcador[^>]*>\s*<span>\s*(\d+\s*-\s*\d+)\s*<\/span>/);
          const score = scoreMatch ? scoreMatch[1].replace(/\s/g, '') : '';

          // Extract goals from the Gols table (in sections[2] - middle section)
          const goals = extractGoals(actaHtml, homePlayers, awayPlayers);

          // Extract cards from home (sections[1]) and away (sections[3]) sections
          const homeCards = sections.length >= 2 ? extractCardsFromSection(sections[1], 'home') : [];
          const awayCards = sections.length >= 4 ? extractCardsFromSection(sections[3], 'away') : [];
          const cards = [...homeCards, ...awayCards];

          matchData = {
            homeTeamName: actaHomeTeam,
            awayTeamName: actaAwayTeam,
            homePlayers,
            awayPlayers,
            score,
            actaUrl,
            goals,
            cards,
          };

          console.log(`Found match: ${actaHomeTeam} vs ${actaAwayTeam}, ${goals.length} goals, ${cards.length} cards`);
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
  
  const titularsMatch = sectionHtml.indexOf('Titulars');
  const suplentsMatch = sectionHtml.indexOf('Suplents');
  
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

function extractGoals(actaHtml: string, homePlayers: MatchPlayer[], awayPlayers: MatchPlayer[]): MatchGoal[] {
  const goals: MatchGoal[] = [];

  // Find the Gols table
  const golsTableMatch = actaHtml.match(/<th\s+colspan="4"\s*>\s*Gols\s*<\/th>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/);
  if (!golsTableMatch) return goals;

  const golsBody = golsTableMatch[1];
  // Each goal row: gol-normal or gol-penal, running score, player name, minute
  const goalRowRegex = /gol-(normal|penal)[\s\S]*?acta-marcador-gol">\s*([\d\s]+-[\s\d]+)\s*<\/div>[\s\S]*?<a[^>]*>\s*([^<\n]+)[\s\S]*?<td>\s*(\d+)'/g;

  let m;
  while ((m = goalRowRegex.exec(golsBody)) !== null) {
    const type = m[1] === 'penal' ? 'penalty' : 'normal';
    const runningScore = m[2].replace(/\s/g, '');
    const playerName = m[3].trim();
    const minute = parseInt(m[4], 10);

    // Determine team by matching player name against rosters
    const normName = normalizeTeamName(playerName);
    const isHome = homePlayers.some(p => normalizeTeamName(p.name) === normName);
    const isAway = awayPlayers.some(p => normalizeTeamName(p.name) === normName);

    let teamSide: 'home' | 'away';
    if (isHome && !isAway) {
      teamSide = 'home';
    } else if (isAway && !isHome) {
      teamSide = 'away';
    } else {
      // Infer from running score changes
      const parts = runningScore.split('-').map(s => parseInt(s, 10));
      const prevGoals = goals.filter(g => g.teamSide === 'home').length;
      teamSide = parts[0] > prevGoals ? 'home' : 'away';
    }

    goals.push({ playerName, minute, type, teamSide, runningScore });
  }

  return goals;
}

function extractCardsFromSection(sectionHtml: string, teamSide: 'home' | 'away'): MatchCard[] {
  const cards: MatchCard[] = [];

  // Find the Targetes section within this team's section
  const targetsIdx = sectionHtml.indexOf('Targetes');
  if (targetsIdx < 0) return cards;

  const targetsSection = sectionHtml.substring(targetsIdx);

  // Extract each card: player name + card type (groga-s or vermella-s) + minute
  const cardRegex = /<a[^>]*>\s*([^<\n]+)<\/a>[\s\S]*?(groga-s|vermella-s)[\s\S]*?acta-minut-targeta">\s*(\d+)'/g;
  let m;
  while ((m = cardRegex.exec(targetsSection)) !== null) {
    const playerName = m[1].trim();
    const cardType = m[2] === 'vermella-s' ? 'red' : 'yellow';
    const minute = parseInt(m[3], 10);
    cards.push({ playerName, minute, cardType, teamSide });
  }

  return cards;
}
