'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { track } from '@/lib/analytics';

type Phase = 'idle' | 'submitting' | 'error' | 'locked' | 'success';

const MOTES = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 61) % 100}%`,
  delay: `${(i * 1.37) % 9}s`,
  duration: `${11 + ((i * 2.3) % 8)}s`,
  size: 2 + ((i * 7) % 3),
  drift: `${((i * 13) % 9) - 4}vw`,
}));

export default function EnterClient() {
  const router = useRouter();
  const params = useSearchParams();
  const from = params.get('from') || '/';
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (phase === 'submitting' || phase === 'success') return;
    setPhase('submitting');
    setMessage('');
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setPhase('success');
        track('gate_success', { tier: 'guest', returning: false });
        // Fresh session: nothing carries over from a previous visit (user requirement).
        try {
          window.localStorage.removeItem('archive.visited');
          window.localStorage.removeItem('archive.readingList');
          window.sessionStorage.removeItem('archive.edition');
          window.sessionStorage.removeItem('archive.turned');
        } catch {}
        // Success sequence (spec Fig 7.1): beam narrows → panel slides into slot →
        // strip lights sweep → camera eases back → hand off to the shelf.
        timer.current = setTimeout(() => {
          router.replace(from.startsWith('/') ? from : '/');
        }, 1500);
        return;
      }
      const data = await res.json().catch(() => ({ message: 'ACCESS NOT RECOGNISED' }));
      if (res.status === 429) {
        setPhase('locked');
        setMessage(data.message || 'TRY AGAIN LATER');
      } else {
        setPhase('error');
        setMessage(data.message || 'ACCESS NOT RECOGNISED');
        timer.current = setTimeout(() => setPhase('idle'), 1400);
      }
    } catch {
      setPhase('error');
      setMessage('ACCESS NOT RECOGNISED');
      timer.current = setTimeout(() => setPhase('idle'), 1400);
    }
  }

  const gateClass = useMemo(() => {
    switch (phase) {
      case 'submitting':
        return 'gate gate-submitting';
      case 'error':
        return 'gate gate-error';
      case 'locked':
        return 'gate gate-error';
      case 'success':
        return 'gate gate-leaving';
      default:
        return 'gate';
    }
  }, [phase]);

  return (
    <main className={gateClass}>
      <div className="gate-beam" aria-hidden="true" />
      <div className="gate-motes" aria-hidden="true">
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="gate-mote"
            style={{
              left: m.left,
              width: m.size,
              height: m.size,
              animationDelay: m.delay,
              animationDuration: m.duration,
              ['--mx' as string]: m.drift,
            }}
          />
        ))}
      </div>
      <div className="lightsweep" aria-hidden="true" />
      <div className="roomfade" aria-hidden="true" />

      <div className="gate-inner">
        <div className="gate-crest">
          <div className="wordmark">THE ARCHIVE</div>
          <div className="tagline">A library of solved problems.</div>
        </div>

        <form className="gate-panel" onSubmit={submit} aria-label="Archive access">
          <div className="gate-slot-label mono">Present credentials</div>
          <label className="visually-hidden" htmlFor="gate-user">
            Username
          </label>
          <input
            id="gate-user"
            className="gate-field"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={phase === 'submitting' || phase === 'success'}
            autoFocus
          />
          <label className="visually-hidden" htmlFor="gate-pass">
            Password
          </label>
          <input
            id="gate-pass"
            className="gate-field"
            type="password"
            autoComplete="current-password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={phase === 'submitting' || phase === 'success'}
          />
          <button className="gate-key" type="submit" disabled={phase === 'submitting' || phase === 'success'}>
            Enter
          </button>
          <div className={`gate-msg${phase === 'success' ? ' ok' : ''}`} role="alert" aria-live="polite">
            {phase === 'submitting' ? 'VERIFYING…' : message}
          </div>
        </form>
      </div>

      <footer className="gate-foot mono">Bayshore · Data Science &amp; AI · Private collection</footer>
    </main>
  );
}
