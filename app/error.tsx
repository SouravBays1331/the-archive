'use client';

import React, { useEffect } from 'react';

// Archive-styled error boundary (spec principle: spectacle never blocks substance).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[archive] render error:', error);
  }, [error]);

  return (
    <main
      className="gate"
      style={{ position: 'fixed', inset: 0, zIndex: 300 }}
      role="alert"
    >
      <div className="gate-beam" aria-hidden="true" />
      <div className="gate-inner">
        <div className="gate-crest">
          <div className="wordmark">THE ARCHIVE</div>
          <div className="tagline">A page slipped from the shelf.</div>
        </div>
        <div className="gate-panel" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-mid)', fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
            Something came loose while opening this volume. The collection itself is
            unharmed — re-shelve and try again.
          </p>
          {error.digest && (
            <p className="mono" style={{ marginBottom: 18, color: 'var(--text-dim)' }}>
              ref: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="gate-key" style={{ width: 'auto', padding: '12px 22px' }} onClick={reset}>
              Try again
            </button>
            <button
              className="gate-key"
              style={{ width: 'auto', padding: '12px 22px', background: 'var(--surface)', color: 'var(--text-hi)', border: '1px solid var(--line)', boxShadow: 'none' }}
              onClick={() => {
                window.location.href = '/';
              }}
            >
              Back to the shelf
            </button>
          </div>
        </div>
      </div>
      <footer className="gate-foot mono">Bayshore · Data Science &amp; AI · Private collection</footer>
    </main>
  );
}
