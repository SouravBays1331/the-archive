'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume } from '@/lib/schema';
import { Edition, useArchive } from '@/lib/store';
import { accentFor } from '@/lib/tokens';
import { track } from '@/lib/analytics';
import { buildChapters, ChapterProps } from '@/components/book/chapters';

interface RelatedMeta {
  slug: string;
  codename: string;
  domain: string;
  hook: string;
}

interface Props {
  volume: Volume;
  related: RelatedMeta[];
  mode: 'spread' | 'flat';
  allSlugs: string[];
}

export default function Reader({ volume, related, mode, allSlugs }: Props) {
  const router = useRouter();
  const { edition, setEdition, editionChosen, readingList, toggleReadingList, markVisited } =
    useArchive();

  const chapters = useMemo(() => buildChapters(volume, edition), [volume, edition]);

  if (mode === 'flat') {
    return (
      <FlatReader
        volume={volume}
        related={related}
        edition={edition}
        setEdition={setEdition}
        chapters={chapters}
      />
    );
  }

  return (
    <SpreadReader
      volume={volume}
      related={related}
      edition={edition}
      setEdition={setEdition}
      editionChosen={editionChosen}
      chapters={chapters}
      inList={readingList.includes(volume.slug)}
      onPlus={() => toggleReadingList(volume.slug)}
      markVisited={markVisited}
      allSlugs={allSlugs}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Spread reader                                                       */
/* ------------------------------------------------------------------ */

function SpreadReader({
  volume,
  related,
  edition,
  setEdition,
  editionChosen,
  chapters,
  inList,
  onPlus,
  markVisited,
  allSlugs,
}: {
  volume: Volume;
  related: RelatedMeta[];
  edition: Edition;
  setEdition: (e: Edition) => void;
  editionChosen: boolean;
  chapters: ReturnType<typeof buildChapters>;
  inList: boolean;
  onPlus: () => void;
  markVisited: (slug: string, depth: number) => void;
  allSlugs: string[];
}) {
  const router = useRouter();
  const accent = accentFor(volume.domain);
  const [idx, setIdx] = useState(0);
  const [anim, setAnim] = useState<null | 'fwd' | 'back'>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintSeen, setHintSeen] = useState(true);
  const lockRef = useRef(false);
  const wheelAcc = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const enterTs = useRef(Date.now());

  // arriving from the shelf: release the room's exit transition
  useEffect(() => {
    document.body.classList.remove('leave-room');
    try {
      setHintSeen(!!window.sessionStorage.getItem('archive.turned'));
    } catch {}
  }, []);

  // deep link: /book/slug#problem lands on that chapter
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace('#', '');
      const i = chapters.findIndex((c) => c.id === hash);
      if (i > 0) setIdx(i);
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [chapters]);

  // reveal stagger after the turn lands (spec §10: elements animate after the turn)
  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 60);
    enterTs.current = Date.now();
    const ch = chapters[idx];
    if (ch) {
      track('chapter_view', { slug: volume.slug, chapter: ch.id, edition, dwell_ms: 0 });
      markVisited(volume.slug, Math.min(1, (idx + 1) / chapters.length));
    }
    return () => clearTimeout(t);
  }, [idx, chapters, edition, volume.slug, markVisited]);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (lockRef.current) return;
      try {
        window.sessionStorage.setItem('archive.turned', '1');
      } catch {}
      setHintSeen(true);
      setIdx((cur) => {
        const next = cur + dir;
        if (next < 0 || next >= chapters.length) return cur;
        lockRef.current = true;
        setAnim(dir === 1 ? 'fwd' : 'back');
        setTimeout(() => {
          setIdx(next);
          setAnim(null);
          lockRef.current = false;
        }, 700);
        return cur;
      });
    },
    [chapters.length],
  );

  const jumpTo = useCallback(
    (i: number) => {
      if (lockRef.current || i === idx) return;
      lockRef.current = true;
      setAnim(i > idx ? 'fwd' : 'back');
      setTimeout(() => {
        setIdx(i);
        setAnim(null);
        lockRef.current = false;
      }, 500);
    },
    [idx],
  );

  // in-volume jumps (e.g. ledger → checkout)
  useEffect(() => {
    function onGoto(e: Event) {
      const id = (e as CustomEvent).detail?.id;
      const i = chapters.findIndex((c) => c.id === id);
      if (i >= 0) jumpTo(i);
    }
    window.addEventListener('archive:goto', onGoto);
    return () => window.removeEventListener('archive:goto', onGoto);
  }, [chapters, jumpTo]);

  // keys
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT') return;
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'Home') jumpTo(0);
      else if (e.key === 'End') jumpTo(chapters.length - 1);
      else if (e.key === 'Escape') router.push('/');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, jumpTo, chapters.length, router]);

  // wheel = scrub-lite: accumulate and commit as full turns
  useEffect(() => {
    let decay: ReturnType<typeof setTimeout> | null = null;
    function onWheel(e: WheelEvent) {
      const t = e.target as HTMLElement;
      if (t.closest('.vellum') || t.closest('.librarian-panel') || t.closest('.tray-panel')) return;
      wheelAcc.current += e.deltaY;
      if (decay) clearTimeout(decay);
      decay = setTimeout(() => {
        wheelAcc.current = 0;
      }, 300);
      if (Math.abs(wheelAcc.current) > 110) {
        const dir = wheelAcc.current > 0 ? 1 : -1;
        wheelAcc.current = 0;
        go(dir as 1 | -1);
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => window.removeEventListener('wheel', onWheel);
  }, [go]);

  // clamp when the chapter list shrinks (e.g. tech → exec reflow)
  useEffect(() => {
    setIdx((i) => Math.min(i, chapters.length - 1));
  }, [chapters.length]);

  // touch swipe
  useEffect(() => {
    function onStart(e: TouchEvent) {
      touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    function onEnd(e: TouchEvent) {
      if (!touchStart.current) return;
      const dx = e.changedTouches[0].clientX - touchStart.current.x;
      const dy = e.changedTouches[0].clientY - touchStart.current.y;
      touchStart.current = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 60) return;
      if (Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
      else go(dy < 0 ? 1 : -1);
    }
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchend', onEnd);
    };
  }, [go]);

  const props: ChapterProps = { volume, edition, revealed, related, openVolume: openRelated };
  function openRelated(slug: string) {
    try {
      window.sessionStorage.setItem('archive.openSource', 'related');
    } catch {}
    router.push(`/book/${slug}`);
  }

  const ch = chapters[idx];
  const under = anim === 'fwd' ? chapters[idx + 1] : null;
  const over = anim === 'back' ? chapters[idx - 1] : null;

  return (
    <div className="reader" style={{ ['--ch-acc' as string]: accent }}>
      <div className="read-progress" aria-hidden="true">
        <i style={{ width: `${((idx + 1) / chapters.length) * 100}%` }} />
      </div>
      <header className="reader-chrome">
        <button className="chrome-back" onClick={() => router.push('/')}>
          ← Shelf
        </button>
        <div className="chrome-title" key={ch.id}>
          <b>{volume.codename}</b> · {ch.title}
        </div>
        <div className="chrome-right">
          <nav className="edition-tab" aria-label="Edition">
            <button className={edition === 'exec' ? 'on' : ''} onClick={() => setEdition('exec')}>
              Exec
            </button>
            <button className={edition === 'tech' ? 'on' : ''} onClick={() => setEdition('tech')}>
              Tech
            </button>
          </nav>
          <button
            className={`plus-btn${inList ? ' added' : ''}`}
            onClick={onPlus}
            aria-label={inList ? 'Remove from reading list' : 'Add to reading list'}
            title={inList ? 'In reading list' : 'Add to reading list'}
          >
            {inList ? '✓' : '+'}
          </button>
        </div>
      </header>

      <div className="spread-stage" key={edition}>
        {under && (
          <div className="spread" aria-hidden="true">
            <div className="page left">{under.left?.(props) ?? null}</div>
            <div className="page right">{under.right(props)}</div>
          </div>
        )}
        <div
          className={`spread spread-main${revealed ? ' revealed' : ''}`}
          style={under ? { position: 'absolute', zIndex: 2 } : undefined}
        >
          <div className="page left">
            {ch.left ? ch.left(props) : null}
            {idx > 0 && (
              <button
                className="page-corner left"
                onClick={() => go(-1)}
                aria-label="Previous page"
                tabIndex={anim ? -1 : 0}
              >
                ‹
              </button>
            )}
          </div>
          <div className={`page right${anim === 'fwd' ? ' turning' : ''}`}>
            {ch.right(props)}
            <button
              className="page-corner right"
              onClick={() => go(1)}
              disabled={idx === chapters.length - 1}
              aria-label="Next page"
              tabIndex={anim ? -1 : 0}
            >
              ›
            </button>
          </div>
        </div>
        {over && (
          <div className="spread" style={{ position: 'absolute', inset: 0, zIndex: 7 }} aria-hidden="true">
            <div className="page left">{over.left?.(props) ?? null}</div>
            <div className="page right turning-back">{over.right(props)}</div>
          </div>
        )}
      </div>

      <nav className="ribbon-toc" aria-label="Chapters">
        {chapters.map((c, i) => (
          <button
            key={c.id}
            className={`ribbon${i === idx ? ' on' : ''}`}
            onClick={() => jumpTo(i)}
            style={{ ['--rb' as string]: accent }}
          >
            <span className="rlabel">
              {c.num} · {c.short}
            </span>
            <span className="band" />
          </button>
        ))}
      </nav>

      <div className="page-edges" aria-hidden="false">
        <div
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin={0}
          aria-valuemax={chapters.length - 1}
          aria-valuenow={idx}
          style={{ display: 'contents' }}
        >
          {Array.from({ length: chapters.length }).map((_, i) => (
            <i key={i} style={{ width: `${Math.max(12, 46 - i * 5)}px`, opacity: i <= idx ? 0.8 : 0.3 }} />
          ))}
        </div>
      </div>

      <footer className="reader-foot">
        <span className="mono" style={{ color: 'var(--text-dim)' }}>
          {String(idx + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')} ·{' '}
          {ch.title}
        </span>
        <div className="navbtns">
          <button className="navbtn" onClick={() => go(-1)} disabled={idx === 0 || !!anim}>
            ← Turn
          </button>
          <button
            className="navbtn"
            onClick={() => go(1)}
            disabled={idx === chapters.length - 1 || !!anim}
          >
            Turn →
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {!hintSeen && (
            <span className="mono turn-hint" aria-hidden="true">
              ← → or scroll to turn
            </span>
          )}
          <a
            className="flatlink"
            href={`/book/${volume.slug}?mode=flat#${ch.id}`}
            onClick={(e) => {
              e.preventDefault();
              router.push(`/book/${volume.slug}?mode=flat#${ch.id}`);
            }}
          >
            Read as page
          </a>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Flat reader (spec §17: reduced-motion / no-WebGL / explicit)        */
/* ------------------------------------------------------------------ */

function FlatReader({
  volume,
  related,
  edition,
  setEdition,
  chapters,
}: {
  volume: Volume;
  related: RelatedMeta[];
  edition: Edition;
  setEdition: (e: Edition) => void;
  chapters: ReturnType<typeof buildChapters>;
}) {
  const router = useRouter();
  const accent = accentFor(volume.domain);
  const { markVisited } = useArchive();

  useEffect(() => {
    markVisited(volume.slug, 1);
    track('chapter_view', { slug: volume.slug, chapter: 'flat', edition, dwell_ms: 0 });
  }, [volume.slug, edition, markVisited]);

  return (
    <div className="reader" style={{ ['--ch-acc' as string]: accent }}>
      <header className="reader-chrome">
        <button className="chrome-back" onClick={() => router.push('/')}>
          ← Shelf
        </button>
        <div className="chrome-title">
          <b>{volume.codename}</b> · Flat read
        </div>
        <div className="chrome-right">
          <nav className="edition-tab" aria-label="Edition">
            <button className={edition === 'exec' ? 'on' : ''} onClick={() => setEdition('exec')}>
              Exec
            </button>
            <button className={edition === 'tech' ? 'on' : ''} onClick={() => setEdition('tech')}>
              Tech
            </button>
          </nav>
        </div>
      </header>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        <div className="flat">
          {chapters.map((c) => {
            const props: ChapterProps = {
              volume,
              edition,
              revealed: true,
              related,
              openVolume: (slug: string) => {
                try {
                  window.sessionStorage.setItem('archive.openSource', 'related');
                } catch {}
                router.push(`/book/${slug}`);
              },
            };
            return (
              <section key={c.id} id={c.id} className="flat-chapter">
                {c.left && (
                  <div className="fpaper revealed" style={{ padding: 10, marginBottom: 10 }}>
                    {c.left(props)}
                  </div>
                )}
                <div className="fpaper revealed">{c.right(props)}</div>
              </section>
            );
          })}
          <a className="flatlink" href={`/book/${volume.slug}`} style={{ display: 'block', textAlign: 'center' }}>
            ← Read as volume
          </a>
        </div>
      </div>
    </div>
  );
}
