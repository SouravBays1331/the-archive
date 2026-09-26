import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const querySchema = z.object({ query: z.string().min(2).max(500) });

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000;
const queries = new Map<string, { count: number; resetAt: number }>();

// Sanitised corpus summaries — no client identifiers, only figures present in content.
interface VolumeSummary {
  slug: string;
  codename: string;
  domain: string;
  sectorTag: string;
  hook: string;
  techniques: string[];
  status: string;
  summary: string;
}

function buildCorpus(summaries: VolumeSummary[]): string {
  return summaries
    .map(
      (v) =>
        `- ${v.codename} (${v.slug}) · domain: ${v.domain} · sector: ${v.sectorTag} · techniques: ${v.techniques.join(', ')} · status: ${v.status}\n  hook: ${v.hook}\n  summary: ${v.summary}`,
    )
    .join('\n');
}

function keywordFallback(
  query: string,
  corpus: VolumeSummary[],
): { message: string; recommendations: { slug: string; reason: string }[] } {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
  const scored = corpus
    .map((v) => {
      const hay = `${v.codename} ${v.hook} ${v.domain} ${v.sectorTag} ${v.techniques.join(' ')} ${v.summary}`.toLowerCase();
      let score = 0;
      for (const t of terms) if (hay.includes(t)) score += 1;
      for (const t of v.techniques) if (terms.some((q) => t.includes(q) || q.includes(t))) score += 2;
      return { v, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  if (scored.length === 0) {
    return {
      message:
        'Nothing in the collection matches that directly. Try naming the problem area — for example "document validation", "lineage", "manufacturing quality" or "AI visibility" — or browse the shelf by capability.',
      recommendations: [],
    };
  }
  return {
    message: `Based on what you described, ${scored.length === 1 ? 'this volume is' : 'these volumes are'} the closest match in the collection:`,
    recommendations: scored.map(({ v }) => ({ slug: v.slug, codename: v.codename, reason: v.hook })),
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
  const parsed = querySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }

  const sessionKey = req.cookies.get('archive_session')?.value.slice(0, 24) ?? 'anon';
  const now = Date.now();
  const rl = queries.get(sessionKey);
  if (rl && now < rl.resetAt && rl.count >= RATE_LIMIT) {
    return NextResponse.json(
      { error: 'The librarian needs a rest — try again in a little while.' },
      { status: 429 },
    );
  }
  if (!rl || now >= rl.resetAt) queries.set(sessionKey, { count: 1, resetAt: now + RATE_WINDOW_MS });
  else rl.count += 1;

  const { getShelfOrder } = await import('@/lib/content');
  const summaries: VolumeSummary[] = getShelfOrder().map((v) => ({
    slug: v.slug,
    codename: v.codename,
    domain: v.domain,
    sectorTag: v.sectorTag,
    hook: v.hook,
    techniques: [...v.techniques],
    status: v.status,
    summary: v.approach.summaryExec,
  }));

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const provider =
    process.env.LIBRARIAN_PROVIDER ??
    (deepseekKey ? 'deepseek' : anthropicKey ? 'anthropic' : 'keyword');

  const finish = (message: string, recs: { slug: string; reason: string }[]) => {
    const valid = new Map(summaries.map((s) => [s.slug, s.codename]));
    return NextResponse.json({
      message,
      recommendations: recs
        .filter((r) => valid.has(r.slug))
        .map((r) => ({ ...r, codename: valid.get(r.slug) })),
    });
  };

  if (provider === 'deepseek' && deepseekKey) {
    try {
      const corpus = buildCorpus(summaries);
      const base = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
      const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-v4.1-flash';
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${deepseekKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: `You are "the librarian", the guide for a private product-portfolio archive of a data science & AI team. Recommend volumes from ONLY this corpus:
${corpus}

Rules: Only discuss the portfolio and the team's capabilities; politely decline anything else. Never speculate about client identities; engagements are confidential. Never invent metrics; quote only figures present above. Reply with STRICT JSON only: {"message": string (2-4 sentences, warm, precise), "recommendations": [{"slug": string, "reason": string (one line)}]} with 0-3 recommendations using only slugs from the corpus.`,
            },
            { role: 'user', content: parsed.data.query },
          ],
          temperature: 0.3,
          max_tokens: 600,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text: string = data?.choices?.[0]?.message?.content ?? '';
        const match = /\{[\s\S]*\}/.exec(text);
        if (match) {
          const parsedOut = z
            .object({
              message: z.string(),
              recommendations: z.array(z.object({ slug: z.string(), reason: z.string() })),
            })
            .safeParse(JSON.parse(match[0]));
          if (parsedOut.success) return finish(parsedOut.data.message, parsedOut.data.recommendations);
        }
      }
    } catch {
      /* fall through to keyword fallback */
    }
  }

  if (provider === 'anthropic' && anthropicKey) {
    try {
      const corpus = buildCorpus(summaries);
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: process.env.LIBRARIAN_MODEL ?? 'claude-sonnet-4-20250514',
          max_tokens: 600,
          system: `You are "the librarian", the guide for a private product-portfolio archive of a data science & AI team. Recommend volumes from ONLY this corpus:
${corpus}

Rules: Only discuss the portfolio and the team's capabilities; politely decline anything else. Never speculate about client identities; engagements are confidential. Never invent metrics; quote only figures present above. Reply with STRICT JSON only: {"message": string (2-4 sentences, warm, precise), "recommendations": [{"slug": string, "reason": string (one line)}]} with 0-3 recommendations using only slugs from the corpus.`,
          messages: [{ role: 'user', content: parsed.data.query }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text: string = data?.content?.[0]?.text ?? '';
        const match = /\{[\s\S]*\}/.exec(text);
        if (match) {
          const parsedOut = z
            .object({
              message: z.string(),
              recommendations: z.array(z.object({ slug: z.string(), reason: z.string() })),
            })
            .safeParse(JSON.parse(match[0]));
          if (parsedOut.success) return finish(parsedOut.data.message, parsedOut.data.recommendations);
        }
      }
    } catch {
      /* fall through to keyword fallback */
    }
  }

  return NextResponse.json(keywordFallback(parsed.data.query, summaries));
}
