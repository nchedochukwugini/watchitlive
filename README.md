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

🌐 **Live:** https://watchitlive.vercel.app
📦 **GitHub:** https://github.com/nchedochukwugini/watchitlive

---

## The Problem 🤔

Sports betting data is fragmented, delayed, and opaque. Sharp odds movement — the signal that professional bettors act on — happens in seconds and is invisible to most users. Prediction markets have zero accountability. Anyone can claim they "called it" after the fact with no timestamped, tamper-proof record. ❌

## The Solution 💡

WatchItLive solves this by combining real-time TxLINE odds intelligence with on-chain anchoring:

1. **Live odds stream** from TxLINE's consensus sharp bookmaker feed via SSE ⏰
2. **Sharp signal detection** fires when implied probability shifts ≥4% — classifying by market, direction, game phase, and strength 🔒
3. **Every pick is anchored on Solana devnet** via memo transactions — a verifiable, immutable proof that your call was locked before kickoff 📜
4. **Six AI agents** analyze every fixture with TxLINE live odds context, creating a benchmark you compete against 🤖

No edits. No deletions. No "I told you so" without proof. 🎯

---

## TxLINE Integration Deep Dive 🔗

This project leverages TxLINE's full data stack:

### TxLINE Endpoints Used

| Endpoint | Purpose |
|---|---|
| `POST /auth/guest/start` | Guest JWT authentication |
| `POST /api/token/activate` | Service Level 1 activation on Solana devnet |
| `GET /api/fixtures/snapshot` | All World Cup 2026 fixtures (filtered CompetitionId: 72) |
| `GET /api/odds/stream` (SSE) | Real-time live odds stream — powers signal detector + ticker |
| `GET /api/odds/snapshot/:fixtureId` | Per-fixture 1X2 odds with de-margined Pct probabilities |
| `GET /api/scores/stream` (SSE) | Real-time scores stream — live minute, goals, cards, corners |
| `GET /api/scores/snapshot/:fixtureId` | Live match stats — Score object with H1/HT/H2/Total per participant |
| `GET /api/scores/stat-validation` | Merkle proof data for on-chain score verification |
| TxLINE Solana Program | `validateStat` instruction — cryptographic score anchoring |

**TxLINE Solana Program ID:** `6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J`
**Service Level 1** activated on Solana devnet

### Live Odds Stream 📊

Every World Cup fixture is streamed in real time via TxLINE's SSE endpoint:

1. Subscribes to `/api/odds/stream` for live 1X2 odds updates 📡
2. Parses `SuperOddsType: 1X2_PARTICIPANT_RESULT` — prices stored as integers ×1000
3. Uses TxLINE `Pct` field for de-margined implied probabilities
4. Tracks probability per `(fixtureId, market)` in browser memory as baseline
5. Fires a **sharp signal** when `|newProb - baselineProb| >= 0.04` (4 percentage points)
6. Classifies signals by game phase using TxLINE `StatusId` field
7. Proxied through Next.js API route to handle CORS

### Live Scores Stream ⚽

Subscribes to `/api/scores/stream` for real-time updates:
- Goal events with `Score.Participant1/2.Total.Goals`
- Game phase from `StatusId` (2=H1, 3=HT, 4=H2, 5=F, 12=PE)
- Live clock from `Clock.Seconds` — calculates minute displayed on match cards
- Corners, yellow cards, red cards per half from Score object

### TxLINE StatusId Mapping

| StatusId | Phase | Description |
|---|---|---|
| 1 | NS | Not Started |
| 2 | H1 | First Half |
| 3 | HT | Half Time |
| 4 | H2 | Second Half |
| 5 | F | Full Time |
| 7 | ET1 | Extra Time First Half |
| 9 | ET2 | Extra Time Second Half |
| 10 | FET | Full Time After Extra Time |
| 12 | PE | Penalty Shootout |
| 13 | FPE | Full Time After Penalties |

### On-Chain Subscription 🔗

Service Level 1 subscription registered on Solana devnet via the TxLINE program. Every wallet-connected pick is anchored using a Solana memo instruction storing the SHA-256 hash of the pick payload.

### TxLINE Merkle Score Verification

- Fetches Merkle proof from `/api/scores/stat-validation?fixtureId=X&seq=Y&statKey=1&statKey2=2`
- Derives Daily Scores PDA: seeds `["daily_scores_roots", epochDay as u16 LE]`
- Calls `validateStat` on TxLINE program with fixture summary, proof nodes, and stat terms
- Returns cryptographic proof that the score is real and anchored on-chain

---

## Features 🎮

### ⚡ Sharp Movement Detector
- Monitors TxLINE odds every 60 seconds via SSE stream (client-side persistent baseline)
- Fires when implied probability shifts ≥4 percentage points on any fixture
- Classifies: direction (▲/▼), strength (1-5★), game phase, market (HOME/AWAY)
- Predicts winner based on money direction — tracks accuracy vs actual outcomes
- Toast notifications slide in automatically — no refresh needed
- Signal log with outcome tracking and accuracy percentage

### 📡 Real-Time Odds
- Live 1X2 odds on every match card via TxLINE SSE stream
- De-margined probabilities from TxLINE `Pct` field
- Odds update automatically without page refresh
- `SuperOddsType: 1X2_PARTICIPANT_RESULT` with prices ×1000

### 🔒 On-Chain Prediction Anchoring
- On-chain anchoring ONLY when wallet is connected (guest mode saves locally)
- SHA256 hash of pick data written via Solana memo transaction
- Full Solana TX signature displayed in modal + Solscan link
- TxLINE Daily Scores PDA shown on every match card
- Verify predictions at `/verify` page

### ⛓ TxLINE Merkle Score Verification
- "VERIFY SCORE ON-CHAIN" button on every finished match card
- Calls `validateStat` on TxLINE Solana program
- Cryptographic proof that the score is real — not just a number

### 🤖 AI Analyst
- WatchItLive AI powered by OpenRouter
- Context from live TxLINE fixture data (upcoming matches, live status)
- Ask anything about World Cup 2026 — odds, markets, sharp money
- Text-to-speech enabled — AI reads analysis aloud
- Suggested questions for quick interaction

### 🏆 Global Arena
- Predict every World Cup match before kickoff
- Out-call 6 AI agents (Vega, Ronin, Sage, Halo, Knox, Phoenix)
- Each agent uses TxLINE live 1X2 odds in their reasoning
- Live, Upcoming and Results sections
- Results sorted by most recent match first
- Leaderboard with points for correct picks + exact scores

### 📊 Match Stats Page
- Live stats from TxLINE scores snapshot (corners, cards, goals per half)
- Auto-updates via TxLINE scores SSE during live matches
- Lineups, formations, managers from Zafronix World Cup API
- H2H historical World Cup meetings across all tournaments (2006-2026)
- Events timeline — goals, cards, substitutions by minute

### 🎮 Additional Features
- **Penalty Shootout** — Three.js 3D AI goalkeeper
- **Tournament Bracket** — All 104 World Cup fixtures
- **Head to Head** — Historical scorecard comparison
- **Wallet Connection** — Reown AppKit (Phantom, Solflare, 150+ wallets)
- **Retro Arcade UI** — CRT scanlines, pixel fonts, neon colors, starfield

---

## Architecture
Browser
├── TxLINE Odds SSE → useLiveOdds hook → Match cards (real-time)
├── TxLINE Scores SSE → Stats page + Match cards (real-time)
├── Signal detector → 60s odds scan → Toast notifications
└── Reown AppKit → Wallet connection
Server (Next.js API Routes)
├── /api/matches      → TxLINE fixtures (WC only) + worldcup26 status/scores
├── /api/odds         → TxLINE odds snapshot (all fixtures)
├── /api/txline       → SSE proxy (odds + scores streams)
├── /api/live-score   → TxLINE scores snapshot per fixture
├── /api/match-stats  → TxLINE scores + Zafronix lineups
├── /api/signals      → Sharp movement detection + outcome tracking
├── /api/storage      → Solana memo tx anchoring
├── /api/validate-score → TxLINE Merkle proof + validateStat
├── /api/verify       → Solana tx verification
├── /api/agents       → AI agent picks with TxLINE odds context
├── /api/ai-chat      → AI analyst with TxLINE fixture context
└── /api/h2h          → Historical World Cup H2H via Zafronix

---

## Signal Detection Logic
impliedProb = 1 / decimalOdds
shift = newProb - baselineProb  (absolute percentage points)
signal fires when |shift| >= 0.04 (4 percentage points)
strength = min(5, ceil(|shift| / 0.02))
predictedWinner = if shift > 0: shortening side, else: drifting opponent
accuracy = correct signals / resolved signals * 100

---

## On-Chain Flow
1. User connects wallet (Phantom/Solflare via Reown)
2. User locks pick (outcome + exact score)
3. Server creates SHA256 hash of pick data
4. Server sends Solana memo tx: "watchitlive:pick:{hash}"
5. Transaction confirmed on devnet (~1.5s)
6. Full tx signature + Solscan link returned to user
7. Pick permanently anchored before kickoff

---

## Tech Stack 🛠️

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Styling | Tailwind CSS 4, Press Start 2P + VT323 fonts, Framer Motion |
| 3D Engine | Three.js (penalty shootout) |
| Wallet | Reown AppKit v3 (150+ wallets) |
| Blockchain | Solana devnet, @solana/web3.js, @coral-xyz/anchor |
| Data Primary | TxLINE (odds, scores, signals, on-chain) |
| Data Secondary | worldcup26.ir (results), Zafronix (lineups/H2H) |
| AI | OpenRouter (nvidia/nemotron-3-nano-30b-a3b:free) |
| Deployment | Vercel |

---

## Scoring System 📐

| Event | Points |
|---|---|
| Correct outcome (home/draw/away) | +3 |
| Exact score match | +2 bonus |
| Penalty shootout win | +10 |
| **Maximum per match** | **5** |

---

## Getting Started 🚀

### Prerequisites
- Node.js 18+
- TxLINE API token (via on-chain subscription)
- Reown project ID from [cloud.reown.com](https://cloud.reown.com)

### Installation

```bash
git clone https://github.com/nchedochukwugini/watchitlive.git
cd watchitlive
npm install --ignore-scripts

Create .env.local:
TXLINE_JWT=your_txline_jwt
TXLINE_API_TOKEN=your_txline_api_token
TXLINE_API_BASE=https://txline-dev.txodds.com
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
SOLANA_KEYPAIR_BASE64=your_keypair_base64
ZAFRONIX_API_KEY=your_zafronix_key
OPENROUTER_API_KEY=your_openrouter_key
RPC_URL=https://api.devnet.solana.com

Run:npm run dev

Open http://localhost:3000
License 📄
MIT
�
Built with ☕ and ⚽ for the TxODDS x Superteam World Cup Hackathon 2026 


�
WatchItLive — Every signal from TxLINE. Every pick on Solana. 

README ```
