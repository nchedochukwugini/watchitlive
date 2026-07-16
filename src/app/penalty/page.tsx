'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AGENTS } from '@/lib/types';
import { isMuted as _isMuted } from '@/lib/store';
import { emitZeroGEvent } from '@/components/ZeroGFeed';

type Direction = 'left' | 'center-left' | 'center' | 'center-right' | 'right';
type Height = 'low' | 'mid' | 'high';

interface ShotResult {
  round: number;
  direction: Direction;
  height: Height;
  power: number;
  gkDirection: Direction;
  gkHeight: Height;
  scored: boolean;
}

interface GameStats {
  totalGames: number;
  totalWins: number;
  totalGoals: number;
  totalShots: number;
  currentStreak: number;
  bestStreak: number;
}

const DIR_LABELS: Record<Direction, string> = {
  left: 'FAR LEFT', 'center-left': 'LEFT', center: 'CENTER',
  'center-right': 'RIGHT', right: 'FAR RIGHT',
};

const AGENT_STYLES: Record<string, { color: string; tagline: string }> = {
  vega: { color: '#00ff88', tagline: 'Studies your last shots. Mirrors the opposite.' },
  ronin: { color: '#ff4488', tagline: 'Lives on the edges. Far left or far right only.' },
  sage: { color: '#4488ff', tagline: 'Plays the percentages. Saves your most common.' },
  halo: { color: '#ffaa00', tagline: 'Pure gut. 50/50 every single time.' },
  knox: { color: '#9d65ff', tagline: 'Defensive realist. Plants center, mid-height.' },
  phoenix: { color: '#ff6b00', tagline: 'Hot-hand mirror. Dives where you last shot.' },
};

const ALL_DIRS: Direction[] = ['left', 'center-left', 'center', 'center-right', 'right'];
const ALL_HEIGHTS: Height[] = ['low', 'mid', 'high'];

const OPPOSITE_DIR: Record<Direction, Direction> = {
  left: 'right',
  'center-left': 'center-right',
  center: 'center',
  'center-right': 'center-left',
  right: 'left',
};

function pickRandom<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function getGKChoice(
  agentId: string,
  history: ShotResult[]
): { dir: Direction; height: Height } {
  switch (agentId) {
    case 'vega': {
      // Mirror opposite of last shot, copy height
      if (history.length === 0) return { dir: 'center', height: 'mid' };
      const lastShot = history[history.length - 1];
      return { dir: OPPOSITE_DIR[lastShot.direction], height: lastShot.height };
    }
    case 'ronin': {
      // Always extremes
      return { dir: Math.random() < 0.5 ? 'left' : 'right', height: pickRandom(ALL_HEIGHTS) };
    }
    case 'sage': {
      // Most common direction & height from history, with small noise
      if (history.length === 0) return { dir: 'center-left', height: 'mid' };
      const dirCount: Record<string, number> = {};
      const heightCount: Record<string, number> = {};
      for (const s of history) {
        dirCount[s.direction] = (dirCount[s.direction] || 0) + 1;
        heightCount[s.height] = (heightCount[s.height] || 0) + 1;
      }
      const topDir = Object.entries(dirCount).sort((a, b) => b[1] - a[1])[0][0] as Direction;
      const topHeight = Object.entries(heightCount).sort((a, b) => b[1] - a[1])[0][0] as Height;
      return {
        dir: Math.random() < 0.8 ? topDir : pickRandom(ALL_DIRS),
        height: Math.random() < 0.8 ? topHeight : pickRandom(ALL_HEIGHTS),
      };
    }
    case 'knox': {
      // Defensive realist — always center-ish, always mid-low
      const dirs: Direction[] = ['center-left', 'center', 'center-right'];
      const heights: Height[] = ['mid', 'mid', 'low'];
      return { dir: pickRandom(dirs), height: pickRandom(heights) };
    }
    case 'phoenix': {
      // Hot-hand mirror — dives WHERE you last shot (copies your direction & height)
      if (history.length === 0) return { dir: pickRandom(ALL_DIRS), height: 'mid' };
      const lastShot = history[history.length - 1];
      return { dir: lastShot.direction, height: lastShot.height };
    }
    case 'halo':
    default:
      // Pure random
      return { dir: pickRandom(ALL_DIRS), height: pickRandom(ALL_HEIGHTS) };
  }
}

function loadStats(): GameStats {
  if (typeof window === 'undefined') return { totalGames: 0, totalWins: 0, totalGoals: 0, totalShots: 0, currentStreak: 0, bestStreak: 0 };
  try {
    const raw = localStorage.getItem('zerocall_penalty_stats');
    if (raw) return JSON.parse(raw);
  } catch {}
  return { totalGames: 0, totalWins: 0, totalGoals: 0, totalShots: 0, currentStreak: 0, bestStreak: 0 };
}

function saveStats(stats: GameStats) {
  if (typeof window !== 'undefined') localStorage.setItem('zerocall_penalty_stats', JSON.stringify(stats));
}

class SoundFX {
  private ctx: AudioContext | null = null;
  private getCtx() { if (!this.ctx) this.ctx = new AudioContext(); return this.ctx; }
  private skip() { return _isMuted(); }
  kick() {
    if (this.skip()) return;
    const c = this.getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination);
    o.frequency.setValueAtTime(150, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.15);
    g.gain.setValueAtTime(0.6, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.2);
    o.start(c.currentTime); o.stop(c.currentTime + 0.2);
  }
  goal() {
    if (this.skip()) return;
    const c = this.getCtx();
    [523, 659, 784, 1047].forEach((freq, i) => {
      const o = c.createOscillator(), g = c.createGain();
      o.connect(g); g.connect(c.destination); o.type = 'square';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.12, c.currentTime + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + i * 0.1 + 0.3);
      o.start(c.currentTime + i * 0.1); o.stop(c.currentTime + i * 0.1 + 0.35);
    });
  }
  save() {
    if (this.skip()) return;
    const c = this.getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.type = 'sawtooth';
    o.frequency.setValueAtTime(300, c.currentTime);
    o.frequency.exponentialRampToValueAtTime(80, c.currentTime + 0.3);
    g.gain.setValueAtTime(0.2, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.3);
    o.start(c.currentTime); o.stop(c.currentTime + 0.35);
  }
  whistle() {
    if (this.skip()) return;
    const c = this.getCtx(), o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.type = 'sine';
    o.frequency.setValueAtTime(800, c.currentTime);
    o.frequency.setValueAtTime(1000, c.currentTime + 0.15);
    o.frequency.setValueAtTime(800, c.currentTime + 0.3);
    g.gain.setValueAtTime(0.25, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.5);
    o.start(c.currentTime); o.stop(c.currentTime + 0.5);
  }
  crowd() {
    if (this.skip()) return;
    const c = this.getCtx();
    const buf = c.createBuffer(1, c.sampleRate * 1.2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(i / d.length * Math.PI);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.4;
    s.connect(f); f.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.1, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 1.2);
    s.start(c.currentTime);
  }
  net() {
    if (this.skip()) return;
    const c = this.getCtx();
    const buf = c.createBuffer(1, c.sampleRate * 0.15, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; s.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.15, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.15);
    s.start(c.currentTime);
  }
}

const DIR_X: Record<Direction, number> = { left: 0.08, 'center-left': 0.3, center: 0.5, 'center-right': 0.7, right: 0.92 };
const HEIGHT_Y: Record<Height, number> = { high: 0.12, mid: 0.5, low: 0.85 };

export default function PenaltyPage() {
  const [selectedAgent] = useState(() => AGENTS[Math.floor(Math.random() * AGENTS.length)]);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<'intro' | 'ready' | 'aiming' | 'power' | 'height-select' | 'shooting' | 'result' | 'done'>('intro');
  const [shots, setShots] = useState<ShotResult[]>([]);
  const [lastResult, setLastResult] = useState<ShotResult | null>(null);
  const [chosenDir, setChosenDir] = useState<Direction>('center');
  const [power, setPower] = useState(0);
  const [powerDir, setPowerDir] = useState(1);
  const [stats, setStats] = useState<GameStats>(loadStats);
  const [showStats, setShowStats] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef(0);
  const frameRef = useRef(0);
  const soundRef = useRef<SoundFX | null>(null);
  const powerIntRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shootAnimRef = useRef<{
    progress: number;
    ballEndX: number; ballEndY: number;
    gkTargetX: number; gkTargetY: number;
    scored: boolean; power: number;
  } | null>(null);
  const canvasSizeRef = useRef({ w: 960, h: 540 });
  const shakeRef = useRef({ intensity: 0, decay: 0.92 });

  const totalRounds = 5;
  const scored = shots.filter(s => s.scored).length;
  const missed = shots.filter(s => !s.scored).length;

  useEffect(() => { soundRef.current = new SoundFX(); }, []);

  // Resize canvas to fill container
  useEffect(() => {
    function resize() {
      if (!containerRef.current || !canvasRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.floor(rect.height);
      canvasRef.current.width = w;
      canvasRef.current.height = h;
      canvasSizeRef.current = { w, h };
    }
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  useEffect(() => {
    if (phase === 'power') {
      powerIntRef.current = setInterval(() => {
        setPower(p => {
          let n = p + powerDir * 2.5;
          if (n >= 100) { n = 100; setPowerDir(-1); }
          if (n <= 0) { n = 0; setPowerDir(1); }
          return n;
        });
      }, 20);
      return () => { if (powerIntRef.current) clearInterval(powerIntRef.current); };
    }
  }, [phase, powerDir]);

  const startGame = () => {
    setPhase('ready');
    soundRef.current?.whistle();
    setTimeout(() => setPhase('aiming'), 1200);
  };

  const selectDirection = (dir: Direction) => { setChosenDir(dir); setPhase('power'); setPower(0); setPowerDir(1); };

  const lockPower = () => {
    if (powerIntRef.current) clearInterval(powerIntRef.current);
    setPhase('height-select');
  };

  const selectHeight = (h: Height) => { executeShot(chosenDir, h, power); };

  const executeShot = (dir: Direction, height: Height, pwr: number) => {
    const gk = getGKChoice(selectedAgent.id, shots);

    const dirIdx = ALL_DIRS.indexOf(dir);
    const gkDirIdx = ALL_DIRS.indexOf(gk.dir);
    const dirDist = Math.abs(dirIdx - gkDirIdx);

    const heightIdx = ALL_HEIGHTS.indexOf(height);
    const gkHeightIdx = ALL_HEIGHTS.indexOf(gk.height);
    const heightDist = Math.abs(heightIdx - gkHeightIdx);

    let saveChance = 0;
    if (dirDist === 0 && heightDist === 0) saveChance = 0.92;
    else if (dirDist === 0 && heightDist === 1) saveChance = 0.55;
    else if (dirDist === 1 && heightDist === 0) saveChance = 0.50;
    else if (dirDist === 1 && heightDist === 1) saveChance = 0.25;
    else if (dirDist === 2 && heightDist === 0) saveChance = 0.10;

    // GK reads your body language — base reaction bonus
    saveChance += 0.05;

    // Power outside sweet spot reduces accuracy
    const isWild = pwr > 93 && height === 'high';
    const isWeak = pwr < 25;
    if (pwr > 85 || pwr < 35) saveChance += 0.08;
    if (isWeak) saveChance += 0.15;

    const isSaved = Math.random() < Math.min(saveChance, 0.95);
    const didScore = !isSaved && !isWild;
    const result: ShotResult = { round, direction: dir, height, power: pwr, gkDirection: gk.dir, gkHeight: gk.height, scored: didScore };

    const { w: W, h: H } = canvasSizeRef.current;
    const gx = W * 0.22, gw = W * 0.56, gy = H * 0.05, gh = H * 0.38;

    shootAnimRef.current = {
      progress: 0,
      ballEndX: isWild ? gx + DIR_X[dir] * gw : gx + DIR_X[dir] * gw,
      ballEndY: isWild ? gy - 50 : gy + HEIGHT_Y[height] * gh,
      gkTargetX: gx + DIR_X[gk.dir] * gw,
      gkTargetY: gy + HEIGHT_Y[gk.height] * gh,
      scored: didScore, power: pwr,
    };

    soundRef.current?.kick();
    setLastResult(result);
    setPhase('shooting');
  };

  const finishShot = useCallback(() => {
    if (!lastResult) return;
    shootAnimRef.current = null;
    shakeRef.current.intensity = lastResult.scored ? 12 : 6;
    if (lastResult.scored) { soundRef.current?.goal(); soundRef.current?.crowd(); soundRef.current?.net(); }
    else { soundRef.current?.save(); }
    const finalShots = [...shots, lastResult];
    setShots(finalShots);
    setPhase('result');
    setTimeout(() => {
      if (round >= totalRounds) {
        const ns = finalShots.filter(s => s.scored).length;
        const won = ns >= 3;
        setStats(prev => {
          const u = { ...prev, totalGames: prev.totalGames + 1, totalWins: prev.totalWins + (won ? 1 : 0), totalGoals: prev.totalGoals + ns, totalShots: prev.totalShots + totalRounds, currentStreak: won ? prev.currentStreak + 1 : 0, bestStreak: won ? Math.max(prev.bestStreak, prev.currentStreak + 1) : prev.bestStreak };
          saveStats(u); return u;
        });
        emitZeroGEvent({ type: 'storage-upload', message: `Saving shootout result to Solana…` });
        fetch('/api/storage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'penalty-shootout',
            opponent: selectedAgent.id,
            opponentName: selectedAgent.displayName,
            shots: finalShots,
            scored: ns,
            won,
            timestamp: new Date().toISOString(),
          }),
        }).then((res) => res?.json()).then((data) => {
          if (data?.rootHash) emitZeroGEvent({ type: 'storage-success', message: 'Shootout result anchored on Solana', hash: data.rootHash });
        }).catch(() => {
          emitZeroGEvent({ type: 'storage-error', message: 'Shootout save fallback — demo hash' });
        });
        setPhase('done');
      } else { setRound(r => r + 1); setPhase('aiming'); setLastResult(null); }
    }, 2200);
  }, [lastResult, round, shots, totalRounds, selectedAgent]);

  const reset = () => { setRound(1); setPhase('intro'); setShots([]); setLastResult(null); shootAnimRef.current = null; setPower(0); };

  // --- MAIN RENDER LOOP ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let running = true;

    function render() {
      if (!running) return;
      frameRef.current++;
      const f = frameRef.current;
      const W = canvasSizeRef.current.w;
      const H = canvasSizeRef.current.h;
      if (W < 10 || H < 10) { animRef.current = requestAnimationFrame(render); return; }

      ctx.clearRect(0, 0, W, H);

      // Camera shake
      const shake = shakeRef.current;
      if (shake.intensity > 0.5) {
        const sx = (Math.random() - 0.5) * shake.intensity;
        const sy = (Math.random() - 0.5) * shake.intensity;
        ctx.save();
        ctx.translate(sx, sy);
        shake.intensity *= shake.decay;
      }

      // ===== SKY =====
      const sky = ctx.createLinearGradient(0, 0, 0, H * 0.32);
      sky.addColorStop(0, '#060a18');
      sky.addColorStop(1, '#141e33');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H * 0.32);

      // Stars
      ctx.fillStyle = '#fff';
      for (let i = 0; i < 40; i++) {
        const sx = (i * 197.3 + 50) % W;
        const sy = (i * 53.7 + 10) % (H * 0.18);
        ctx.globalAlpha = (Math.sin(f * 0.015 + i * 1.3) + 1) * 0.25;
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }
      ctx.globalAlpha = 1;

      // ===== STADIUM STANDS (curved behind goal) =====
      const standGrad = ctx.createLinearGradient(0, H * 0.04, 0, H * 0.35);
      standGrad.addColorStop(0, '#181838');
      standGrad.addColorStop(1, '#222255');
      ctx.fillStyle = standGrad;
      ctx.beginPath();
      ctx.moveTo(0, H * 0.35);
      ctx.lineTo(0, H * 0.08);
      ctx.quadraticCurveTo(W * 0.5, -H * 0.02, W, H * 0.08);
      ctx.lineTo(W, H * 0.35);
      ctx.fill();

      // Crowd rows
      const crowdColors = ['#e74c3c','#e74c3c','#3498db','#3498db','#f1c40f','#2ecc71','#e67e22','#9b59b6','#fff','#1abc9c'];
      const goalCelebrating = phase === 'result' && lastResult?.scored;
      for (let row = 0; row < 6; row++) {
        const rowY = H * 0.06 + row * (H * 0.045);
        const spacing = 9;
        const rowOffset = (row % 2) * 4;
        for (let i = 0; i < Math.ceil(W / spacing); i++) {
          const cx = i * spacing + rowOffset;
          const baseY = rowY;
          const bounce = goalCelebrating
            ? Math.sin(f * 0.12 + i * 0.4 + row) * 5
            : Math.sin(f * 0.04 + i * 0.6 + row * 1.5) > 0.6 ? -2 : 0;

          // Body
          ctx.fillStyle = crowdColors[(i + row * 5) % crowdColors.length];
          ctx.fillRect(cx, baseY + bounce, 5, 6);
          // Head
          ctx.fillStyle = '#fcd5a8';
          ctx.fillRect(cx + 0.5, baseY + bounce - 3.5, 4, 4);
          // Arms up when celebrating
          if (goalCelebrating && Math.sin(f * 0.1 + i + row) > 0) {
            ctx.fillStyle = crowdColors[(i + row * 5) % crowdColors.length];
            ctx.fillRect(cx - 1, baseY + bounce - 4, 2, 3);
            ctx.fillRect(cx + 4, baseY + bounce - 4, 2, 3);
          }
        }
      }

      // ===== FLOODLIGHTS =====
      for (const lx of [W * 0.06, W * 0.94]) {
        ctx.fillStyle = '#555';
        ctx.fillRect(lx - 2, 0, 4, H * 0.22);
        // Light housing
        ctx.fillStyle = '#888';
        ctx.fillRect(lx - 12, H * 0.01, 24, 8);
        // Light glow
        ctx.fillStyle = '#ffe';
        ctx.shadowColor = '#ffe088';
        ctx.shadowBlur = 30;
        ctx.fillRect(lx - 10, H * 0.01, 20, 5);
        ctx.shadowBlur = 0;
        // Beams
        ctx.fillStyle = 'rgba(255,240,200,0.015)';
        ctx.beginPath();
        ctx.moveTo(lx - 10, H * 0.02);
        ctx.lineTo(W * 0.3, H * 0.45);
        ctx.lineTo(W * 0.7, H * 0.45);
        ctx.lineTo(lx + 10, H * 0.02);
        ctx.fill();
      }

      // ===== PITCH with perspective =====
      const horizonY = H * 0.34;
      const grassGrad = ctx.createLinearGradient(0, horizonY, 0, H);
      grassGrad.addColorStop(0, '#1a6d1a');
      grassGrad.addColorStop(0.3, '#1d7a1d');
      grassGrad.addColorStop(0.6, '#1a6d1a');
      grassGrad.addColorStop(1, '#145a14');
      ctx.fillStyle = grassGrad;
      ctx.fillRect(0, horizonY, W, H - horizonY);

      // Perspective grass stripes
      for (let i = 0; i < 12; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.018)';
          const t1 = i / 12, t2 = (i + 1) / 12;
          const y1 = horizonY + (H - horizonY) * (t1 * t1);
          const y2 = horizonY + (H - horizonY) * (t2 * t2);
          ctx.fillRect(0, y1, W, y2 - y1);
        }
      }

      // ===== GOAL (perspective) =====
      const goalPostW = 5;
      const goalLX = W * 0.22;
      const goalRX = W * 0.78;
      const goalTopY = H * 0.07;
      const goalBotY = horizonY + 4;
      const goalH = goalBotY - goalTopY;

      // Net (perspective depth lines)
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 0.6;
      const netDepth = W * 0.04;
      // Vertical net lines
      for (let nx = goalLX; nx <= goalRX; nx += 14) {
        ctx.beginPath();
        ctx.moveTo(nx, goalTopY);
        ctx.lineTo(nx - netDepth * ((nx - W / 2) / (goalRX - goalLX)), goalBotY);
        ctx.stroke();
      }
      // Horizontal net lines
      for (let ny = goalTopY; ny <= goalBotY; ny += 14) {
        ctx.beginPath();
        ctx.moveTo(goalLX, ny);
        ctx.lineTo(goalRX, ny);
        ctx.stroke();
      }
      ctx.restore();

      // Net background (darker)
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(goalLX, goalTopY, goalRX - goalLX, goalH);

      // Net bulge on goal
      if (phase === 'result' && lastResult?.scored) {
        const bulgeT = Math.min(1, (f % 120) / 40);
        const bulgeAmt = Math.sin(bulgeT * Math.PI) * W * 0.025;
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        for (let ny = goalTopY + 8; ny < goalBotY; ny += 12) {
          ctx.beginPath();
          ctx.moveTo(goalLX, ny);
          ctx.quadraticCurveTo((goalLX + goalRX) / 2, ny - bulgeAmt, goalRX, ny);
          ctx.stroke();
        }
      }

      // Goal posts - thick white with shadow
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 12;
      // Left post
      ctx.fillRect(goalLX - goalPostW / 2, goalTopY, goalPostW, goalH);
      // Right post
      ctx.fillRect(goalRX - goalPostW / 2, goalTopY, goalPostW, goalH);
      // Crossbar
      ctx.fillRect(goalLX - goalPostW / 2, goalTopY - goalPostW / 2, goalRX - goalLX + goalPostW, goalPostW);
      ctx.shadowBlur = 0;

      // ===== PITCH LINES (perspective) =====
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      // Penalty area
      const vanishX = W * 0.5;
      const pboxLT = W * 0.15, pboxRT = W * 0.85; // top of penalty box (at horizon)
      const pboxLB = W * 0.05, pboxRB = W * 0.95; // bottom of penalty box
      const pboxBotY = horizonY + (H - horizonY) * 0.55;
      ctx.beginPath();
      ctx.moveTo(pboxLT, goalBotY);
      ctx.lineTo(pboxLB, pboxBotY);
      ctx.lineTo(pboxRB, pboxBotY);
      ctx.lineTo(pboxRT, goalBotY);
      ctx.stroke();

      // 6-yard box
      const sixLT = W * 0.3, sixRT = W * 0.7;
      const sixLB = W * 0.25, sixRB = W * 0.75;
      const sixBotY = horizonY + (H - horizonY) * 0.25;
      ctx.beginPath();
      ctx.moveTo(sixLT, goalBotY);
      ctx.lineTo(sixLB, sixBotY);
      ctx.lineTo(sixRB, sixBotY);
      ctx.lineTo(sixRT, goalBotY);
      ctx.stroke();

      // Penalty spot
      const spotY = horizonY + (H - horizonY) * 0.72;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(W / 2, spotY, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Penalty arc
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(W / 2, spotY, W * 0.12, H * 0.06, 0, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // ===== GOALKEEPER =====
      const gkBaseX = W / 2;
      const gkBaseY = goalBotY - 2;
      let gkX = gkBaseX;
      let gkDiveAmt = 0;
      let gkDiveDir: 'left' | 'right' | 'center' = 'center';
      const anim = shootAnimRef.current;

      if (anim && anim.progress > 8) {
        gkDiveAmt = Math.min(1, (anim.progress - 8) / 18);
        // Extend reach so GK actually stretches to the posts, not just to ball target
        const reachMul = 1.2;
        gkX = gkBaseX + (anim.gkTargetX - gkBaseX) * gkDiveAmt * reachMul;
        // Clamp so GK doesn't go outside the goal mouth
        const goalLX = W * 0.22, goalRX = W * 0.78;
        gkX = Math.max(goalLX + W * 0.02, Math.min(goalRX - W * 0.02, gkX));
        gkDiveDir = anim.gkTargetX < gkBaseX ? 'left' : anim.gkTargetX > gkBaseX ? 'right' : 'center';
      } else if (!anim) {
        gkX = gkBaseX + Math.sin(f * 0.035) * W * 0.04;
      }

      drawGK(ctx, gkX, gkBaseY, W, H, gkDiveAmt, gkDiveDir, f);

      // ===== KICKER =====
      const kickerY = horizonY + (H - horizonY) * 0.82;
      const isKicking = !!(anim && anim.progress < 12);
      drawKicker(ctx, W / 2, kickerY, W, H, isKicking, f);

      // ===== BALL =====
      const ballRestY = spotY;
      if (!anim) {
        drawBall(ctx, W / 2, ballRestY, W * 0.012);
      } else {
        const flightFrames = 30;
        const t = Math.min(1, anim.progress / flightFrames);
        const ease = 1 - Math.pow(1 - t, 3);
        const startX = W / 2, startY = ballRestY;
        const bx = startX + (anim.ballEndX - startX) * ease;
        const by = startY + (anim.ballEndY - startY) * ease;
        const arc = Math.sin(t * Math.PI) * anim.power * 0.6;
        const scale = 1 - t * 0.4;
        const ballR = W * 0.012 * scale;

        // Shadow on ground
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(bx, by + ballR * 2 - arc * 0.1, ballR * 1.5, ballR * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Trail
        for (let tr = 1; tr <= 5; tr++) {
          const tt = Math.max(0, t - tr * 0.035);
          const te = 1 - Math.pow(1 - tt, 3);
          const tx = startX + (anim.ballEndX - startX) * te;
          const ty = startY + (anim.ballEndY - startY) * te;
          const ta = Math.sin(tt * Math.PI) * anim.power * 0.6;
          ctx.globalAlpha = 0.2 - tr * 0.035;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(tx, ty - ta, ballR * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        drawBall(ctx, bx, by - arc, ballR);

        anim.progress++;

        // Screen flash on impact
        if (anim.progress >= flightFrames && anim.progress < flightFrames + 8) {
          ctx.fillStyle = anim.scored ? 'rgba(0,255,136,0.06)' : 'rgba(255,50,80,0.06)';
          ctx.fillRect(0, 0, W, H);
        }

        if (anim.progress >= flightFrames + 25) {
          finishShot();
        }
      }

      // ===== RESULT TEXT =====
      if (phase === 'result' && lastResult) {
        const pulse = 1 + Math.sin(f * 0.08) * 0.04;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const fontSize = Math.floor(W * 0.06);
        ctx.font = `bold ${fontSize}px "Press Start 2P", monospace`;
        if (lastResult.scored) {
          ctx.fillStyle = '#00ff88';
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 40;
          ctx.setTransform(pulse, 0, 0, pulse, W / 2 * (1 - pulse), H * 0.48 * (1 - pulse));
          ctx.fillText('GOAL!', W / 2, H * 0.48);
        } else {
          ctx.fillStyle = '#ff4466';
          ctx.shadowColor = '#ff4466';
          ctx.shadowBlur = 40;
          ctx.setTransform(pulse, 0, 0, pulse, W / 2 * (1 - pulse), H * 0.48 * (1 - pulse));
          const txt = (lastResult.power > 93 && lastResult.height === 'high') ? 'OVER THE BAR!' : 'SAVED!';
          ctx.fillText(txt, W / 2, H * 0.48);
        }
        ctx.shadowBlur = 0;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.font = `${Math.floor(W * 0.015)}px "Press Start 2P", monospace`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        const sub = lastResult.scored
          ? `${DIR_LABELS[lastResult.direction]} · ${lastResult.height.toUpperCase()} · ${lastResult.power}% POWER`
          : `GK dived ${DIR_LABELS[lastResult.gkDirection]} ${lastResult.gkHeight.toUpperCase()}`;
        ctx.fillText(sub, W / 2, H * 0.56);
        ctx.restore();
      }

      // ===== VIGNETTE =====
      const vig = ctx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, W, H);

      // End camera shake
      if (shakeRef.current.intensity > 0.5) ctx.restore();

      animRef.current = requestAnimationFrame(render);
    }
    render();
    return () => { running = false; cancelAnimationFrame(animRef.current); };
  }, [phase, lastResult, finishShot]);

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden">
      {/* Top HUD — hidden during intro */}
      <div className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/85 to-transparent ${phase === 'intro' ? 'hidden' : ''}`}>
        <a href="/" className="font-pixel text-[10px] px-3 py-1.5 border border-[var(--neon-green)]/40 rounded-sm text-[var(--neon-green)] hover:bg-[var(--neon-green)]/15 transition-colors tracking-widest">
          ← EXIT
        </a>
        <div className="font-pixel text-[10px] text-[var(--neon-cyan)] tracking-widest">PENALTY SHOOTOUT</div>
        <div className="flex gap-2">
          <button onClick={() => setShowStats(!showStats)} className="font-pixel text-[9px] px-3 py-1.5 border border-[var(--neon-yellow)]/40 rounded-sm text-[var(--neon-yellow)] hover:bg-[var(--neon-yellow)]/15 transition-colors tracking-widest">STATS</button>
          {phase !== 'intro' && (
            <button onClick={reset} className="font-pixel text-[9px] px-3 py-1.5 border border-red-500/40 rounded-sm text-red-300 hover:bg-red-500/15 transition-colors tracking-widest">
              RESET
            </button>
          )}
        </div>
      </div>

      {/* Score HUD */}
      {phase !== 'intro' && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6 bg-black/50 backdrop-blur-sm rounded-full px-6 py-2 border border-white/10">
          <div className="text-center">
            <div className="font-pixel text-[8px] text-[var(--text-muted)]">YOU</div>
            <div className="font-pixel text-xl text-[var(--neon-green)]">{scored}</div>
          </div>
          <div className="text-center">
            <div className="font-pixel text-[8px] text-[var(--text-muted)]">RD {Math.min(round, totalRounds)}/{totalRounds}</div>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: totalRounds }).map((_, i) => (
                <div key={i} className={`w-2.5 h-2.5 rounded-full border ${i < shots.length ? shots[i].scored ? 'bg-[var(--neon-green)] border-[var(--neon-green)]' : 'bg-red-500 border-red-500' : 'bg-transparent border-white/30'}`} />
              ))}
            </div>
          </div>
          <div className="text-center">
            <div className="font-pixel text-[8px] text-[var(--text-muted)]">{selectedAgent.avatar} GK</div>
            <div className="font-pixel text-xl text-[var(--neon-magenta)]">{missed}</div>
          </div>
        </div>
      )}

      {/* Canvas container — hidden during intro */}
      <div ref={containerRef} className={`flex-1 relative ${phase === 'intro' ? 'invisible' : ''}`}>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
        {/* Scanlines */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px)' }} />
      </div>

      {/* ===== OVERLAYS ===== */}

      {/* Press Start intro with video bg */}
      <AnimatePresence>
        {phase === 'intro' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center overflow-hidden">
            {/* Video background */}
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 w-full h-full object-cover scale-[1.08] motion-reduce:hidden"
              style={{ filter: 'blur(6px)', opacity: 0.4 }}
            >
              <source src="/videos/game_introbg.webm" type="video/webm" />
            </video>
            {/* Static fallback for reduced motion */}
            <div className="absolute inset-0 hidden motion-reduce:block bg-[#020617]" />
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-[#020617]/70" />
            {/* CRT scanlines */}
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 3px)' }} />

            {/* Content */}
            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} className="relative z-10 text-center px-6">
              <motion.h1
                className="font-pixel text-xl sm:text-3xl md:text-5xl text-[var(--neon-green)] mb-3"
                style={{ textShadow: '0 0 12px rgba(0,255,136,0.4)' }}
              >
                PENALTY SHOOTOUT
              </motion.h1>
              <p className="font-retro text-xs sm:text-sm text-[var(--text-muted)] mb-8">
                5 shots · Aim, power, height — beat the AI keeper!
              </p>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.95 }}
                onClick={startGame}
                className="font-pixel text-sm md:text-lg text-[var(--neon-green)] border-2 border-[var(--neon-green)] px-10 py-4 md:px-14 md:py-5 bg-transparent cursor-pointer hover:bg-[var(--neon-green)]/10 transition-colors press-start-btn"
              >
                ▶ PRESS START
              </motion.button>
              {stats.totalGames > 0 && (
                <div className="mt-5 font-pixel text-[8px] text-[var(--text-muted)]">
                  {stats.totalWins}W / {stats.totalGames - stats.totalWins}L · STREAK: {stats.currentStreak} · BEST: {stats.bestStreak}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ready */}
      <AnimatePresence>
        {phase === 'ready' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
            <motion.div initial={{ scale: 4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', stiffness: 150 }}
              className="font-pixel text-4xl md:text-6xl text-white" style={{ textShadow: '0 0 12px rgba(255,255,255,0.3)' }}>
              ROUND {round}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Direction */}
      <AnimatePresence>
        {phase === 'aiming' && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }} className="absolute bottom-8 left-0 right-0 z-30 flex flex-col items-center px-4">
            <p className="font-pixel text-xs text-[var(--neon-green)] mb-3 tracking-wider" style={{ textShadow: '0 0 6px rgba(0,255,136,0.3)' }}>AIM YOUR SHOT</p>
            <div className="flex gap-2 md:gap-3">
              {(['left', 'center-left', 'center', 'center-right', 'right'] as Direction[]).map(dir => (
                <motion.button key={dir} whileHover={{ scale: 1.08, y: -3 }} whileTap={{ scale: 0.92 }} onClick={() => selectDirection(dir)}
                  className="font-pixel text-[8px] md:text-[10px] px-3 md:px-5 py-3 bg-black/70 border border-[var(--neon-cyan)]/40 rounded-lg text-[var(--neon-cyan)] hover:bg-[var(--neon-cyan)]/15 hover:border-[var(--neon-cyan)] transition-all backdrop-blur-sm shadow-lg">
                  {DIR_LABELS[dir]}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Power */}
      <AnimatePresence>
        {phase === 'power' && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-8 left-0 right-0 z-30 flex flex-col items-center px-4">
            <p className="font-pixel text-xs text-[var(--neon-yellow)] mb-3" style={{ textShadow: '0 0 6px rgba(255,170,0,0.3)' }}>SET POWER</p>
            <div className="w-72 h-10 bg-black/70 border border-white/20 rounded-full overflow-hidden backdrop-blur-sm relative shadow-lg">
              <motion.div className="h-full rounded-full transition-all duration-[20ms]" style={{
                width: `${power}%`,
                background: power < 35 ? 'linear-gradient(90deg,#22c55e,#4ade80)' : power < 65 ? 'linear-gradient(90deg,#eab308,#facc15)' : power < 85 ? 'linear-gradient(90deg,#f97316,#fb923c)' : 'linear-gradient(90deg,#ef4444,#f87171)',
              }} />
              <div className="absolute inset-0 flex items-center justify-center font-pixel text-sm text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{Math.round(power)}%</div>
              <div className="absolute top-0 bottom-0 left-[60%] w-[20%] border-x-2 border-[var(--neon-green)]/40 bg-[var(--neon-green)]/5" />
            </div>
            <p className="font-pixel text-[8px] text-[var(--text-muted)] mt-1.5">SWEET SPOT 60-80%</p>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={lockPower}
              className="mt-3 font-pixel text-xs px-10 py-3 bg-[var(--neon-green)]/20 border border-[var(--neon-green)]/50 rounded-lg text-[var(--neon-green)] hover:bg-[var(--neon-green)]/30 shadow-lg backdrop-blur-sm">
              LOCK
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Height */}
      <AnimatePresence>
        {phase === 'height-select' && (
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="absolute bottom-8 left-0 right-0 z-30 flex flex-col items-center px-4">
            <p className="font-pixel text-xs text-[var(--neon-magenta)] mb-3" style={{ textShadow: '0 0 6px rgba(255,68,136,0.3)' }}>CHOOSE HEIGHT</p>
            <div className="flex gap-3">
              {(['high', 'mid', 'low'] as Height[]).map(h => (
                <motion.button key={h} whileHover={{ scale: 1.08, y: -3 }} whileTap={{ scale: 0.92 }} onClick={() => selectHeight(h)}
                  className="font-pixel text-sm px-6 py-4 bg-black/70 border border-[var(--neon-magenta)]/40 rounded-lg text-[var(--neon-magenta)] hover:bg-[var(--neon-magenta)]/15 hover:border-[var(--neon-magenta)] transition-all backdrop-blur-sm shadow-lg">
                  {h === 'high' ? '⬆ HIGH' : h === 'mid' ? '➡ MID' : '⬇ LOW'}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game over */}
      <AnimatePresence>
        {phase === 'done' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 flex items-center justify-center bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} className="text-center max-w-md px-6">
              {scored >= 3 ? (
                <>
                  <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 180, delay: 0.15 }} className="text-7xl mb-3">🏆</motion.div>
                  <h2 className="font-pixel text-3xl text-[var(--neon-green)] mb-1" style={{ textShadow: '0 0 8px rgba(0,255,136,0.3)' }}>
                    {scored === 5 ? 'PERFECT!' : scored === 4 ? 'VICTORY!' : 'YOU WIN!'}
                  </h2>
                </>
              ) : (
                <>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.15 }} className="text-7xl mb-3">😞</motion.div>
                  <h2 className="font-pixel text-3xl text-red-400 mb-1">{scored === 0 ? 'DISASTER!' : scored === 1 ? 'TOUGH LOSS' : 'DEFEATED'}</h2>
                </>
              )}
              <p className="font-retro text-base text-[var(--text-muted)] mb-4">{scored}/{totalRounds} scored vs {selectedAgent.displayName}</p>

              {/* WIL POINTS reward */}
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.45, type: 'spring', stiffness: 220 }}
                className="inline-block px-4 py-2 mb-5 rounded-sm border border-[var(--neon-cyan)]/50 bg-[var(--neon-cyan)]/10"
              >
                <span className="font-pixel text-[8px] tracking-widest text-[var(--text-muted)]">EARNED · </span>
                <span className="font-pixel text-base text-[var(--neon-cyan)]">
                  +{scored * 2 + (scored >= 3 ? 10 : 0)} WIL PTS
                </span>
                <div className="font-pixel text-[8px] tracking-widest text-[var(--text-muted)] mt-1">
                  {scored} GOAL × 2 {scored >= 3 ? '· +10 WIN BONUS' : ''}
                </div>
              </motion.div>

              <div className="flex justify-center gap-2 mb-5">
                {shots.map((s, i) => (
                  <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold border-2 ${s.scored ? 'border-[var(--neon-green)] text-[var(--neon-green)] bg-[var(--neon-green)]/10' : 'border-red-500 text-red-400 bg-red-500/10'}`}>
                    {s.scored ? '⚽' : '✕'}
                  </motion.div>
                ))}
              </div>
              {stats.currentStreak > 1 && scored >= 3 && (
                <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="font-pixel text-xs text-[var(--neon-yellow)] mb-4">
                  🔥 {stats.currentStreak} WIN STREAK!
                </motion.p>
              )}
              <div className="flex gap-3 justify-center">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={reset} className="btn-neon btn-lock font-pixel text-xs px-8 py-3">PLAY AGAIN</motion.button>
                <a href="/global" className="font-pixel text-xs px-6 py-3 border border-white/20 rounded-lg text-[var(--text-muted)] hover:bg-white/5 transition-colors flex items-center gap-1">PREDICT →</a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <AnimatePresence>
        {showStats && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowStats(false)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()} className="card-retro p-6 w-full max-w-xs mx-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-pixel text-sm text-[var(--neon-cyan)]">YOUR STATS</h3>
                <button onClick={() => setShowStats(false)} className="font-pixel text-xs text-[var(--text-muted)]">✕</button>
              </div>
              <div className="space-y-3">
                {[
                  { l: 'GAMES', v: stats.totalGames, c: 'var(--neon-cyan)' },
                  { l: 'WINS', v: stats.totalWins, c: 'var(--neon-green)' },
                  { l: 'WIN RATE', v: stats.totalGames > 0 ? `${Math.round(stats.totalWins / stats.totalGames * 100)}%` : '—', c: 'var(--neon-yellow)' },
                  { l: 'GOALS', v: stats.totalGoals, c: 'var(--neon-green)' },
                  { l: 'ACCURACY', v: stats.totalShots > 0 ? `${Math.round(stats.totalGoals / stats.totalShots * 100)}%` : '—', c: 'var(--neon-cyan)' },
                  { l: 'STREAK', v: stats.currentStreak, c: stats.currentStreak > 0 ? 'var(--neon-green)' : 'var(--text-muted)' },
                  { l: 'BEST STREAK', v: stats.bestStreak, c: 'var(--neon-yellow)' },
                ].map(s => (
                  <div key={s.l} className="flex justify-between"><span className="font-pixel text-[8px] text-[var(--text-muted)]">{s.l}</span><span className="font-pixel text-sm" style={{ color: s.c }}>{s.v}</span></div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ========== DRAWING HELPERS ==========

function drawGK(ctx: CanvasRenderingContext2D, x: number, y: number, W: number, H: number, dive: number, diveDir: string, frame: number) {
  const scale = W * 0.022;
  ctx.save();

  if (dive > 0.2) {
    const angle = diveDir === 'left' ? -dive * 1.0 : diveDir === 'right' ? dive * 1.0 : 0;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.translate(-x, -y);
  }

  const s = scale;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.5, s * 1.8, s * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(x - s * 0.5, y - s * 1.2, s * 0.35, s * 1.5);
  ctx.fillRect(x + s * 0.15, y - s * 1.2, s * 0.35, s * 1.5);

  // Boots
  ctx.fillStyle = '#ff5500';
  ctx.beginPath();
  ctx.roundRect(x - s * 0.55, y + s * 0.1, s * 0.45, s * 0.3, 2);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x + s * 0.1, y + s * 0.1, s * 0.45, s * 0.3, 2);
  ctx.fill();

  // Jersey body
  const jGrad = ctx.createLinearGradient(x - s * 0.7, y - s * 3, x + s * 0.7, y - s * 1.2);
  jGrad.addColorStop(0, '#ffcc00');
  jGrad.addColorStop(1, '#ee9900');
  ctx.fillStyle = jGrad;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.7, y - s * 3, s * 1.4, s * 1.9, 3);
  ctx.fill();

  // Number
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.font = `bold ${s * 0.7}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('1', x, y - s * 2.1);

  // Arms
  const armW = s * (1 + dive * 2.5);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(x - s * 0.7 - armW, y - s * 3, armW, s * 0.5);
  ctx.fillRect(x + s * 0.7, y - s * 3, armW, s * 0.5);

  // Gloves
  ctx.fillStyle = '#00ff88';
  ctx.shadowColor = '#00ff88';
  ctx.shadowBlur = dive > 0.3 ? 8 : 0;
  ctx.beginPath();
  ctx.arc(x - s * 0.7 - armW, y - s * 2.75, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + s * 0.7 + armW, y - s * 2.75, s * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Head
  ctx.fillStyle = '#fcd5a8';
  ctx.beginPath();
  ctx.arc(x, y - s * 3.6, s * 0.65, 0, Math.PI * 2);
  ctx.fill();

  // Hair / cap
  ctx.fillStyle = '#eebb00';
  ctx.beginPath();
  ctx.arc(x, y - s * 3.8, s * 0.65, Math.PI, 0);
  ctx.fill();

  ctx.restore();
}

function drawKicker(ctx: CanvasRenderingContext2D, x: number, y: number, W: number, H: number, kicking: boolean, frame: number) {
  const s = W * 0.028;
  ctx.save();

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + s * 0.6, s * 2, s * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.fillStyle = '#fcd5a8';
  if (kicking) {
    ctx.fillRect(x - s * 0.5, y - s * 1.5, s * 0.35, s * 1.8);
    ctx.save();
    ctx.translate(x + s * 0.2, y - s * 1.5);
    ctx.rotate(-0.7);
    ctx.fillRect(0, 0, s * 0.35, s * 1.8);
    ctx.restore();
  } else {
    ctx.fillRect(x - s * 0.5, y - s * 1.5, s * 0.35, s * 1.8);
    ctx.fillRect(x + s * 0.15, y - s * 1.5, s * 0.35, s * 1.8);
  }

  // Boots
  ctx.fillStyle = '#222';
  ctx.beginPath();
  ctx.roundRect(x - s * 0.55, y + s * 0.1, s * 0.5, s * 0.35, 2);
  ctx.fill();

  // Shorts
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(x - s * 0.7, y - s * 2, s * 1.4, s * 0.8);

  // Jersey
  const jGrad = ctx.createLinearGradient(x - s * 0.8, y - s * 4.2, x + s * 0.8, y - s * 2);
  jGrad.addColorStop(0, '#3b82f6');
  jGrad.addColorStop(1, '#2563eb');
  ctx.fillStyle = jGrad;
  ctx.beginPath();
  ctx.roundRect(x - s * 0.8, y - s * 4.2, s * 1.6, s * 2.4, 3);
  ctx.fill();

  // #10
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `bold ${s * 0.7}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('10', x, y - s * 3);

  // Arms
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(x - s * 1.3, y - s * 4, s * 0.5, s * 1.5);
  ctx.fillRect(x + s * 0.8, y - s * 4, s * 0.5, s * 1.5);

  // Hands
  ctx.fillStyle = '#fcd5a8';
  ctx.fillRect(x - s * 1.3, y - s * 2.6, s * 0.4, s * 0.4);
  ctx.fillRect(x + s * 0.9, y - s * 2.6, s * 0.4, s * 0.4);

  // Head
  ctx.fillStyle = '#fcd5a8';
  ctx.beginPath();
  ctx.arc(x, y - s * 5, s * 0.8, 0, Math.PI * 2);
  ctx.fill();

  // Hair
  ctx.fillStyle = '#2a1505';
  ctx.beginPath();
  ctx.arc(x, y - s * 5.2, s * 0.8, Math.PI * 1.1, Math.PI * 1.9);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y - s * 5.4, s * 0.75, Math.PI, 0);
  ctx.fill();

  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  const grad = ctx.createRadialGradient(x - r * 0.25, y - r * 0.25, 0, x, y, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.7, '#eee');
  grad.addColorStop(1, '#bbb');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  // Pattern
  ctx.fillStyle = '#333';
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
