'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

interface VerifyResult {
  found: boolean;
  data?: Record<string, unknown>;
  explorerUrl?: string;
  error?: string;
}

export default function VerifyPage() {
  const [hash, setHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);

  const verify = async () => {
    const trimmed = hash.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rootHash: trimmed }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ found: false, error: 'Network error — try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-6 sm:mb-10"
      >
        <h1 className="font-pixel text-base sm:text-xl text-[var(--neon-green)] mb-2 flex items-center justify-center gap-2">
          <span>🔍</span> VERIFY PREDICTION
        </h1>
        <p className="font-retro text-sm sm:text-lg text-[var(--text-muted)]">
          Paste the Solana transaction signature from your locked pick to verify it was anchored on-chain before kickoff.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-retro p-4 sm:p-6 border-t-3! border-t-[var(--neon-green)]/40!"
      >
        <label className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-cyan)] tracking-widest mb-3 block">
          SOLANA TX SIGNATURE
        </label>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            placeholder="Enter Solana tx signature (base58)..."
            className="flex-1 bg-[var(--bg-secondary)] border-2 border-white/15 px-3 py-2.5 font-retro text-base text-white placeholder:text-white/20 focus:border-[var(--neon-cyan)]/60 outline-none"
          />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={verify}
            disabled={loading || !hash.trim()}
            className="btn-neon btn-lock text-[10px]! px-5! disabled:opacity-30"
          >
            {loading ? '...' : 'VERIFY'}
          </motion.button>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            {result.found && result.data ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-3 h-3 rounded-full bg-[var(--neon-green)]" />
                  <span className="font-pixel text-[10px] text-[var(--neon-green)] tracking-widest">
                    PREDICTION VERIFIED
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(result.data)
                    .filter(([k]) => !['app', 'version'].includes(k))
                    .map(([key, value]) => (
                      <div key={key} className="bg-[var(--bg-secondary)] rounded-sm p-3 border border-white/5">
                        <div className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest mb-1">
                          {key.toUpperCase()}
                        </div>
                        <div className="font-retro text-sm text-white break-all">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      </div>
                    ))}
                </div>

                {result.explorerUrl && (
                  <a
                    href={result.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-pixel text-[9px] text-[var(--neon-green)] border border-[var(--neon-green)]/40 px-3 py-2 rounded-sm hover:bg-[var(--neon-green)]/10 transition-colors tracking-widest"
                  >
                    🔗 VIEW ON SOLANA EXPLORER
                  </a>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500" />
                <span className="font-pixel text-[10px] text-red-400 tracking-widest">
                  {result.error || 'NOT FOUND — hash may not exist on Solana'}
                </span>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 0.3 }}
        className="mt-6 text-center font-pixel text-[8px] text-[var(--text-muted)] tracking-widest"
      >
        POWERED BY TXLINE · SOLANA DEVNET
      </motion.p>
    </div>
  );
}
