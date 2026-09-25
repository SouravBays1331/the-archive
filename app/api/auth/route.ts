import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { createSessionToken, SESSION_COOKIE, Tier } from '@/lib/session';

// ARCHIVE_USERS format: "username:bcryptHash[,tier]|username2:bcryptHash2"
// dotenv expands `$` in .env files, so hashes are stored with `$` encoded as `~`
// (npm run hash prints the ready-to-paste encoded form).
function parseUsers(): Record<string, { hash: string; tier: Tier }> {
  const raw = process.env.ARCHIVE_USERS ?? '';
  const out: Record<string, { hash: string; tier: Tier }> = {};
  for (const entry of raw.split('|')) {
    const idx = entry.indexOf(':');
    if (idx <= 0) continue;
    const name = entry.slice(0, idx).trim();
    const rest = entry.slice(idx + 1).trim();
    const [hashEnc, tier] = rest.split(',');
    if (!hashEnc) continue;
    out[name.toLowerCase()] = {
      hash: hashEnc.trim().replace(/~/g, '$'),
      tier: tier === 'partner' ? 'partner' : 'guest',
    };
  }
  return out;
}

// Timing-equalising dummy hash for unknown usernames.
const DUMMY_HASH = '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7ZBpEbF1uU6MjCfIf9ENmTCjoNQO1lO';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map<string, { count: number; resetAt: number }>();

function attemptKey(req: NextRequest, username: string): string[] {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'local';
  return [`${ip}|${username.toLowerCase()}`, `${ip}|*`];
}

function isLocked(keys: string[]): boolean {
  const now = Date.now();
  return keys.some((k) => {
    const a = attempts.get(k);
    return !!a && a.count >= MAX_ATTEMPTS && now < a.resetAt;
  });
}

function recordFailure(keys: string[]) {
  const now = Date.now();
  for (const k of keys) {
    const a = attempts.get(k);
    if (!a || now >= a.resetAt) attempts.set(k, { count: 1, resetAt: now + WINDOW_MS });
    else a.count += 1;
  }
}

function clearAttempts(keys: string[]) {
  for (const k of keys) attempts.delete(k);
}

export async function POST(req: NextRequest) {
  let body: { username?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'ACCESS NOT RECOGNISED' }, { status: 401 });
  }
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const keys = attemptKey(req, username);

  if (isLocked(keys)) {
    return NextResponse.json({ message: 'TRY AGAIN LATER' }, { status: 429 });
  }

  const users = parseUsers();
  const user = users[username.toLowerCase()];
  const ok = user
    ? await bcrypt.compare(password, user.hash)
    : await bcrypt.compare(password, DUMMY_HASH);

  if (!user || !ok) {
    recordFailure(keys);
    return NextResponse.json({ message: 'ACCESS NOT RECOGNISED' }, { status: 401 });
  }

  clearAttempts(keys);
  const tier: Tier = user.tier;
  const token = await createSessionToken({ sub: username, tier });
  const secure = process.env.NODE_ENV === 'production' && process.env.COOKIE_INSECURE !== '1';

  const res = NextResponse.json({ ok: true, tier });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    // no maxAge → browser-session cookie: closing the browser ends the session
    // and the gate is required again on reopen.
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return res;
}
