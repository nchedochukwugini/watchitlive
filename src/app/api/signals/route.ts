import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.TXLINE_API_BASE || 'https://txline-dev.txodds.com';
const JWT      = process.env.TXLINE_JWT || '';
const TOKEN    = process.env.TXLINE_API_TOKEN || '';

const HEADERS = {
  'Authorization': `Bearer ${JWT}`,
  'X-Api-Token':   TOKEN,
};

// In-memory signal log (persists during server lifecycle)
interface SignalLog {
  id:          string;
  fixtureId:   string;
  home:        string;
  away:        string;
  market:      string;
  direction:   '▲' | '▼';
  shift:       number;
  prevProb:    number;
  newProb:     number;
  gameState:   string;
  ts:          number;
  strength:    number;
  // Outcome tracking
  predictedWinner: 'home' | 'away' | 'draw' | null;
  actualOutcome:   'home' | 'away' | 'draw' | null;
  correct:         boolean | null;
  homeScore?:      number;
  awayScore?:      number;
}

const signalLog: SignalLog[] = [];
const oddsBaseline = new Map<string, { prob: number; ts: number }>();

// GET — return all logged signals with outcome tracking
export async function GET() {
  return NextResponse.json({
    signals:    signalLog.slice(-100),
    total:      signalLog.length,
    correct:    signalLog.filter(s => s.correct === true).length,
    incorrect:  signalLog.filter(s => s.correct === false).length,
    pending:    signalLog.filter(s => s.correct === null).length,
    accuracy:   signalLog.filter(s => s.correct !== null).length > 0
      ? ((signalLog.filter(s => s.correct === true).length /
          signalLog.filter(s => s.correct !== null).length) * 100).toFixed(1) + '%'
      : 'N/A',
  });
}

// POST — scan odds and detect signals
export async function POST() {
  try {
    // Fetch all fixtures
    const fixturesRes = await fetch(`${API_BASE}/api/fixtures/snapshot`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(5000),
    });
    if (!fixturesRes.ok) return NextResponse.json({ error: 'Fixtures fetch failed' }, { status: 502 });
    const fixtures = await fixturesRes.json();

    const now = Date.now();
    const newSignals: SignalLog[] = [];

    // Check odds for each fixture
    await Promise.allSettled(
      (Array.isArray(fixtures) ? fixtures : []).slice(0, 20).map(async (f: any) => {
        try {
          const oddsRes = await fetch(`${API_BASE}/api/odds/snapshot/${f.FixtureId}`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(3000),
          });
          if (!oddsRes.ok) return;
          const oddsData = await oddsRes.json();
          if (!Array.isArray(oddsData)) return;

          const market1x2 = oddsData.find((o: any) => o.SuperOddsType?.startsWith('1X2'));
          if (!market1x2?.Prices || market1x2.Prices.length < 2) return;

          const homeDecimal = market1x2.Prices[0] / 1000;
          const awayDecimal = market1x2.Prices[market1x2.Prices.length - 1] / 1000;
          if (homeDecimal <= 1 || awayDecimal <= 1) return;

          const homeProb = 1 / homeDecimal;
          const awayProb = 1 / awayDecimal;
          const gameState = market1x2.GameState || 'NS';

          // Check home movement
          for (const [market, newProb] of [['HOME', homeProb], ['AWAY', awayProb]] as [string, number][]) {
            const key      = `${f.FixtureId}:${market}`;
            const baseline = oddsBaseline.get(key);

            if (!baseline) {
              oddsBaseline.set(key, { prob: newProb, ts: now });
              continue;
            }

            const shift = (newProb - baseline.prob) / baseline.prob;

            if (Math.abs(shift) >= 0.04) {
              const strength = Math.min(5, Math.ceil(Math.abs(shift) / 0.02));
              const signal: SignalLog = {
                id:              `${f.FixtureId}-${market}-${now}`,
                fixtureId:       String(f.FixtureId),
                home:            f.Participant1,
                away:            f.Participant2,
                market,
                direction:       shift > 0 ? '▲' : '▼',
                shift:           parseFloat((shift * 100).toFixed(1)),
                prevProb:        parseFloat((baseline.prob * 100).toFixed(1)),
                newProb:         parseFloat((newProb * 100).toFixed(1)),
                gameState,
                ts:              now,
                strength,
                predictedWinner: shift > 0
                  ? (market === 'HOME' ? 'home' : 'away')
                  : (market === 'HOME' ? 'away' : 'home'),
                actualOutcome:   null,
                correct:         null,
              };

              signalLog.push(signal);
              newSignals.push(signal);
              oddsBaseline.set(key, { prob: newProb, ts: now });
            }
          }

          // Update outcome for finished matches
          const scoreRes = await fetch(`${API_BASE}/api/scores/snapshot/${f.FixtureId}`, {
            headers: HEADERS,
            signal: AbortSignal.timeout(2000),
          });
          if (scoreRes.ok) {
            const scoreData = await scoreRes.json();
            const snap = Array.isArray(scoreData) ? scoreData[0] : scoreData;
            if (snap?.StatusId === 5 || snap?.StatusId === 10 || snap?.StatusId === 13) {
              // Match finished — resolve pending signals
              const homeGoals = snap.Score?.Participant1?.Total?.Goals ?? 0;
              const awayGoals = snap.Score?.Participant2?.Total?.Goals ?? 0;
              const outcome: 'home' | 'away' | 'draw' =
                homeGoals > awayGoals ? 'home' :
                awayGoals > homeGoals ? 'away' : 'draw';

              signalLog
                .filter(s => s.fixtureId === String(f.FixtureId) && s.correct === null)
                .forEach(s => {
                  s.actualOutcome = outcome;
                  s.correct       = s.predictedWinner === outcome;
                  s.homeScore     = homeGoals;
                  s.awayScore     = awayGoals;
                });
            }
          }
        } catch {}
      })
    );

    return NextResponse.json({
      scanned:    fixtures.length,
      newSignals: newSignals.length,
      signals:    newSignals,
      total:      signalLog.length,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
