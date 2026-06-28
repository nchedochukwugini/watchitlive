import { NextResponse } from 'next/server';
import type { LiveOdds } from '@/lib/types';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';

const HEADERS = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token':   TOKEN,
};

// Cache per fixture: fixtureId → { odds, ts }
const cache = new Map<string, { odds: LiveOdds; ts: number }>();
const CACHE_TTL = 30_000;

// Snapshot cache for all fixtures
let snapshotCache: { data: Record<string, LiveOdds>; ts: number } | null = null;
const SNAPSHOT_TTL = 30_000;

function parseOddsPayload(payloads: any[]): LiveOdds | null {
  // Find 1X2 market
  const market1x2 = payloads.find((p: any) =>
    p.SuperOddsType === '1X2' ||
    p.SuperOddsType === '1x2' ||
    p.SuperOddsType === '1X2_PARTICIPANT_RESULT' ||
    p.SuperOddsType?.startsWith('1X2')
  );
  if (!market1x2) return null;

  const prices    = market1x2.Prices || [];
  const pct       = market1x2.Pct || [];
  const names     = market1x2.PriceNames || [];
  const gameState = market1x2.GameState || 'NS';

  if (prices.length < 2) return null;

  // Prices are stored as integers ×1000
  const homeDecimal = prices[0] / 1000;
  const awayDecimal = prices[prices.length - 1] / 1000;
  const drawDecimal = prices.length >= 3 ? prices[1] / 1000 : undefined;

  return {
    home:        homeDecimal,
    draw:        drawDecimal,
    away:        awayDecimal,
    lastUpdate:  market1x2.Ts || Date.now(),
    gameState,
    // Include raw pct if available (already de-margined by TxLINE)
    homePct:     pct[0] ? parseFloat(pct[0]) : undefined,
    drawPct:     pct[1] ? parseFloat(pct[1]) : undefined,
    awayPct:     pct[pct.length - 1] ? parseFloat(pct[pct.length - 1]) : undefined,
    priceNames:  names,
    // Include all markets for richer display
    allMarkets:  payloads.map((p: any) => ({
      market:     p.SuperOddsType,
      prices:     (p.Prices || []).map((x: number) => x / 1000),
      pct:        p.Pct || [],
      names:      p.PriceNames || [],
      gameState:  p.GameState,
      inRunning:  p.InRunning,
    })),
  };
}

// GET /api/odds — returns odds for all fixtures from snapshot
export async function GET() {
  if (snapshotCache && Date.now() - snapshotCache.ts < SNAPSHOT_TTL) {
    return NextResponse.json(snapshotCache.data);
  }

  try {
    // Get all fixtures first
    const fixturesRes = await fetch(`${API_BASE}/api/fixtures/snapshot`, {
      headers: HEADERS,
      next: { revalidate: 30 },
    });
    if (!fixturesRes.ok) throw new Error(`Fixtures ${fixturesRes.status}`);
    const fixtures = await fixturesRes.json();

    const oddsMap: Record<string, LiveOdds> = {};

    // Fetch odds snapshot for each fixture (parallel, limit to 10)
    const upcoming = (Array.isArray(fixtures) ? fixtures : [])
      .slice(0, 30)
      .map((f: any) => String(f.FixtureId));

    await Promise.allSettled(
      upcoming.map(async (fixtureId) => {
        try {
          const res = await fetch(
            `${API_BASE}/api/odds/snapshot/${fixtureId}`,
            { headers: HEADERS }
          );
          if (!res.ok) return;
          const payloads = await res.json();
          if (!Array.isArray(payloads) || payloads.length === 0) return;
          const odds = parseOddsPayload(payloads);
          if (odds) oddsMap[fixtureId] = odds;
        } catch {
          // skip this fixture
        }
      })
    );

    snapshotCache = { data: oddsMap, ts: Date.now() };
    return NextResponse.json(oddsMap);
  } catch (err) {
    return NextResponse.json(snapshotCache?.data || {});
  }
}
