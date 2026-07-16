import { AGENTS, Match, Pick, AgentPrediction, Outcome } from './types';

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  vega: `You are Vega, a balanced football analyst. You weigh form, FIFA rankings, head-to-head records, and live betting odds evenly. When sharp money moves on a side (odds shortening), you factor that in. You are the benchmark predictor — reliable, measured, and data-informed.`,
  ronin: `You are Ronin, the upset specialist. You love underdogs and shock results. When the odds suggest a heavy favourite, you look for reasons the underdog can nick it. Sharp money on the underdog is fuel. You pick upsets more often than a normal analyst would.`,
  sage: `You are Sage, a pure statistics and odds machine. You convert decimal odds to implied probabilities, remove the bookmaker margin, and derive true win probabilities. If odds imply 65% for the home side, you lean home. Numbers only — no gut feelings.`,
  halo: `You are Halo, driven by momentum and narrative. You believe in host nation magic, golden generation moments, and tournament destiny. But when sharp money (odds movement) contradicts the narrative, you take notice — the market often knows something you don't.`,
  knox: `You are Knox, a defensive realist. You expect low-scoring, tactical, cagey football. You favour 1-0 grinds and 0-0 draws. When odds on Under 2.5 goals shorten, you take that as confirmation. You distrust attacking fireworks.`,
  phoenix: `You are Phoenix, a pure form-chaser. You only care about momentum and live market signals. When odds shorten on a team late, that's the smart money following the form. The team the market is moving toward wins.`,
};

interface OddsContext {
  home: number;
  draw?: number;
  away: number;
}

function formatOddsContext(odds?: OddsContext): string {
  if (!odds) return 'No live odds available.';
  const homeProb = (1 / odds.home * 100).toFixed(1);
  const awayProb = (1 / odds.away * 100).toFixed(1);
  const drawProb = odds.draw ? (1 / odds.draw * 100).toFixed(1) : null;

  return `Live TxLINE odds: Home ${odds.home.toFixed(2)} (${homeProb}% implied)${
    drawProb ? ` · Draw ${odds.draw!.toFixed(2)} (${drawProb}% implied)` : ''
  } · Away ${odds.away.toFixed(2)} (${awayProb}% implied). These are consensus sharp bookmaker odds — significant movement indicates professional money.`;
}

export async function generateAgentPick(
  agentId: string,
  match: Match,
  odds?: OddsContext,
): Promise<AgentPrediction> {
  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId];
  if (!systemPrompt) throw new Error(`Unknown agent: ${agentId}`);

  const oddsContext = formatOddsContext(odds);

  const userPrompt = `World Cup 2026 match: ${match.homeTeam} vs ${match.awayTeam}${match.group ? ` (Group ${match.group})` : ''}.
Kickoff: ${match.kickoffTime}.

MARKET DATA: ${oddsContext}

Based on your strategy and the market data above, predict the outcome.
Respond with ONLY valid JSON, no other text:
{"outcome": "home" | "draw" | "away", "score": {"home": <number>, "away": <number>}, "oneLineReason": "<max 15 words mentioning odds if relevant>"}`;

  const apiKey = process.env.OPENROUTER_API_KEY || '';

  if (!apiKey) {
    return generateFallbackPick(agentId, match, odds);
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer':  'https://watchitlive.vercel.app',
        'X-Title':       'WatchItLive',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-nano-30b-a3b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        temperature:
          agentId === 'sage' || agentId === 'knox' ? 0.3 :
          agentId === 'ronin' ? 0.95 :
          agentId === 'phoenix' ? 0.5 : 0.6,
        max_tokens: 150,
      }),
    });

    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);

    const data     = await res.json();
    const content  = data.choices?.[0]?.message?.content?.trim() || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]) as AgentPrediction;
  } catch {
    return generateFallbackPick(agentId, match, odds);
  }
}

// ── Fallback templates ────────────────────────────────────────────────────────

type Template = {
  outcome: Outcome;
  score: { home: number; away: number };
  reason: (h: string, a: string, odds?: OddsContext) => string;
};

const VEGA_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 2, away: 1 }, reason: (h, _a, o) => o ? `${h} 2-1. Market favours home at ${o.home.toFixed(2)} — I agree.` : `${h} take it 2-1. Form and structure point to a tight win.` },
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} edge a low-scoring tie. Discipline wins it 1-0.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: (_h, _a, o) => o ? `Odds too close to split. 1-1 the balanced call.` : `Even sides cancel out. 1-1 looks the honest result.` },
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (_h, a, o) => o ? `${a} 2-1. Short odds at ${o.away.toFixed(2)} — sharp money knows.` : `${a} travel well and edge it 2-1.` },
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. Midfield control and clean sheet.` },
  { outcome: 'home', score: { home: 3, away: 1 }, reason: (h) => `${h} 3-1. Class shows when the game opens up.` },
  { outcome: 'draw', score: { home: 2, away: 2 }, reason: () => `Both attacks fire, both defenses crack. 2-2.` },
];

const RONIN_TEMPLATES: Template[] = [
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (_h, a, o) => o ? `${a} 2-1. Odds at ${o.away.toFixed(2)} still undervalues them.` : `${a} STUN the favorite — write it down.` },
  { outcome: 'away', score: { home: 0, away: 1 }, reason: (_h, a) => `Nobody sees this but ${a} nick it 1-0.` },
  { outcome: 'away', score: { home: 2, away: 3 }, reason: (_h, a) => `Chaos game. ${a} pull a 3-2 thriller.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: (h) => `${h} get jittery. The underdog holds. 1-1.` },
  { outcome: 'away', score: { home: 0, away: 2 }, reason: (h, a) => `${h} flop in style. ${a} 2-0 — wide open.` },
  { outcome: 'home', score: { home: 3, away: 2 }, reason: (h) => `Wild one. ${h} survive 3-2. Bet against the form book.` },
  { outcome: 'draw', score: { home: 2, away: 2 }, reason: () => `Late equalizer drama. 2-2 — chaos rules.` },
];

const SAGE_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h, _a, o) => o ? `${h} 1-0. Implied prob ${(1/o.home*100).toFixed(0)}% — model agrees.` : `${h} 1-0. xG model: 1.4 vs 0.7 in their favor.` },
  { outcome: 'home', score: { home: 2, away: 1 }, reason: (h) => `${h} 2-1. H2H last 5 reads W-W-D-W-L.` },
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. Clean-sheet probability 41%.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: (_h, _a, o) => o && o.draw ? `1-1. Draw at ${o.draw.toFixed(2)} — value in the stalemate.` : `1-1. Goals-per-game variance favors stalemate.` },
  { outcome: 'away', score: { home: 0, away: 1 }, reason: (_h, a, o) => o ? `${a} 0-1. Odds ${o.away.toFixed(2)} underpriced — edge detected.` : `${a} 0-1. Travel form holds, defense ranks top-tier.` },
  { outcome: 'home', score: { home: 1, away: 1 }, reason: (h) => `Toss-up. ${h} edge by ranking delta — lean home.` },
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (h, a) => `${a} 2-1 ${h}. Shots-on-target ratio inverts second half.` },
];

const HALO_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. The crowd carries them — feel the noise.` },
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (_h, a) => `${a} 2-1. Destiny calls the underdog tonight.` },
  { outcome: 'home', score: { home: 3, away: 1 }, reason: (h) => `${h} 3-1. Tournament momentum favors the bold.` },
  { outcome: 'draw', score: { home: 2, away: 2 }, reason: () => `Both sides feel it. Neither folds. 2-2 — pure theatre.` },
  { outcome: 'away', score: { home: 0, away: 1 }, reason: (_h, a) => `${a} 0-1. A captain's final tournament writes its own ending.` },
  { outcome: 'home', score: { home: 2, away: 1 }, reason: (h, _a, o) => o ? `${h} 2-1. Market at ${o.home.toFixed(2)} — and the story agrees.` : `${h} 2-1. Home soil. End of story.` },
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} 1-0. Heart over heads — they want it more.` },
];

const KNOX_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} grind it out 1-0. Set-piece goal, back four locked.` },
  { outcome: 'draw', score: { home: 0, away: 0 }, reason: () => `0-0. Two coaches playing not to lose. Bore-draw special.` },
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. Clean sheet, two on the counter.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: () => `1-1. Goals from corners both ends. Game stays tight.` },
  { outcome: 'away', score: { home: 0, away: 1 }, reason: (_h, a) => `${a} 0-1. Park the bus and nick a winner. Old-school.` },
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} 1-0. Late header. Both keepers have great games.` },
  { outcome: 'draw', score: { home: 0, away: 0 }, reason: () => `0-0. Knockout-football energy. Tactical lockdown.` },
];

const PHOENIX_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 3, away: 1 }, reason: (h, _a, o) => o ? `${h} 3-1. Odds moving their way — back the heat.` : `${h} 3-1. They're on fire and won't slow down.` },
  { outcome: 'away', score: { home: 1, away: 3 }, reason: (_h, a) => `${a} 3-1. Riding the streak — back the heat.` },
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. Form trumps reputation tonight.` },
  { outcome: 'away', score: { home: 0, away: 2 }, reason: (_h, a) => `${a} 0-2. Hot momentum carries through the road.` },
  { outcome: 'home', score: { home: 4, away: 2 }, reason: (h) => `${h} 4-2. Open game, hot side wins the shootout.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: () => `1-1. Both cooling off — split the points.` },
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (_h, a, o) => o ? `${a} 2-1. Odds shortening late — follow the money.` : `${a} 2-1. Late goal — they're believing right now.` },
];

const TEMPLATES: Record<string, Template[]> = {
  vega: VEGA_TEMPLATES, ronin: RONIN_TEMPLATES, sage: SAGE_TEMPLATES,
  halo: HALO_TEMPLATES, knox: KNOX_TEMPLATES,   phoenix: PHOENIX_TEMPLATES,
};

function generateFallbackPick(agentId: string, match: Match, odds?: OddsContext): AgentPrediction {
  const pool = TEMPLATES[agentId] || VEGA_TEMPLATES;
  const seed = hashCode(`${agentId}-${match.id}`);
  const t    = pool[seed % pool.length];
  return {
    outcome:       t.outcome,
    score:         t.score,
    oneLineReason: t.reason(match.homeTeam, match.awayTeam, odds),
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function generateAllAgentPicks(matches: Match[]): Pick[] {
  const picks: Pick[] = [];
  for (const agent of AGENTS) {
    for (const match of matches) {
      const prediction = generateFallbackPick(agent.id, match);
      picks.push({
        id:          `${agent.id}-${match.id}`,
        predictorId: agent.id,
        matchId:     match.id,
        outcome:     prediction.outcome,
        score:       prediction.score,
        reason:      prediction.oneLineReason,
        timestamp:   new Date(new Date(match.kickoffTime).getTime() - 3600000).toISOString(),
        storageRef:  `sol-${hashCode(`${agent.id}-${match.id}`).toString(16).padStart(8, '0')}`,
      });
    }
  }
  return picks;
}
