'use client';

import { useState, useEffect, useRef } from 'react';
import type { LiveOdds } from '@/lib/types';

const POLL_INTERVAL = 30_000;

export function useLiveOdds(fixtureIds: string[]) {
  const [oddsMap, setOddsMap] = useState<Record<string, LiveOdds>>({});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (fixtureIds.length === 0) return;

    async function fetchOdds() {
      try {
        const res = await fetch('/api/odds');
        if (!res.ok) return;
        const data = await res.json();
        setOddsMap(data);
      } catch {
        // ignore
      }
    }

    fetchOdds();
    timerRef.current = setInterval(fetchOdds, POLL_INTERVAL);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fixtureIds.join(',')]);

  return oddsMap;
}
