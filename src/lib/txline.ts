export interface TxLineSignal {
  id:        string;
  fixtureId: string;
  home:      string;
  away:      string;
  market:    string;
  direction: '▲' | '▼';
  shift:     number;
  prevProb:  number;
  newProb:   number;
  gameState: string;
  ts:        number;
  strength:  number; // 1-5 stars
}

export interface OddsState {
  prob: number;
  ts:   number;
}

const oddsMap = new Map<string, OddsState>();

export function detectSignal(
  fixtureId: string,
  home: string,
  away: string,
  market: string,
  newProb: number,
  gameState: string,
): TxLineSignal | null {
  const key      = `${fixtureId}:${market}`;
  const previous = oddsMap.get(key);

  if (!previous) {
    oddsMap.set(key, { prob: newProb, ts: Date.now() });
    return null;
  }

  const shift = (newProb - previous.prob) / previous.prob;
  oddsMap.set(key, { prob: newProb, ts: Date.now() });

  if (Math.abs(shift) < 0.04) return null;

  const strength = Math.min(5, Math.ceil(Math.abs(shift) / 0.02));

  return {
    id:        `${fixtureId}-${market}-${Date.now()}`,
    fixtureId,
    home,
    away,
    market,
    direction: shift > 0 ? '▲' : '▼',
    shift:     parseFloat((shift * 100).toFixed(1)),
    prevProb:  parseFloat((previous.prob * 100).toFixed(1)),
    newProb:   parseFloat((newProb * 100).toFixed(1)),
    gameState,
    ts:        Date.now(),
    strength,
  };
}

export function parseOddsSSE(raw: string, fixtureMap: Map<string, { home: string; away: string }>) {
  try {
    const data = JSON.parse(raw);
    if (!data.fixtureId || !data.prices || !data.priceNames) return null;

    const fixtureId = String(data.fixtureId);
    const gameState = data.gameState || 'NS';
    const market    = data.superOddsType || '1X2';
    const names     = data.priceNames as string[];
    const prices    = data.prices as number[];
    const fixture   = fixtureMap.get(fixtureId) || { home: 'Home', away: 'Away' };

    if (market === '1X2' && prices.length >= 2) {
      const homeDecimal = prices[0] / 1000;
      const awayDecimal = prices[prices.length - 1] / 1000;
      if (homeDecimal > 1) {
        return detectSignal(fixtureId, fixture.home, fixture.away, 'HOME', 1 / homeDecimal, gameState);
      }
      if (awayDecimal > 1) {
        return detectSignal(fixtureId, fixture.home, fixture.away, 'AWAY', 1 / awayDecimal, gameState);
      }
    }
    return null;
  } catch {
    return null;
  }
}
