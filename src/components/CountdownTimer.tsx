'use client';

import { useState, useEffect } from 'react';

export function CountdownTimer({ kickoffTime }: { kickoffTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(kickoffTime).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('LIVE');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);

      if (d > 0) setTimeLeft(`${d}d ${h}h ${m}m`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m ${s}s`);
      else setTimeLeft(`${m}m ${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [kickoffTime]);

  const isUrgent = new Date(kickoffTime).getTime() - Date.now() < 3600000;

  return (
    <span
      className={`font-pixel text-[10px] ${
        timeLeft === 'LIVE'
          ? 'text-[var(--neon-green)] glow-green'
          : isUrgent
            ? 'text-[var(--neon-orange)]'
            : 'text-[var(--text-muted)]'
      }`}
    >
      {timeLeft === 'LIVE' ? '● LIVE' : `⏱ ${timeLeft}`}
    </span>
  );
}
