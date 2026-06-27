'use client';

import { useState } from 'react';
import { useApp } from '@/lib/store';
import { getFlagUrl } from '@/lib/countries';

export function MatchTicker() {
  const { matches } = useApp();
  const [paused, setPaused] = useState(false);

  const finishedMatches = matches.filter((m) => m.status === 'final' && m.result);
  const upcomingMatches = matches
    .filter((m) => m.status === 'upcoming' || m.status === 'live')
    .sort((a, b) => new Date(a.kickoffTime).getTime() - new Date(b.kickoffTime).getTime());

  if (finishedMatches.length === 0 && upcomingMatches.length === 0) return null;

  const tickerContent = (
    <>
      {finishedMatches.map((m) => (
        <span key={m.id} className="inline-flex items-center gap-1.5 px-3 shrink-0">
          <span className="font-pixel text-[6px] text-[var(--neon-green)]/60">FT</span>
          <img src={getFlagUrl(m.homeTeam)} alt="" className="w-4 h-3 rounded-sm" />
          <span className="font-pixel text-[8px] text-[var(--text-muted)]">
            {m.homeTeam.slice(0, 3).toUpperCase()}
          </span>
          <span className="font-pixel text-[8px] text-[var(--neon-green)] font-bold">
            {m.result!.home}
          </span>
          <span className="font-pixel text-[8px] text-[var(--text-muted)]">-</span>
          <span className="font-pixel text-[8px] text-[var(--neon-green)] font-bold">
            {m.result!.away}
          </span>
          <span className="font-pixel text-[8px] text-[var(--text-muted)]">
            {m.awayTeam.slice(0, 3).toUpperCase()}
          </span>
          <img src={getFlagUrl(m.awayTeam)} alt="" className="w-4 h-3 rounded-sm" />
          <span className="text-[var(--text-muted)]/20 px-1">│</span>
        </span>
      ))}

      {upcomingMatches.length > 0 && (
        <span className="inline-flex items-center px-2 shrink-0">
          <span className="font-pixel text-[6px] text-[var(--neon-orange)] tracking-wider mr-2">UPCOMING</span>
        </span>
      )}

      {upcomingMatches.map((m) => {
        const kickoff = new Date(m.kickoffTime);
        const timeStr = kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = kickoff.toLocaleDateString([], { month: 'short', day: 'numeric' });
        const isLive = m.status === 'live';
        return (
          <span key={m.id} className="inline-flex items-center gap-1.5 px-3 shrink-0">
            {isLive ? (
              <span className="font-pixel text-[6px] text-red-400 animate-pulse">LIVE</span>
            ) : (
              <span className="font-pixel text-[6px] text-[var(--neon-cyan)]/60">{dateStr}</span>
            )}
            <img src={getFlagUrl(m.homeTeam)} alt="" className="w-4 h-3 rounded-sm" />
            <span className="font-pixel text-[8px] text-[var(--text-muted)]">
              {m.homeTeam.slice(0, 3).toUpperCase()}
            </span>
            <span className="font-pixel text-[8px] text-[var(--neon-cyan)]">vs</span>
            <span className="font-pixel text-[8px] text-[var(--text-muted)]">
              {m.awayTeam.slice(0, 3).toUpperCase()}
            </span>
            <img src={getFlagUrl(m.awayTeam)} alt="" className="w-4 h-3 rounded-sm" />
            {!isLive && (
              <span className="font-pixel text-[6px] text-[var(--text-muted)]/50">{timeStr}</span>
            )}
            <span className="text-[var(--text-muted)]/20 px-1">│</span>
          </span>
        );
      })}
    </>
  );

  return (
    <div
      className="bg-[var(--bg-secondary)] border-b border-[var(--neon-green)]/10 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center">
        <div className="shrink-0 bg-[var(--neon-green)]/10 border-r border-[var(--neon-green)]/20 px-3 py-1.5">
          <span className="font-pixel text-[8px] text-[var(--neon-green)]">LIVE</span>
        </div>
        <div className="overflow-hidden flex-1">
          <div
            className="ticker-track py-1.5"
            style={paused ? { animationPlayState: 'paused' } : undefined}
          >
            <span className="ticker-copy">{tickerContent}</span>
            <span className="ticker-copy">{tickerContent}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
