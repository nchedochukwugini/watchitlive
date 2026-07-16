'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useApp } from '@/lib/store';
import { CountdownTimer } from '@/components/CountdownTimer';
import { useEffect, useMemo, useState } from 'react';
import { getFlagUrl } from '@/lib/countries';

const PressStart = dynamic(() => import('@/components/PressStart'), { ssr: false });
const AIChatPanel = dynamic(() => import('@/components/AIChatPanel').then(m => ({ default: m.AIChatPanel })), { ssr: false });

const heroModes = [
  {
    title: 'GLOBAL ARENA',
    subtitle: 'Predict every World Cup match before kickoff. Out-call six AI agents. Every pick locks on Solana.',
    href: '/global',
    color: 'var(--neon-green)',
    icon: '🏆',
    badge: 'REAL-TIME',
    badgeColor: '#00ff88',
    cta: 'PREDICT NOW',
  },
  {
    title: 'AGENT ARENA',
    subtitle: 'Watch six AI agents duel across every fixture. Each agent has a unique strategy.',
    href: '/agents',
    color: 'var(--neon-magenta)',
    icon: '🤖',
    badge: 'TXLINE',
    badgeColor: '#ff00ff',
    cta: 'ENTER',
  },
];

const sideModes = [
  {
    title: 'PENALTY SHOOTOUT',
    short: 'Five shots vs an AI keeper that reads your tells. +10 WIL PTS to win.',
    href: '/penalty',
    color: 'var(--neon-orange)',
    icon: '⚽',
    badge: 'PLAY',
  },
  {
    title: 'TOURNAMENT BRACKET',
    short: 'Group standings and knockout bracket — all 104 matches.',
    href: '/bracket',
    color: 'var(--neon-cyan)',
    icon: '🏟',
    badge: 'VIEW',
  },
  {
    title: 'HEAD TO HEAD',
    short: 'Anyone vs anyone. Match-by-match scorecards.',
    href: '/compare',
    color: 'var(--neon-yellow)',
    icon: '⚔️',
    badge: 'COMPARE',
  },
];

// v2
const AI_CARD = {
  title: 'AI ANALYST',
  short: 'Ask anything about the World Cup. Live odds context. Sharp money explained. Voice-enabled.',
  color: 'var(--neon-green)',
  icon: '🤖',
  badge: 'ASK AI',
};



export default function LandingPage() {
  const { matches, picks, walletAddress } = useApp();
  const [introDone, setIntroDone] = useState(false);
  const [showAI, setShowAI] = useState(false);

  // Show the PRESS START gate once per browser session, not on every visit.
  useEffect(() => {
    if (sessionStorage.getItem('watchitlive_intro_seen') === '1') setIntroDone(true);
  }, []);

  const finishIntro = () => {
    sessionStorage.setItem('watchitlive_intro_seen', '1');
    setIntroDone(true);
  };

  const stats = useMemo(() => {
    const finished = matches.filter((m) => m.status === 'final').length;
    const upcoming = matches.filter((m) => m.status === 'upcoming').length;
    const totalGoals = matches
      .filter((m) => m.result)
      .reduce((sum, m) => sum + m.result!.home + m.result!.away, 0);
    const totalPicks = picks.length;
    return { finished, upcoming, totalGoals, totalPicks };
  }, [matches, picks]);

  const nextMatch = useMemo(() => {
    const upcoming = matches
      .filter((m) => m.status === 'upcoming')
      .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime());
    return upcoming[0];
  }, [matches]);


  return (
    <>
      {!introDone && <PressStart onStart={finishIntro} />}
      {showAI && <AIChatPanel onClose={() => setShowAI(false)} />}
      <div className="relative flex flex-col items-center min-h-[calc(100vh-120px)] px-3 sm:px-4 py-4 sm:py-8">
        <div className="relative z-10 w-full max-w-6xl flex flex-col items-center">

          {/* Status pill */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--neon-green)]/40 bg-[var(--neon-green)]/10 mb-5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--neon-green)] animate-pulse" />
            <span className="font-pixel text-[8px] text-[var(--neon-green)] tracking-widest">
              TOURNAMENT ACTIVE · {stats.totalPicks} PICKS LOCKED
            </span>
          </motion.div>

          {/* Compact wordmark */}
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-pixel text-xl sm:text-3xl md:text-4xl text-[var(--neon-green)] mb-4 sm:mb-8 tracking-wider"
            style={{ textShadow: '0 0 8px rgba(0,255,136,0.3)' }}
          >
            WATCHITLIVE
          </motion.h1>

          {/* NEXT MATCH banner */}
          {nextMatch && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card-retro w-full max-w-2xl p-3 sm:p-4 mb-4 sm:mb-6 border-[var(--neon-orange)]/30! border-t-2! border-t-[var(--neon-orange)]/50!"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-pixel text-[8px] text-[var(--neon-orange)] tracking-widest">▸ NEXT KICKOFF</span>
                <CountdownTimer kickoffTime={nextMatch.kickoffTime} />
              </div>
              <div className="flex items-center justify-center gap-4 sm:gap-8">
                <TeamMini name={nextMatch.homeTeam} />
                <div className="font-pixel text-[var(--text-muted)] text-base">VS</div>
                <TeamMini name={nextMatch.awayTeam} />
              </div>
              {nextMatch.group && (
                <p className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest text-center mt-3">
                  GROUP {nextMatch.group}
                </p>
              )}
            </motion.div>
          )}

          {/* Stats row — SNES card boxes */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="grid grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6 w-full max-w-lg"
          >
            {[
              { value: stats.finished, label: 'PLAYED', color: 'var(--neon-green)' },
              { value: stats.totalGoals, label: 'GOALS', color: 'var(--neon-cyan)' },
              { value: stats.upcoming, label: 'LEFT', color: 'var(--neon-orange)' },
              { value: stats.totalPicks, label: 'PICKS', color: 'var(--neon-magenta)' },
            ].map((s) => (
              <div key={s.label} className="card-retro flex flex-col items-center justify-center py-2.5 sm:py-3 px-1">
                <span className="font-pixel text-sm sm:text-lg" style={{ color: s.color }}>{s.value}</span>
                <span className="font-pixel text-[6px] sm:text-[7px] text-[var(--text-muted)] tracking-widest mt-0.5">{s.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Hero mode cards — 2 big */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-3">
            {heroModes.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <Link href={m.href} className="block group h-full">
                  <div
                    className="card-hero p-5 sm:p-6 h-full cursor-pointer"
                    style={{ borderColor: `color-mix(in srgb, ${m.color} 30%, transparent)` }}
                  >
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg sm:text-xl">{m.icon}</span>
                          <span className="font-pixel text-[8px] tracking-widest" style={{ color: m.color }}>{m.badge}</span>
                        </div>
                        <span
                          className="badge-tag"
                          style={{ color: m.badgeColor, borderColor: `${m.badgeColor}50`, background: `${m.badgeColor}15` }}
                        >
                          {m.badge}
                        </span>
                      </div>
                      <h2
                        className="font-pixel text-sm sm:text-lg mb-2 tracking-wider"
                        style={{ color: m.color }}
                      >
                        {m.title}
                      </h2>
                      <p className="font-retro text-sm sm:text-base text-[var(--text-muted)] mb-4 leading-snug">
                        {m.subtitle}
                      </p>
                      <span
                        className="inline-flex items-center gap-2 font-pixel text-[9px] group-hover:gap-3 transition-all"
                        style={{ color: m.color }}
                      >
                        {m.cta} <span>→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Side modes — 3 smaller */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8">
            {sideModes.map((m, i) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75 + i * 0.08 }}
              >
                <Link href={m.href} className="block group h-full">
                  <div
                    className="card-hero p-4 h-full cursor-pointer"
                    style={{ borderColor: `color-mix(in srgb, ${m.color} 25%, transparent)`, borderLeftWidth: '3px', borderLeftColor: `color-mix(in srgb, ${m.color} 50%, transparent)` }}
                  >
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl sm:text-2xl">{m.icon}</span>
                        <h3 className="font-pixel text-[9px] sm:text-[10px] tracking-wider" style={{ color: m.color }}>
                          {m.title}
                        </h3>
                      </div>
                      <p className="font-retro text-sm text-[var(--text-muted)] leading-snug mb-2">{m.short}</p>
                      <span
                        className="badge-tag inline-block"
                        style={{ color: m.color, borderColor: `color-mix(in srgb, ${m.color} 40%, transparent)`, background: `color-mix(in srgb, ${m.color} 8%, transparent)` }}
                      >
                        {m.badge} →
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* AI Analyst card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <div
              onClick={() => setShowAI(true)}
              className="card-hero p-5 cursor-pointer"
              style={{ borderColor: `color-mix(in srgb, var(--neon-green) 30%, transparent)`, borderLeftWidth: '3px', borderLeftColor: 'color-mix(in srgb, var(--neon-green) 50%, transparent)' }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🤖</span>
                <h3 className="font-pixel text-[10px] tracking-wider text-[var(--neon-green)]">AI ANALYST</h3>
                <span className="badge-tag ml-auto" style={{ color: 'var(--neon-green)', borderColor: 'color-mix(in srgb, var(--neon-green) 40%, transparent)', background: 'color-mix(in srgb, var(--neon-green) 8%, transparent)' }}>ASK AI →</span>
              </div>
              <p className="font-retro text-sm text-[var(--text-muted)] leading-snug">Ask anything about the World Cup. Live TxLINE odds context. Sharp money explained. Voice-enabled with TTS.</p>
            </div>
          </motion.div>


          {/* spacer */}
          <div className="mt-4" />
        </div>
      </div>
    </>
  );
}

function TeamMini({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <img
        src={getFlagUrl(name)}
        alt={name}
        className="w-12 h-8 sm:w-14 sm:h-9 object-cover rounded-sm border border-white/15"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span className="font-pixel text-[9px] sm:text-[10px] text-white tracking-wider">{name.toUpperCase()}</span>
    </div>
  );
}
