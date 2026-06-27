'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/lib/store';
import { AGENTS, Match, Pick } from '@/lib/types';
import { buildLeaderboard, getOutcomeFromResult, scorePick } from '@/lib/scoring';
import { Leaderboard } from '@/components/Leaderboard';
import { ProphetMoment } from '@/components/ProphetMoment';
import { getFlagUrl } from '@/lib/countries';

const PAGE_SIZE = 5;

export default function AgentsPage() {
  const { matches, picks, predictors } = useApp();
  const [selectedAgent, setSelectedAgent] = useState(AGENTS[0].id);
  const [prophetData, setProphetData] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const agentPredictors = predictors.filter((p) => p.type === 'agent');

  const agentLeaderboard = useMemo(
    () => buildLeaderboard(agentPredictors, picks, matches),
    [agentPredictors, picks, matches]
  );

  const agentPicks = useMemo(
    () => picks.filter((p) => p.predictorId === selectedAgent),
    [picks, selectedAgent]
  );

  const matchesWithPicks = useMemo(
    () => matches.filter((m) => agentPicks.some((p) => p.matchId === m.id)),
    [matches, agentPicks]
  );

  const agent = AGENTS.find((a) => a.id === selectedAgent)!;

  const prophetPick = prophetData ? picks.find((p) => p.id === prophetData) : null;
  const prophetMatch = prophetPick ? matches.find((m) => m.id === prophetPick.matchId) : null;
  const prophetPredictor = prophetPick ? predictors.find((p) => p.id === prophetPick.predictorId) : null;

  const handleAgentChange = (id: string) => {
    setSelectedAgent(id);
    setVisibleCount(PAGE_SIZE);
  };

  const visibleMatches = matchesWithPicks.slice(0, visibleCount);
  const hasMore = visibleCount < matchesWithPicks.length;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-4 sm:mb-6"
      >
        <h1 className="font-pixel text-sm sm:text-xl text-[var(--neon-magenta)] glow-magenta mb-1 sm:mb-2 flex items-center justify-center gap-2">
          <span>🤖</span> AGENT ARENA
        </h1>
        <p className="font-retro text-xs sm:text-lg text-[var(--text-muted)]">
          Six AI minds. One tournament. Who sees the future?
        </p>
      </motion.div>

      {/* Agent selector — horizontal scroll on mobile */}
      <div className="overflow-x-auto scrollbar-hide pb-2 mb-4 sm:mb-6 -mx-3 px-3 sm:mx-0 sm:px-0">
        <div className="flex gap-1.5 sm:gap-2 sm:justify-center sm:flex-wrap min-w-max sm:min-w-0">
          {AGENTS.map((a) => (
            <motion.button
              key={a.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleAgentChange(a.id)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-4 py-2 sm:py-2.5 border-2 font-pixel text-[7px] sm:text-[9px] transition-all shrink-0 ${
                selectedAgent === a.id
                  ? 'border-[var(--neon-magenta)] bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] shadow-[inset_0_0_16px_rgba(255,0,255,0.06),0_2px_0_rgba(255,0,255,0.2)]'
                  : 'border-white/12 text-[var(--text-muted)] hover:border-white/30 shadow-[inset_0_0_8px_rgba(255,255,255,0.01),0_2px_0_rgba(255,255,255,0.04)]'
              }`}
            >
              <span className="text-base sm:text-lg">{a.avatar}</span>
              {a.displayName.toUpperCase()}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Leaderboard first on mobile, sidebar on desktop */}
      <div className="lg:hidden mb-4">
        <Leaderboard
          entries={agentLeaderboard}
          title="AGENT STANDINGS"
          highlightId={selectedAgent}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
        {/* Agent detail + picks */}
        <div className="lg:col-span-2">
          {/* Agent card */}
          <motion.div
            key={selectedAgent}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="card-retro p-3 sm:p-5 mb-4 border-l-3! border-l-[var(--neon-magenta)]/50!"
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl sm:text-4xl shrink-0">{agent.avatar}</span>
              <div className="min-w-0">
                <h2 className="font-pixel text-[9px] sm:text-xs text-[var(--neon-magenta)] mb-1">
                  {agent.displayName.toUpperCase()}
                </h2>
                <p className="font-retro text-xs sm:text-sm text-[var(--text-muted)] line-clamp-2">
                  {agent.agentPersona}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Picks header with count */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-pixel text-[9px] sm:text-xs text-[var(--neon-cyan)]">
              {agent.displayName.toUpperCase()}&apos;S PICKS
            </h3>
            <span className="font-pixel text-[7px] sm:text-[8px] text-[var(--text-muted)]">
              {visibleCount > matchesWithPicks.length ? matchesWithPicks.length : visibleCount}/{matchesWithPicks.length}
            </span>
          </div>

          {/* Agent picks — paginated */}
          <div className="space-y-1.5 sm:space-y-2">
            <AnimatePresence mode="popLayout">
              {visibleMatches.map((match, i) => {
                const pick = agentPicks.find((p) => p.matchId === match.id);
                if (!pick) return null;

                const isFinal = match.status === 'final' && match.result;
                const actualOutcome = isFinal ? getOutcomeFromResult(match.result!) : null;
                const isCorrect = actualOutcome ? pick.outcome === actualOutcome : null;
                const points = isFinal ? scorePick(pick, match) : null;

                return (
                  <motion.div
                    key={`${selectedAgent}-${match.id}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className={`card-retro p-2 sm:p-3 flex items-center gap-2 sm:gap-3 ${
                      isCorrect === true ? 'border-[var(--neon-green)]/30! border-l-3! border-l-[var(--neon-green)]!' : isCorrect === false ? 'border-l-3! border-l-red-500/40!' : ''
                    }`}
                  >
                    {/* Flags + teams */}
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                      <img src={getFlagUrl(match.homeTeam)} alt="" className="w-5 h-3.5 sm:w-6 sm:h-4 rounded-sm shrink-0" />
                      <span className="font-retro text-sm sm:text-base truncate">{match.homeTeam}</span>
                      <span className="text-[var(--text-muted)] text-xs shrink-0">vs</span>
                      <span className="font-retro text-sm sm:text-base truncate">{match.awayTeam}</span>
                      <img src={getFlagUrl(match.awayTeam)} alt="" className="w-5 h-3.5 sm:w-6 sm:h-4 rounded-sm shrink-0" />
                    </div>

                    {/* Pick badge */}
                    <span className={`outcome-badge text-[8px]! sm:text-[10px]! px-2! sm:px-2.5! py-0.5! shrink-0 outcome-${pick.outcome}`}>
                      {pick.outcome === 'home'
                        ? match.homeTeam.slice(0, 3)
                        : pick.outcome === 'away'
                          ? match.awayTeam.slice(0, 3)
                          : 'DRW'}
                    </span>

                    {/* Score */}
                    {pick.score && (
                      <span className="font-pixel text-[9px] sm:text-[11px] text-[var(--text-muted)] shrink-0">
                        {pick.score.home}-{pick.score.away}
                      </span>
                    )}

                    {/* Result indicator */}
                    <div className="shrink-0 w-10 text-right">
                      {isFinal ? (
                        <span className={`font-pixel text-[10px] sm:text-xs ${isCorrect ? 'text-[var(--neon-green)]' : 'text-red-400'}`}>
                          {isCorrect ? '✓' : '✗'}
                          {points !== null && points > 0 && (
                            <span className="text-[var(--neon-cyan)] ml-0.5">+{points}</span>
                          )}
                        </span>
                      ) : (
                        <span className="font-pixel text-[8px] text-[var(--text-muted)]">—</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* View More / Show Less */}
          {matchesWithPicks.length > PAGE_SIZE && (
            <div className="mt-3 flex justify-center">
              {hasMore ? (
                <button
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                  className="font-pixel text-[8px] sm:text-[9px] text-[var(--neon-cyan)] border-2 border-[var(--neon-cyan)]/30 px-4 sm:px-6 py-2 hover:bg-[var(--neon-cyan)]/10 transition-colors shadow-[0_2px_0_rgba(0,229,255,0.15)]"
                >
                  VIEW MORE ({matchesWithPicks.length - visibleCount} left)
                </button>
              ) : (
                <button
                  onClick={() => setVisibleCount(PAGE_SIZE)}
                  className="font-pixel text-[8px] sm:text-[9px] text-[var(--text-muted)] border-2 border-white/10 px-4 sm:px-6 py-2 hover:bg-white/5 transition-colors"
                >
                  SHOW LESS
                </button>
              )}
            </div>
          )}
        </div>

        {/* Agent standings — desktop sidebar */}
        <div className="hidden lg:block">
          <div className="sticky top-16">
            <Leaderboard
              entries={agentLeaderboard}
              title="AGENT STANDINGS"
              highlightId={selectedAgent}
            />
          </div>
        </div>
      </div>

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
