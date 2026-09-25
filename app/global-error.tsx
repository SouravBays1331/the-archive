'use client';

// Last-resort boundary (must render its own html/body).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b0b0d',
          color: '#ede9e1',
          fontFamily: 'Georgia, serif',
          textAlign: 'center',
        }}
      >
        <div>
          <div style={{ letterSpacing: '0.3em', fontSize: 22, marginBottom: 10 }}>THE ARCHIVE</div>
          <p style={{ color: '#a9a49a', fontFamily: 'system-ui, sans-serif', fontSize: 14, marginBottom: 24 }}>
            The room went dark unexpectedly.{' '}
            {error.digest ? `(ref: ${error.digest})` : ''}
          </p>
          <button
            onClick={reset}
            style={{
              background: '#ffd9a0',
              color: '#241a0d',
              border: 'none',
              borderRadius: 8,
              padding: '12px 26px',
              fontFamily: 'monospace',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Relight the room
          </button>
        </div>
      </body>
    </html>
  );
}
