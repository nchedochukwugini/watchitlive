import { NextRequest, NextResponse } from 'next/server';

const ZAFRONIX_KEY  = process.env.ZAFRONIX_API_KEY || '';
const ZAFRONIX_BASE = 'https://api.zafronix.com/fifa/worldcup/v1';
const WC_BASE       = 'https://worldcup26.ir';

// Cache: matchId → { data, ts }
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 60_000;

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get('matchId');
  const home    = req.nextUrl.searchParams.get('home');
  const away    = req.nextUrl.searchParams.get('away');

  if (!matchId && !home) {
    return NextResponse.json({ error: 'Missing matchId or home/away' }, { status: 400 });
  }

  const cacheKey = matchId || `${home}-${away}`;
  const cached   = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Strategy 1: Try Zafronix by match ID (format: 2026-001)
    if (matchId) {
      const res = await fetch(`${ZAFRONIX_BASE}/matches/${matchId}`, {
        headers: { 'X-API-Key': ZAFRONIX_KEY },
      });
      if (res.ok) {
        const data = await res.json();
        cache.set(cacheKey, { data, ts: Date.now() });
        return NextResponse.json(data);
      }
    }

    // Strategy 2: Search worldcup26.ir games by team names
    if (home && away) {
      const res = await fetch(`${WC_BASE}/get/games`);
      if (res.ok) {
        const { games } = await res.json();
        const match = games.find((g: any) =>
          (g.home_team_name_en?.toLowerCase() === home.toLowerCase() &&
           g.away_team_name_en?.toLowerCase() === away.toLowerCase()) ||
          (g.home_team_name_en?.toLowerCase() === away.toLowerCase() &&
           g.away_team_name_en?.toLowerCase() === home.toLowerCase())
        );

        if (match) {
          // Try to get richer Zafronix data by team names
          const allRes = await fetch(`${ZAFRONIX_BASE}/matches?year=2026`, {
            headers: { 'X-API-Key': ZAFRONIX_KEY },
          });
          if (allRes.ok) {
            const { data: allMatches } = await allRes.json();
            const zMatch = allMatches?.find((m: any) =>
              (m.homeTeam?.toLowerCase() === home.toLowerCase() &&
               m.awayTeam?.toLowerCase() === away.toLowerCase()) ||
              (m.homeTeam?.toLowerCase() === away.toLowerCase() &&
               m.awayTeam?.toLowerCase() === home.toLowerCase())
            );
            if (zMatch) {
              // Get full details
              const detailRes = await fetch(`${ZAFRONIX_BASE}/matches/${zMatch.id}`, {
                headers: { 'X-API-Key': ZAFRONIX_KEY },
              });
              if (detailRes.ok) {
                const detail = await detailRes.json();
                cache.set(cacheKey, { data: detail, ts: Date.now() });
                return NextResponse.json(detail);
              }
              cache.set(cacheKey, { data: zMatch, ts: Date.now() });
              return NextResponse.json(zMatch);
            }
          }

          // Fallback to worldcup26 data
          const result = {
            homeTeam:   match.home_team_name_en,
            awayTeam:   match.away_team_name_en,
            homeScore:  parseInt(match.home_score) || 0,
            awayScore:  parseInt(match.away_score) || 0,
            status:     match.finished === 'TRUE' ? 'finished' : 'upcoming',
            stage:      match.type,
            group:      match.group,
            date:       match.local_date,
          };
          cache.set(cacheKey, { data: result, ts: Date.now() });
          return NextResponse.json(result);
        }
      }
    }

    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Stats fetch failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
