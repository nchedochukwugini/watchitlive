'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LeaderboardEntry } from '@/lib/types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  title?: string;
  highlightId?: string;
}

const RANK_STYLES = [
  'text-[var(--gold)]',
  'text-[var(--silver)]',
  'text-[var(--bronze)]',
];

export function Leaderboard({ entries, title = 'LEADERBOARD', highlightId }: LeaderboardProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="card-retro p-4 border-t-3! border-t-[var(--neon-cyan)]/50! shadow-[inset_0_0_40px_rgba(0,229,255,0.02)]">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-pixel text-xs text-[var(--neon-cyan)] glow-cyan flex items-center gap-2">
          <span className="text-base">🏆</span> {title}
        </h3>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-5 h-5 flex items-center justify-center border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] font-pixel text-[8px] hover:bg-[var(--neon-cyan)]/10 transition-colors"
          title="Scoring info"
        >
          ?
        </button>
      </div>
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="bg-[var(--neon-cyan)]/5 border border-[var(--neon-cyan)]/20 p-2 space-y-0.5">
              <p className="font-pixel text-[7px] text-[var(--neon-cyan)]">WIL PTS = +3 OUTCOME · +2 EXACT</p>
              <p className="font-pixel text-[7px] text-[var(--text-muted)]">✓ = CORRECT OUTCOME</p>
              <p className="font-pixel text-[7px] text-[var(--neon-yellow)]">⭐ = EXACT SCORE</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="font-retro text-sm text-[var(--text-muted)] mb-4">Your calls vs the six AI agents</p>

      <div className="space-y-1">
        {/* Header */}
        <div className="grid grid-cols-[24px_1fr_50px_36px_36px] sm:grid-cols-[30px_1fr_70px_50px_50px] gap-1 sm:gap-2 px-2 pb-2 border-b border-white/10">
          <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)]">#</span>
          <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)]">PLAYER</span>
          <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)] text-right">PTS</span>
          <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)] text-right">✓</span>
          <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)] text-right">⭐</span>
        </div>

        <AnimatePresence mode="popLayout">
          {entries.map((entry, i) => (
            <motion.div
              key={entry.predictor.id}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
              className={`grid grid-cols-[24px_1fr_50px_36px_36px] sm:grid-cols-[30px_1fr_70px_50px_50px] gap-1 sm:gap-2 px-2 py-1.5 sm:py-2 rounded-sm transition-colors ${
                entry.predictor.id === highlightId
                  ? 'bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/30 shadow-[0_0_12px_rgba(0,229,255,0.08)]'
                  : i < 3
                    ? 'bg-white/[0.02] hover:bg-white/5 border border-transparent'
                    : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className={`font-pixel text-sm ${RANK_STYLES[i] || 'text-[var(--text-muted)]'}`}>
                {i + 1}
              </span>
              <div className="flex items-center gap-2 min-w-0">
                {entry.predictor.type === 'agent' && (
                  <span className="text-base flex-shrink-0">{entry.predictor.avatar}</span>
                )}
                <span
                  className={`font-retro text-base truncate ${
                    entry.predictor.type === 'agent'
                      ? 'text-[var(--neon-magenta)]'
                      : 'text-[var(--neon-green)]'
                  }`}
                >
                  {entry.predictor.displayName}
                </span>
                {entry.predictor.type === 'agent' && (
                  <span className="text-xs flex-shrink-0" title="AI Agent">🤖</span>
                )}
              </div>
              <motion.span
                key={entry.points}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="font-pixel text-sm text-right text-[var(--neon-green)]"
              >
                {entry.points}
              </motion.span>
              <span className="font-retro text-sm text-right text-[var(--text-muted)]">
                {entry.correctOutcomes}
              </span>
              <span className="font-retro text-sm text-right text-[var(--neon-yellow)]">
                {entry.exactScores}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
