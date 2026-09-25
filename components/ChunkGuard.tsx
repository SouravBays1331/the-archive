'use client';

import React, { useEffect } from 'react';

// Self-heal stale-chunk crashes: after a rebuild, an open tab can request chunk
// files that no longer exist (ChunkLoadError). Reload once, with a guard against loops.
export default function ChunkGuard() {
  useEffect(() => {
    function isChunkError(text: unknown): boolean {
      return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|error loading dynamically imported module/i.test(
        String(text ?? ''),
      );
    }
    function reloadOnce() {
      try {
        const last = Number(window.sessionStorage.getItem('archive.chunkReload') || 0);
        if (Date.now() - last < 10000) return;
        window.sessionStorage.setItem('archive.chunkReload', String(Date.now()));
        window.location.reload();
      } catch {
        /* storage unavailable — do nothing */
      }
    }
    function onError(e: ErrorEvent) {
      if (isChunkError(e.message)) reloadOnce();
    }
    function onRejection(e: PromiseRejectionEvent) {
      if (isChunkError((e.reason as Error)?.message ?? e.reason)) reloadOnce();
    }
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);
  return null;
}
