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
  const [signals, setSignals]   = useState<TxLineSignal[]>([]);
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

  // Connect to TxLINE SSE via Next.js proxy
  useEffect(() => {
    function connect() {
      if (esRef.current) esRef.current.close();
      const es = new EventSource('/api/txline?stream=odds');
      esRef.current = es;

      es.onopen  = () => setConnected(true);
      es.onerror = () => {
        setConnected(false);
        es.close();
        setTimeout(connect, 5000);
      };

      es.onmessage = (e) => {
        if (!e.data || e.data === '[HEARTBEAT]') return;
        const signal = parseOddsSSE(e.data, fixtureMap.current);
        if (signal) {
          addSignal(signal);
          emitSignal(signal);
          fireSignalToast(signal);
        }
      };
    }

    connect();
    return () => esRef.current?.close();
  }, [addSignal]);

  const recentCount = signals.filter((s) => Date.now() - s.ts < 30000).length;

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
            {s.market === 'HOME' ? s.home : s.away}
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
