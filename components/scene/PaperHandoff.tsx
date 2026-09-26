'use client';

import React, { useEffect, useRef } from 'react';
import { useScene, openingClock } from '@/lib/scene-store';

// The paper handoff (spec §09): as the 3D opening shot ends, the 3D page fills the
// view and this paper layer reaches full opacity at the exact handoff moment; the
// DOM reader mounts beneath it on the same paper, then the layer fades away.
export default function PaperHandoff() {
  const ref = useRef<HTMLDivElement>(null);
  const phase = useScene((s) => s.phase);
  const handoff = useScene((s) => s.handoff);
  const raf = useRef(0);

  useEffect(() => {
    const tick = () => {
      const el = ref.current;
      if (el) {
        if (openingClock.slug) {
          const target = Math.max(0, Math.min(1, (openingClock.progress - 0.82) / 0.18));
          el.style.opacity = String(target);
        } else if (phase === 'reading' && handoff) {
          el.style.opacity = '1';
        } else {
          el.style.opacity = '0';
        }
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [phase, handoff]);

  // once the reader is mounted under full paper, reveal it
  useEffect(() => {
    if (phase === 'reading' && handoff) {
      const t = setTimeout(() => useScene.getState().setHandoff(false), 450);
      return () => clearTimeout(t);
    }
  }, [phase, handoff]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="paper-handoff"
      style={{ opacity: 0, transition: 'opacity 420ms cubic-bezier(0.65,0,0.35,1)' }}
    />
  );
}
