'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/store';
import { getAllPredictors } from '@/lib/store';
import { buildLeaderboard } from '@/lib/scoring';
import { Leaderboard } from '@/components/Leaderboard';

export default function LeaderboardPage() {
  const { matches, picks, walletAddress } = useApp();

  const entries = useMemo(() => {
    const predictors = getAllPredictors(walletAddress);
    return buildLeaderboard(predictors, picks, matches);
  }, [matches, picks, walletAddress]);

  return (
    <div className="relative z-10 max-w-3xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 text-center"
      >
        <h1
          className="font-pixel text-2xl sm:text-3xl text-[var(--neon-cyan)]"
          style={{ textShadow: '0 0 8px rgba(0,229,255,0.3)' }}
        >
          GLOBAL LEADERBOARD
        </h1>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <Leaderboard entries={entries} title="ALL PREDICTORS" highlightId={walletAddress || 'anon'} />
      </motion.div>
    </div>
  );
}
