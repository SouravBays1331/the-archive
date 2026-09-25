'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useArchive } from '@/lib/store';
import { accentFor } from '@/lib/tokens';
import EnquiryWrapper from '@/components/book/EnquiryWrapper';

interface TrayMeta {
  slug: string;
  codename: string;
  domain: string;
  hook: string;
}

export default function ReadingListTray({ meta }: { meta: TrayMeta[] }) {
  const router = useRouter();
  const { readingList, removeFromReadingList, trayOpen, setTrayOpen } = useArchive();
  const [overlay, setOverlay] = useState(false);
  const items = readingList.map((s) => meta.find((m) => m.slug === s)).filter(Boolean) as TrayMeta[];

  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOverlay(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay]);

  return (
    <>
      <div className="tray">
        {trayOpen && (
          <div className="tray-panel" role="dialog" aria-label="Reading list">
            <h4>Reading list · {items.length}</h4>
            {items.length === 0 && <p className="tray-empty">Nothing collected yet.</p>}
            {items.map((m) => (
              <div className="tray-item" key={m.slug}>
                <i
                  className="swatch"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: accentFor(m.domain),
                  }}
                />
                <button className="tname" onClick={() => router.push(`/book/${m.slug}`)}>
                  {m.codename}
                </button>
                <button
                  className="rm"
                  aria-label={`Remove ${m.codename} from reading list`}
                  onClick={() => removeFromReadingList(m.slug)}
                >
                  ✕
                </button>
              </div>
            ))}
            {items.length > 0 && (
              <button
                className="tray-cta"
                onClick={() => {
                  setTrayOpen(false);
                  setOverlay(true);
                }}
              >
                Enquire about these
              </button>
            )}
          </div>
        )}
        <button
          className="tray-cart"
          aria-expanded={trayOpen}
          aria-label={`Reading list, ${items.length} volumes`}
          onClick={() => setTrayOpen(!trayOpen)}
        >
          <span className="minis" aria-hidden="true">
            {items.slice(-6).map((m) => (
              <i
                key={m.slug}
                style={{
                  height: 14 + ((m.slug.length * 5) % 8),
                  ['--ma' as string]: accentFor(m.domain),
                }}
              />
            ))}
          </span>
          <span className="tray-count">{items.length} IN TRAY</span>
        </button>
      </div>
      {overlay && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setOverlay(false)}>
          <EnquiryWrapper meta={items} onClose={() => setOverlay(false)} />
        </div>
      )}
    </>
  );
}
