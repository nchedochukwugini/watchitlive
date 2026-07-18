'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommentaryLine {
  id:        string;
  minute:    number;
  event:     string;
  text:      string;
  icon:      string;
  ts:        number;
}

const EVENT_TEMPLATES: Record<string, (data: any) => { text: string; icon: string }> = {
  goal:           (d) => ({ icon: '⚽', text: `GOAL! ${d.team === 1 ? d.home : d.away} score. The market will react — odds shifting now.` }),
  yellow_card:    (d) => ({ icon: '🟨', text: `Yellow card — ${d.team === 1 ? d.home : d.away}. Discipline concern noted by sharp bettors.` }),
  red_card:       (d) => ({ icon: '🟥', text: `RED CARD! ${d.team === 1 ? d.home : d.away} down to 10 men. Massive odds movement incoming.` }),
  corner:         (d) => ({ icon: '🚩', text: `Corner for ${d.team === 1 ? d.home : d.away}. Danger zone — watch the odds.` }),
  substitution:   (d) => ({ icon: '🔄', text: `Substitution — ${d.team === 1 ? d.home : d.away} making a change. Tactical shift.` }),
  kickoff:        (d) => ({ icon: '🏁', text: `KICKOFF! ${d.home} vs ${d.away} underway. TxLINE odds streaming live.` }),
  halftime:       ()  => ({ icon: '⏸', text: `Half time. Review the odds — sharp money often moves at the break.` }),
  fulltime:       ()  => ({ icon: '🔔', text: `Full time! Match over. All picks are now locked on Solana.` }),
  var:            ()  => ({ icon: '📺', text: `VAR check underway. Odds suspended — wait for the decision.` }),
  penalty:        (d) => ({ icon: '🎯', text: `PENALTY awarded to ${d.team === 1 ? d.home : d.away}! Huge swing in win probability.` }),
};

interface Props {
  fixtureId: string;
  home:      string;
  away:      string;
  onClose:   () => void;
}

export function LiveCommentary({ fixtureId, home, away, onClose }: Props) {
  const [lines, setLines]       = useState<CommentaryLine[]>([]);
  const [ttsOn, setTtsOn]       = useState(true);
  const [connected, setConnected] = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);
  const readerRef               = useRef<ReadableStreamDefaultReader | null>(null);

  const speak = (text: string) => {
    if (!ttsOn || typeof window === 'undefined') return;
    window.speechSynthesis?.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.rate   = 1.0;
    utt.pitch  = 1;
    const voices = window.speechSynthesis?.getVoices() || [];
    const voice  = voices.find(v => v.lang.startsWith('en')) || voices[0];
    if (voice) utt.voice = voice;
    window.speechSynthesis?.speak(utt);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  useEffect(() => {
    let active = true;

    async function connect() {
      try {
        const res = await fetch(`/api/txline?stream=scores&fixtureId=${fixtureId}`, {
          headers: { 'Accept': 'text/event-stream' },
        });
        if (!res.ok || !res.body) throw new Error('no stream');

        readerRef.current = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        setConnected(true);

        // Opening line
        const opening = { id: `open-${Date.now()}`, minute: 0, event: 'kickoff', ...EVENT_TEMPLATES.kickoff({ home, away }), ts: Date.now() };
        setLines([opening]);
        speak(opening.text);

        while (active) {
          const { value, done } = await readerRef.current.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const evtLines = buffer.split('\n');
          buffer = evtLines.pop() || '';

          for (const line of evtLines) {
            if (!line.startsWith('data:')) continue;
            const raw = line.slice(5).trim();
            if (!raw || raw === '[HEARTBEAT]') continue;

            try {
              const event  = JSON.parse(raw);
              const action = event.Action?.toLowerCase();
              const clock  = event.Clock;
              const sid    = event.StatusId;

              // Calculate minute
              let minute = 0;
              if (clock) {
                const secs = clock.Seconds || 0;
                if (sid === 2) minute = Math.min(45, Math.max(1, 45 - Math.floor(secs / 60)));
                if (sid === 4) minute = Math.min(90, Math.max(46, 90 - Math.floor(secs / 60)));
              }

              // Map to commentary
              let template = null;
              const teamData = { team: event.Participant, home, away };

              if (action === 'goal')         template = EVENT_TEMPLATES.goal(teamData);
              if (action === 'yellow_card')  template = EVENT_TEMPLATES.yellow_card(teamData);
              if (action === 'red_card')     template = EVENT_TEMPLATES.red_card(teamData);
              if (action === 'corner')       template = EVENT_TEMPLATES.corner(teamData);
              if (action === 'substitution') template = EVENT_TEMPLATES.substitution(teamData);
              if (action === 'var')          template = EVENT_TEMPLATES.var({});
              if (action === 'penalty')      template = EVENT_TEMPLATES.penalty(teamData);
              if (sid === 3 && action === 'status') template = EVENT_TEMPLATES.halftime({});
              if (sid === 5 && action === 'status') template = EVENT_TEMPLATES.fulltime({});

              if (!template) continue;

              const commentary: CommentaryLine = {
                id:     `${action}-${Date.now()}`,
                minute,
                event:  action,
                text:   template.text,
                icon:   template.icon,
                ts:     Date.now(),
              };

              setLines(prev => [...prev, commentary]);
              if (ttsOn) speak(`${minute} minutes. ${template.text}`);
            } catch {}
          }
        }
      } catch {
        if (!active) return;
        setConnected(false);
        setTimeout(connect, 5000);
      }
    }

    connect();
    return () => {
      active = false;
      readerRef.current?.cancel();
      window.speechSynthesis?.cancel();
    };
  }, [fixtureId, home, away]);

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-x-0 bottom-0 z-[150] bg-[var(--bg-primary)] border-t-2 border-[var(--neon-green)]/40"
      style={{ height: '60vh', display: 'flex', flexDirection: 'column' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--neon-green)]' : 'bg-red-500'}`}
            style={{ animation: connected ? 'pulse-dot 1s infinite' : 'none' }} />
          <div>
            <div className="font-pixel text-[9px] text-[var(--neon-green)]">LIVE COMMENTARY</div>
            <div className="font-pixel text-[6px] text-[var(--text-muted)]">{home.toUpperCase()} VS {away.toUpperCase()} · TXLINE</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setTtsOn(!ttsOn); window.speechSynthesis?.cancel(); }}
            className="font-pixel text-[7px] border border-white/20 px-2 py-1"
            style={{ color: ttsOn ? 'var(--neon-cyan)' : 'var(--text-muted)' }}
          >
            {ttsOn ? '🔊 ON' : '🔇 OFF'}
          </button>
          <button onClick={onClose} className="font-pixel text-xs text-[var(--text-muted)] hover:text-white px-2">✕</button>
        </div>
      </div>

      {/* Commentary feed */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {lines.length === 0 && (
          <div className="text-center py-8">
            <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
              <div className="font-pixel text-[8px] text-[var(--neon-cyan)]">CONNECTING TO TXLINE SCORES STREAM...</div>
            </motion.div>
          </div>
        )}
        {lines.map(line => (
          <motion.div
            key={line.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-3"
          >
            <span className="text-xl shrink-0">{line.icon}</span>
            <div className="flex-1">
              {line.minute > 0 && (
                <span className="font-pixel text-[8px] text-[var(--neon-green)] mr-2">{line.minute}'</span>
              )}
              <span className="font-retro text-sm text-[var(--text-primary)]">{line.text}</span>
            </div>
            <button
              onClick={() => speak(`${line.minute > 0 ? line.minute + ' minutes. ' : ''}${line.text}`)}
              className="font-pixel text-[6px] text-[var(--text-muted)] hover:text-[var(--neon-cyan)] shrink-0"
            >🔊</button>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>
    </motion.div>
  );
}
