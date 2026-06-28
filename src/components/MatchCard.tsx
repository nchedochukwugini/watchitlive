'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Match, Pick, LiveOdds } from '@/lib/types';
import { CountdownTimer } from './CountdownTimer';
import { getFlagUrl } from '@/lib/countries';
import { getOutcomeFromResult } from '@/lib/scoring';
import { ScoreVerifyButton } from './ScoreVerifyButton';
import { DailyScoresPDA } from './DailyScoresPDA';

interface MatchCardProps {
  match: Match;
  onPick: (match: Match) => void;
  userPick?: Pick;
  index: number;
  odds?: LiveOdds;
}

export function MatchCard({ match, onPick, userPick, index, odds }: MatchCardProps) {
  const isLocked     = match.status !== 'upcoming';
  const isFinal      = match.status === 'final';
  const isLive       = match.status === 'live';
  const actualOutcome = isFinal && match.result ? getOutcomeFromResult(match.result) : null;
  const userCorrect  = userPick && actualOutcome ? userPick.outcome === actualOutcome : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className={`card-retro p-3 sm:p-4 ${
        userCorrect === true
          ? 'border-[var(--neon-green)]/50! shadow-[0_0_20px_rgba(0,255,136,0.12),inset_0_0_30px_rgba(0,255,136,0.03)] border-t-3! border-t-[var(--neon-green)]!'
          : userCorrect === false
            ? 'border-red-500/40! border-t-3! border-t-red-500/50!'
            : isFinal
              ? 'border-white/8!'
              : isLive
                ? 'border-[var(--neon-green)]/40! border-t-3! border-t-[var(--neon-green)]!'
                : 'border-t-3! border-t-[var(--neon-cyan)]/30!'
      }`}
    >
      {/* Status + Group */}
      <div className="flex justify-between items-center mb-2 sm:mb-3">
        <span className="font-pixel text-[7px] sm:text-[9px] text-[var(--neon-cyan)] tracking-wider">
          {match.group ? `GROUP ${match.group}` : 'KNOCKOUT'}
        </span>
        {match.status === 'upcoming' ? (
          <CountdownTimer kickoffTime={match.kickoffTime} />
        ) : (
          <span className={`font-pixel text-[7px] sm:text-[9px] px-2 py-0.5 border ${
            isFinal
              ? 'text-[var(--text-muted)] bg-white/5 border-white/10'
              : 'text-[var(--neon-green)] bg-[var(--neon-green)]/10 border-[var(--neon-green)]/30'
          }`}>
            {isFinal ? 'FT' : '● LIVE'}
          </span>
        )}
      </div>

      {/* Teams */}
      <div className="flex items-center justify-between gap-2">
        <TeamBadge name={match.homeTeam} />
        <div className="text-center shrink-0 px-1">
          {isFinal && match.result ? (
            <div className="font-pixel text-lg sm:text-2xl text-[var(--neon-green)] tabular-nums">
              {match.result.home} - {match.result.away}
            </div>
          ) : (
            <span className="font-pixel text-base sm:text-xl text-[var(--text-muted)]">VS</span>
          )}
        </div>
        <TeamBadge name={match.awayTeam} />
      </div>

      {/* Live Odds Strip */}
      {odds && (
        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <OddsBox label={match.homeTeam.slice(0, 3).toUpperCase()} value={odds.home} color="var(--neon-green)" />
          {odds.draw !== undefined && (
            <OddsBox label="DRAW" value={odds.draw} color="var(--neon-yellow)" />
          )}
          <OddsBox label={match.awayTeam.slice(0, 3).toUpperCase()} value={odds.away} color="var(--neon-magenta)" />
        </div>
      )}

      {isFinal && match.result && (
          <ScoreVerifyButton
            fixtureId={match.id}
            homeTeam={match.homeTeam}
            awayTeam={match.awayTeam}
            result={match.result}
          />
        )}

        {/* No odds placeholder */}
      {!odds && match.status === 'upcoming' && (
        <div className="mt-3 flex items-center justify-center gap-1.5 py-1.5">
          <span className="font-pixel text-[6px] text-[var(--text-muted)]/40 tracking-widest">ODDS PENDING · TXLINE</span>
        </div>
      )}

      {/* TxLINE badge when odds available */}
      {odds && (
        <div className="mt-1.5 flex justify-end">
          <span className="font-pixel text-[6px] text-[var(--neon-cyan)]/50 tracking-widest">
            TXLINE ODDS
          </span>
        </div>
      )}

      {/* Daily Scores PDA */}
      <DailyScoresPDA kickoffTime={match.kickoffTime} />

      {/* Stats link */}
      <Link
        href={`/stats/${encodeURIComponent(match.homeTeam)}/${encodeURIComponent(match.awayTeam)}`}
        className="mt-2 block text-center font-pixel text-[7px] text-[var(--neon-cyan)]/60 hover:text-[var(--neon-cyan)] tracking-widest transition-colors"
        onClick={e => e.stopPropagation()}
      >
        📊 MATCH STATS →
      </Link>

      {/* User pick status */}
      <div className="mt-3 flex items-center justify-between">
        {userPick ? (
          <div className="flex items-center gap-2">
            <span className={`outcome-badge ${
              userCorrect === true
                ? 'outcome-correct'
                : userCorrect === false
                  ? 'outcome-wrong'
                  : `outcome-${userPick.outcome}`
            }`}>
              {userPick.outcome === 'home'
                ? match.homeTeam
                : userPick.outcome === 'away'
                  ? match.awayTeam
                  : 'DRAW'}
            </span>
            {userPick.score && (
              <span className="font-retro text-sm text-[var(--text-muted)]">
                ({userPick.score.home}-{userPick.score.away})
              </span>
            )}
            {userPick.storageRef && (
              <a
                href={`https://solscan.io/tx/${userPick.storageRef}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm border border-[var(--neon-green)]/40 text-[var(--neon-green)] bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/20 transition-colors"
                title={`Locked on Solana · ${userPick.storageRef.slice(0, 10)}…`}
              >
                🔒 SOL
              </a>
            )}
          </div>
        ) : (
          <span className="text-[var(--text-muted)] text-sm">No pick yet</span>
        )}

        {!isLocked && !userPick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(match)}
            className="btn-neon btn-lock text-[9px]! px-3! py-1.5!"
          >
            CALL IT
          </motion.button>
        )}
        {!isLocked && userPick && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(match)}
            className="font-pixel text-[9px] text-[var(--text-muted)] hover:text-[var(--neon-cyan)] transition-colors"
          >
            CHANGE
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function OddsBox({ label, value, pct, color }: { label: string; value: number; pct?: number; color: string }) {
  const prob = pct ? pct.toFixed(1) : value > 1 ? (1 / value * 100).toFixed(1) : '—';
  return (
    <div style={{ borderColor: `color-mix(in srgb, ${color} 30%, transparent)` }}
      className="border rounded-sm p-1.5 text-center bg-[var(--bg-secondary)]">
      <div className="font-pixel text-[6px] text-[var(--text-muted)] mb-0.5">{label}</div>
      <div className="font-pixel text-[11px] sm:text-[13px]" style={{ color }}>
        {value?.toFixed(2) ?? "—"}
      </div>
      <div className="font-pixel text-[6px]" style={{ color }}>{prob}%</div>
    </div>
  );
}

function TeamBadge({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0 flex-1">
      <img
        src={getFlagUrl(name)}
        alt={name}
        className="w-8 h-5 sm:w-10 sm:h-7 object-cover rounded-sm border border-white/10"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
      <span className="font-pixel text-[7px] sm:text-[9px] text-center leading-tight truncate max-w-full">
        {name.toUpperCase()}
      </span>
    </div>
  );
}

