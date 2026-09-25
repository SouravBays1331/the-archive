import { SignJWT, jwtVerify } from 'jose';

export type Tier = 'guest' | 'partner';
export interface SessionClaims {
  sub: string;
  tier: Tier;
}

export const SESSION_COOKIE = 'archive_session';
export const SESSION_MAX_AGE = 7 * 24 * 60 * 60; // 7 days, seconds

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 24) {
    throw new Error('AUTH_SECRET is missing or too short (need >= 24 chars)');
  }
  return new TextEncoder().encode(s);
}

export async function createSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ tier: claims.tier })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(secret());
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ['HS256'] });
    if (!payload.sub) return null;
    return { sub: payload.sub, tier: (payload.tier as Tier) ?? 'guest' };
  } catch {
    return null;
  }
}
