'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  fixtureId: string;
  homeTeam:  string;
  awayTeam:  string;
  result:    { home: number; away: number };
}

export function ScoreVerifyButton({ fixtureId, homeTeam, awayTeam, result }: Props) {
  const [loading,   setLoading]   = useState(false);
  const [verified,  setVerified]  = useState<boolean | null>(null);
  const [pdaUrl,    setPdaUrl]    = useState<string | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [isDemo,    setIsDemo]    = useState(false);
  const [expanded,  setExpanded]  = useState(false);

  const verify = async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/validate-score', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ fixtureId }),
      });
      const data = await res.json();
      setVerified(data.valid);
      setPdaUrl(data.solscanUrl || null);
      setIsDemo(data.demo || false);
      setError(data.error || null);
      setExpanded(true);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      {verified === null ? (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={verify}
          disabled={loading}
          className="w-full font-pixel text-[8px] tracking-widest py-2 border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/5 hover:bg-[var(--neon-cyan)]/10 transition-colors disabled:opacity-40"
        >
          {loading ? (
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
              ⛓ VERIFYING ON-CHAIN...
            </motion.span>
          ) : (
            '⛓ VERIFY SCORE ON-CHAIN'
          )}
        </motion.button>
      ) : (
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border border-[var(--neon-green)]/20 bg-[var(--bg-secondary)] p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${verified ? 'bg-[var(--neon-green)]' : 'bg-red-500'}`} />
                <span className={`font-pixel text-[8px] tracking-widest ${verified ? 'text-[var(--neon-green)]' : 'text-red-400'}`}>
                  {verified ? 'SCORE VERIFIED ON-CHAIN' : 'VERIFICATION FAILED'}
                </span>
                {isDemo && (
                  <span className="font-pixel text-[6px] text-[var(--neon-yellow)] ml-auto">DEMO</span>
                )}
              </div>

              <div className="font-pixel text-[8px] text-[var(--text-muted)] mb-2">
                {homeTeam} {result.home} – {result.away} {awayTeam}
              </div>

              {error && (
                <p className="font-pixel text-[7px] text-red-400 mb-2">{error}</p>
              )}

              <div className="flex gap-2">
                {pdaUrl && !isDemo && (
                  <a
                    href={pdaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-pixel text-[7px] text-[var(--neon-cyan)] border border-[var(--neon-cyan)]/30 px-2 py-1 hover:bg-[var(--neon-cyan)]/10 transition-colors"
                  >
                    VIEW PDA →
                  </a>
                )}
                <button
                  onClick={() => { setVerified(null); setExpanded(false); setError(null); }}
                  className="font-pixel text-[7px] text-[var(--text-muted)] border border-white/10 px-2 py-1 hover:bg-white/5 transition-colors"
                >
                  RESET
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
