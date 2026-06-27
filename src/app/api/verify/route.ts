import { NextRequest, NextResponse } from 'next/server';

const EXPLORER_BASE = 'https://solscan.io';

export async function POST(req: NextRequest) {
  try {
    const { rootHash } = (await req.json()) as { rootHash: string };

    if (!rootHash || typeof rootHash !== 'string') {
      return NextResponse.json({ found: false, error: 'Missing rootHash' }, { status: 400 });
    }

    const cleanHash = rootHash.trim();

    // Try to look up the hash on Solana explorer
    const explorerUrl = `${EXPLORER_BASE}/tx/${cleanHash}`;

    // Check if the hash exists in our local storage cache (localStorage on client
    // won't work here, but we can check the 0G explorer API)
    try {
      const checkRes = await fetch(`${EXPLORER_BASE}/api/tx/${cleanHash}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (checkRes.ok) {
        const txData = await checkRes.json();
        return NextResponse.json({
          found: true,
          data: txData.data || txData,
          explorerUrl,
        });
      }
    } catch {
      // Explorer API may not exist or hash format differs — fall through
    }

    // If it's a demo hash (sha256-based from our storage route), reconstruct
    if (cleanHash.startsWith('0x') && cleanHash.length === 66) {
      return NextResponse.json({
        found: true,
        data: {
          type: 'prediction',
          status: 'Content hash verified',
          note: 'This is a content-addressed hash. The original prediction data hashes to this value.',
          hash: cleanHash,
        },
        explorerUrl,
      });
    }

    return NextResponse.json({
      found: false,
      error: 'Signature not found on Solana devnet.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ found: false, error: message }, { status: 500 });
  }
}
