'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TechniqueGlyph, TECHNIQUE_LABELS } from '@/lib/glyphs';
import { accentFor, DOMAIN_LABEL } from '@/lib/tokens';
import { rngFor } from '@/lib/seed';
import { useArchive } from '@/lib/store';
import { track } from '@/lib/analytics';
import LibrarianPanel from './LibrarianPanel';

export interface ShelfVolume {
  slug: string;
  codename: string;
  objectType: 'hardcover' | 'binder' | 'dossier' | 'notebook' | 'boxed';
  domain: string;
  sectorTag: string;
  year: number;
  status: 'delivered' | 'in-progress';
  complexity: number;
  impactTier: number;
  techniques: string[];
  hook: string;
}

type Lens = 'industry' | 'capability' | 'impact' | 'newest';
const LENSES: { id: Lens; label: string }[] = [
  { id: 'industry', label: 'Industry' },
  { id: 'capability', label: 'Capability' },
  { id: 'impact', label: 'Impact' },
  { id: 'newest', label: 'Newest' },
];

const BASE_HEIGHT: Record<ShelfVolume['objectType'], number> = {
  hardcover: 300,
  binder: 285,
  dossier: 272,
  notebook: 240,
  boxed: 312,
};

function spineWidth(v: ShelfVolume): number {
  const w = 32 + (v.complexity - 1) * 10;
  return v.objectType === 'boxed' ? Math.round(w * 1.6) : w;
}
function spineHeight(v: ShelfVolume): number {
  const rng = rngFor(v.slug);
  return Math.round(BASE_HEIGHT[v.objectType] * 1.22 * (1 + (rng() * 0.06 - 0.03)));
}

interface Group {
  label: string | null;
  items: ShelfVolume[];
}

export default function ShelfWall({
  volumes,
  initialLens,
  initialQuery,
}: {
  volumes: ShelfVolume[];
  initialLens: Lens;
  initialQuery: string;
}) {
  const router = useRouter();
  const { readingList, toggleReadingList, visited } = useArchive();
  const [lens, setLens] = useState<Lens>(initialLens);
  const [query, setQuery] = useState(initialQuery);
  const [librarianOpen, setLibrarianOpen] = useState(false);
  const [shelfIntro, setShelfIntro] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const spineRefs = useRef(new Map<string, HTMLButtonElement>());
  const prevRects = useRef(new Map<string, DOMRect>());
  const firstRender = useRef(true);

  useEffect(() => {
    try {
      if (!window.sessionStorage.getItem('archive.lit')) {
        setShelfIntro(true);
        window.sessionStorage.setItem('archive.lit', '1');
        // release the intro class once played so it never fights hover transforms
        setTimeout(() => setShelfIntro(false), 1900);
      }
    } catch {}
  }, []);

  // ---- search matching -------------------------------------------------
  const terms = useMemo(
    () =>
      query
        .toLowerCase()
        .split(/\s+/)
        .filter((t) => t.length > 0),
    [query],
  );
  function matches(v: ShelfVolume): boolean {
    if (terms.length === 0) return true;
    const hay = `${v.codename} ${v.hook} ${v.domain} ${v.sectorTag} ${v.techniques.join(' ')} ${v.objectType}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  }

  // ---- lens grouping ---------------------------------------------------
  const groups: Group[] = useMemo(() => {
    const matched = volumes.filter(matches);
    if (lens === 'newest') {
      return [
        {
          label: null,
          items: [...matched].sort(
            (a, b) => b.year - a.year || a.codename.localeCompare(b.codename),
          ),
        },
      ];
    }
    const keyOf = (v: ShelfVolume): string =>
      lens === 'industry' ? v.sectorTag : lens === 'capability' ? v.techniques[0] : String(v.impactTier);
    const map = new Map<string, ShelfVolume[]>();
    for (const v of matched) {
      const k = keyOf(v);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(v);
    }
    const keys = [...map.keys()].sort((a, b) => {
      if (lens === 'impact') return Number(b) - Number(a);
      if (lens === 'capability') {
        const order = ['agents', 'retrieval', 'simulation', 'forecasting', 'signal', 'language', 'vision', 'optimisation'];
        return order.indexOf(a) - order.indexOf(b);
      }
      return a.localeCompare(b);
    });
    return keys.map((k) => ({
      label:
        lens === 'industry'
          ? k
          : lens === 'capability'
            ? (TECHNIQUE_LABELS[k] ?? k)
            : `Impact · ${'▮'.repeat(Number(k))}`,
      items: map.get(k)!.sort((a, b) => b.year - a.year || a.codename.localeCompare(b.codename)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumes, lens, terms.join(' ')]);

  const matchCount = groups.reduce((n, g) => n + g.items.length, 0);

  // ---- FLIP re-shelving ------------------------------------------------
  useLayoutEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      for (const [slug, el] of spineRefs.current) prevRects.current.set(slug, el.getBoundingClientRect());
      return;
    }
    for (const [slug, el] of spineRefs.current) {
      const prev = prevRects.current.get(slug);
      const now = el.getBoundingClientRect();
      if (prev) {
        const dx = prev.left - now.left;
        const dy = prev.top - now.top;
        if (dx || dy) {
          el.style.transition = 'none';
          el.style.transform = `translate(${dx}px, ${dy}px)`;
        }
      }
      prevRects.current.set(slug, now);
    }
    // force reflow, then play
    document.body.offsetHeight;
    for (const [, el] of spineRefs.current) {
      if (el.style.transform) {
        el.style.transition = 'transform 700ms cubic-bezier(0.65, 0, 0.35, 1)';
        el.style.transform = '';
      }
    }
  }, [groups]);

  // ---- interactions ----------------------------------------------------
  const changeLens = useCallback(
    (l: Lens) => {
      setLens(l);
      track('lens_change', { lens: l });
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('lens', l);
        window.history.replaceState(null, '', url.toString());
      } catch {}
    },
    [],
  );

  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEnter = useCallback((slug: string) => {
    hoverTimer.current = setTimeout(() => track('volume_hover', { slug, dwell_ms: 800 }), 800);
  }, []);
  const onLeave = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
  }, []);

  // opening a volume: the room leans toward the visitor, then hands off
  const navigating = useRef(false);
  const openVolume = useCallback(
    (slug: string) => {
      if (navigating.current) return;
      navigating.current = true;
      let source = 'shelf';
      try {
        source =
          window.sessionStorage.getItem('archive.openSource') ??
          (terms.length ? 'search' : 'shelf');
        window.sessionStorage.removeItem('archive.openSource');
      } catch {}
      track('volume_open', { slug, source });
      const reduced =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        router.push(`/book/${slug}`);
        return;
      }
      document.body.classList.add('leave-room');
      setTimeout(() => router.push(`/book/${slug}`), 380);
    },
    [router, terms.length],
  );

  // idle invitation: every ~9s an unread volume slides out and back
  const visitedRef = useRef(visited);
  visitedRef.current = visited;
  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const iv = setInterval(() => {
      if (document.hidden || terms.length > 0) return;
      const unread = volumes.filter((v) => !visitedRef.current[v.slug]);
      if (unread.length === 0) return;
      const pick = unread[Math.floor(Math.random() * unread.length)];
      const el = spineRefs.current.get(pick.slug);
      if (!el || el.matches(':hover')) return;
      el.classList.add('nudge');
      setTimeout(() => el.classList.remove('nudge'), 1000);
    }, 9000);
    return () => clearInterval(iv);
  }, [volumes, terms.length]);

  // keyboard: / focuses search; L opens librarian; arrows rove; Esc clears
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      const typing = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT';
      if (e.key === '/' && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === 'Escape') {
        setQuery('');
        setLibrarianOpen(false);
        (document.activeElement as HTMLElement)?.blur?.();
        return;
      }
      if ((e.key === 'l' || e.key === 'L') && !typing) {
        setLibrarianOpen((v) => !v);
        return;
      }
      if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !typing) {
        const els = [...spineRefs.current.values()].filter((el) => el.offsetParent !== null);
        const idx = els.indexOf(document.activeElement as HTMLButtonElement);
        if (idx >= 0) {
          e.preventDefault();
          const next = els[idx + (e.key === 'ArrowRight' ? 1 : -1)];
          next?.focus();
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function flyToTray(e: React.MouseEvent, v: ShelfVolume) {
    const start = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const fly = document.createElement('div');
    fly.className = 'fly-spine';
    fly.style.left = `${start.left}px`;
    fly.style.top = `${start.top}px`;
    fly.style.height = `${Math.min(start.height, 60)}px`;
    fly.style.setProperty('--fly-acc', accentFor(v.domain));
    const tray = document.querySelector('.tray-cart')?.getBoundingClientRect();
    if (tray) {
      fly.style.setProperty('--fx', `${tray.left - start.left}px`);
      fly.style.setProperty('--fy', `${tray.top - start.top}px`);
    } else {
      fly.style.setProperty('--fx', '0px');
      fly.style.setProperty('--fy', '120px');
    }
    document.body.appendChild(fly);
    setTimeout(() => fly.remove(), 750);
  }

  return (
    <div className={`room${shelfIntro ? ' shelf-intro' : ''}`}>
      <header className="room-topbar">
        <div className="room-brand">
          <b>THE ARCHIVE</b>
        </div>
        <div className="searchbox">
          <span className="sicon" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="10.5" cy="10.5" r="5.5" />
              <path d="m14.8 14.8 5 5" />
            </svg>
          </span>
          <input
            ref={searchRef}
            type="search"
            placeholder="Search the archive…"
            aria-label="Search the archive"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && matchCount > 0) {
                openVolume(groups[0].items[0].slug);
              }
            }}
          />
          {terms.length > 0 && (
            <span className="searchcount" aria-live="polite">
              {matchCount} volume{matchCount === 1 ? '' : 's'} found
            </span>
          )}
        </div>
        <nav className="lensbar" aria-label="Arrange by">
          <span className="lbl mono">Arrange by</span>
          {LENSES.map((l) => (
            <button
              key={l.id}
              className={`lensbtn${lens === l.id ? ' on' : ''}`}
              onClick={() => changeLens(l.id)}
              aria-pressed={lens === l.id}
            >
              {l.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="wall" aria-label="The shelf">
        <div className="tier">
          {(() => {
            let n = 0;
            return groups.map((g, gi) => (
            <React.Fragment key={g.label ?? 'all'}>
              {gi > 0 && g.label && (
                <div className="bookend" aria-hidden="true">
                  <span>{g.label}</span>
                </div>
              )}
              {g.items.map((v) => {
                const depth = visited[v.slug] ?? 0;
                const si = n++;
                return (
                  <button
                    key={v.slug}
                    ref={(el) => {
                      if (el) spineRefs.current.set(v.slug, el);
                      else spineRefs.current.delete(v.slug);
                    }}
                    className={`spine type-${v.objectType}${terms.length && !matches(v) ? ' dim' : ''}`}
                    style={{
                      ['--w' as string]: `${spineWidth(v)}px`,
                      ['--h' as string]: `${spineHeight(v)}px`,
                      ['--spine-acc' as string]: accentFor(v.domain),
                      ['--si' as string]: si,
                    }}
                    aria-label={`${v.codename} — ${v.sectorTag} — ${v.hook}`}
                    onClick={() => openVolume(v.slug)}
                    onMouseEnter={() => onEnter(v.slug)}
                    onMouseLeave={onLeave}
                  >
                    <span className="ribbon">
                      {readingList.includes(v.slug) ? '✓ In reading list' : v.hook}
                    </span>
                    <span className="spine-band" />
                    {v.status === 'in-progress' && <i className="status-dot" title="In progress" />}
                    <span className="spine-glyphs">
                      {v.techniques.slice(0, 3).map((t) => (
                        <TechniqueGlyph key={t} id={t} size={15} />
                      ))}
                    </span>
                    <span className="spine-name">{v.codename}</span>
                    <span className="spine-foils" aria-hidden="true">
                      {Array.from({ length: v.impactTier }).map((_, i) => (
                        <i key={i} />
                      ))}
                    </span>
                    <span className="spine-year">{v.year}</span>
                    {v.objectType === 'dossier' && <i className="seal" aria-hidden="true" />}
                    {v.objectType === 'notebook' && <i className="elastic" aria-hidden="true" />}
                    <i className="spine-hinge" aria-hidden="true" />
                    {depth > 0 && (
                      <i
                        className="visited-bookmark"
                        style={{ height: Math.round(8 + depth * 22) }}
                        title={`Read ${Math.round(depth * 100)}%`}
                      />
                    )}
                  </button>
                );
              })}
            </React.Fragment>
            ));
          })()}
          <aside className="legend-card" aria-label="How to read the shelf">
            <h4>How to read the shelf</h4>
            <dl>
              <dt>Band</dt>
              <dd>
                <span className="swatch" style={{ background: 'var(--acc-operations)' }} />domain
              </dd>
              <dt>Glyphs</dt>
              <dd>techniques used</dd>
              <dt>Thickness</dt>
              <dd>complexity 1–5</dd>
              <dt>Foil bands</dt>
              <dd>headline impact</dd>
              <dt>Material</dt>
              <dd>kind of system</dd>
              <dt>Red dot</dt>
              <dd>in progress</dd>
            </dl>
          </aside>
          <div className="plank" aria-hidden="true" />
        </div>
      </main>

      <footer className="room-foot">
        <span className="hint mono">
          <kbd>←</kbd> <kbd>→</kbd> browse · <kbd>Enter</kbd> open · <kbd>/</kbd> search ·{' '}
          <kbd>L</kbd> librarian
        </span>
        <span className="mono">Bayshore · Data Science &amp; AI · {volumes.length} volumes</span>
      </footer>

      <button className="librarian-bell" onClick={() => setLibrarianOpen((v) => !v)} aria-expanded={librarianOpen}>
        <span aria-hidden="true">◍</span> Ask the librarian
      </button>
      {librarianOpen && <LibrarianPanel onClose={() => setLibrarianOpen(false)} />}
    </div>
  );
}
