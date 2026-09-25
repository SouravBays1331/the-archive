import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ALLOWED = new Set([
  'gate_success',
  'lens_change',
  'volume_hover',
  'volume_open',
  'chapter_view',
  'edition_switch',
  'roi_calculated',
  'librarian_query',
  'reading_list_add',
  'enquiry_submit',
]);

export async function POST(req: NextRequest) {
  let body: { event?: unknown; props?: unknown; ts?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const event = typeof body.event === 'string' ? body.event : '';
  if (!ALLOWED.has(event)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const record = {
    ts: typeof body.ts === 'number' ? new Date(body.ts).toISOString() : new Date().toISOString(),
    user: req.headers.get('x-archive-user') ?? 'unknown',
    event,
    props: body.props ?? {},
  };

  try {
    const dir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'analytics.jsonl'), JSON.stringify(record) + '\n');
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
