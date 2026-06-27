import { NextResponse } from 'next/server';
import type { Match, MatchStatus } from '@/lib/types';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';

const HEADERS = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token':   TOKEN,
  'Content-Type':  'application/json',
};

let cache: { data: Match[]; ts: number } | null = null;
const CACHE_TTL = 60 * 1000; // 1 min

const LIVE_STATES  = new Set(['H1','H2','ET1','ET2','PE','HT']);
const FINAL_STATES = new Set(['F','FET','FPE']);

function deriveStatus(gameState: string, startTime: string): MatchStatus {
  if (FINAL_STATES.has(gameState)) return 'final';
  if (LIVE_STATES.has(gameState))  return 'live';
  const kickoffMs = new Date(startTime).getTime();
  if (Date.now() >= kickoffMs)     return 'live';
  return 'upcoming';
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(`${API_BASE}/api/fixtures/snapshot`, {
      headers: HEADERS,
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`TxLINE returned ${res.status}`);

    const raw = await res.json();
    const fixtures: Match[] = (Array.isArray(raw) ? raw : []).map((f: any) => ({
      id:          String(f.FixtureId),
      homeTeam:    f.Participant1 || 'Home',
      awayTeam:    f.Participant2 || 'Away',
      group:       f.GroupName || undefined,
      kickoffTime: f.StartTime || new Date().toISOString(),
      status:      deriveStatus(f.GameState || 'NS', f.StartTime || ''),
      result:      FINAL_STATES.has(f.GameState)
        ? { home: f.HomeScore ?? 0, away: f.AwayScore ?? 0 }
        : undefined,
      // Extra TxLINE fields stored on match for odds display
      gameState:   f.GameState || 'NS',
      minute:      f.Minute || undefined,
    }));

    cache = { data: fixtures, ts: Date.now() };
    return NextResponse.json(fixtures);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch';
    if (cache) return NextResponse.json(cache.data);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
