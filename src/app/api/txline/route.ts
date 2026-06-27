import { NextRequest } from 'next/server';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';

export async function GET(req: NextRequest) {
  const stream = req.nextUrl.searchParams.get('stream') || 'odds';
  const endpoint = stream === 'scores'
    ? `${API_BASE}/api/scores/stream`
    : `${API_BASE}/api/odds/stream`;

  const upstream = await fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${JWT}`,
      'X-Api-Token':   TOKEN,
      'Accept':        'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });

  if (!upstream.ok) {
    return new Response(`TxLINE error: ${upstream.status}`, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
