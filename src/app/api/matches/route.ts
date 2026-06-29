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

const STATUS_ID_MAP: Record<number, MatchStatus> = {
  1: 'upcoming',  // NS
  2: 'live',      // H1
  3: 'live',      // HT
  4: 'live',      // H2
  5: 'final',     // F
  6: 'live',      // WET
  7: 'live',      // ET1
  8: 'live',      // HTET
  9: 'live',      // ET2
  10: 'final',    // FET
  11: 'live',     // WPE
  12: 'live',     // PE
  13: 'final',    // FPE
};

function deriveStatus(gameState: string, startTime: string | number, statusId?: number): MatchStatus {
  // Use StatusId if available - more reliable than GameState
  if (statusId && STATUS_ID_MAP[statusId]) return STATUS_ID_MAP[statusId];
  if (FINAL_STATES.has(gameState)) return 'final';
  if (LIVE_STATES.has(gameState))  return 'live';
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

    // Fetch scores snapshots for all fixtures to get real StatusId
    let scoresMap = new Map<string, any>();
    if (txlineRes.status === 'fulfilled' && txlineRes.value.ok) {
      const rawFixtures = await txlineRes.value.json();
      const fixtureIds = (Array.isArray(rawFixtures) ? rawFixtures : []).map((f: any) => f.FixtureId);

      // Fetch scores in parallel (limit to 20)
      await Promise.allSettled(
        fixtureIds.slice(0, 20).map(async (id: number) => {
          try {
            const r = await fetch(`${API_BASE}/api/scores/snapshot/${id}`, { headers: HEADERS });
            if (!r.ok) return;
            const data = await r.json();
            const snap = Array.isArray(data) ? data[0] : data;
            if (snap) scoresMap.set(String(id), snap);
          } catch {}
        })
      );

      // Parse TxLINE fixtures
      const txlineFixturesRaw: Match[] = [];
      for (const f of (Array.isArray(rawFixtures) ? rawFixtures : [])) {
        const homeTeam  = f.Participant1 || 'Home';
        const awayTeam  = f.Participant2 || 'Away';
        const key       = `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}`;
        const wcMatch   = finishedMap.get(key);
        const scoreSnap = scoresMap.get(String(f.FixtureId));

        const isFinished = wcMatch?.finished === 'TRUE';
        const isWcLive   = wcMatch?.time_elapsed === 'live';

        // Use TxLINE StatusId as primary source
        const statusId = scoreSnap?.StatusId;
        const status: MatchStatus = isFinished ? 'final'
          : isWcLive ? 'live'
          : deriveStatus(f.GameState || 'NS', f.StartTime || '', statusId);

        // Get score from TxLINE scores snapshot first, then worldcup26
        const txHome = scoreSnap?.Score?.Participant1?.Total?.Goals ?? null;
        const txAway = scoreSnap?.Score?.Participant2?.Total?.Goals ?? null;
        const hasScore = status === 'final' || status === 'live';

        txlineFixturesRaw.push({
          id:          String(f.FixtureId),
          homeTeam,
          awayTeam,
          group:       f.GroupName || wcMatch?.group || undefined,
          kickoffTime: typeof f.StartTime === 'number'
            ? new Date(f.StartTime).toISOString()
            : (f.StartTime || new Date().toISOString()),
          status,
          result: hasScore ? {
            home: txHome ?? (wcMatch ? parseInt(wcMatch.home_score) || 0 : 0),
            away: txAway ?? (wcMatch ? parseInt(wcMatch.away_score) || 0 : 0),
          } : undefined,
          gameState: scoreSnap ? (
            [5,10,13].includes(statusId) ? 'F' :
            statusId === 2 ? 'H1' :
            statusId === 3 ? 'HT' :
            statusId === 4 ? 'H2' :
            statusId === 12 ? 'PE' : 'NS'
          ) : (f.GameState || 'NS'),
          minute: f.Minute || undefined,
        } as Match);
      }

      return txlineFixturesRaw;
    }
    let txlineFixtures: Match[] = [];

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
