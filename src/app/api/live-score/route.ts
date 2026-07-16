import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';

const HEADERS = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token':   TOKEN,
};

const STATUS_MAP: Record<number, string> = {
  1:'NS', 2:'H1', 3:'HT', 4:'H2', 5:'F',
  6:'WET', 7:'ET1', 8:'HTET', 9:'ET2',
  10:'FET', 11:'WPE', 12:'PE', 13:'FPE',
};

function calcMinute(statusId: number, clock: any): number | null {
  if (!clock) return null;
  const secs = clock.Seconds || 0;
  if (statusId === 2) return Math.min(45, Math.max(1, 45 - Math.floor(secs / 60)));
  if (statusId === 3) return 45;
  if (statusId === 4) return Math.min(90, Math.max(46, 90 - Math.floor(secs / 60)));
  if (statusId === 7) return Math.min(105, Math.max(91, 105 - Math.floor(secs / 60)));
  if (statusId === 9) return Math.min(120, Math.max(106, 120 - Math.floor(secs / 60)));
  return null;
}

export async function GET(req: NextRequest) {
  const fixtureId = req.nextUrl.searchParams.get('fixtureId');
  if (!fixtureId) return NextResponse.json({ error: 'Missing fixtureId' }, { status: 400 });

  try {
    const res = await fetch(`${API_BASE}/api/scores/snapshot/${fixtureId}`, {
      headers: HEADERS,
    });
    if (!res.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const raw  = await res.json();
    const snap = Array.isArray(raw) ? raw[0] : raw;
    if (!snap) return NextResponse.json({ error: 'No data' }, { status: 404 });

    const statusId  = snap.StatusId || 1;
    const gameState = STATUS_MAP[statusId] || 'NS';
    const minute    = calcMinute(statusId, snap.Clock);
    const p1        = snap.Score?.Participant1?.Total || {};
    const p2        = snap.Score?.Participant2?.Total || {};

    return NextResponse.json({
      fixtureId,
      statusId,
      gameState,
      minute,
      clock:     snap.Clock,
      homeScore: p1.Goals       || 0,
      awayScore: p2.Goals       || 0,
      stats: {
        home: {
          goals:       p1.Goals       || 0,
          yellowCards: p1.YellowCards || 0,
          redCards:    p1.RedCards    || 0,
          corners:     p1.Corners     || 0,
        },
        away: {
          goals:       p2.Goals       || 0,
          yellowCards: p2.YellowCards || 0,
          redCards:    p2.RedCards    || 0,
          corners:     p2.Corners     || 0,
        }
      }
    });
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
