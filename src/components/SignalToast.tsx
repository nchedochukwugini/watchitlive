'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TxLineSignal } from '@/lib/txline';

interface Toast extends TxLineSignal {
  key: number;
}

let toastListeners: ((s: TxLineSignal) => void)[] = [];

export function fireSignalToast(signal: TxLineSignal) {
  toastListeners.forEach(fn => fn(signal));
}

export function SignalToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const keyRef = { current: 0 };

  const addToast = useCallback((signal: TxLineSignal) => {
    const toast: Toast = { ...signal, key: Date.now() };
    setToasts(prev => [toast, ...prev].slice(0, 3));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.key !== toast.key));
    }, 6000);
  }, []);

  useEffect(() => {
    toastListeners.push(addToast);
    return () => { toastListeners = toastListeners.filter(fn => fn !== addToast); };
  }, [addToast]);

  const isUp      = (s: Toast) => s.direction === '▲';
  const accent    = (s: Toast) => isUp(s) ? '#00ff88' : '#ff3d3d';
  const stars     = (s: Toast) => '★'.repeat(s.strength) + '☆'.repeat(5 - s.strength);
  const bookUrl   = (s: Toast) => `https://www.bet365.com/#/IP/EV${s.fixtureId}/`;

  return (
    <div style={{
      position: 'fixed', top: '70px', right: '12px',
      zIndex: 9000, display: 'flex', flexDirection: 'column', gap: '8px',
      maxWidth: '320px', width: 'calc(100vw - 24px)',
    }}>
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.key}
            initial={{ opacity: 0, x: 60, scale: 0.95 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit={{    opacity: 0, x: 60, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              background:   '#0a0e1a',
              border:       `1px solid ${accent(toast)}44`,
              borderLeft:   `3px solid ${accent(toast)}`,
              borderRadius: '6px',
              padding:      '10px 12px',
              boxShadow:    `0 4px 24px rgba(0,0,0,0.6), 0 0 12px ${accent(toast)}22`,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: accent(toast), display: 'inline-block',
                  animation: 'pulse-dot 1s infinite',
                }} />
                <span className="font-pixel" style={{ fontSize: '7px', color: accent(toast), letterSpacing: '0.1em' }}>
                  SHARP SIGNAL
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '9px', color: '#f59e0b' }}>{stars(toast)}</span>
                <button
                  onClick={() => setToasts(prev => prev.filter(t => t.key !== toast.key))}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Match */}
            <div className="font-pixel" style={{ fontSize: '8px', color: '#f1f5f9', marginBottom: '4px' }}>
              {toast.home} vs {toast.away}
            </div>

            {/* Signal body */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '18px', fontWeight: 900, color: accent(toast), fontFamily: 'monospace' }}>
                {toast.direction}{Math.abs(toast.shift)}%
              </span>
              <div>
                <div className="font-pixel" style={{ fontSize: '7px', color: '#94a3b8' }}>
                  {toast.market === 'HOME' ? toast.home : toast.market === 'AWAY' ? toast.away : toast.market}
                </div>
                <div className="font-pixel" style={{ fontSize: '7px', color: '#475569' }}>
                  {toast.prevProb}% → <span style={{ color: accent(toast) }}>{toast.newProb}%</span>
                  {' · '}{toast.gameState}
                </div>
              </div>
            </div>

            {/* CTA */}
            <a
              href={bookUrl(toast)}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center',
                background: `${accent(toast)}22`,
                border: `1px solid ${accent(toast)}44`,
                color: accent(toast),
                padding: '5px', borderRadius: '4px',
                textDecoration: 'none',
              }}
              className="font-pixel"
              onClick={e => e.stopPropagation()}
            >
              <span style={{ fontSize: '7px', letterSpacing: '0.1em' }}>BET THIS → BET365</span>
            </a>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
