import { SignJWT, jwtVerify } from 'jose';

export type Tier = 'guest' | 'partner';
export interface SessionClaims {
  sub: string;
  tier: Tier;
  sid: string;
}

export const SESSION_COOKIE = 'archive_session';
// Token validity ceiling. The cookie itself is a *browser-session cookie* (no maxAge),
// so closing the browser ends the session and the gate is shown again (user requirement,
// overriding the spec's 7-day persistent session).
export const SESSION_TTL_HOURS = 12;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) {
    throw new Error('AUTH_SECRET is missing or too short (need >= 24 chars)');
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ tier: claims.tier, sid: claims.sid })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_HOURS}h`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      tier: (payload.tier as Tier) ?? 'guest',
      sid: (payload.sid as string) ?? '',
    };
  } catch {
    return null;
  }
}
