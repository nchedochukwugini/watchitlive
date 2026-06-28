'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/store';
import { buildLeaderboard } from '@/lib/scoring';
import { MatchCard } from '@/components/MatchCard';
import { PickModal } from '@/components/PickModal';
import { Leaderboard } from '@/components/Leaderboard';
import { ProphetMoment } from '@/components/ProphetMoment';
import { Match } from '@/lib/types';
import { isProphetMoment } from '@/lib/scoring';
import { useLiveOdds } from '@/hooks/useLiveOdds';

const MATCH_PAGE  = 6;
const RESULT_PAGE = 4;

export default function GlobalPage() {
  const { matches, picks, predictors, walletAddress, getUserPick } = useApp();
  const [pickingMatch, setPickingMatch]     = useState<Match | null>(null);
  const [prophetData, setProphetData]       = useState<{ pickId: string } | null>(null);
  const [upcomingVisible, setUpcomingVisible] = useState(MATCH_PAGE);
  const [resultsVisible, setResultsVisible]   = useState(RESULT_PAGE);

  const upcomingMatches = useMemo(() => matches.filter((m) => m.status === 'upcoming'), [matches]);
  const finishedMatches = useMemo(() => matches.filter((m) => m.status === 'final'),    [matches]);

  const leaderboard = useMemo(
    () => buildLeaderboard(predictors, picks, matches),
    [predictors, picks, matches]
  );

  const userId = walletAddress || 'anon';

  // Fetch live TxLINE odds for all fixtures
  const fixtureIds = useMemo(() => matches.map((m) => m.id), [matches]);
  const oddsMap    = useLiveOdds(fixtureIds);

  // Prophet moments
  const [checkedMatches, setCheckedMatches] = useState<Set<string>>(new Set());

  const checkProphetMoments = () => {
    for (const match of finishedMatches) {
      if (checkedMatches.has(match.id)) continue;
      const userPick = picks.find((p) => p.predictorId === userId && p.matchId === match.id);
      if (userPick && isProphetMoment(userPick, match)) {
        setProphetData({ pickId: userPick.id });
        setCheckedMatches((prev) => new Set(prev).add(match.id));
        return;
      }
      setCheckedMatches((prev) => new Set(prev).add(match.id));
    }
  };

  if (finishedMatches.length > 0 && checkedMatches.size < finishedMatches.length) {
    checkProphetMoments();
  }

  const prophetPick      = prophetData ? picks.find((p) => p.id === prophetData.pickId) : null;
  const prophetMatch     = prophetPick ? matches.find((m) => m.id === prophetPick.matchId) : null;
  const prophetPredictor = prophetPick ? predictors.find((p) => p.id === prophetPick.predictorId) : null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 sm:mb-6"
      >
        <h1 className="font-pixel text-sm sm:text-xl text-[var(--neon-green)] glow-green mb-1 sm:mb-2 flex items-center justify-center gap-2">
          <span>🏆</span> GLOBAL ARENA
        </h1>
        <p className="font-retro text-xs sm:text-base text-[var(--text-muted)]">
          Beat the AI. Prove your foresight on-chain.
        </p>
        {Object.keys(oddsMap).length > 0 && (
          <p className="font-pixel text-[7px] text-[var(--neon-cyan)]/60 mt-1 tracking-widest">
            📡 TXLINE LIVE ODDS · {Object.keys(oddsMap).length} FIXTURES
          </p>
        )}
      </motion.div>

      {/* Leaderboard — mobile */}
      <div className="lg:hidden mb-4">
        <Leaderboard entries={leaderboard} highlightId={userId} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6">

          {upcomingMatches.length === 0 && finishedMatches.length === 0 && (
            <div className="card-retro p-8 sm:p-10 flex flex-col items-center text-center">
              <span className="text-4xl sm:text-5xl mb-3 sm:mb-4 opacity-80">📡</span>
              <h2 className="font-pixel text-[9px] sm:text-xs text-[var(--neon-cyan)] mb-2">LOADING FIXTURES…</h2>
              <p className="font-retro text-sm sm:text-base text-[var(--text-muted)] max-w-xs">
                Pulling the World Cup 2026 schedule from TxLINE. Check back shortly.
              </p>
            </div>
          )}

          {/* Upcoming */}
          {upcomingMatches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="font-pixel text-[9px] sm:text-xs text-[var(--neon-cyan)] flex items-center gap-2">
                  <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[var(--neon-cyan)] rounded-full animate-pulse" />
                  UPCOMING MATCHES
                </h2>
                <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)]">
                  {Math.min(upcomingVisible, upcomingMatches.length)}/{upcomingMatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {upcomingMatches.slice(0, upcomingVisible).map((match, i) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onPick={setPickingMatch}
                    userPick={getUserPick(match.id)}
                    index={i}
                    odds={oddsMap[match.id]}
                  />
                ))}
              </div>
              {upcomingMatches.length > MATCH_PAGE && (
                <div className="mt-3 flex justify-center">
                  {upcomingVisible < upcomingMatches.length ? (
                    <button
                      onClick={() => setUpcomingVisible((c) => c + MATCH_PAGE)}
                      className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-cyan)] border-2 border-[var(--neon-cyan)]/30 px-4 sm:px-6 py-2 hover:bg-[var(--neon-cyan)]/10 transition-colors"
                    >
                      VIEW MORE ({upcomingMatches.length - upcomingVisible} left)
                    </button>
                  ) : (
                    <button
                      onClick={() => setUpcomingVisible(MATCH_PAGE)}
                      className="font-pixel text-[8px] sm:text-[9px] text-[var(--text-muted)] border-2 border-white/10 px-4 sm:px-6 py-2 hover:bg-white/5 transition-colors"
                    >
                      SHOW LESS
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Finished */}
          {finishedMatches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="font-pixel text-[9px] sm:text-xs text-[var(--text-muted)]">RESULTS</h2>
                <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)]">
                  {Math.min(resultsVisible, finishedMatches.length)}/{finishedMatches.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {finishedMatches.slice(0, resultsVisible).map((match, i) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    onPick={setPickingMatch}
                    userPick={getUserPick(match.id)}
                    index={i}
                    odds={oddsMap[match.id]}
                  />
                ))}
              </div>
              {finishedMatches.length > RESULT_PAGE && (
                <div className="mt-3 flex justify-center">
                  {resultsVisible < finishedMatches.length ? (
                    <button
                      onClick={() => setResultsVisible((c) => c + RESULT_PAGE)}
                      className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-cyan)] border-2 border-[var(--neon-cyan)]/30 px-4 sm:px-6 py-2 hover:bg-[var(--neon-cyan)]/10 transition-colors"
                    >
                      VIEW MORE ({finishedMatches.length - resultsVisible} left)
                    </button>
                  ) : (
                    <button
                      onClick={() => setResultsVisible(RESULT_PAGE)}
                      className="font-pixel text-[8px] sm:text-[9px] text-[var(--text-muted)] border-2 border-white/10 px-4 sm:px-6 py-2 hover:bg-white/5 transition-colors"
                    >
                      SHOW LESS
                    </button>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Leaderboard — desktop */}
        <div className="hidden lg:block">
          <div className="sticky top-16">
            <Leaderboard entries={leaderboard} highlightId={userId} />
          </div>
        </div>
      </div>

      <PickModal match={pickingMatch} onClose={() => setPickingMatch(null)} />
      <ProphetMoment
        show={!!prophetData}
        pick={prophetPick || null}
        match={prophetMatch || null}
        predictor={prophetPredictor || null}
        onClose={() => setProphetData(null)}
      />
    </div>
  );
}
