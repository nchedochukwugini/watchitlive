import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { message, history, context } = await req.json();

    // Context is now passed from client — no server-side TxLINE fetch needed
    const systemPrompt = `You are WatchItLive AI — sharp money analyst for FIFA World Cup 2026 powered by TxLINE real-time odds.
${context ? `Live data: ${context}` : 'World Cup 2026 is underway with 48 teams competing in USA, Canada and Mexico.'}
Rules: Be concise (2-3 sentences). Reference odds and scores when available. Be direct and confident like a professional analyst.`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'HTTP-Referer':  'https://watchitlive.vercel.app',
        'X-Title':       'WatchItLive',
      },
      body: JSON.stringify({
        model:       'nvidia/nemotron-3-nano-30b-a3b:free',
        messages: [
          { role: 'system', content: systemPrompt },
          ...(history || []).slice(-6),
          { role: 'user', content: message },
        ],
        max_tokens:  200,
        temperature: 0.7,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) throw new Error(`OpenRouter ${res.status}`);
    const data  = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim() || 'No response.';
    return NextResponse.json({ reply });

  } catch (err) {
    return NextResponse.json(
      { reply: 'Please try again.' },
      { status: 500 }
    );
  }
}
