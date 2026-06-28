import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL       = process.env.RPC_URL || 'https://api.devnet.solana.com';
const EXPLORER_BASE = 'https://solscan.io';

export async function POST(req: NextRequest) {
  try {
    const { rootHash } = (await req.json()) as { rootHash: string };

    if (!rootHash || typeof rootHash !== 'string') {
      return NextResponse.json({ found: false, error: 'Missing signature' }, { status: 400 });
    }

    const sig = rootHash.trim();

    // Demo hash fallback
    if (sig.startsWith('demo-')) {
      return NextResponse.json({
        found: true,
        data: {
          type:   'prediction',
          status: 'Demo hash — not anchored on-chain',
          hash:   sig,
          note:   'Connect a wallet and make a real pick to get a Solana tx signature.',
        },
        explorerUrl: null,
        demo: true,
      });
    }

    // Verify on Solana devnet
    const connection  = new Connection(RPC_URL, 'confirmed');
    const tx = await connection.getParsedTransaction(sig, {
      commitment:                       'confirmed',
      maxSupportedTransactionVersion:   0,
    });

    if (!tx) {
      return NextResponse.json({
        found: false,
        error: 'Transaction not found on Solana devnet. Make sure you copied the full signature.',
      });
    }

    // Extract memo data if present
    let memoData: string | null = null;
    const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr';
    for (const ix of tx.transaction.message.instructions) {
      if ('programId' in ix && ix.programId.toString() === MEMO_PROGRAM) {
        if ('parsed' in ix) memoData = ix.parsed as string;
        else if ('data' in ix) memoData = ix.data as string;
      }
    }

    const blockTime = tx.blockTime
      ? new Date(tx.blockTime * 1000).toISOString()
      : 'Unknown';

    const fee  = tx.meta?.fee ?? 0;
    const slot = tx.slot;

    return NextResponse.json({
      found: true,
      data: {
        signature:  sig.slice(0, 20) + '…' + sig.slice(-8),
        status:     tx.meta?.err ? 'FAILED' : 'CONFIRMED',
        timestamp:  blockTime,
        slot:       String(slot),
        fee:        `${fee} lamports`,
        memo:       memoData || 'watchitlive:pick',
        network:    'Solana Devnet',
      },
      explorerUrl: `${EXPLORER_BASE}/tx/${sig}?cluster=devnet`,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ found: false, error: message }, { status: 500 });
  }
}
