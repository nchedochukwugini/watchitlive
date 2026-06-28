import { NextResponse } from 'next/server';
import type { Match, MatchStatus } from '@/lib/types';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';
const WC_BASE  = 'https://worldcup26.ir';

const HEADERS = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token':   TOKEN,
};

let cache: { data: Match[]; ts: number } | null = null;
const CACHE_TTL = 60_000;

const LIVE_STATES  = new Set(['H1','H2','ET1','ET2','PE','HT']);
const FINAL_STATES = new Set(['F','FET','FPE']);

function deriveStatus(gameState: string, startTime: string | number): MatchStatus {
  if (FINAL_STATES.has(gameState)) return 'final';
  if (LIVE_STATES.has(gameState))  return 'live';
  // Handle both ISO strings and Unix timestamps (ms)
  const ts = typeof startTime === 'number' ? startTime
    : /^\d{10,}$/.test(String(startTime)) ? parseInt(startTime)
    : new Date(startTime).getTime();
  if (Date.now() >= ts) return 'live';
  return 'upcoming';
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    // Fetch from both sources in parallel
    const [txlineRes, wcRes] = await Promise.allSettled([
      fetch(`${API_BASE}/api/fixtures/snapshot`, {
        headers: HEADERS,
        next: { revalidate: 60 },
      }),
      fetch(`${WC_BASE}/get/games`),
    ]);

    // Parse worldcup26.ir finished matches
    const finishedMap = new Map<string, any>();
    if (wcRes.status === 'fulfilled' && wcRes.value.ok) {
      const { games } = await wcRes.value.json();
      for (const g of (games || [])) {
        const key = `${g.home_team_name_en?.toLowerCase()}-${g.away_team_name_en?.toLowerCase()}`;
        finishedMap.set(key, g);
      }
    }

    // Parse TxLINE fixtures
    let txlineFixtures: Match[] = [];
    if (txlineRes.status === 'fulfilled' && txlineRes.value.ok) {
      const raw = await txlineRes.value.json();
      txlineFixtures = (Array.isArray(raw) ? raw : []).map((f: any) => {
        const homeTeam = f.Participant1 || 'Home';
        const awayTeam = f.Participant2 || 'Away';
        const key      = `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}`;
        const wcMatch  = finishedMap.get(key);

        // If worldcup26 has this match as finished, use that status
        const isFinished = wcMatch?.finished === 'TRUE';
        const isWcLive    = wcMatch?.time_elapsed === 'live';
        const status: MatchStatus = isFinished ? 'final'
          : isWcLive ? 'live'
          : deriveStatus(f.GameState || 'NS', f.StartTime || '');

        return {
          id:          String(f.FixtureId),
          homeTeam,
          awayTeam,
          group:       f.GroupName || wcMatch?.group || undefined,
          kickoffTime: typeof f.StartTime === 'number' ? new Date(f.StartTime).toISOString() : (f.StartTime || new Date().toISOString()),
          status,
          result:      (isFinished || isWcLive) && wcMatch ? {
            home: parseInt(wcMatch.home_score) || 0,
            away: parseInt(wcMatch.away_score) || 0,
          } : undefined,
          gameState:   f.GameState || 'NS',
          minute:      f.Minute || undefined,
        } as Match;
      });
    }

    // Add finished matches from worldcup26 that aren't in TxLINE
    const txlineTeamPairs = new Set(
      txlineFixtures.map(f => `${f.homeTeam.toLowerCase()}-${f.awayTeam.toLowerCase()}`)
    );

    const extraFinished: Match[] = [];
    for (const [key, g] of finishedMap.entries()) {
      if (!txlineTeamPairs.has(key) && g.finished === 'TRUE') {
        extraFinished.push({
          id:          `wc-${g.id}`,
          homeTeam:    g.home_team_name_en,
          awayTeam:    g.away_team_name_en,
          group:       g.group,
          kickoffTime: new Date(g.local_date).toISOString(),
          status:      'final' as MatchStatus,
          result: {
            home: parseInt(g.home_score) || 0,
            away: parseInt(g.away_score) || 0,
          },
        });
      }
    }

    const allMatches = [...txlineFixtures, ...extraFinished];

    // Sort: live first, then upcoming by date, then finished
    allMatches.sort((a, b) => {
      const order = { live: 0, upcoming: 1, final: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
    });

    cache = { data: allMatches, ts: Date.now() };
    return NextResponse.json(allMatches);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch';
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
