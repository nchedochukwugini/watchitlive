'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Pick, Match, Predictor } from '@/lib/types';

interface ProphetMomentProps {
  show: boolean;
  pick: Pick | null;
  match: Match | null;
  predictor: Predictor | null;
  onClose: () => void;
}

export function ProphetMoment({ show, pick, match, predictor, onClose }: ProphetMomentProps) {
  const hasConfetti = useRef(false);

  useEffect(() => {
    if (show && !hasConfetti.current) {
      hasConfetti.current = true;
      import('canvas-confetti').then((mod) => {
        const fire = mod.default;
        // Golden confetti burst
        fire({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#ffd700', '#ff6600', '#00ff88'] });
        setTimeout(() => {
          fire({ particleCount: 50, spread: 100, origin: { y: 0.5 }, colors: ['#00e5ff', '#ff00ff', '#ffe600'] });
        }, 300);
      });
    }
    if (!show) hasConfetti.current = false;
  }, [show]);

  if (!pick || !match || !predictor) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0, rotate: -10 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="prophet-card text-center p-8 max-w-sm"
          >
            <motion.div
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mb-4"
            >
              <span className="text-6xl">{predictor.avatar || '🏆'}</span>
            </motion.div>

            <motion.h2
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="font-pixel text-2xl text-[var(--gold)] mb-2"
              style={{ textShadow: '0 0 8px #ffd700, 0 0 16px rgba(255,215,0,0.3)' }}
            >
              PROPHET
            </motion.h2>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="font-pixel text-xs text-[var(--neon-green)] glow-green mb-4"
            >
              CALLED IT
            </motion.p>

            <div className="card-retro p-4 mb-4">
              <p className="font-retro text-lg text-white mb-1">
                {predictor.displayName} predicted
              </p>
              <p className="font-pixel text-sm text-[var(--neon-cyan)] mb-2">
                {match.homeTeam} {pick.score?.home} - {pick.score?.away} {match.awayTeam}
              </p>
              <p className="font-retro text-sm text-[var(--text-muted)]">
                Result: {match.result?.home} - {match.result?.away}
              </p>
            </div>

            <div className="text-[var(--text-muted)] font-pixel text-[8px] space-y-1">
              <p>Locked: {new Date(pick.timestamp).toLocaleString()}</p>
              {pick.storageRef && <p>SOL: {pick.storageRef.slice(0, 16)}...</p>}
            </div>

            <p className="mt-4 font-pixel text-[8px] text-[var(--text-muted)]">
              TAP TO CLOSE
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
