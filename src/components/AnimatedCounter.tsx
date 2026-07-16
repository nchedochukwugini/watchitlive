'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';

export function AnimatedCounter({ value, label, color = 'var(--neon-green)' }: {
  value: number;
  label: string;
  color?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const duration = 1000;
    const step = Math.max(1, Math.floor(value / 30));
    const interval = duration / (value / step);

    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(start);
      }
    }, interval);

    return () => clearInterval(timer);
  }, [isInView, value]);

  return (
    <div ref={ref} className="text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={isInView ? { scale: 1 } : {}}
        transition={{ type: 'spring', stiffness: 200 }}
        className="font-pixel text-3xl sm:text-4xl md:text-5xl mb-1.5"
        style={{ color, textShadow: `0 0 8px ${color}33` }}
      >
        {display}
      </motion.div>
      <div className="font-pixel text-[8px] sm:text-[9px] text-[var(--text-muted)] tracking-widest">{label}</div>
    </div>
  );
}
