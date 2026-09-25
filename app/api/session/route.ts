import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

// Authenticated identity check used by SessionGuard: the client mirrors the
// session's sid in sessionStorage and confirms it matches the cookie here.
export async function GET(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ sid: session.sid, sub: session.sub, tier: session.tier });
}
