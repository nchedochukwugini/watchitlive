'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';

type Tab = 'stats' | 'lineups' | 'events' | 'h2h';

function StatBar({ label, home, away, homeColor = '#00ff88', awayColor = '#ff00ff' }: {
  label: string; home: number; away: number; homeColor?: string; awayColor?: string;
}) {
  const total = (home + away) || 1;
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1.5">
        <span className="font-pixel text-[10px]" style={{ color: homeColor }}>{home}</span>
        <span className="font-pixel text-[7px] text-[var(--text-muted)] tracking-widest">{label}</span>
        <span className="font-pixel text-[10px]" style={{ color: awayColor }}>{away}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
        <div style={{ width: `${home / total * 100}%`, background: homeColor, transition: 'width 0.8s ease' }} />
        <div style={{ width: `${away / total * 100}%`, background: awayColor, transition: 'width 0.8s ease' }} className="ml-auto" />
      </div>
    </div>
  );
}

function PlayerRow({ player, home }: { player: any; home: boolean }) {
  const color = home ? '#00ff88' : '#ff00ff';
  return (
    <div className={`flex items-center gap-2 py-1.5 border-b border-white/5 ${!home ? 'flex-row-reverse' : ''}`}>
      <div style={{ background: color + '22', border: `1px solid ${color}44` }}
        className="w-6 h-6 rounded-sm flex items-center justify-center shrink-0">
        <span className="font-pixel text-[8px]" style={{ color }}>{player.number}</span>
      </div>
      <div className={`flex-1 ${!home ? 'text-right' : ''}`}>
        <span className="font-retro text-sm">{player.player}</span>
        {player.captain && <span className="font-pixel text-[6px] text-[var(--neon-yellow)] ml-1">(C)</span>}
      </div>
      <span className="font-pixel text-[7px] text-[var(--text-muted)] shrink-0">{player.position}</span>
      {!player.starter && <span className="font-pixel text-[6px] text-[var(--neon-orange)] shrink-0">SUB</span>}
    </div>
  );
}

function EventTimeline({ goals, cards, subs, homeTeam, awayTeam }: any) {
  const allEvents = [
    ...(goals || []).map((g: any) => ({ ...g, type: 'goal' })),
    ...(cards || []).map((c: any) => ({ ...c, type: 'card' })),
    ...(subs  || []).map((s: any) => ({ ...s, type: 'sub'  })),
  ].sort((a, b) => a.minute - b.minute);

  if (allEvents.length === 0) return (
    <div className="text-center py-8 font-pixel text-[8px] text-[var(--text-muted)]">NO EVENTS YET</div>
  );

  return (
    <div className="space-y-3">
      {allEvents.map((e: any, i: number) => {
        const isHome = e.team === 'home';
        const icon   = e.type === 'goal' ? '⚽' : e.type === 'card' ? (e.color === 'yellow' ? '🟨' : '🟥') : '🔄';
        const text   = e.type === 'goal' ? e.scorer : e.type === 'card' ? e.player : `${e.on} ↑ / ${e.off} ↓`;
        return (
          <div key={i} className={`flex items-center gap-3 ${isHome ? '' : 'flex-row-reverse'}`}>
            <div className="font-pixel text-[8px] text-[var(--text-muted)] w-8 text-center shrink-0">{e.minute}'</div>
            <div className={`flex-1 flex items-center gap-2 ${isHome ? '' : 'flex-row-reverse'}`}>
              <span className="text-base">{icon}</span>
              <div className={isHome ? '' : 'text-right'}>
                <div className="font-retro text-sm">{text}</div>
                <div className="font-pixel text-[7px] text-[var(--text-muted)]">{isHome ? homeTeam : awayTeam}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MatchStatsPage() {
  const params  = useParams();
  const home    = decodeURIComponent(params.home as string);
  const away    = decodeURIComponent(params.away as string);
  const [match,   setMatch]   = useState<any>(null);
  const [h2h,     setH2h]     = useState<any>(null);
  const [tab,     setTab]     = useState<Tab>('stats');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const base = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
        const [mRes, hRes] = await Promise.all([
          fetch(`${base}/api/match-stats?home=${encodeURIComponent(home)}&away=${encodeURIComponent(away)}`),
          fetch(`${base}/api/h2h?team1=${encodeURIComponent(home)}&team2=${encodeURIComponent(away)}`),
        ]);
        if (mRes.ok) setMatch(await mRes.json());
        if (hRes.ok) setH2h(await hRes.json());
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [home, away]);

  const hs  = match?.statistics?.home;
  const as_ = match?.statistics?.away;
  const starters = {
    home: match?.lineups?.home?.filter((p: any) =>  p.starter) || [],
    away: match?.lineups?.away?.filter((p: any) =>  p.starter) || [],
  };
  const bench = {
    home: match?.lineups?.home?.filter((p: any) => !p.starter) || [],
    away: match?.lineups?.away?.filter((p: any) => !p.starter) || [],
  };

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4">
      <Link href="/global" className="inline-flex items-center gap-2 font-pixel text-[8px] text-[var(--text-muted)] hover:text-[var(--neon-cyan)] mb-4 transition-colors">
        ← BACK TO MATCHES
      </Link>

      {loading ? (
        <div className="card-retro p-8 text-center">
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <div className="font-pixel text-[9px] text-[var(--neon-cyan)]">LOADING MATCH DATA...</div>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Score header */}
          <div className="card-retro p-4 sm:p-6 mb-4 border-t-3! border-t-[var(--neon-green)]/40!">
            <div className="text-center mb-3">
              <span className="font-pixel text-[7px] text-[var(--text-muted)] tracking-widest">
                {match?.stage?.replace(/_/g,' ').toUpperCase()} · {match?.date}
              </span>
              {match?.source === 'txline' && (
                <span className="font-pixel text-[6px] text-[var(--neon-cyan)] tracking-widest">📡 LIVE · TXLINE</span>
              )}
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 text-center">
                <div className="font-pixel text-xs sm:text-sm text-[var(--neon-green)]">{home.toUpperCase()}</div>
                {match?.formations?.home && <div className="font-pixel text-[7px] text-[var(--text-muted)] mt-1">{match.formations.home}</div>}
              </div>
              <div className="text-center">
                <div className="font-pixel text-2xl sm:text-4xl text-white">
                  {match?.homeScore ?? '—'} - {match?.awayScore ?? '—'}
                </div>
                <div className="font-pixel text-[7px] text-[var(--text-muted)] mt-1">
                  {match?.status === 'finished' ? 'FULL TIME' : match?.liveMinute ? `${match.liveMinute}'` : 'UPCOMING'}
                </div>
              </div>
              <div className="flex-1 text-center">
                <div className="font-pixel text-xs sm:text-sm text-[var(--neon-magenta)]">{away.toUpperCase()}</div>
                {match?.formations?.away && <div className="font-pixel text-[7px] text-[var(--text-muted)] mt-1">{match.formations.away}</div>}
              </div>
            </div>
            {(match?.stadium || match?.attendance || match?.referee?.name) && (
              <div className="mt-4 pt-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
                {match?.stadium     && <div><div className="font-pixel text-[6px] text-[var(--text-muted)]">STADIUM</div><div className="font-retro text-xs truncate">{match.stadium}</div></div>}
                {match?.attendance  && <div><div className="font-pixel text-[6px] text-[var(--text-muted)]">ATTENDANCE</div><div className="font-retro text-xs">{match.attendance.toLocaleString()}</div></div>}
                {match?.referee?.name && <div><div className="font-pixel text-[6px] text-[var(--text-muted)]">REFEREE</div><div className="font-retro text-xs truncate">{match.referee.name}</div></div>}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto scrollbar-hide">
            {(['stats','lineups','events','h2h'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`font-pixel text-[8px] px-3 py-2 border-2 whitespace-nowrap shrink-0 transition-all ${
                tab === t
                  ? 'border-[var(--neon-cyan)]/60 text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10'
                  : 'border-white/10 text-[var(--text-muted)]'
              }`}>{t.toUpperCase()}</button>
            ))}
          </div>

          {/* STATS */}
          {tab === 'stats' && (
            <div className="card-retro p-4">
              {hs ? (
                <>
                  <StatBar label="POSSESSION %" home={hs.possessionPct}  away={as_.possessionPct} />
                  <StatBar label="SHOTS"         home={hs.shotsTotal}     away={as_.shotsTotal} />
                  <StatBar label="SHOTS ON GOAL" home={hs.shotsOnGoal}    away={as_.shotsOnGoal} />
                  <StatBar label="CORNERS"       home={hs.corners}        away={as_.corners} />
                  <StatBar label="FOULS"         home={hs.fouls}          away={as_.fouls} />
                  <StatBar label="YELLOW CARDS"  home={hs.yellowCards}    away={as_.yellowCards} homeColor="#ffe600" awayColor="#ffe600" />
                  <StatBar label="RED CARDS"     home={hs.redCards}       away={as_.redCards}    homeColor="#ff3d3d" awayColor="#ff3d3d" />
                  <StatBar label="PASSES"        home={hs.passesTotal}    away={as_.passesTotal} />
                  <StatBar label="PASS ACC %"    home={hs.passesPct}      away={as_.passesPct} />
                  {hs.expectedGoals && <StatBar label="xG" home={hs.expectedGoals} away={as_.expectedGoals} />}
                </>
              ) : (
                <div className="text-center py-8 font-pixel text-[8px] text-[var(--text-muted)]">STATS NOT YET AVAILABLE</div>
              )}
            </div>
          )}

          {/* LINEUPS */}
          {tab === 'lineups' && (
            <div className="card-retro p-4">
              {starters.home.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="font-pixel text-[8px] text-[var(--neon-green)] mb-2">{home.toUpperCase()} · {match?.formations?.home}</div>
                      {starters.home.map((p: any, i: number) => <PlayerRow key={i} player={p} home={true} />)}
                    </div>
                    <div>
                      <div className="font-pixel text-[8px] text-[var(--neon-magenta)] mb-2 text-right">{match?.formations?.away} · {away.toUpperCase()}</div>
                      {starters.away.map((p: any, i: number) => <PlayerRow key={i} player={p} home={false} />)}
                    </div>
                  </div>
                  {(bench.home.length > 0 || bench.away.length > 0) && (
                    <div className="border-t border-white/10 pt-4">
                      <div className="font-pixel text-[7px] text-[var(--text-muted)] mb-3">SUBSTITUTES</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>{bench.home.map((p: any, i: number) => <PlayerRow key={i} player={p} home={true}  />)}</div>
                        <div>{bench.away.map((p: any, i: number) => <PlayerRow key={i} player={p} home={false} />)}</div>
                      </div>
                    </div>
                  )}
                  {match?.managers && (
                    <div className="border-t border-white/10 pt-4 mt-4 grid grid-cols-2 gap-4">
                      <div><div className="font-pixel text-[6px] text-[var(--text-muted)]">MANAGER</div><div className="font-retro text-sm">{match.managers.home}</div></div>
                      <div className="text-right"><div className="font-pixel text-[6px] text-[var(--text-muted)]">MANAGER</div><div className="font-retro text-sm">{match.managers.away}</div></div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 font-pixel text-[8px] text-[var(--text-muted)]">LINEUPS NOT YET AVAILABLE</div>
              )}
            </div>
          )}

          {/* EVENTS */}
          {tab === 'events' && (
            <div className="card-retro p-4">
              <EventTimeline goals={match?.goals} cards={match?.cards} subs={match?.substitutions} homeTeam={home} awayTeam={away} />
            </div>
          )}

          {/* H2H */}
          {tab === 'h2h' && (
            <div className="space-y-4">
              {h2h ? (
                <>
                  <div className="card-retro p-4">
                    <div className="font-pixel text-[8px] text-[var(--text-muted)] mb-4 tracking-widest">
                      WORLD CUP H2H · {h2h.totalMeetings} MEETINGS
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div><div className="font-pixel text-xl text-[var(--neon-green)]">{h2h.summary?.team1Wins}</div><div className="font-pixel text-[7px] text-[var(--text-muted)]">{home.slice(0,10).toUpperCase()}</div></div>
                      <div><div className="font-pixel text-xl text-[var(--neon-yellow)]">{h2h.summary?.draws}</div><div className="font-pixel text-[7px] text-[var(--text-muted)]">DRAWS</div></div>
                      <div><div className="font-pixel text-xl text-[var(--neon-magenta)]">{h2h.summary?.team2Wins}</div><div className="font-pixel text-[7px] text-[var(--text-muted)]">{away.slice(0,10).toUpperCase()}</div></div>
                    </div>
                  </div>
                  {h2h.matches?.length > 0 ? (
                    <div className="card-retro p-4">
                      <div className="font-pixel text-[8px] text-[var(--text-muted)] mb-3">PAST MEETINGS</div>
                      <div className="space-y-3">
                        {h2h.matches.map((m: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 py-2 border-b border-white/5">
                            <div className="font-pixel text-[7px] text-[var(--text-muted)] w-12 shrink-0">{m.date?.slice(0,4)}</div>
                            <div className="flex-1 font-pixel text-[8px] text-right truncate">{m.homeTeam}</div>
                            <div className="font-pixel text-[10px] text-[var(--neon-green)] px-2 shrink-0">{m.homeScore} - {m.awayScore}</div>
                            <div className="flex-1 font-pixel text-[8px] truncate">{m.awayTeam}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="card-retro p-6 text-center font-pixel text-[8px] text-[var(--text-muted)]">NO PREVIOUS WORLD CUP MEETINGS</div>
                  )}
                </>
              ) : (
                <div className="card-retro p-8 text-center font-pixel text-[8px] text-[var(--text-muted)]">LOADING H2H DATA...</div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
