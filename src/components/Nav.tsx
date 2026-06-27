'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp, isMuted as readMuted, setMuted as writeMuted } from '@/lib/store';
import { getChiptune } from '@/lib/chiptune';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';

// Init Reown AppKit

export function Nav() {
  const pathname = usePathname();
  const { walletAddress, setWalletAddress } = useApp();
  const [showHelp, setShowHelp]             = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showConnect, setShowConnect]       = useState(false);
  const [guestName, setGuestName]           = useState('');
  const [muted, setMutedState]             = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  // Reown AppKit hooks
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();

  // Sync Reown wallet → app store
  useEffect(() => {
    if (isConnected && address) {
      setWalletAddress(address);
    }
  }, [isConnected, address, setWalletAddress]);

  const isGuest = walletAddress?.startsWith('guest:');
  const displayName = isGuest
    ? walletAddress!.slice('guest:'.length)
    : walletAddress
      ? `${walletAddress.slice(0, 4)}..${walletAddress.slice(-3)}`
      : '';

  const playAsGuest = () => {
    const trimmed = guestName.trim().slice(0, 16);
    if (!trimmed) return;
    setWalletAddress(`guest:${trimmed}`);
    setShowConnect(false);
    setGuestName('');
  };

  const handleDisconnect = () => {
    setWalletAddress(null);
    setShowWalletMenu(false);
    // Also disconnect Reown if connected
    if (isConnected) open({ view: 'Account' });
  };

  useEffect(() => {
    setMutedState(readMuted());
    const onMuteChange = (e: Event) => setMutedState((e as CustomEvent<boolean>).detail);
    window.addEventListener('zerocall-mute', onMuteChange);
    return () => window.removeEventListener('zerocall-mute', onMuteChange);
  }, []);

  const toggleMute = () => {
    const next = !muted;
    setMutedState(next);
    writeMuted(next);
    const t = getChiptune();
    if (next) t.stop();
    else t.start();
  };

  const links = [
    { href: '/', label: 'HOME' },
    { href: '/global', label: 'PREDICT' },
    { href: '/agents', label: 'AGENTS' },
    { href: '/penalty', label: 'PENALTY' },
  ];

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b border-[var(--neon-cyan)]/15 shadow-[0_2px_16px_rgba(0,0,0,0.4)]">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
          <Link href="/" className="font-pixel text-xs sm:text-sm text-[var(--neon-green)] flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden className="shrink-0">
              <rect width="64" height="64" rx="10" fill="#0a0e1a" stroke="#00ff88" strokeOpacity="0.4"/>
              <path d="M16 18 H48 V26 L26 46 H48 V54 H16 V46 L38 26 H16 Z" fill="#00ff88"/>
            </svg>
            WATCHITLIVE
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1.5">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`font-pixel text-[8px] tracking-wider transition-all px-3 py-2 border-2 ${
                  pathname === link.href
                    ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/40'
                    : 'text-[var(--text-muted)] hover:text-[var(--neon-cyan)] hover:bg-white/5 border-white/10 hover:border-[var(--neon-cyan)]/30'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Sound toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={toggleMute}
              className="w-8 h-8 flex items-center justify-center border border-white/15 rounded-full text-[var(--text-muted)] hover:text-white hover:border-white/30 transition-colors text-xs"
              title={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? '🔇' : '🔊'}
            </motion.button>

            {/* Help button */}
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => setShowHelp(true)}
              className="w-8 h-8 flex items-center justify-center border border-[var(--neon-yellow)]/30 rounded-full text-[var(--neon-yellow)] hover:bg-[var(--neon-yellow)]/10 transition-colors font-pixel text-xs"
              title="How it works"
            >
              ?
            </motion.button>

            {/* Connect / identity */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={walletAddress ? () => setShowWalletMenu((v) => !v) : () => setShowConnect(true)}
                className={`font-pixel text-[9px] px-3 py-1.5 border rounded-sm transition-colors tracking-widest ${
                  walletAddress
                    ? 'border-[var(--neon-green)]/50 text-[var(--neon-green)] bg-[var(--neon-green)]/10 hover:bg-[var(--neon-green)]/15'
                    : 'border-[var(--neon-cyan)]/60 text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/10 animate-pulse'
                }`}
                title={walletAddress ? 'Account menu' : 'Connect or play as guest'}
              >
                {walletAddress ? displayName.toUpperCase() : 'CONNECT'}
              </motion.button>

              <AnimatePresence>
                {walletAddress && showWalletMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onMouseLeave={() => setShowWalletMenu(false)}
                    className="absolute right-0 mt-2 w-56 card-retro p-3 z-50"
                  >
                    <div className="font-pixel text-[8px] text-[var(--text-muted)] tracking-widest mb-1">
                      {isGuest ? 'GUEST SESSION' : 'SOLANA WALLET'}
                    </div>
                    <div className="font-pixel text-[10px] text-white break-all mb-3">
                      {isGuest ? displayName : walletAddress}
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className="w-full font-pixel text-[9px] tracking-widest py-2 border border-red-500/40 text-red-300 rounded-sm hover:bg-red-500/15 transition-colors"
                    >
                      DISCONNECT
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden font-pixel text-lg text-[var(--neon-cyan)]"
              aria-label={showMobileMenu ? 'Close menu' : 'Open menu'}
            >
              {showMobileMenu ? '✕' : '☰'}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-white/10"
            >
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setShowMobileMenu(false)}
                    className={`font-pixel text-[8px] px-3 py-2 border-2 transition-all ${
                      pathname === link.href
                        ? 'text-[var(--neon-cyan)] bg-[var(--neon-cyan)]/10 border-[var(--neon-cyan)]/40'
                        : 'text-[var(--text-muted)] border-white/10'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Connect Modal */}
      <AnimatePresence>
        {showConnect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={() => setShowConnect(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card-retro p-6 w-full max-w-sm mx-4 border-[var(--neon-cyan)]/30!"
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-pixel text-xs text-[var(--neon-cyan)]">JOIN THE ARENA</h2>
                <button onClick={() => setShowConnect(false)} className="font-pixel text-xs text-[var(--text-muted)] hover:text-white">✕</button>
              </div>

              {/* Reown wallet connect */}
              <button
                onClick={() => { setShowConnect(false); open(); }}
                className="w-full mb-3 p-3 border border-[var(--neon-green)]/40 rounded-sm bg-[var(--neon-green)]/5 hover:bg-[var(--neon-green)]/15 transition-colors text-left"
              >
                <div className="font-pixel text-[10px] text-[var(--neon-green)] mb-1">⛓ CONNECT WALLET</div>
                <div className="font-retro text-sm text-[var(--text-muted)]">Phantom · Solflare · Backpack · 150+ wallets · Email · Google</div>
              </button>

              <div className="font-pixel text-[8px] text-[var(--text-muted)] text-center my-3 tracking-widest">OR</div>

              {/* Guest path */}
              <div className="p-3 border border-[var(--neon-cyan)]/30 rounded-sm bg-[var(--neon-cyan)]/5">
                <div className="font-pixel text-[10px] text-[var(--neon-cyan)] mb-1">👤 PLAY AS GUEST</div>
                <div className="font-retro text-sm text-[var(--text-muted)] mb-3">No wallet. Picks lock with a demo hash.</div>
                <form onSubmit={(e) => { e.preventDefault(); playAsGuest(); }} className="flex gap-2">
                  <input
                    autoFocus
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    maxLength={16}
                    placeholder="YOUR NAME"
                    className="flex-1 bg-[var(--bg-secondary)] border border-white/15 rounded-sm px-2 py-1.5 font-pixel text-[10px] text-white placeholder:text-white/30 focus:border-[var(--neon-cyan)]/60 outline-none uppercase"
                  />
                  <button
                    type="submit"
                    disabled={!guestName.trim()}
                    className="font-pixel text-[9px] px-3 py-1.5 bg-[var(--neon-cyan)] text-[var(--bg-primary)] rounded-sm disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ENTER ▶
                  </button>
                </form>
              </div>

              <p className="font-pixel text-[8px] text-[var(--text-muted)] text-center mt-4 tracking-widest">
                POWERED BY TXLINE · SOLANA DEVNET
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help Modal */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
            onClick={() => setShowHelp(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="card-retro p-6 w-full max-w-lg mx-4 border-[var(--neon-yellow)]/30! max-h-[80vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-pixel text-sm text-[var(--neon-yellow)]">HOW IT WORKS</h2>
                <button onClick={() => setShowHelp(false)} className="font-pixel text-xs text-[var(--text-muted)] hover:text-white">✕</button>
              </div>

              <div className="space-y-4">
                {[
                  { step: '01', icon: '🔗', title: 'CONNECT OR GO GUEST', desc: 'Connect Phantom, Solflare, email, or Google via Reown. Or just type a username and play as guest.' },
                  { step: '02', icon: '⚽', title: 'PREDICT MATCHES', desc: 'Open PREDICT, scroll the World Cup 2026 fixtures, hit CALL IT. Pick Home / Draw / Away — and the exact score for bonus WIL Points.' },
                  { step: '03', icon: '🔒', title: 'LOCK ON SOLANA', desc: 'Every pick is anchored on Solana devnet. A 🔒 SOL badge appears on the card — click to view on Solana Explorer.' },
                  { step: '04', icon: '🤖', title: 'BEAT THE AGENTS', desc: 'Six AI agents (Vega, Ronin, Sage, Halo, Knox, Phoenix) analyze every fixture via TxLINE. Each plays in character — see who you can out-call.' },
                  { step: '05', icon: '🥅', title: 'PLAY THE SHOOTOUT', desc: 'Penalty Shootout: 5 shots vs an AI keeper. Win a shootout = +10 WIL Points.' },
                  { step: '06', icon: '🏆', title: 'CLIMB THE BOARD', desc: '+3 for correct outcome, +2 for exact score. Open LEADERBOARD — you and the six AI agents ranked on one board.' },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3">
                    <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-sm bg-[var(--bg-secondary)] border border-white/10">
                      <span className="text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-pixel text-[9px] text-[var(--neon-cyan)] mb-0.5">{item.step}. {item.title}</h3>
                      <p className="font-retro text-sm text-[var(--text-muted)]">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <h3 className="font-pixel text-[9px] text-[var(--neon-green)] mb-2">SCORING</h3>
                <div className="grid grid-cols-2 gap-2 font-retro text-sm text-[var(--text-muted)]">
                  <div>✓ Correct outcome</div><div className="text-[var(--neon-green)]">+3 pts</div>
                  <div>⭐ Exact score bonus</div><div className="text-[var(--neon-yellow)]">+2 pts</div>
                  <div>✗ Wrong prediction</div><div className="text-red-400">0 pts</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 text-center">
                <p className="font-pixel text-[8px] text-[var(--text-muted)]">POWERED BY TXLINE · SOLANA DEVNET</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
