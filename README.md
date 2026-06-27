<p align="center">
  <img src="https://img.shields.io/badge/TxODDS-World%20Cup%20Hackathon-00ff88?style=for-the-badge" alt="TxODDS Hackathon"/>
  <img src="https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js" alt="Next.js 16"/>
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19"/>
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/Solana-Devnet-9945FF?style=for-the-badge&logo=solana" alt="Solana"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License"/>
</p>

<h1 align="center">⚽ WatchItLive</h1>

<p align="center">
  <b>World Cup 2026 · Live Odds · Sharp Signals · On Solana.</b>
</p>

<p align="center">
  A retro-arcade live odds streaming platform powered by <a href="https://txline.txodds.com">TxLINE</a> real-time data feeds. Watch sharp money move in real time, get signal alerts when odds shift significantly, predict every FIFA World Cup 2026 fixture against six AI agents, and anchor every pick on Solana devnet for tamper-proof proof-of-foresight. ⚡
</p>

<p align="center">
  <a href="https://earn.superteam.fun">Built for the TxODDS x Superteam World Cup Hackathon 2026</a> 🏆
</p>

---

## The Problem 🤔

Sports betting data is fragmented, delayed, and opaque. Sharp odds movement — the signal that professional bettors act on — happens in seconds and is invisible to most users. Prediction markets have zero accountability. Anyone can claim they "called it" after the fact with no timestamped, tamper-proof record. ❌

## The Solution 💡

WatchItLive solves this by combining real-time TxLINE odds intelligence with on-chain anchoring:

1. **Live odds stream** from TxLINE's consensus sharp bookmaker feed via SSE ⏰
2. **Sharp signal detection** fires when implied probability shifts ≥4% — classifying by market, direction, game phase, and strength 🔒
3. **Every pick is anchored on Solana devnet** via memo transactions — a verifiable, immutable proof that your call was locked before kickoff 📜
4. **Six AI agents** analyze every fixture with unique strategies, creating a benchmark you compete against 🤖

No edits. No deletions. No "I told you so" without proof. 🎯

---

## TxLINE Integration Deep Dive 🔗

This project leverages TxLINE's full data stack:

### Live Odds Stream 📊

Every World Cup fixture is streamed in real time via TxLINE's SSE endpoint. The odds engine:

1. Subscribes to `/api/odds/stream` for live 1X2 odds updates 📡
2. Tracks implied probability per `(fixtureId, market)` over a rolling window 📈
3. Fires a **sharp signal** when `|newProb - baselineProb| / baselineProb ≥ 0.04` 🚨
4. Classifies signals by game phase (H1, HT, H2, ET, PE) and strength (1–5 stars) ⭐
5. Proxies the stream through a Next.js API route to the frontend via SSE 🔄

### Live Scores Stream ⚽

Subscribes to `/api/scores/stream` for real-time goal events, game phase updates, and match minutes. Score changes trigger animated goal flashes in the UI.

### On-Chain Subscription 🔗

Service Level 1 subscription registered on Solana devnet via the TxLINE program (`6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`). Every pick is anchored using a Solana memo instruction storing the SHA-256 hash of the pick payload. See [`storage.ts`](src/lib/storage.ts).

### TxLINE Endpoints Used

| Endpoint | Purpose |
|---|---|
| `POST /auth/guest/start` | Guest JWT |
| `POST /api/token/activate` | API token activation |
| `GET /api/fixtures/snapshot` | All World Cup fixtures |
| `GET /api/odds/stream` (SSE) | Live odds stream |
| `GET /api/scores/stream` (SSE) | Live scores + game phase |

---

## Features 🎮

### Live Odds Dashboard 📡
Real-time 1X2 odds for all 104 World Cup matches streamed directly from TxLINE. Odds animate on every update. Live matches glow. Tap any fixture for full detail.

### Sharp Signal Feed 🚨
Fires automatically when TxLINE odds shift ≥4%. Each signal shows:
- Which team is moving and by how much
- Implied probability before and after
- Game phase at time of signal
- Signal strength (1–5 stars)
- Direct **Bet This →** link to Bet365

### Global Arena 🌍
Browse all World Cup 2026 fixtures, submit outcome and exact score predictions, and watch your calls get anchored on Solana in real time. Countdown timer tracks the next kickoff. 📊

### Agent Arena 🤖
Six autonomous AI analysts, each with a distinct personality and strategy:

| Agent | Avatar | Strategy |
|-------|--------|----------|
| **Vega** | ✨ | Balanced analyst weighing form, rankings, and matchup history evenly |
| **Ronin** | 🃏 | Upset specialist who backs underdogs and thrives on chaos |
| **Sage** | 📊 | Pure statistics engine driven by xG, rankings, and H2H data |
| **Halo** | 🔥 | Narrative-driven believer in momentum and tournament destiny |
| **Knox** | 🛡️ | Defensive realist expecting low-scoring tactical grinds |
| **Phoenix** | 🚀 | Hot-hand form chaser who backs teams on winning streaks |

### Penalty Shootout Minigame ⚽
Fully interactive 3D penalty shootout built with Three.js. Choose shot direction, height, and power. Each AI agent goalkeeper uses a unique save strategy. Score 3+ out of 5 to win bonus WIL Points. 🏅

### Head-to-Head Comparisons ⚔️
Pick any two predictors (human or AI) and view a match-by-match breakdown of predictions, scores, and accuracy. 📋

### Global Leaderboard 🏆
Unified ranking of humans and AI agents:
- **+3 points** for correct outcome ✅
- **+2 bonus** for exact score 🎯

---

## Tech Stack 🛠️

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router), React 19, TypeScript 5 |
| **Styling** | Tailwind CSS 4 · Retro CRT design · Press Start 2P + VT323 |
| **Animations** | Framer Motion |
| **3D Engine** | Three.js (penalty shootout) |
| **Data** | TxLINE API — SSE odds + scores stream (Service Level 1) |
| **Wallet** | Reown AppKit — Phantom, Solflare, email, Google (150+ wallets) |
| **On-chain** | Solana devnet — memo program tx per pick |
| **Deployment** | Vercel |

---

## Getting Started 🚀

### Prerequisites
- Node.js 18+ 📦
- TxLINE API token (free for hackathon via on-chain subscription) 🔑
- Reown project ID from [cloud.reown.com](https://cloud.reown.com) 🌐

### Installation

```bash
git clone https://github.com/nchedochukwugini/watchitlive.git
cd watchitlive
npm install --ignore-scripts
```

Create `.env.local`:

```env
TXLINE_JWT=your_txline_jwt
TXLINE_API_TOKEN=your_txline_api_token
TXLINE_API_BASE=https://txline-dev.txodds.com
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
```

Run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🖥️

### TxLINE On-Chain Activation

```bash
cd bot
npm install
node src/activate.mjs
```

This registers your Service Level 1 subscription on Solana devnet and saves your API credentials automatically.

---

## Scoring System 📐

| Event | Points |
|-------|--------|
| Correct outcome (home/draw/away) | +3 |
| Exact score match | +2 bonus |
| Penalty shootout win | +10 |
| **Maximum per match** | **5** |

---

## License 📄

MIT ✅

---

<p align="center">
  Built with ☕ and ⚽ for the <a href="https://earn.superteam.fun">TxODDS x Superteam World Cup Hackathon 2026</a>
</p>
