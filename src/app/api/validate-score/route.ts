import { NextRequest, NextResponse } from 'next/server';
import { validateScoreOnChain } from '@/lib/validateScore';

export async function POST(req: NextRequest) {
  try {
    const { fixtureId } = await req.json();
    if (!fixtureId) {
      return NextResponse.json({ error: 'Missing fixtureId' }, { status: 400 });
    }
    const result = await validateScoreOnChain(String(fixtureId));
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Validation error';
    return NextResponse.json({ valid: false, error: msg }, { status: 500 });
  }
}
