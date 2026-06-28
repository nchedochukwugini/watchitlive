'use client';

import { useEffect, useState } from 'react';

const PROGRAM_ID   = '6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J';
const SOLSCAN_BASE = 'https://solscan.io/account';

// Derive the daily scores PDA client-side using pure JS
// Seeds: ["daily_scores_roots", epochDay as u16 LE]
async function deriveDailyScoresPDA(epochDay: number): Promise<string> {
  const { PublicKey } = await import('@solana/web3.js');
  const programId = new PublicKey(PROGRAM_ID);
  const seed1     = Buffer.from('daily_scores_roots');
  const seed2     = Buffer.alloc(2);
  seed2.writeUInt16LE(epochDay, 0);

  const [pda] = PublicKey.findProgramAddressSync([seed1, seed2], programId);
  return pda.toBase58();
}

interface Props {
  kickoffTime: string; // ISO timestamp of the match
}

export function DailyScoresPDA({ kickoffTime }: Props) {
  const [pda, setPda]       = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const kickoff  = new Date(kickoffTime).getTime();
    const epochDay = Math.floor(kickoff / (24 * 60 * 60 * 1000));
    deriveDailyScoresPDA(epochDay).then(setPda).catch(() => {});
  }, [kickoffTime]);

  if (!pda) return null;

  const short     = `${pda.slice(0, 6)}…${pda.slice(-4)}`;
  const solscanUrl = `${SOLSCAN_BASE}/${pda}?cluster=devnet`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pda);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  return (
    <div className="mt-2 flex items-center gap-1.5 bg-[var(--bg-secondary)] border border-[var(--neon-cyan)]/15 px-2 py-1.5 rounded-sm">
      <span className="font-pixel text-[6px] text-[var(--neon-cyan)]/60 tracking-widest shrink-0">
        ON-CHAIN PDA
      </span>
      <a
        href={solscanUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-pixel text-[7px] text-[var(--neon-cyan)] hover:text-white transition-colors flex-1 truncate"
        title={pda}
      >
        {short}
      </a>
      <button
        onClick={copy}
        className="font-pixel text-[6px] text-[var(--text-muted)] hover:text-white transition-colors shrink-0"
      >
        {copied ? '✓' : 'COPY'}
      </button>
    </div>
  );
}
