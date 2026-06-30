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

// StatusId is the ONLY reliable source from TxLINE
// GameState field is often wrong/delayed
const STATUS_ID_TO_STATUS: Record<number, MatchStatus> = {
  1: 'upcoming', // NS
  2: 'live',     // H1
  3: 'live',     // HT
  4: 'live',     // H2
  5: 'final',    // F
  6: 'live',     // WET
  7: 'live',     // ET1
  8: 'live',     // HTET
  9: 'live',     // ET2
  10: 'final',   // FET
  11: 'live',    // WPE
  12: 'live',    // PE
  13: 'final',   // FPE
};

const STATUS_ID_TO_GAMESTATE: Record<number, string> = {
  1: 'NS', 2: 'H1', 3: 'HT', 4: 'H2', 5: 'F',
  6: 'WET', 7: 'ET1', 8: 'HTET', 9: 'ET2',
  10: 'FET', 11: 'WPE', 12: 'PE', 13: 'FPE',
};

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const [txlineRes, wcRes] = await Promise.allSettled([
      fetch(`${API_BASE}/api/fixtures/snapshot`, { headers: HEADERS }),
      fetch(`${WC_BASE}/get/games`),
    ]);

    // Build worldcup26 map for finished matches
    const wcMap = new Map<string, any>();
    if (wcRes.status === 'fulfilled' && wcRes.value.ok) {
      const { games } = await wcRes.value.json();
      for (const g of (games || [])) {
        const k = `${g.home_team_name_en?.toLowerCase()}-${g.away_team_name_en?.toLowerCase()}`;
        wcMap.set(k, g);
      }
    }

    let matches: Match[] = [];

    if (txlineRes.status === 'fulfilled' && txlineRes.value.ok) {
      const fixtures = await txlineRes.value.json();

      // Fetch scores snapshots for ALL fixtures in parallel
      const snapshots = new Map<string, any>();
      await Promise.allSettled(
        (Array.isArray(fixtures) ? fixtures : []).map(async (f: any) => {
          try {
            const r = await fetch(
              `${API_BASE}/api/scores/snapshot/${f.FixtureId}`,
              { headers: HEADERS }
            );
            if (!r.ok) return;
            const data = await r.json();
            const snap = Array.isArray(data) ? data[0] : data;
            if (snap) snapshots.set(String(f.FixtureId), snap);
          } catch {}
        })
      );

      matches = (Array.isArray(fixtures) ? fixtures : []).map((f: any) => {
        const homeTeam  = f.Participant1 || 'Home';
        const awayTeam  = f.Participant2 || 'Away';
        const key       = `${homeTeam.toLowerCase()}-${awayTeam.toLowerCase()}`;
        const wc        = wcMap.get(key);
        const snap      = snapshots.get(String(f.FixtureId));
        const startTime = typeof f.StartTime === 'number'
          ? new Date(f.StartTime).toISOString()
          : (f.StartTime || new Date().toISOString());

        // Use StatusId as primary — most reliable
        const statusId  = snap?.StatusId;
        let status: MatchStatus = 'upcoming';
        let gameState   = 'NS';

        if (statusId && STATUS_ID_TO_STATUS[statusId]) {
          status    = STATUS_ID_TO_STATUS[statusId];
          gameState = STATUS_ID_TO_GAMESTATE[statusId] || 'NS';
        } else if (wc) {
          if (wc.finished === 'TRUE')           { status = 'final';    gameState = 'F';  }
          else if (wc.time_elapsed === 'live')  { status = 'live';     gameState = 'H1'; }
        } else {
          // Last resort: time-based
          if (Date.now() >= new Date(startTime).getTime()) {
            status    = 'live';
            gameState = 'H1';
          }
        }

        // Score from TxLINE snapshot first, then worldcup26
        const txHome = snap?.Score?.Participant1?.Total?.Goals;
        const txAway = snap?.Score?.Participant2?.Total?.Goals;
        const hasScore = status === 'final' || status === 'live';

        const result = hasScore ? {
          home: txHome ?? (wc ? parseInt(wc.home_score) || 0 : 0),
          away: txAway ?? (wc ? parseInt(wc.away_score) || 0 : 0),
        } : undefined;

        return {
          id:          String(f.FixtureId),
          homeTeam,
          awayTeam,
          group:       wc?.group || f.GroupName || undefined,
          kickoffTime: startTime,
          status,
          result,
          gameState,
          minute:      undefined,
        } as Match;
      });
    }

    // Add worldcup26 finished matches not in TxLINE
    const txKeys = new Set(matches.map(m =>
      `${m.homeTeam.toLowerCase()}-${m.awayTeam.toLowerCase()}`
    ));
    for (const [key, g] of wcMap.entries()) {
      if (!txKeys.has(key) && g.finished === 'TRUE') {
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
