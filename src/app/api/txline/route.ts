import { NextRequest } from 'next/server';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';

export const dynamic    = 'force-dynamic';
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const stream   = req.nextUrl.searchParams.get('stream') || 'odds';
  const fixture  = req.nextUrl.searchParams.get('fixtureId');

  // Return credentials for client-side use
  if (stream === 'creds') {
    return Response.json({ apiBase: API_BASE, jwt: JWT, token: TOKEN });
  }

  const endpoint = stream === 'scores'
    ? `${API_BASE}/api/scores/stream${fixture ? `?FixtureId=${fixture}` : ''}`
    : `${API_BASE}/api/odds/stream`;

  try {
    const upstream = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${JWT}`,
        'X-Api-Token':   TOKEN,
        'Accept':        'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });

    if (!upstream.ok || !upstream.body) {
      return new Response(`TxLINE error: ${upstream.status}`, { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type':                  'text/event-stream',
        'Cache-Control':                 'no-cache, no-transform',
        'Connection':                    'keep-alive',
        'X-Accel-Buffering':             'no',
        'Access-Control-Allow-Origin':   '*',
      },
    });
  } catch (err) {
    return new Response('Stream error', { status: 500 });
  }
}
