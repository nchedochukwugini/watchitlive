'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { AppContext, loadPicks, savePicks, loadWallet, saveWallet, getAllPredictors } from '@/lib/store';
import { Match, Pick, AGENT_IDS, AGENTS } from '@/lib/types';
import { generateAllAgentPicks } from '@/lib/agents';
import { emitZeroGEvent } from '@/components/ZeroGFeed';
import fallbackMatches from '@/data/matches.json';

const REFRESH_INTERVAL = 5 * 60 * 1000;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>(fallbackMatches as Match[]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedWallet = loadWallet();
    if (savedWallet) setWalletAddress(savedWallet);

    async function fetchMatches() {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) throw new Error('API error');
        const live: Match[] = await res.json();
        if (Array.isArray(live) && live.length > 0) {
          setMatches(live);
          return live;
        }
      } catch {
        /* fall through to fallback */
      }
      return fallbackMatches as Match[];
    }

    fetchMatches().then(async (m) => {
      const userPicks = loadPicks();
      const fallbackPicks = generateAllAgentPicks(m);
      setPicks([...userPicks, ...fallbackPicks]);

      // Try TxLINE AI for upcoming matches (fire-and-forget, updates in background)
      const upcoming = m.filter((match) => match.status === 'upcoming').slice(0, 5);
      for (const match of upcoming) {
        for (const agent of AGENTS) {
          try {
            emitZeroGEvent({ type: 'ai-request', message: `${agent.displayName} analyzing ${match.homeTeam} vs ${match.awayTeam}…` });
            const res = await fetch('/api/agents', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ agentId: agent.id, match }),
            });
            if (!res.ok) continue;
            const { prediction } = await res.json();
            if (!prediction) continue;
            emitZeroGEvent({ type: 'ai-success', message: `${agent.displayName} predicted ${match.homeTeam} vs ${match.awayTeam}` });
            const pick: Pick = {
              id: `${agent.id}-${match.id}`,
              predictorId: agent.id,
              matchId: match.id,
              outcome: prediction.outcome,
              score: prediction.score,
              reason: prediction.oneLineReason,
              timestamp: new Date().toISOString(),
              storageRef: `solana-devnet-${Date.now().toString(16)}`,
            };
            setPicks((prev) => {
              const filtered = prev.filter((p) => !(p.predictorId === pick.predictorId && p.matchId === pick.matchId));
              return [...filtered, pick];
            });
          } catch {
            emitZeroGEvent({ type: 'ai-error', message: `${agent.displayName} fallback for ${match.homeTeam} vs ${match.awayTeam}` });
          }
        }
      }
    });

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/matches');
        if (!res.ok) return;
        const live: Match[] = await res.json();
        if (Array.isArray(live) && live.length > 0) setMatches(live);
      } catch { /* ignore */ }
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (mounted) saveWallet(walletAddress);
  }, [walletAddress, mounted]);

  const addPick = useCallback((pick: Pick) => {
    setPicks((prev) => {
      const filtered = prev.filter(
        (p) => !(p.predictorId === pick.predictorId && p.matchId === pick.matchId)
      );
      const updated = [...filtered, pick];
      const userPicks = updated.filter(
        (p) => !(AGENT_IDS as readonly string[]).includes(p.predictorId)
      );
      savePicks(userPicks);
      return updated;
    });
  }, []);

  const getPicksForMatch = useCallback(
    (matchId: string) => picks.filter((p) => p.matchId === matchId),
    [picks]
  );

  const getPicksForPredictor = useCallback(
    (predictorId: string) => picks.filter((p) => p.predictorId === predictorId),
    [picks]
  );

  const getUserPick = useCallback(
    (matchId: string) => {
      const userId = walletAddress || 'anon';
      return picks.find((p) => p.predictorId === userId && p.matchId === matchId);
    },
    [picks, walletAddress]
  );

  const predictors = useMemo(() => getAllPredictors(walletAddress), [walletAddress]);

  const store = useMemo(
    () => ({
      matches,
      picks,
      predictors,
      walletAddress,
      addPick,
      setWalletAddress,
      getPicksForMatch,
      getPicksForPredictor,
      getUserPick,
    }),
    [matches, picks, predictors, walletAddress, addPick, getPicksForMatch, getPicksForPredictor, getUserPick]
  );

  if (!mounted) {
    return <div className="min-h-screen bg-[var(--bg-primary)]" />;
  }

  return <AppContext.Provider value={store}>{children}</AppContext.Provider>;
}
