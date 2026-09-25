'use client';

import React, { useLayoutEffect } from 'react';

// Per-tab session enforcement (user requirement): the sign-in mints a sid that is
// mirrored into sessionStorage. A newly opened tab has no sid — even with a valid
// cookie — so it is sent back to the gate before the first paint. Same-tab
// reloads keep the sid and pass straight through.
export default function SessionGuard() {
  useLayoutEffect(() => {
    const boot = () => {
      const from = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/enter?from=${from}`);
    };
    let sid: string | null = null;
    try {
      sid = window.sessionStorage.getItem('archive.sid');
    } catch {
      sid = null;
    }
    if (!sid) {
      boot();
      return;
    }
    fetch('/api/session')
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { sid?: string }) => {
        if (d.sid !== sid) boot();
      })
      .catch(() => boot());
  }, []);
  return null;
}
