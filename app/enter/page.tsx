import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifySessionToken, SESSION_COOKIE } from '@/lib/session';
import EnterClient from './EnterClient';

export const dynamic = 'force-dynamic';

export default async function EnterPage() {
  // Returning visitor with a valid session skips the gate (spec §07).
  const token = cookies().get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (session) redirect('/');

  return <EnterClient />;
}
