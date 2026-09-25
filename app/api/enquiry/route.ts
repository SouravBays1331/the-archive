import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const enquirySchema = z.object({
  volumes: z.array(z.string().min(1)).min(1).max(20),
  name: z.string().min(1).max(120),
  company: z.string().max(160).optional().default(''),
  email: z.string().email().max(160),
  interest: z.enum(['demo', 'pilot', 'partnership', 'exploring']),
  note: z.string().max(2000).optional().default(''),
  roi: z.string().max(400).optional().default(''),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'INVALID SUBMISSION' }, { status: 400 });
  }
  const parsed = enquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: 'INVALID SUBMISSION' }, { status: 400 });
  }

  const record = {
    ts: new Date().toISOString(),
    user: req.headers.get('x-archive-user') ?? 'unknown',
    ...parsed.data,
  };

  try {
    const dir = path.join(process.cwd(), 'data');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'enquiries.jsonl'), JSON.stringify(record) + '\n');
  } catch (e) {
    console.error('[enquiry] failed to persist', e);
    return NextResponse.json({ ok: false, message: 'COULD NOT RECORD' }, { status: 500 });
  }

  console.log('[enquiry]', JSON.stringify(record));
  return NextResponse.json({
    ok: true,
    message: 'CHECKED OUT · WE WILL BE IN TOUCH WITHIN ONE BUSINESS DAY',
  });
}
