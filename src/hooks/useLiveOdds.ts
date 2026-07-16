'use client';

import { useState, useEffect, useRef } from 'react';
import type { LiveOdds } from '@/lib/types';

export function useLiveOdds(fixtureIds: string[]) {
  const [oddsMap, setOddsMap] = useState<Record<string, LiveOdds>>({});
  const readerRef = useRef<ReadableStreamDefaultReader | null>(null);

  useEffect(() => {
    if (fixtureIds.length === 0) return;

    // Initial snapshot fetch
    async function fetchSnapshot() {
      try {
        const res = await fetch('/api/odds');
        if (!res.ok) return;
        const data = await res.json();
        setOddsMap(data);
      } catch {}
    }
    fetchSnapshot();

    // Connect to TxLINE odds SSE stream for real-time updates
    let active = true;

    async function connectStream() {
      try {
        const response = await fetch('/api/txline?stream=odds', {
          headers: { 'Accept': 'text/event-stream' },
        });
        if (!response.ok || !response.body) throw new Error('no stream');

        readerRef.current = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (active) {
          const { value, done } = await readerRef.current.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === '[HEARTBEAT]') continue;

            try {
              const event = JSON.parse(raw);
              const fixtureId = String(event.FixtureId);
              if (!fixtureId) continue;

              // Parse 1X2 odds from SSE event
              if (!event.SuperOddsType?.startsWith('1X2')) continue;
              const prices = event.Prices || [];
              if (prices.length < 2) continue;

              const odds: LiveOdds = {
                home:       prices[0] / 1000,
                draw:       prices.length >= 3 ? prices[1] / 1000 : undefined,
                away:       prices[prices.length - 1] / 1000,
                lastUpdate: event.Ts || Date.now(),
                gameState:  event.GameState,
              };

              setOddsMap(prev => ({ ...prev, [fixtureId]: odds }));
            } catch {}
          }
        }
      } catch {
        if (!active) return;
        // Reconnect after 5s on error
        setTimeout(connectStream, 5000);
      }
    }

    connectStream();

    return () => {
      active = false;
      readerRef.current?.cancel();
    };
  }, [fixtureIds.join(',')]);

  return oddsMap;
}
