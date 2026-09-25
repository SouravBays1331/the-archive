'use client';

// §13 events — fire-and-forget; the endpoint is authenticated and appends to a local JSONL file.
export type ArchiveEvent =
  | 'gate_success'
  | 'lens_change'
  | 'volume_hover'
  | 'volume_open'
  | 'chapter_view'
  | 'edition_switch'
  | 'roi_calculated'
  | 'librarian_query'
  | 'reading_list_add'
  | 'enquiry_submit';

export function track(event: ArchiveEvent, props: Record<string, unknown> = {}): void {
  try {
    const body = JSON.stringify({ event, props, ts: Date.now() });
    fetch('/api/analytics', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* never block the experience on analytics */
  }
}
