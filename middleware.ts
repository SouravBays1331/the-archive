import { NextRequest, NextResponse } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';

// The gate (/enter) and its credential endpoint are the only unauthenticated paths.
// Static chunks under _next/static are excluded from the matcher: they contain no
// project content — every volume is rendered server-side behind this middleware.
const PUBLIC_PATHS = ['/enter', '/api/auth'];

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));

  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  if (isPublic) return res;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) {
    const headers = new Headers(req.headers);
    headers.set('x-archive-user', session.sub);
    const authed = NextResponse.next({ request: { headers } });
    authed.headers.set('X-Robots-Tag', 'noindex, nofollow');
    return authed;
  }

  if (pathname.startsWith('/api/')) {
    return new NextResponse(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json', 'x-robots-tag': 'noindex, nofollow' },
    });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/enter';
  url.search = '';
  url.searchParams.set('from', pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
