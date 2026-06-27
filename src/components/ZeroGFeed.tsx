'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ZeroGEvent {
  id: string;
  type: 'storage-upload' | 'storage-success' | 'storage-error' | 'ai-request' | 'ai-success' | 'ai-error';
  message: string;
  hash?: string;
  timestamp: number;
}

let listeners: ((event: ZeroGEvent) => void)[] = [];

export function emitZeroGEvent(event: Omit<ZeroGEvent, 'id' | 'timestamp'>) {
  const full: ZeroGEvent = {
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: Date.now(),
  };
  listeners.forEach((fn) => fn(full));
}

export function ZeroGFeed() {
  const [events, setEvents] = useState<ZeroGEvent[]>([]);
  const [expanded, setExpanded] = useState(false);

  const addEvent = useCallback((event: ZeroGEvent) => {
    setEvents((prev) => [event, ...prev].slice(0, 30));
  }, []);

  useEffect(() => {
    listeners.push(addEvent);
    return () => {
      listeners = listeners.filter((fn) => fn !== addEvent);
    };
  }, [addEvent]);

  const activeCount = events.filter((e) => Date.now() - e.timestamp < 10000).length;

  return (
    <>
      {/* Compact badge — bottom-left, above ticker bar */}
      <div className="fixed bottom-[38px] left-3 z-40">
        <button
          onClick={() => setExpanded(!expanded)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 border-2 font-pixel text-[7px] tracking-widest transition-all ${
            expanded
              ? 'bg-[var(--neon-green)]/10 border-[var(--neon-green)]/40 text-[var(--neon-green)] shadow-[0_0_12px_rgba(0,255,136,0.1)]'
              : 'bg-[var(--bg-primary)]/95 border-white/12 text-[var(--text-muted)] hover:border-[var(--neon-green)]/30 hover:text-[var(--neon-green)]'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${activeCount > 0 ? 'bg-[var(--neon-green)] animate-pulse' : 'bg-[var(--text-muted)]/30'}`} />
          SIGNALS
        </button>
      </div>

      {/* Expanded panel — slides up from bottom-left */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-[62px] left-3 z-40 w-72 sm:w-80 max-h-60 overflow-y-auto bg-[var(--bg-primary)]/97 border-2 border-[var(--neon-green)]/20 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          >
            <div className="p-2 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[var(--bg-primary)]/95 z-10">
              <span className="font-pixel text-[7px] text-[var(--neon-green)] tracking-widest">SIGNAL ACTIVITY</span>
              <button
                onClick={() => setExpanded(false)}
                className="font-pixel text-[7px] text-[var(--text-muted)] hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="p-1.5 space-y-1">
              {events.slice(0, 15).map((event) => (
                <FeedItem key={event.id} event={event} />
              ))}
              {events.length === 0 && (
                <p className="font-retro text-xs text-[var(--text-muted)] text-center py-4">No activity yet</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FeedItem({ event }: { event: ZeroGEvent }) {
  const age = Math.floor((Date.now() - event.timestamp) / 1000);
  const ageStr = age < 60 ? `${age}s` : `${Math.floor(age / 60)}m`;

  const config = {
    'storage-upload': { icon: '📤', color: 'var(--neon-cyan)', border: 'var(--neon-cyan)' },
    'storage-success': { icon: '🔗', color: 'var(--neon-green)', border: 'var(--neon-green)' },
    'storage-error': { icon: '⚠', color: '#ff4444', border: '#ff4444' },
    'ai-request': { icon: '🤖', color: 'var(--neon-cyan)', border: 'var(--neon-cyan)' },
    'ai-success': { icon: '✅', color: 'var(--neon-green)', border: 'var(--neon-green)' },
    'ai-error': { icon: '⚠', color: '#ff4444', border: '#ff4444' },
  }[event.type];

  return (
    <div
      className="bg-[var(--bg-card)]/80 px-2.5 py-1.5 border-l-2"
      style={{ borderColor: config.border }}
    >
      <div className="flex items-start gap-1.5">
        <span className="text-xs shrink-0">{config.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-retro text-xs leading-tight" style={{ color: config.color }}>
            {event.message}
          </p>
          {event.hash && (
            <p className="font-pixel text-[6px] text-[var(--text-muted)] mt-0.5 truncate">
              {event.hash.slice(0, 20)}…
            </p>
          )}
        </div>
        <span className="font-pixel text-[6px] text-[var(--text-muted)] shrink-0">{ageStr}</span>
      </div>
    </div>
  );
}
