'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { track } from '@/lib/analytics';

interface Rec {
  slug: string;
  reason: string;
}
interface Turn {
  who: 'you' | 'librarian';
  text: string;
  recs?: Rec[];
}

const STARTERS = [
  'Show me your agent work',
  'What have you built for financial services?',
  'Which projects automated manual analysis?',
];

export default function LibrarianPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [turns, busy]);

  async function ask(q: string) {
    const query = q.trim();
    if (!query || busy) return;
    setInput('');
    setTurns((t) => [...t, { who: 'you', text: query }]);
    setBusy(true);
    track('librarian_query', { length: query.length, recs: [] });
    try {
      const res = await fetch('/api/librarian', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setTurns((t) => [
        ...t,
        {
          who: 'librarian',
          text: data.message ?? 'The librarian is unavailable just now — please browse the shelf.',
          recs: Array.isArray(data.recommendations) ? data.recommendations : [],
        },
      ]);
    } catch {
      setTurns((t) => [
        ...t,
        { who: 'librarian', text: 'The librarian is unavailable just now — please browse the shelf.' },
      ]);
    } finally {
      setBusy(false);
    }
  }

  function openRec(slug: string) {
    try {
      window.sessionStorage.setItem('archive.openSource', 'librarian');
    } catch {}
    router.push(`/book/${slug}`);
  }

  return (
    <aside className="librarian-panel" aria-label="Ask the librarian">
      <div className="librarian-head">
        <span className="mono" style={{ color: 'var(--text-hi)' }}>
          ◍ The librarian
        </span>
        <button className="rm" onClick={onClose} aria-label="Close librarian" style={{ color: 'var(--text-mid)' }}>
          ✕
        </button>
      </div>

      <div className="librarian-log" ref={logRef}>
        {turns.length === 0 && (
          <>
            <div className="lib-msg">
              Welcome. Describe the problem on your desk — I&apos;ll pull the volumes that match.
            </div>
            <div className="librarian-starters">
              {STARTERS.map((s) => (
                <button key={s} onClick={() => ask(s)}>
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
        {turns.map((t, i) => (
          <div key={i} className={t.who === 'you' ? 'lib-msg you' : 'lib-msg'}>
            {t.text}
            {t.recs?.map((r) => (
              <button className="lib-chip" key={r.slug} onClick={() => openRec(r.slug)}>
                <span className="cn">{r.slug.toUpperCase()}</span>
                <span className="rs">{r.reason}</span>
              </button>
            ))}
          </div>
        ))}
        {busy && <div className="lib-msg">The librarian is thinking…</div>}
      </div>

      <form
        className="librarian-form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe a problem…"
          aria-label="Ask the librarian"
        />
        <button type="submit" disabled={busy}>
          Ask
        </button>
      </form>
      <p className="lib-notice">Conversations are logged (with this notice) for quality review.</p>
    </aside>
  );
}
