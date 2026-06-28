'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Match, Pick, Outcome } from '@/lib/types';
import { useApp } from '@/lib/store';
import { getFlagUrl } from '@/lib/countries';
import { emitZeroGEvent } from '@/components/ZeroGFeed';

interface PickModalProps {
  match: Match | null;
  onClose: () => void;
}

export function PickModal({ match, onClose }: PickModalProps) {
  const { addPick, walletAddress } = useApp();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [isLocking, setIsLocking] = useState(false);
  const [locked, setLocked] = useState(false);
  const [storageResult, setStorageResult] = useState<{ rootHash?: string; explorerUrl?: string; demo?: boolean } | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!match) return null;

  const copyHash = async () => {
    if (!storageResult?.rootHash) return;
    try {
      await navigator.clipboard.writeText(storageResult.rootHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  const syncOutcomeToScore = (h: number, a: number) => {
    if (h > a) setOutcome('home');
    else if (a > h) setOutcome('away');
    else setOutcome('draw');
  };

  const updateHomeScore = (v: number) => {
    setHomeScore(v);
    syncOutcomeToScore(v, awayScore);
  };

  const updateAwayScore = (v: number) => {
    setAwayScore(v);
    syncOutcomeToScore(homeScore, v);
  };

  const handleLock = async () => {
    if (!outcome) return;
    setIsLocking(true);

    const timestamp = new Date().toISOString();
    let storageRef = '';
    let explorerUrl = '';
    let isDemo = false;

    try {
      emitZeroGEvent({ type: 'storage-upload', message: `Anchoring on Solana devnet...` });
      const res = await fetch('/api/storage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          predictorId: walletAddress || 'anon',
          matchId: match.id,
          match: `${match.homeTeam} vs ${match.awayTeam}`,
          outcome,
          score: { home: homeScore, away: awayScore },
          timestamp,
          lockedBeforeKickoff: new Date(match.kickoffTime) > new Date(),
        }),
      });
      const data = await res.json();
      storageRef = data.rootHash || '';
      explorerUrl = data.explorerUrl || '';
      isDemo = !!data.demo;
      emitZeroGEvent({ type: 'storage-success', message: `Prediction anchored on Solana`, hash: storageRef });
    } catch (err) {
      isDemo = true;
      setLockError(err instanceof Error ? err.message : 'Storage unavailable');
      emitZeroGEvent({ type: 'storage-error', message: 'Storage fallback — demo hash used' });
    }

    const pick: Pick = {
      id: `${walletAddress || 'anon'}-${match.id}-${Date.now()}`,
      predictorId: walletAddress || 'anon',
      matchId: match.id,
      outcome,
      score: { home: homeScore, away: awayScore },
      timestamp,
      storageRef: storageRef || undefined,
    };

    addPick(pick);
    setStorageResult({ rootHash: storageRef, explorerUrl, demo: isDemo });
    setLocked(true);
    setIsLocking(false);
    // Receipt stays up until the user dismisses it — the proof is the payoff,
    // so we never auto-close and yank it away.
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card-retro p-5 sm:p-6 w-full max-w-md mx-4 border-[var(--neon-cyan)]/60! border-t-3! border-t-[var(--neon-cyan)]!"
        >
          {locked ? (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="text-center py-8"
            >
              <motion.div
                initial={{ rotate: 0, scale: 0 }}
                animate={{ rotate: [0, 15, -10, 0], scale: 1 }}
                transition={{ duration: 0.6 }}
                className="text-5xl mb-4"
              >
                🔒
              </motion.div>
              <h3 className="font-pixel text-sm text-[var(--neon-green)] glow-green mb-3">
                LOCKED ON SOLANA
              </h3>
              <div className="space-y-3">
                <p className="font-retro text-base text-[var(--text-muted)]">
                  Sealed on Solana. No edits after kickoff.
                </p>
                {storageResult?.demo && (
                  <p className="font-pixel text-[9px] text-[var(--neon-yellow)] tracking-widest leading-relaxed px-2">
                    ⚠ DEMO MODE — on-chain tx unavailable
                  </p>
                )}

                {storageResult?.rootHash && (
                  <div className="rounded-sm border border-[var(--neon-cyan)]/30 bg-[var(--bg-secondary)] p-3 text-left">
                    <div className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest mb-1">
                      STORAGE ROOT HASH
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="font-pixel text-[10px] text-[var(--neon-cyan)] break-all flex-1">
                        {storageResult.rootHash.slice(0, 14)}…{storageResult.rootHash.slice(-12)}
                      </code>
                      <button
                        onClick={copyHash}
                        aria-label="Copy storage hash"
                        className="font-pixel text-[8px] tracking-widest px-2 py-1 rounded-sm border border-[var(--neon-cyan)]/40 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/15 transition-colors shrink-0"
                      >
                        {copied ? '✓ COPIED' : 'COPY'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  {storageResult?.demo && (
                    <p className="font-pixel text-[7px] text-[var(--neon-orange)] tracking-widest text-center">
                      ⚠ DEMO MODE — HASH IS LOCAL, NOT ON-CHAIN
                    </p>
                  )}
                  {storageResult?.explorerUrl && !storageResult?.demo && (
                    <a
                      href={storageResult.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-neon w-full flex items-center justify-center gap-2 text-[10px]!"
                    >
                      ⛓ VIEW ON SOLANA EXPLORER
                    </a>
                  )}
                  <button
                    onClick={onClose}
                    className="font-pixel text-[10px] tracking-widest text-[var(--text-muted)] hover:text-white py-2 transition-colors"
                  >
                    DONE ✕
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-pixel text-xs text-[var(--neon-cyan)]">MAKE YOUR CALL</h3>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="font-pixel text-[10px] text-[var(--text-muted)] hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Teams */}
              <div className="flex items-center justify-center gap-6 mb-6">
                <div className="text-center">
                  <img src={getFlagUrl(match.homeTeam)} alt="" className="w-12 h-8 mx-auto mb-1 rounded-sm" />
                  <span className="font-pixel text-[10px]">{match.homeTeam.toUpperCase()}</span>
                </div>
                <span className="font-pixel text-lg text-[var(--text-muted)]">VS</span>
                <div className="text-center">
                  <img src={getFlagUrl(match.awayTeam)} alt="" className="w-12 h-8 mx-auto mb-1 rounded-sm" />
                  <span className="font-pixel text-[10px]">{match.awayTeam.toUpperCase()}</span>
                </div>
              </div>

              {/* Outcome buttons */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {(['home', 'draw', 'away'] as Outcome[]).map((o) => (
                  <motion.button
                    key={o}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setOutcome(o);
                      if (o === 'home') { setHomeScore(2); setAwayScore(1); }
                      else if (o === 'away') { setHomeScore(1); setAwayScore(2); }
                      else { setHomeScore(1); setAwayScore(1); }
                    }}
                    className={`p-3 border-2 font-pixel text-[9px] sm:text-[10px] transition-all ${
                      outcome === o
                        ? o === 'home'
                          ? 'border-[var(--neon-green)] bg-[var(--neon-green)]/10 text-[var(--neon-green)] shadow-[inset_0_0_20px_rgba(0,255,136,0.06),0_2px_0_rgba(0,255,136,0.2)]'
                          : o === 'away'
                            ? 'border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] shadow-[inset_0_0_20px_rgba(255,0,255,0.06),0_2px_0_rgba(255,0,255,0.2)]'
                            : 'border-[var(--neon-yellow)] bg-[var(--neon-yellow)]/10 text-[var(--neon-yellow)] shadow-[inset_0_0_20px_rgba(255,230,0,0.06),0_2px_0_rgba(255,230,0,0.2)]'
                        : 'border-white/15 text-[var(--text-muted)] hover:border-white/30 shadow-[inset_0_0_12px_rgba(255,255,255,0.01),0_2px_0_rgba(255,255,255,0.05)]'
                    }`}
                  >
                    {o === 'home' ? match.homeTeam : o === 'away' ? match.awayTeam : 'DRAW'}
                  </motion.button>
                ))}
              </div>

              {/* Score prediction (optional bonus) */}
              {outcome && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mb-6"
                >
                  <p className="font-pixel text-[9px] text-[var(--text-muted)] mb-3 text-center">
                    PREDICT EXACT SCORE (+2 BONUS)
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="font-pixel text-[9px]">{match.homeTeam.slice(0, 3).toUpperCase()}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateHomeScore(Math.max(0, homeScore - 1))}
                          className="w-7 h-7 border-2 border-white/15 text-white/60 hover:border-white/30 font-pixel text-xs shadow-[inset_0_0_8px_rgba(255,255,255,0.02),0_1px_0_rgba(255,255,255,0.05)]"
                        >
                          -
                        </button>
                        <span className="font-pixel text-lg w-6 text-center text-[var(--neon-green)]">
                          {homeScore}
                        </span>
                        <button
                          onClick={() => updateHomeScore(Math.min(9, homeScore + 1))}
                          className="w-7 h-7 border-2 border-white/15 text-white/60 hover:border-white/30 font-pixel text-xs shadow-[inset_0_0_8px_rgba(255,255,255,0.02),0_1px_0_rgba(255,255,255,0.05)]"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <span className="font-pixel text-[var(--text-muted)]">-</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateAwayScore(Math.max(0, awayScore - 1))}
                          className="w-7 h-7 border-2 border-white/15 text-white/60 hover:border-white/30 font-pixel text-xs shadow-[inset_0_0_8px_rgba(255,255,255,0.02),0_1px_0_rgba(255,255,255,0.05)]"
                        >
                          -
                        </button>
                        <span className="font-pixel text-lg w-6 text-center text-[var(--neon-magenta)]">
                          {awayScore}
                        </span>
                        <button
                          onClick={() => updateAwayScore(Math.min(9, awayScore + 1))}
                          className="w-7 h-7 border-2 border-white/15 text-white/60 hover:border-white/30 font-pixel text-xs shadow-[inset_0_0_8px_rgba(255,255,255,0.02),0_1px_0_rgba(255,255,255,0.05)]"
                        >
                          +
                        </button>
                      </div>
                      <span className="font-pixel text-[9px]">{match.awayTeam.slice(0, 3).toUpperCase()}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Lock button */}
              <motion.button
                whileHover={outcome ? { scale: 1.02 } : {}}
                whileTap={outcome ? { scale: 0.98 } : {}}
                onClick={handleLock}
                disabled={!outcome || isLocking}
                className="btn-neon btn-lock w-full flex items-center justify-center gap-2"
              >
                {isLocking ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      ⛓
                    </motion.span>
                    ANCHORING ON SOLANA...
                  </>
                ) : (
                  <>🔒 LOCK PICK</>
                )}
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
