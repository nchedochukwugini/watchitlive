import { NextRequest, NextResponse } from 'next/server';
import { generateAgentPick } from '@/lib/agents';
import { Match, AGENT_IDS } from '@/lib/types';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';

async function fetchOddsForFixture(fixtureId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/odds/snapshot/${fixtureId}`, {
      headers: {
        'Authorization': `Bearer ${JWT}`,
        'X-Api-Token':   TOKEN,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();

    // Parse 1X2 odds from snapshot
    // Find 1X2 market from array
    const market = Array.isArray(data)
      ? data.find((p: any) => p.SuperOddsType?.startsWith('1X2'))
      : data;
    const prices = market?.Prices || market?.prices || [];
    const names  = data?.priceNames || data?.PriceNames || [];

    if (prices.length >= 2) {
      return {
        home: prices[0] / 1000,
        draw: prices.length >= 3 ? prices[1] / 1000 : undefined,
        away: prices[prices.length - 1] / 1000,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentId, match } = body as { agentId: string; match: Match };

    if (!agentId || !(AGENT_IDS as readonly string[]).includes(agentId)) {
      return NextResponse.json({ success: false, error: `Invalid agentId: ${agentId}` }, { status: 400 });
    }

    if (!match?.id || !match?.homeTeam || !match?.awayTeam) {
      return NextResponse.json({ success: false, error: 'Invalid match data' }, { status: 400 });
    }

    // Fetch live TxLINE odds for this fixture
    const odds = await fetchOddsForFixture(match.id);

    // Generate prediction with odds context
    const prediction = await generateAgentPick(agentId, match, odds || undefined);

    return NextResponse.json({ success: true, prediction, oddsUsed: odds });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
