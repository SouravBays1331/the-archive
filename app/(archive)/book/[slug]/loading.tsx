// Themed route-level transition while a volume is fetched.
export default function Loading() {
  return (
    <div className="reader loading-room" role="status" aria-label="Opening the volume">
      <div className="loading-inner">
        <span className="loading-spine" aria-hidden="true" />
        <span className="mono">Pulling the volume…</span>
      </div>
    </div>
  );
}
