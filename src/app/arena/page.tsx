'use client';

import { motion } from 'framer-motion';

export default function ArenaPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <span className="text-6xl block mb-6">⚔️</span>
        <h1 className="font-pixel text-xl text-[var(--neon-cyan)] glow-cyan mb-4">
          ARENA MODE
        </h1>
        <p className="font-retro text-xl text-[var(--text-muted)] max-w-md mx-auto mb-6">
          Create private prediction rooms. Challenge your friends. Join by code.
        </p>
        <div className="card-retro p-6 max-w-sm mx-auto">
          <p className="font-pixel text-[10px] text-[var(--neon-orange)] mb-4">
            COMING FOR THE TOP 16 ROUND
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span className="text-lg">🏠</span>
              <span className="font-retro text-sm">Create a room with a custom code</span>
            </div>
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span className="text-lg">🔗</span>
              <span className="font-retro text-sm">Share the code with friends</span>
            </div>
            <div className="flex items-center gap-3 text-[var(--text-muted)]">
              <span className="text-lg">🏆</span>
              <span className="font-retro text-sm">Private leaderboard, same on-chain proofs</span>
            </div>
          </div>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5 }}
          className="font-pixel text-[8px] text-[var(--text-muted)] mt-6"
        >
          ALL PICKS ANCHORED ON SOLANA · SAME SCORING RULES
        </motion.p>
      </motion.div>
    </div>
  );
}
