import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';

// This route just returns credentials for client-side SSE connection
export async function GET(req: NextRequest) {
  return NextResponse.json({
    apiBase: API_BASE,
    jwt:     JWT,
    token:   TOKEN,
  });
}
