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
const CACHE_TTL = 30_000;

function wcStatus(g: any): MatchStatus {
  if (g.finished === 'TRUE') return 'final';
  if (g.time_elapsed === 'live') return 'live';
  if (g.time_elapsed === 'not_started' || !g.time_elapsed) return 'upcoming';
  return 'upcoming';
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const [txlineRes, wcRes] = await Promise.allSettled([
      fetch(`${API_BASE}/api/fixtures/snapshot`, {
        headers: HEADERS,
        next: { revalidate: 30 },
      }),
      fetch(`${WC_BASE}/get/games`),
    ]);

    // Build worldcup26 map: team pair → game data
    const wcMap = new Map<string, any>();
    if (wcRes.status === 'fulfilled' && wcRes.value.ok) {
      const { games } = await wcRes.value.json();
      for (const g of (games || [])) {
        const k = `${g.home_team_name_en?.toLowerCase()}-${g.away_team_name_en?.toLowerCase()}`;
        wcMap.set(k, g);
      }
    }

    // Parse TxLINE fixtures, enriched with worldcup26 status+scores
    let matches: Match[] = [];
    if (txlineRes.status === 'fulfilled' && txlineRes.value.ok) {
      const raw = await txlineRes.value.json();
      matches = (Array.isArray(raw) ? raw : []).map((f: any) => {
        const homeTeam  = f.Participant1 || 'Home';
        const awayTeam  = f.Participant2 || 'Away';
        const key       = `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}`;
        const wc        = wcMap.get(key);
        const startTime = typeof f.StartTime === 'number'
          ? new Date(f.StartTime).toISOString()
          : (f.StartTime || new Date().toISOString());

        // Determine status — worldcup26 is most accurate for finished/live
        let status: MatchStatus = 'upcoming';
        if (wc) {
          status = wcStatus(wc);
        } else {
          // Fallback: if start time passed, mark as live
          if (Date.now() >= new Date(startTime).getTime()) status = 'live';
        }

        const hasScore = status === 'final' || status === 'live';
        const result = hasScore && wc ? {
          home: parseInt(wc.home_score) || 0,
          away: parseInt(wc.away_score) || 0,
        } : undefined;

        return {
          id:          String(f.FixtureId),
          homeTeam,
          awayTeam,
          group:       wc?.group || f.GroupName || undefined,
          kickoffTime: startTime,
          status,
          result,
          gameState:   status === 'final' ? 'F'
                     : status === 'live' ? 'H1'
                     : 'NS',
          minute:      undefined,
        } as Match;
      });
    }

    // Add any worldcup26 matches not in TxLINE
    const txIds = new Set(matches.map(m =>
      `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}`
    ));
    for (const [key, g] of wcMap.entries()) {
      if (!txIds.has(key) && g.finished === 'TRUE') {
        matches.push({
          id:          `wc-${g.id}`,
          homeTeam:    g.home_team_name_en,
          awayTeam:    g.away_team_name_en,
          group:       g.group,
          kickoffTime: new Date(g.local_date).toISOString(),
          status:      'final',
          result: {
            home: parseInt(g.home_score) || 0,
            away: parseInt(g.away_score) || 0,
          },
          gameState: 'F',
        } as Match);
      }
    }

    // Sort: live → upcoming → final
    matches.sort((a, b) => {
      const order = { live: 0, upcoming: 1, final: 2 };
      if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
      return new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime();
    });

    cache = { data: matches, ts: Date.now() };
    return NextResponse.json(matches);
  } catch (err) {
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: 'Failed' }, { status: 502 });
  }
}
