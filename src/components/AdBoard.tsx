'use client';

import Link from 'next/link';

export function AdBoard() {
  const tweetText = encodeURIComponent('Watching live World Cup 2026 odds with sharp signal detection on WatchItLive 🔴⚽ — powered by TxLINE + Solana');
  const tweetUrl  = `https://x.com/intent/tweet?text=${tweetText}&url=https://watchitlive.vercel.app`;

  return (
    <div className="mt-auto border-t-2 border-[var(--neon-cyan)]/10 bg-[var(--bg-primary)]/95">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-3">

        {/* Left — branding */}
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--neon-green)] tracking-widest">
            WATCHITLIVE 2026
          </span>
          <span className="hidden sm:inline font-pixel text-[7px] text-[var(--text-muted)]">·</span>
          <span className="hidden sm:inline font-pixel text-[7px] text-[var(--neon-cyan)] tracking-widest">
            POWERED BY TXLINE + SOLANA
          </span>
        </div>

        {/* Right — links */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/verify"
            className="font-pixel text-[7px] sm:text-[8px] text-[var(--neon-green)] tracking-widest border border-[var(--neon-green)]/30 px-2 py-1 hover:bg-[var(--neon-green)]/10 transition-colors"
          >
            🔍 VERIFY
          </Link>
          <a
            href={tweetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center w-7 h-7 text-[var(--text-muted)] hover:text-white transition-colors border border-white/10 hover:border-white/25"
            title="Share on X"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
