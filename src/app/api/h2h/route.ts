import { NextRequest, NextResponse } from 'next/server';

const ZAFRONIX_KEY  = process.env.ZAFRONIX_API_KEY || '';
const ZAFRONIX_BASE = 'https://api.zafronix.com/fifa/worldcup/v1';

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60_000;

export async function GET(req: NextRequest) {
  const team1 = req.nextUrl.searchParams.get('team1');
  const team2 = req.nextUrl.searchParams.get('team2');
  if (!team1 || !team2) {
    return NextResponse.json({ error: 'Missing team1 or team2' }, { status: 400 });
  }

  const key = `h2h-${team1}-${team2}`;
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Fetch all World Cup matches across all years and filter by teams
    const years = [2026, 2022, 2018, 2014, 2010, 2006, 2002, 1998];
    const allH2H: any[] = [];

    await Promise.allSettled(years.map(async (year) => {
      try {
        const res = await fetch(`${ZAFRONIX_BASE}/matches?year=${year}`, {
          headers: { 'X-API-Key': ZAFRONIX_KEY },
        });
        if (!res.ok) return;
        const { data } = await res.json();
        if (!Array.isArray(data)) return;

        const matches = data.filter((m: any) =>
          (m.homeTeam?.toLowerCase() === team1.toLowerCase() &&
           m.awayTeam?.toLowerCase() === team2.toLowerCase()) ||
          (m.homeTeam?.toLowerCase() === team2.toLowerCase() &&
           m.awayTeam?.toLowerCase() === team1.toLowerCase())
        );
        allH2H.push(...matches);
      } catch {}
    }));

    // Sort by date descending
    allH2H.sort((a, b) =>
      new Date(b.kickoffUtc || b.date).getTime() -
      new Date(a.kickoffUtc || a.date).getTime()
    );

    const result = {
      team1,
      team2,
      totalMeetings: allH2H.length,
      matches: allH2H.slice(0, 10),
      summary: {
        team1Wins: allH2H.filter(m =>
          (m.homeTeam?.toLowerCase() === team1.toLowerCase() && m.homeScore > m.awayScore) ||
          (m.awayTeam?.toLowerCase() === team1.toLowerCase() && m.awayScore > m.homeScore)
        ).length,
        team2Wins: allH2H.filter(m =>
          (m.homeTeam?.toLowerCase() === team2.toLowerCase() && m.homeScore > m.awayScore) ||
          (m.awayTeam?.toLowerCase() === team2.toLowerCase() && m.awayScore > m.homeScore)
        ).length,
        draws: allH2H.filter(m => m.homeScore === m.awayScore).length,
      }
    };

    cache.set(key, { data: result, ts: Date.now() });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: 'H2H fetch failed' }, { status: 500 });
  }
}
