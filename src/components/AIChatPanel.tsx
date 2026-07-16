'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED = [
  "Who is leading the Golden Boot?",
  "What do odds say about the final?",
  "Which upset shocked the market most?",
  "Who has sharp money on them right now?",
];

export function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "I'm WatchItLive AI — your sharp money analyst for World Cup 2026. Ask me anything about matches, odds, or market movements. 📡",
  }]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [ttsOn, setTtsOn]     = useState(true);
  const bottomRef             = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const speak = (text: string) => {
    if (!ttsOn || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt   = new SpeechSynthesisUtterance(text);
    utt.rate    = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const voice  = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (voice) utt.voice = voice;
    window.speechSynthesis.speak(utt);
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel();
  };

  // Fetch TxLINE context client-side (non-blocking)
  const getContext = async (): Promise<string> => {
    try {
      const res = await fetch('/api/txline', { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return '';
      const creds = await res.json();
      const fRes  = await fetch(`${creds.apiBase}/api/fixtures/snapshot`, {
        headers: { 'Authorization': `Bearer ${creds.jwt}`, 'X-Api-Token': creds.token },
        signal: AbortSignal.timeout(2000),
      });
      if (!fRes.ok) return '';
      const fixtures = await fRes.json();
      if (!Array.isArray(fixtures)) return '';
      const now = Date.now();
      const live = fixtures.filter((f: any) => {
        const diff = (now - f.StartTime) / 60000;
        return diff > 0 && diff < 200;
      }).map((f: any) => `${f.Participant1} vs ${f.Participant2} (live)`).join(', ');
      const upcoming = fixtures.filter((f: any) => f.StartTime > now)
        .slice(0, 3).map((f: any) => `${f.Participant1} vs ${f.Participant2}`).join(', ');
      return [live, upcoming].filter(Boolean).join('. Upcoming: ');
    } catch { return ''; }
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    stopSpeech();

    const userMsg: Message = { role: 'user', content: msg };
    const history = [...messages, userMsg];
    setMessages(history);
    setLoading(true);

    try {
      // Fetch context and send in parallel — context is best-effort
      const [, contextResult] = await Promise.allSettled([
        Promise.resolve(),
        getContext(),
      ]);
      const context = contextResult.status === 'fulfilled' ? contextResult.value : '';

      const res  = await fetch('/api/ai-chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message: msg,
          history: history.slice(-6, -1).map(m => ({ role: m.role, content: m.content })),
          context,
        }),
      });
      const data  = await res.json();
      const reply = data.reply || 'No response.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end justify-center bg-black/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-lg bg-[var(--bg-primary)] border-t-2 border-[var(--neon-green)]/40"
        style={{ height: '82vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤖</span>
            <div>
              <div className="font-pixel text-[10px] text-[var(--neon-green)]">WATCHITLIVE AI</div>
              <div className="font-pixel text-[6px] text-[var(--text-muted)] tracking-widest">SHARP MONEY ANALYST · WORLD CUP 2026</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setTtsOn(!ttsOn); stopSpeech(); }}
              className="font-pixel text-[7px] border border-white/20 px-2 py-1 transition-colors"
              style={{ color: ttsOn ? 'var(--neon-cyan)' : 'var(--text-muted)' }}
            >
              {ttsOn ? '🔊 ON' : '🔇 OFF'}
            </button>
            <button onClick={() => { stopSpeech(); onClose(); }} className="font-pixel text-xs text-[var(--text-muted)] hover:text-white px-2">✕</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[85%] px-3 py-2 font-retro text-sm leading-snug"
                style={{
                  background:   m.role === 'user' ? 'rgba(0,255,136,0.1)' : 'var(--bg-card)',
                  border:       `1px solid ${m.role === 'user' ? 'rgba(0,255,136,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color:        m.role === 'user' ? 'var(--neon-green)' : 'var(--text-primary)',
                  borderRadius: m.role === 'user' ? '8px 8px 2px 8px' : '8px 8px 8px 2px',
                }}
              >
                {m.content}
                {m.role === 'assistant' && i > 0 && (
                  <button onClick={() => speak(m.content)} className="ml-2 font-pixel text-[6px] text-[var(--text-muted)] hover:text-[var(--neon-cyan)]">🔊</button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="bg-[var(--bg-card)] border border-white/10 px-3 py-2 font-pixel text-[8px] text-[var(--neon-cyan)]"
                style={{ borderRadius: '8px 8px 8px 2px' }}
              >
                ANALYZING MARKET DATA...
              </motion.div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Suggested questions */}
        {messages.length === 1 && (
          <div className="px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide shrink-0">
            {SUGGESTED.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                className="font-pixel text-[7px] whitespace-nowrap border border-[var(--neon-cyan)]/30 text-[var(--neon-cyan)] px-2 py-1.5 hover:bg-[var(--neon-cyan)]/10 transition-colors shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 pb-4 pt-2 border-t border-white/10 shrink-0">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about matches, odds, market..."
              className="flex-1 bg-[var(--bg-secondary)] border border-white/15 px-3 py-2.5 font-retro text-sm text-white placeholder:text-white/20 focus:border-[var(--neon-green)]/60 outline-none"
            />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => send()}
              disabled={!input.trim() || loading}
              className="font-pixel text-[9px] px-4 bg-[var(--neon-green)] text-[var(--bg-primary)] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              SEND
            </motion.button>
          </div>
          <div className="font-pixel text-[6px] text-[var(--text-muted)] mt-1.5 text-center tracking-widest">
            POWERED BY OPENROUTER · TXLINE CONTEXT
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
