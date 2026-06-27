'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '@/lib/store';
import { AGENTS, Predictor } from '@/lib/types';
import { scorePick, getOutcomeFromResult } from '@/lib/scoring';
import { getFlagUrl } from '@/lib/countries';

export default function ComparePage() {
  const { matches, picks, predictors, walletAddress } = useApp();
  const [leftId, setLeftId] = useState(AGENTS[0].id);
  const [rightId, setRightId] = useState(AGENTS[1].id);

  const allPredictors = predictors;
  const finishedMatches = matches.filter((m) => m.status === 'final');

  const getStats = (id: string) => {
    const pPicks = picks.filter((p) => p.predictorId === id);
    let points = 0, correct = 0, exact = 0, total = 0;
    const results: { matchId: string; points: number; correct: boolean; pick: typeof pPicks[0] }[] = [];

    for (const pick of pPicks) {
      const match = finishedMatches.find((m) => m.id === pick.matchId);
      if (!match || !match.result) continue;
      total++;
      const pts = scorePick(pick, match);
      const isCorrect = pick.outcome === getOutcomeFromResult(match.result);
      points += pts;
      if (isCorrect) correct++;
      if (pts >= 5) exact++;
      results.push({ matchId: match.id, points: pts, correct: isCorrect, pick });
    }

    return { points, correct, exact, total, accuracy: total > 0 ? Math.round((correct / total) * 100) : 0, results };
  };

  const leftStats = useMemo(() => getStats(leftId), [leftId, picks, finishedMatches]);
  const rightStats = useMemo(() => getStats(rightId), [rightId, picks, finishedMatches]);

  const leftPredictor = allPredictors.find((p) => p.id === leftId);
  const rightPredictor = allPredictors.find((p) => p.id === rightId);

  const statRows = [
    { label: 'POINTS', left: leftStats.points, right: rightStats.points },
    { label: 'ACCURACY', left: `${leftStats.accuracy}%`, right: `${rightStats.accuracy}%`, leftNum: leftStats.accuracy, rightNum: rightStats.accuracy },
    { label: 'CORRECT', left: leftStats.correct, right: rightStats.correct },
    { label: 'EXACT SCORES', left: leftStats.exact, right: rightStats.exact },
    { label: 'TOTAL PICKS', left: leftStats.total, right: rightStats.total },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-pixel text-xl text-[var(--neon-cyan)] glow-cyan mb-2">
          HEAD TO HEAD
        </h1>
        <p className="font-retro text-lg text-[var(--text-muted)]">
          Compare any two predictors side by side
        </p>
      </motion.div>

      {/* Selector */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-8">
        <PredictorSelector
          predictors={allPredictors}
          selected={leftId}
          onChange={setLeftId}
          color="var(--neon-green)"
        />
        <span className="font-pixel text-lg text-[var(--text-muted)]">VS</span>
        <PredictorSelector
          predictors={allPredictors}
          selected={rightId}
          onChange={setRightId}
          color="var(--neon-magenta)"
        />
      </div>

      {/* Stats comparison */}
      <div className="card-retro p-6 mb-6">
        <div className="space-y-3">
          {statRows.map((row) => {
            const l = typeof row.left === 'number' ? row.left : (row as any).leftNum ?? 0;
            const r = typeof row.right === 'number' ? row.right : (row as any).rightNum ?? 0;
            const winner = l > r ? 'left' : r > l ? 'right' : 'tie';

            return (
              <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <motion.div
                  className={`text-right font-pixel text-sm ${
                    winner === 'left' ? 'text-[var(--neon-green)]' : 'text-[var(--text-muted)]'
                  }`}
                  animate={winner === 'left' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {row.left}
                </motion.div>
                <span className="font-pixel text-[8px] text-[var(--text-muted)] text-center min-w-[100px]">
                  {row.label}
                </span>
                <motion.div
                  className={`text-left font-pixel text-sm ${
                    winner === 'right' ? 'text-[var(--neon-magenta)]' : 'text-[var(--text-muted)]'
                  }`}
                  animate={winner === 'right' ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {row.right}
                </motion.div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Match-by-match comparison */}
      <h3 className="font-pixel text-xs text-[var(--text-muted)] mb-3">MATCH BY MATCH</h3>
      <div className="space-y-2">
        {finishedMatches.map((match) => {
          const leftPick = picks.find((p) => p.predictorId === leftId && p.matchId === match.id);
          const rightPick = picks.find((p) => p.predictorId === rightId && p.matchId === match.id);
          if (!leftPick && !rightPick) return null;

          const actualOutcome = match.result ? getOutcomeFromResult(match.result) : null;
          const leftCorrect = leftPick && actualOutcome ? leftPick.outcome === actualOutcome : false;
          const rightCorrect = rightPick && actualOutcome ? rightPick.outcome === actualOutcome : false;

          return (
            <motion.div
              key={match.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="card-retro p-3 grid grid-cols-[1fr_auto_1fr] gap-3 items-center"
            >
              {/* Left pick */}
              <div className="text-right">
                {leftPick ? (
                  <span className={`outcome-badge ${leftCorrect ? 'outcome-correct' : 'outcome-wrong'}`}>
                    {leftPick.outcome === 'home' ? match.homeTeam.slice(0, 3) :
                     leftPick.outcome === 'away' ? match.awayTeam.slice(0, 3) : 'DRW'}
                    {leftPick.score ? ` ${leftPick.score.home}-${leftPick.score.away}` : ''}
                  </span>
                ) : (
                  <span className="font-pixel text-[8px] text-[var(--text-muted)]">—</span>
                )}
              </div>

              {/* Match */}
              <div className="text-center min-w-[140px]">
                <div className="flex items-center justify-center gap-2">
                  <img src={getFlagUrl(match.homeTeam)} alt="" className="w-5 h-3.5 rounded-sm" />
                  <span className="font-pixel text-[9px] text-[var(--neon-green)]">
                    {match.result!.home}-{match.result!.away}
                  </span>
                  <img src={getFlagUrl(match.awayTeam)} alt="" className="w-5 h-3.5 rounded-sm" />
                </div>
              </div>

              {/* Right pick */}
              <div className="text-left">
                {rightPick ? (
                  <span className={`outcome-badge ${rightCorrect ? 'outcome-correct' : 'outcome-wrong'}`}>
                    {rightPick.outcome === 'home' ? match.homeTeam.slice(0, 3) :
                     rightPick.outcome === 'away' ? match.awayTeam.slice(0, 3) : 'DRW'}
                    {rightPick.score ? ` ${rightPick.score.home}-${rightPick.score.away}` : ''}
                  </span>
                ) : (
                  <span className="font-pixel text-[8px] text-[var(--text-muted)]">—</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function PredictorSelector({
  predictors,
  selected,
  onChange,
  color,
}: {
  predictors: Predictor[];
  selected: string;
  onChange: (id: string) => void;
  color: string;
}) {
  const current = predictors.find((p) => p.id === selected);

  return (
    <div className="text-center">
      <div className="text-3xl mb-2">{current?.avatar || '👤'}</div>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[var(--bg-card)] border border-white/20 rounded-sm px-3 py-2 font-pixel text-[10px] w-full max-w-[180px] focus:border-[var(--neon-cyan)] outline-none"
        style={{ color }}
      >
        {predictors.map((p) => (
          <option key={p.id} value={p.id}>
            {p.avatar ? `${p.avatar} ` : ''}{p.displayName}
          </option>
        ))}
      </select>
    </div>
  );
}
