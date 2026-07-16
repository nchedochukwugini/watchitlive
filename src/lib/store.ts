'use client';

import { createContext, useContext } from 'react';
import { Match, Pick, Predictor, AGENTS } from './types';

export interface AppState {
  matches: Match[];
  picks: Pick[];
  predictors: Predictor[];
  walletAddress: string | null;
}

export interface AppActions {
  addPick: (pick: Pick) => void;
  setWalletAddress: (addr: string | null) => void;
  getPicksForMatch: (matchId: string) => Pick[];
  getPicksForPredictor: (predictorId: string) => Pick[];
  getUserPick: (matchId: string) => Pick | undefined;
}

export type AppStore = AppState & AppActions;

export const AppContext = createContext<AppStore | null>(null);

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

const PICKS_KEY = 'zerocall_picks';
const WALLET_KEY = 'zerocall_wallet';

export function loadPicks(): Pick[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(PICKS_KEY) || '[]');
  } catch {
    return [];
  }
}

export function savePicks(picks: Pick[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PICKS_KEY, JSON.stringify(picks));
}

export function loadWallet(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(WALLET_KEY);
}

export function saveWallet(addr: string | null) {
  if (typeof window === 'undefined') return;
  if (addr) localStorage.setItem(WALLET_KEY, addr);
  else localStorage.removeItem(WALLET_KEY);
}

const MUTE_KEY = 'zerocall_muted';
export function isMuted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(MUTE_KEY) === '1';
}
export function setMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  if (muted) localStorage.setItem(MUTE_KEY, '1');
  else localStorage.removeItem(MUTE_KEY);
  window.dispatchEvent(new CustomEvent('zerocall-mute', { detail: muted }));
}

export function getHumanPredictor(walletAddress: string | null): Predictor {
  const isGuest = walletAddress?.startsWith('guest:');
  const guestName = isGuest ? walletAddress!.slice('guest:'.length) : null;
  return {
    id: walletAddress || 'anon',
    type: 'human',
    displayName: guestName
      ? guestName
      : walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : 'You',
    wallet: walletAddress && !isGuest ? walletAddress : undefined,
  };
}

export function getAllPredictors(walletAddress: string | null): Predictor[] {
  return [getHumanPredictor(walletAddress), ...AGENTS];
}
