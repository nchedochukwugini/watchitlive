'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/store';
import { getFlagUrl } from '@/lib/countries';

interface BracketMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  result?: { home: number; away: number };
  status: string;
  round: string;
}

const ROUND_ORDER = ['Round of 32', 'Round of 16', 'Quarter-finals', 'Semi-finals', 'Final'];

export default function BracketPage() {
  const { matches } = useApp();

  const { groups, knockouts } = useMemo(() => {
    const groupMap = new Map<string, typeof matches>();
    const ko: BracketMatch[] = [];

    for (const m of matches) {
      if (m.group) {
        const key = m.group;
        if (!groupMap.has(key)) groupMap.set(key, []);
        groupMap.get(key)!.push(m);
      } else {
        let round = 'Knockout';
        const id = m.id.toLowerCase();
        if (id.includes('r32') || id.includes('round-of-32')) round = 'Round of 32';
        else if (id.includes('r16') || id.includes('round-of-16')) round = 'Round of 16';
        else if (id.includes('qf') || id.includes('quarter')) round = 'Quarter-finals';
        else if (id.includes('sf') || id.includes('semi')) round = 'Semi-finals';
        else if (id.includes('final') && !id.includes('semi')) round = 'Final';
        ko.push({ ...m, round });
      }
    }

    // Build group standings
    const groups: { group: string; teams: { name: string; pts: number; gd: number; gf: number }[] }[] = [];
    for (const [group, gMatches] of Array.from(groupMap.entries()).sort()) {
      const teamStats = new Map<string, { pts: number; gd: number; gf: number }>();
      for (const m of gMatches) {
        if (!teamStats.has(m.homeTeam)) teamStats.set(m.homeTeam, { pts: 0, gd: 0, gf: 0 });
        if (!teamStats.has(m.awayTeam)) teamStats.set(m.awayTeam, { pts: 0, gd: 0, gf: 0 });
        if (m.result) {
          const h = teamStats.get(m.homeTeam)!;
          const a = teamStats.get(m.awayTeam)!;
          h.gf += m.result.home; h.gd += m.result.home - m.result.away;
          a.gf += m.result.away; a.gd += m.result.away - m.result.home;
          if (m.result.home > m.result.away) { h.pts += 3; }
          else if (m.result.home < m.result.away) { a.pts += 3; }
          else { h.pts += 1; a.pts += 1; }
        }
      }
      const teams = Array.from(teamStats.entries())
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
      groups.push({ group, teams });
    }

    return { groups, knockouts: ko };
  }, [matches]);

  const knockoutsByRound = useMemo(() => {
    const map = new Map<string, BracketMatch[]>();
    for (const m of knockouts) {
      if (!map.has(m.round)) map.set(m.round, []);
      map.get(m.round)!.push(m);
    }
    return ROUND_ORDER.filter((r) => map.has(r)).map((r) => ({ round: r, matches: map.get(r)! }));
  }, [knockouts]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-5 sm:mb-8"
      >
        <h1 className="font-pixel text-base sm:text-xl text-[var(--neon-green)] mb-2 flex items-center justify-center gap-2">
          <span>🏟</span> TOURNAMENT BRACKET
        </h1>
        <p className="font-retro text-sm sm:text-lg text-[var(--text-muted)]">
          World Cup 2026 · {matches.length} matches · {groups.length} groups
        </p>
      </motion.div>

      {/* Group Stage */}
      {groups.length > 0 && (
        <section className="mb-10">
          <h2 className="font-pixel text-xs text-[var(--neon-cyan)] mb-4 tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--neon-cyan)] rounded-full" />
            GROUP STAGE
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {groups.map(({ group, teams }, gi) => (
              <motion.div
                key={group}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.04 }}
                className="card-retro p-3 border-t-3! border-t-[var(--neon-green)]/40!"
              >
                <div className="font-pixel text-[9px] text-[var(--neon-green)] tracking-widest mb-2 flex items-center justify-between">
                  <span>GROUP {group}</span>
                  <span className="badge-tag text-[var(--neon-green)]" style={{ borderColor: 'rgba(0,255,136,0.3)', background: 'rgba(0,255,136,0.08)' }}>
                    {teams.length} TEAMS
                  </span>
                </div>
                <div className="space-y-1">
                  <div className="grid grid-cols-[1fr_35px_30px_30px] gap-1 px-1 pb-1 border-b border-white/10">
                    <span className="font-pixel text-[7px] text-[var(--text-muted)]">TEAM</span>
                    <span className="font-pixel text-[7px] text-[var(--text-muted)] text-right">PTS</span>
                    <span className="font-pixel text-[7px] text-[var(--text-muted)] text-right">GD</span>
                    <span className="font-pixel text-[7px] text-[var(--text-muted)] text-right">GF</span>
                  </div>
                  {teams.map((team, ti) => (
                    <div
                      key={team.name}
                      className={`grid grid-cols-[1fr_35px_30px_30px] gap-1 px-1 py-1 rounded-sm ${
                        ti < 2 ? 'bg-[var(--neon-green)]/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <img
                          src={getFlagUrl(team.name)}
                          alt=""
                          className="w-5 h-3.5 rounded-sm object-cover shrink-0"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span className={`font-pixel text-[8px] truncate ${ti < 2 ? 'text-[var(--neon-green)]' : 'text-[var(--text-muted)]'}`}>
                          {team.name.slice(0, 12).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-pixel text-[9px] text-right text-white">{team.pts}</span>
                      <span className={`font-pixel text-[9px] text-right ${team.gd > 0 ? 'text-[var(--neon-green)]' : team.gd < 0 ? 'text-red-400' : 'text-[var(--text-muted)]'}`}>
                        {team.gd > 0 ? `+${team.gd}` : team.gd}
                      </span>
                      <span className="font-pixel text-[9px] text-right text-[var(--text-muted)]">{team.gf}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Knockout Stage */}
      {knockoutsByRound.length > 0 && (
        <section>
          <h2 className="font-pixel text-xs text-[var(--neon-orange)] mb-4 tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 bg-[var(--neon-orange)] rounded-full" />
            KNOCKOUT STAGE
          </h2>
          <div className="space-y-6">
            {knockoutsByRound.map(({ round, matches: roundMatches }) => (
              <div key={round}>
                <h3 className="font-pixel text-[9px] text-[var(--neon-cyan)] tracking-widest mb-2">
                  {round.toUpperCase()}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                  {roundMatches.map((m, mi) => (
                    <motion.div
                      key={m.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: mi * 0.05 }}
                      className={`card-retro p-3 ${m.status === 'final' ? 'border-[var(--neon-green)]/30! border-l-3! border-l-[var(--neon-green)]/50!' : 'border-l-3! border-l-[var(--neon-cyan)]/30!'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <TeamMini name={m.homeTeam} />
                        <div className="text-center shrink-0">
                          {m.result ? (
                            <div className="font-pixel text-sm text-[var(--neon-green)]">
                              {m.result.home} - {m.result.away}
                            </div>
                          ) : (
                            <span className="font-pixel text-[9px] text-[var(--text-muted)]">VS</span>
                          )}
                        </div>
                        <TeamMini name={m.awayTeam} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {knockoutsByRound.length === 0 && (
        <div className="card-retro p-8 text-center">
          <span className="text-4xl mb-3 block">🏟</span>
          <p className="font-pixel text-[10px] text-[var(--neon-cyan)] mb-2">KNOCKOUT STAGE PENDING</p>
          <p className="font-retro text-base text-[var(--text-muted)]">
            The bracket will populate as group stage results come in.
          </p>
        </div>
      )}
    </div>
  );
}

function TeamMini({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <img
        src={getFlagUrl(name)}
        alt={name}
        className="w-6 h-4 rounded-sm object-cover shrink-0 border border-white/10"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span className="font-pixel text-[8px] text-white truncate">
        {name.slice(0, 10).toUpperCase()}
      </span>
    </div>
  );
}
