'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export function PageLoader() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const firstRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false;
      return;
    }
    setShow(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setShow(false), 850);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [pathname]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="page-loader"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed top-0 left-0 right-0 z-[300] pointer-events-none"
        >
          {/* Track */}
          <div className="relative h-1 bg-black/40 overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.75, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[var(--neon-green)] via-[var(--neon-cyan)] to-[var(--neon-magenta)]"
              style={{ boxShadow: '0 0 12px rgba(0,255,136,0.5)' }}
            />
          </div>
          {/* Football kicker */}
          <motion.div
            initial={{ left: '0%', y: 0, rotate: 0 }}
            animate={{ left: '100%', y: [0, -16, 0], rotate: 360 }}
            transition={{ duration: 0.75, ease: 'easeOut' }}
            className="absolute top-1 -translate-x-1/2 text-base"
          >
            ⚽
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
