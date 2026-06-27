import { AGENTS, Match, Pick, AgentPrediction, Outcome } from './types';

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  vega: `You are Vega, a balanced football analyst. You weigh form, FIFA rankings, head-to-head records, and tactical matchups evenly. You are the benchmark predictor — reliable, measured, and data-informed. Never pick an upset without strong evidence.`,
  ronin: `You are Ronin, the upset specialist. You love underdogs and shock results. When the gap between teams is close, you lean toward the lower-ranked side. You believe in tournament chaos and dark horses. You pick upsets more often than a normal analyst would.`,
  sage: `You are Sage, a pure statistics machine. You only use FIFA rankings, historical head-to-head data, recent form (last 10 matches), goal difference, and xG. No gut feelings, no narratives — only numbers. If the data says a boring 1-0 to the favorite, that's your pick.`,
  halo: `You are Halo, driven by momentum and narrative. You believe in host nation magic, golden generation moments, and tournament destiny. Teams with a story — a retiring legend, a nation's first World Cup, a revenge match — get your backing. You feel the game.`,
  knox: `You are Knox, a defensive realist. You expect low-scoring, tactical, cagey football. You favor 1-0 grinds, 0-0 draws, and late goals from set pieces. You distrust attacking fireworks and back the side with the better defensive record.`,
  phoenix: `You are Phoenix, a pure form-chaser. You only care about momentum. The team on the hotter recent streak wins. If both are cold, you pick the draw. Reasoning is short, sharp, and form-focused.`,
};

export async function generateAgentPick(
  agentId: string,
  match: Match
): Promise<AgentPrediction> {
  const systemPrompt = AGENT_SYSTEM_PROMPTS[agentId];
  if (!systemPrompt) throw new Error(`Unknown agent: ${agentId}`);

  const userPrompt = `World Cup 2026 match: ${match.homeTeam} vs ${match.awayTeam} (Group ${match.group || 'N/A'}).
Kickoff: ${match.kickoffTime}.

Predict the outcome. You MUST respond with ONLY valid JSON, no other text:
{"outcome": "home" | "draw" | "away", "score": {"home": <number>, "away": <number>}, "oneLineReason": "<max 15 words>"}`;

  const baseUrl = process.env.ZG_SERVICE_URL || 'https://router-api.0g.ai/v1';

  const apiKey = process.env.ZG_API_KEY || process.env.ZG_API_SECRET || '';

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.ZG_MODEL || 'qwen/qwen-2.5-7b-instruct',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature:
          agentId === 'sage' || agentId === 'knox' ? 0.3 :
          agentId === 'ronin' ? 0.95 :
          agentId === 'phoenix' ? 0.5 :
          0.6,
        max_tokens: 150,
      }),
    });

    if (!res.ok) throw new Error(`TxLINE AI error: ${res.status}`);

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    return JSON.parse(jsonMatch[0]) as AgentPrediction;
  } catch {
    return generateFallbackPick(agentId, match);
  }
}

type Template = {
  outcome: Outcome;
  score: { home: number; away: number };
  reason: (h: string, a: string) => string;
};

const VEGA_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 2, away: 1 }, reason: (h) => `${h} take it 2-1. Form and structure point to a tight win.` },
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} edge a low-scoring tie. Discipline wins it 1-0.` },
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} control the midfield and finish it 2-0.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: () => `Even sides cancel out. 1-1 looks the honest result.` },
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (_h, a) => `${a} travel well and edge it 2-1. Quality on the day.` },
  { outcome: 'home', score: { home: 3, away: 1 }, reason: (h) => `${h} 3-1. Class shows when the game opens up.` },
  { outcome: 'draw', score: { home: 2, away: 2 }, reason: () => `Both attacks fire, both defenses crack. 2-2.` },
];

const RONIN_TEMPLATES: Template[] = [
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (_h, a) => `${a} STUN the favorite — write it down. 2-1 away.` },
  { outcome: 'away', score: { home: 0, away: 1 }, reason: (_h, a) => `Nobody sees this but ${a} nick it 1-0.` },
  { outcome: 'away', score: { home: 2, away: 3 }, reason: (_h, a) => `Chaos game. ${a} pull a 3-2 thriller.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: (h) => `${h} get jittery. The underdog holds. 1-1.` },
  { outcome: 'away', score: { home: 0, away: 2 }, reason: (h, a) => `${h} flop in style. ${a} 2-0 — wide open.` },
  { outcome: 'home', score: { home: 3, away: 2 }, reason: (h) => `Wild one. ${h} survive 3-2. Bet against the form book.` },
  { outcome: 'draw', score: { home: 2, away: 2 }, reason: () => `Late equalizer drama. 2-2 — chaos rules.` },
];

const SAGE_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} 1-0. xG model: 1.4 vs 0.7 in their favor.` },
  { outcome: 'home', score: { home: 2, away: 1 }, reason: (h) => `${h} 2-1. H2H last 5 reads W-W-D-W-L.` },
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. Clean-sheet probability: 41% per recent form.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: () => `1-1. Goals-per-game variance favors a stalemate.` },
  { outcome: 'away', score: { home: 0, away: 1 }, reason: (_h, a) => `${a} 0-1. Travel form 0.8 ppg holds; defense ranks top-tier.` },
  { outcome: 'home', score: { home: 1, away: 1 }, reason: (h) => `Toss-up. ${h} edge by ranking delta — 51.3%. Lean home draw.` },
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (h, a) => `${a} 2-1 ${h}. Shots-on-target ratio inverts in the second half.` },
];

const HALO_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. The crowd carries them — feel the noise.` },
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (_h, a) => `${a} 2-1. Destiny calls the underdog tonight.` },
  { outcome: 'home', score: { home: 3, away: 1 }, reason: (h) => `${h} 3-1. Tournament momentum favors the bold.` },
  { outcome: 'draw', score: { home: 2, away: 2 }, reason: () => `Both sides feel it. Neither folds. 2-2 — pure theatre.` },
  { outcome: 'away', score: { home: 0, away: 1 }, reason: (_h, a) => `${a} 0-1. A captain's final tournament writes its own ending.` },
  { outcome: 'home', score: { home: 2, away: 1 }, reason: (h) => `${h} 2-1. Home soil. End of story.` },
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} 1-0. Heart over heads — they want it more.` },
];

const KNOX_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} grind it out 1-0. Set-piece goal, lock the back four.` },
  { outcome: 'draw', score: { home: 0, away: 0 }, reason: () => `0-0. Two coaches playing not to lose. Bore-draw special.` },
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. Clean sheet, two on the counter.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: () => `1-1. Goals from corners both ends. Game stays tight.` },
  { outcome: 'away', score: { home: 0, away: 1 }, reason: (_h, a) => `${a} 0-1. Park the bus and nick a winner. Old-school.` },
  { outcome: 'home', score: { home: 1, away: 0 }, reason: (h) => `${h} 1-0. Late header. Both keepers have great games.` },
  { outcome: 'draw', score: { home: 0, away: 0 }, reason: () => `0-0. Knockout-football energy. Tactical lockdown.` },
];

const PHOENIX_TEMPLATES: Template[] = [
  { outcome: 'home', score: { home: 3, away: 1 }, reason: (h) => `${h} 3-1. They're on fire and won't slow down now.` },
  { outcome: 'away', score: { home: 1, away: 3 }, reason: (_h, a) => `${a} 3-1. Riding the streak — back the heat.` },
  { outcome: 'home', score: { home: 2, away: 0 }, reason: (h) => `${h} 2-0. Form trumps reputation tonight.` },
  { outcome: 'away', score: { home: 0, away: 2 }, reason: (_h, a) => `${a} 0-2. Hot momentum carries through the road.` },
  { outcome: 'home', score: { home: 4, away: 2 }, reason: (h) => `${h} 4-2. Open game, hot side wins the shootout.` },
  { outcome: 'draw', score: { home: 1, away: 1 }, reason: () => `1-1. Both cooling off — split the points.` },
  { outcome: 'away', score: { home: 1, away: 2 }, reason: (_h, a) => `${a} 2-1. Late goal — they're the side believing right now.` },
];

const TEMPLATES: Record<string, Template[]> = {
  vega: VEGA_TEMPLATES,
  ronin: RONIN_TEMPLATES,
  sage: SAGE_TEMPLATES,
  halo: HALO_TEMPLATES,
  knox: KNOX_TEMPLATES,
  phoenix: PHOENIX_TEMPLATES,
};

function generateFallbackPick(agentId: string, match: Match): AgentPrediction {
  const pool = TEMPLATES[agentId] || VEGA_TEMPLATES;
  const seed = hashCode(`${agentId}-${match.id}`);
  const t = pool[seed % pool.length];
  return {
    outcome: t.outcome,
    score: t.score,
    oneLineReason: t.reason(match.homeTeam, match.awayTeam),
  };
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function generateAllAgentPicks(matches: Match[]): Pick[] {
  const picks: Pick[] = [];
  for (const agent of AGENTS) {
    for (const match of matches) {
      const prediction = generateFallbackPick(agent.id, match);
      picks.push({
        id: `${agent.id}-${match.id}`,
        predictorId: agent.id,
        matchId: match.id,
        outcome: prediction.outcome,
        score: prediction.score,
        reason: prediction.oneLineReason,
        timestamp: new Date(new Date(match.kickoffTime).getTime() - 3600000).toISOString(),
        storageRef: `0x${hashCode(`${agent.id}-${match.id}`).toString(16).padStart(8, '0')}`,
      });
    }
  }
  return picks;
}
