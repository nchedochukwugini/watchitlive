import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';
const ZAFRONIX = process.env.ZAFRONIX_API_KEY || '';

const HEADERS = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token':   TOKEN,
};

// TxLINE stat key mapping based on confirmed data
// Keys 1-8 appear to be: goals(1=home,2=away), yellowCards(3=home,4=away),
// redCards(5=home,6=away), corners(7=home,8=away)
function parseStats(stats: Record<string, number>, score: any) {
  const p1 = score?.Participant1?.Total || {};
  const p2 = score?.Participant2?.Total || {};
  return {
    home: {
      goals:        p1.Goals       || 0,
      yellowCards:  p1.YellowCards || 0,
      redCards:     p1.RedCards    || 0,
      corners:      p1.Corners     || 0,
      // Stats numeric keys for additional data
      shotsTotal:   stats['9']  || 0,
      shotsOnGoal:  stats['10'] || 0,
    },
    away: {
      goals:        p2.Goals       || 0,
      yellowCards:  p2.YellowCards || 0,
      redCards:     p2.RedCards    || 0,
      corners:      p2.Corners     || 0,
      shotsTotal:   stats['1009'] || 0,
      shotsOnGoal:  stats['1010'] || 0,
    }
  };
}

// StatusId → game phase name
const STATUS_MAP: Record<number, string> = {
  1: 'NS', 2: 'H1', 3: 'HT', 4: 'H2', 5: 'F',
  6: 'WET', 7: 'ET1', 8: 'HTET', 9: 'ET2',
  10: 'FET', 11: 'WPE', 12: 'PE', 13: 'FPE',
};

const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 30_000;

export async function GET(req: NextRequest) {
  const fixtureId = req.nextUrl.searchParams.get('fixtureId');
  const home      = req.nextUrl.searchParams.get('home');
  const away      = req.nextUrl.searchParams.get('away');

  const cacheKey = fixtureId || `${home}-${away}`;
  const cached   = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    // Strategy 1: Direct TxLINE scores snapshot by fixtureId
    if (fixtureId) {
      const res = await fetch(`${API_BASE}/api/scores/snapshot/${fixtureId}`, {
        headers: HEADERS,
      });
      if (res.ok) {
        const raw  = await res.json();
        const snap = Array.isArray(raw) ? raw[0] : raw;
        if (snap) {
          const parsedStats = parseStats(snap.Stats || {}, snap.Score);
          const statusId    = snap.StatusId || 1;
          const gameState   = STATUS_MAP[statusId] || 'NS';

          // Calculate clock minute
          const isH2  = statusId === 4;
          const secs  = snap.Clock?.Seconds || 0;
          const minute = isH2
            ? Math.max(45, 90 - Math.floor(secs / 60))
            : Math.min(45, 45 - Math.floor(secs / 60));

          const data = {
            fixtureId,
            homeTeam:   home || snap.Participant1 || 'Home',
            awayTeam:   away || snap.Participant2 || 'Away',
            homeScore:  parsedStats.home.goals,
            awayScore:  parsedStats.away.goals,
            status:     ['F','FET','FPE'].includes(gameState) ? 'finished'
                      : ['H1','H2','ET1','ET2','PE','HT'].includes(gameState) ? 'live'
                      : 'upcoming',
            gameState,
            liveMinute: minute,
            clock:      snap.Clock,
            score:      snap.Score,
            statistics: {
              home: {
                possessionPct: 0,
                shotsTotal:    parsedStats.home.shotsTotal,
                shotsOnGoal:   parsedStats.home.shotsOnGoal,
                corners:       parsedStats.home.corners,
                yellowCards:   parsedStats.home.yellowCards,
                redCards:      parsedStats.home.redCards,
                fouls:         0,
                passesTotal:   0,
                passesPct:     0,
              },
              away: {
                possessionPct: 0,
                shotsTotal:    parsedStats.away.shotsTotal,
                shotsOnGoal:   parsedStats.away.shotsOnGoal,
                corners:       parsedStats.away.corners,
                yellowCards:   parsedStats.away.yellowCards,
                redCards:      parsedStats.away.redCards,
                fouls:         0,
                passesTotal:   0,
                passesPct:     0,
              }
            },
            source: 'txline',
          };

          cache.set(cacheKey, { data, ts: Date.now() });
          return NextResponse.json(data);
        }
      }
    }

    // Strategy 2: Search TxLINE fixtures for matching teams, then get scores
    if (home && away) {
      const fixturesRes = await fetch(`${API_BASE}/api/fixtures/snapshot`, { headers: HEADERS });
      if (fixturesRes.ok) {
        const fixtures = await fixturesRes.json();
        const match = (Array.isArray(fixtures) ? fixtures : []).find((f: any) =>
          (f.Participant1?.toLowerCase() === home.toLowerCase() &&
           f.Participant2?.toLowerCase() === away.toLowerCase()) ||
          (f.Participant1?.toLowerCase() === away.toLowerCase() &&
           f.Participant2?.toLowerCase() === home.toLowerCase())
        );

        if (match) {
          const scoreRes = await fetch(
            `${API_BASE}/api/scores/snapshot/${match.FixtureId}`,
            { headers: HEADERS }
          );
          if (scoreRes.ok) {
            const raw  = await scoreRes.json();
            const snap = Array.isArray(raw) ? raw[0] : raw;
            if (snap) {
              const parsedStats = parseStats(snap.Stats || {}, snap.Score);
              const statusId    = snap.StatusId || 1;
              const gameState   = STATUS_MAP[statusId] || 'NS';
              const isReversed  = match.Participant1?.toLowerCase() === away.toLowerCase();

              const data = {
                fixtureId:  String(match.FixtureId),
                homeTeam:   home,
                awayTeam:   away,
                homeScore:  isReversed ? parsedStats.away.goals : parsedStats.home.goals,
                awayScore:  isReversed ? parsedStats.home.goals : parsedStats.away.goals,
                status:     ['F','FET','FPE'].includes(gameState) ? 'finished'
                          : ['H1','H2','ET1','ET2','PE','HT'].includes(gameState) ? 'live'
                          : 'upcoming',
                gameState,
                score:      snap.Score,
                statistics: {
                  home: {
                    possessionPct: 0,
                    shotsTotal:    isReversed ? parsedStats.away.shotsTotal : parsedStats.home.shotsTotal,
                    shotsOnGoal:   isReversed ? parsedStats.away.shotsOnGoal : parsedStats.home.shotsOnGoal,
                    corners:       isReversed ? parsedStats.away.corners : parsedStats.home.corners,
                    yellowCards:   isReversed ? parsedStats.away.yellowCards : parsedStats.home.yellowCards,
                    redCards:      isReversed ? parsedStats.away.redCards : parsedStats.home.redCards,
                    fouls:         0,
                    passesTotal:   0,
                    passesPct:     0,
                  },
                  away: {
                    possessionPct: 0,
                    shotsTotal:    isReversed ? parsedStats.home.shotsTotal : parsedStats.away.shotsTotal,
                    shotsOnGoal:   isReversed ? parsedStats.home.shotsOnGoal : parsedStats.away.shotsOnGoal,
                    corners:       isReversed ? parsedStats.home.corners : parsedStats.away.corners,
                    yellowCards:   isReversed ? parsedStats.home.yellowCards : parsedStats.away.yellowCards,
                    redCards:      isReversed ? parsedStats.home.redCards : parsedStats.away.redCards,
                    fouls:         0,
                    passesTotal:   0,
                    passesPct:     0,
                  }
                },
                source: 'txline',
              };

              cache.set(cacheKey, { data, ts: Date.now() });
              return NextResponse.json(data);
            }
          }
        }
      }
    }

    // Strategy 3: Fallback to Zafronix for historical finished matches
    if (home && away && ZAFRONIX) {
      const allRes = await fetch(
        `https://api.zafronix.com/fifa/worldcup/v1/matches?year=2026`,
        { headers: { 'X-API-Key': ZAFRONIX } }
      );
      if (allRes.ok) {
        const { data: allMatches } = await allRes.json();
        const zMatch = (allMatches || []).find((m: any) =>
          (m.homeTeam?.toLowerCase() === home.toLowerCase() &&
           m.awayTeam?.toLowerCase() === away.toLowerCase()) ||
          (m.homeTeam?.toLowerCase() === away.toLowerCase() &&
           m.awayTeam?.toLowerCase() === home.toLowerCase())
        );
        if (zMatch) {
          const detailRes = await fetch(
            `https://api.zafronix.com/fifa/worldcup/v1/matches/${zMatch.id}`,
            { headers: { 'X-API-Key': ZAFRONIX } }
          );
          if (detailRes.ok) {
            const detail = await detailRes.json();
            cache.set(cacheKey, { data: { ...detail, source: 'zafronix' }, ts: Date.now() });
            return NextResponse.json({ ...detail, source: 'zafronix' });
          }
        }
      }
    }

    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Stats fetch failed' },
      { status: 500 }
    );
  }
}
