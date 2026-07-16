'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TxLineSignal } from '@/lib/txline';
import { fireSignalToast } from '@/components/SignalToast';
import { parseOddsSSE } from '@/lib/txline';
import { useApp } from '@/lib/store';

let signalListeners: ((s: TxLineSignal) => void)[] = [];

export function emitSignal(s: TxLineSignal) {
  signalListeners.forEach((fn) => fn(s));
}

export function TxLineFeed() {
  const [signals, setSignals]     = useState<TxLineSignal[]>([]);
  const [accuracy, setAccuracy]   = useState<string>('N/A');
  const [tracked, setTracked]     = useState<number>(0);
  const [expanded, setExpanded] = useState(false);
  const [connected, setConnected] = useState(false);
  const { matches } = useApp();
  const esRef = useRef<EventSource | null>(null);

  // Build fixture map for signal detection
  const fixtureMap = useRef(new Map<string, { home: string; away: string }>());
  useEffect(() => {
    matches.forEach((m) => {
      fixtureMap.current.set(m.id, { home: m.homeTeam, away: m.awayTeam });
    });
  }, [matches]);

  const addSignal = useCallback((s: TxLineSignal) => {
    setSignals((prev) => [s, ...prev].slice(0, 50));
  }, []);

  useEffect(() => {
    signalListeners.push(addSignal);
    return () => { signalListeners = signalListeners.filter((fn) => fn !== addSignal); };
  }, [addSignal]);

  // Client-side odds baseline for signal detection (persists in browser)
  const oddsBaseline = useRef<Map<string, number>>(new Map());
  const lastSignalTs = useRef<number>(0);

  useEffect(() => {
    const scanOdds = async () => {
      try {
        // Fetch current odds snapshot
        const res = await fetch('/api/odds');
        if (!res.ok) return;
        const oddsMap: Record<string, any> = await res.json();

        for (const [fixtureId, odds] of Object.entries(oddsMap)) {
          for (const [market, prob] of [['HOME', 1/odds.home], ['AWAY', 1/odds.away]] as [string,number][]) {
            const key      = `${fixtureId}:${market}`;
            const baseline = oddsBaseline.current.get(key);

            if (baseline === undefined) {
              oddsBaseline.current.set(key, prob);
              continue;
            }

            const shift = prob - baseline; // absolute probability shift
            if (Math.abs(shift) >= 0.04) {
              const strength = Math.min(5, Math.ceil(Math.abs(shift) / 0.02));
              const signal = {
                id:        `${fixtureId}-${market}-${Date.now()}`,
                fixtureId,
                home:      odds.homeTeam || 'Home',
                away:      odds.awayTeam || 'Away',
                market,
                direction: shift > 0 ? '▲' as const : '▼' as const,
                shift:     parseFloat((Math.abs(shift) * 100).toFixed(1)), // in percentage points
                prevProb:  parseFloat((baseline * 100).toFixed(1)),
                newProb:   parseFloat((prob * 100).toFixed(1)),
                gameState: odds.gameState || 'NS',
                ts:        Date.now(),
                strength,
              };
              addSignal(signal);
              emitSignal(signal);
              fireSignalToast(signal);
              oddsBaseline.current.set(key, prob);
            } else {
              // Update baseline even if no signal
              oddsBaseline.current.set(key, prob);
            }
          }
        }

        // Also fetch fixture names for better signal display
      } catch {}

      // Fetch accuracy stats
      try {
        const res = await fetch('/api/signals');
        if (!res.ok) return;
        const data = await res.json();
        if (data.accuracy) setAccuracy(data.accuracy);
        if (data.total)    setTracked(data.total);
      } catch {}
    };

    scanOdds();
    const timer = setInterval(scanOdds, 60000);
    return () => clearInterval(timer);
  }, [addSignal]);

  // Connect to TxLINE SSE via Next.js proxy
  useEffect(() => {
    let reader: ReadableStreamDefaultReader | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    async function connect() {
      try {
        const response = await fetch('/api/txline?stream=odds', {
          headers: { 'Accept': 'text/event-stream', 'Cache-Control': 'no-cache' },
        });

        if (!response.ok || !response.body) throw new Error('Stream failed');
        setConnected(true);

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (active) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const raw = line.slice(5).trim();
              if (raw && raw !== '[HEARTBEAT]') {
                const signal = parseOddsSSE(raw, fixtureMap.current);
                if (signal) {
                  addSignal(signal);
                  emitSignal(signal);
                  fireSignalToast(signal);
                }
              }
            }
          }
        }
      } catch {
        if (!active) return;
        setConnected(false);
        retryTimer = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => {
      active = false;
      reader?.cancel();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [addSignal]);

  const recentCount = signals.filter((s) => Date.now() - s.ts < 30000).length;

  const lastTestRef = useRef<number>(0);
  const fireTestSignal = () => {
    const now = Date.now();
    if (now - lastTestRef.current < 2000) return; // debounce 2s
    lastTestRef.current = now;
    const s = {
      id:        `test-${now}`,
      fixtureId: '18213979',
      home:      'Norway',
      away:      'England',
      market:    'HOME',
      direction: '▲' as const,
      shift:     4.3,
      prevProb:  45.1,
      newProb:   49.4,
      gameState: 'H2',
      ts:        Date.now(),
      strength:  3,
    };
    emitSignal(s);
    fireSignalToast(s);
  };

  return (
    <>
      {/* Badge */}
      <div className="fixed bottom-[38px] left-3 z-40">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border-2 font-pixel text-[7px] tracking-widest transition-all ${
            expanded
              ? 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/40 text-[var(--neon-green)]'
              : 'bg-[var(--bg-primary)]/95 border-white/12 text-[var(--text-muted)] hover:border-[var(--neon-green)]/30'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[var(--neon-green)] animate-pulse' : 'bg-red-500'}`} />
          SIGNALS {recentCount > 0 && `(${recentCount})`}
        </button>
        <button
          onClick={fireTestSignal}
          className="font-pixel tracking-widest transition-all"
          style={{ fontSize: '6px', background: '#6366f122', border: '1px solid #6366f144', color: '#818cf8', padding: '4px 6px', cursor: 'pointer', marginLeft: '2px' }}
        >
          ⚡TEST
        </button>
      </div>

      {/* Panel */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-[62px] left-3 z-40 w-72 sm:w-80 max-h-72 overflow-y-auto bg-[var(--bg-primary)]/97 border-2 border-[var(--neon-green)]/20 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          >
            <div className="p-2 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[var(--bg-primary)]/95 z-10">
              <span className="font-pixel text-[7px] text-[var(--neon-green)] tracking-widest">
                📡 SHARP SIGNALS
              </span>
              <div className="flex items-center gap-2">
                <span className={`font-pixel text-[6px] ${connected ? 'text-[var(--neon-green)]' : 'text-red-400'}`}>
                  {connected ? '● LIVE' : '○ OFF'}
                </span>
                {tracked > 0 && (
                  <span className="font-pixel text-[6px] text-[var(--neon-yellow)]">
                    ACC: {accuracy} ({tracked})
                  </span>
                )}
                <button onClick={() => setExpanded(false)} className="font-pixel text-[7px] text-[var(--text-muted)] hover:text-white">✕</button>
              </div>
            </div>

            <div className="p-1.5 space-y-1">
              {signals.slice(0, 20).map((s) => (
                <SignalItem key={s.id} signal={s} />
              ))}
              {signals.length === 0 && (
                <p className="font-pixel text-[7px] text-[var(--text-muted)] text-center py-6">
                  Scanning for sharp movement...
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SignalItem({ signal: s }: { signal: TxLineSignal }) {
  const age    = Math.floor((Date.now() - s.ts) / 1000);
  const ageStr = age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`;
  const isUp   = s.direction === '▲';
  const color  = isUp ? 'var(--neon-green)' : '#ff4444';
  const stars  = '★'.repeat(s.strength) + '☆'.repeat(5 - s.strength);

  return (
    <div
      className="bg-[var(--bg-card)]/80 px-2.5 py-2 border-l-2"
      style={{ borderColor: color }}
    >
      <div className="flex items-start gap-1.5">
        <span className="font-pixel text-[10px] shrink-0" style={{ color }}>
          {s.direction}{Math.abs(s.shift)}%
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-pixel text-[6px] leading-tight truncate" style={{ color }}>
            {s.market === 'HOME' || s.market === s.home ? s.home : s.away}
          </p>
          <p className="font-pixel text-[6px] text-[var(--text-muted)] mt-0.5 truncate">
            {s.home} vs {s.away} · {s.gameState}
          </p>
          <p className="font-pixel text-[6px] text-[var(--neon-yellow)] mt-0.5">{stars}</p>
        </div>
        <span className="font-pixel text-[6px] text-[var(--text-muted)] shrink-0">{ageStr}</span>
      </div>
    </div>
  );
}
