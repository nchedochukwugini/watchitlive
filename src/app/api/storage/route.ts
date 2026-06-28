import { NextRequest, NextResponse } from 'next/server';
import { uploadPickToStorage } from '@/lib/storage';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const result = await uploadPickToStorage(body);
    return NextResponse.json({
      rootHash:    result.rootHash,
      explorerUrl: result.explorerUrl,
      demo:        result.demo ?? !result.success,
      success:     result.success,
      error:       result.error,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Storage error';
    return NextResponse.json({ error: msg, demo: true }, { status: 500 });
  }
}
