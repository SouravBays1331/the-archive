import EnterClient from './EnterClient';

export const dynamic = 'force-dynamic';

// The gate always renders for full page loads; whether a returning same-tab
// visitor skips straight through is decided client-side (sessionStorage holds
// the per-tab session id). This is what makes a newly opened tab demand
// credentials again even while a cookie is still technically alive.
export default function EnterPage() {
  return <EnterClient />;
}
