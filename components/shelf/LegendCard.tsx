'use client';

import React, { useEffect, useRef, useState } from 'react';
import { TechniqueGlyph, TECHNIQUE_LABELS } from '@/lib/glyphs';

/* The "How to read the shelf" legend as an archival artefact:
   a folded card whose rows stream in like typed ink; click to unroll
   a full field-guide scroll (glyph glossary + keys), also streamed. */

const ROWS: [string, string][] = [
  ['Band', 'domain — one accent colour per domain'],
  ['Glyphs', 'techniques used (up to three, embossed)'],
  ['Thickness', 'complexity, rated 1–5'],
  ['Foil bands', 'headline impact tier'],
  ['Material', 'kind of system — hardcover, binder, dossier, notebook, boxed set'],
  ['Red dot', 'engagement in progress'],
];

const KEYS: [string, string][] = [
  ['← →', 'browse the shelf'],
  ['Enter', 'open the focused volume'],
  ['/', 'search the archive'],
  ['L', 'ask the librarian'],
  ['Esc', 'clear / step back'],
];

const GLYPHS = Object.entries(TECHNIQUE_LABELS);

function useTypewriter(text: string, active: boolean, cps = 42) {
  const [count, setCount] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setCount(text.length);
      return;
    }
    let i = 0;
    const iv = setInterval(() => {
      i += 1;
      setCount(i);
      if (i >= text.length) clearInterval(iv);
    }, Math.max(10, 1000 / cps));
    return () => clearInterval(iv);
  }, [active, text]);
  return { shown: text.slice(0, count), done: count >= text.length };
}

function StreamTerm({ term, active }: { term: string; active: boolean }) {
  const { shown, done } = useTypewriter(term.toUpperCase(), active);
  return (
    <dt>
      {shown}
      {!done && active && <i className="caret" aria-hidden="true" />}
    </dt>
  );
}

function StreamLine({
  text,
  active,
  className,
  as: Tag = 'span',
  cps,
}: {
  text: string;
  active: boolean;
  className?: string;
  as?: 'span' | 'h3' | 'h4' | 'p';
  cps?: number;
}) {
  const { shown, done } = useTypewriter(text, active, cps);
  return (
    <Tag className={className}>
      {shown}
      {!done && active && <i className="caret" aria-hidden="true" />}
    </Tag>
  );
}

export default function LegendCard() {
  const [lit, setLit] = useState(0); // rows revealed on the folded card
  const [open, setOpen] = useState(false);
  const [hintUp, setHintUp] = useState(false);

  // startup: the card writes itself onto the shelf
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setLit(ROWS.length);
      setHintUp(true);
      return;
    }
    const iv = setInterval(() => {
      setLit((n) => {
        if (n >= ROWS.length) {
          clearInterval(iv);
          setTimeout(() => setHintUp(true), 400);
          return n;
        }
        return n + 1;
      });
    }, 340);
    return () => clearInterval(iv);
  }, []);

  // scroll overlay: esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <aside
        className={`legend-card legend-live${hintUp ? ' hint-up' : ''}`}
        aria-label="How to read the shelf — click to unroll the full guide"
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <h4>
          <StreamLine text="How to read the shelf" active cps={30} />
        </h4>
        <dl>
          {ROWS.map(([term, desc], i) => (
            <React.Fragment key={term}>
              <StreamTerm term={term} active={i < lit} />
              <dd style={{ opacity: i < lit ? 1 : 0, transition: 'opacity 400ms ease 150ms' }}>
                {desc}
              </dd>
            </React.Fragment>
          ))}
        </dl>
        <div className="unfold-hint">click to unroll the full guide ↗</div>
      </aside>

      {open && <LegendScroll onClose={() => setOpen(false)} />}
    </>
  );
}

function LegendScroll({ onClose }: { onClose: () => void }) {
  const total = 4 + ROWS.length + GLYPHS.length + KEYS.length;
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setStep(total);
      return;
    }
    const iv = setInterval(() => {
      setStep((s) => {
        if (s >= total) {
          clearInterval(iv);
          return s;
        }
        return s + 1;
      });
    }, 160);
    return () => clearInterval(iv);
  }, [total]);

  // reveal schedule (explicit, pure):
  const titleAt = 0;
  const subAt = 1;
  const rowAt = (i: number) => 2 + i;
  const glyphHeadAt = 2 + ROWS.length;
  const glyphAt = (i: number) => 3 + ROWS.length + i;
  const keyHeadAt = 3 + ROWS.length + GLYPHS.length;
  const keyAt = (i: number) => 4 + ROWS.length + GLYPHS.length + i;

  return (
    <div className="scroll-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="scroll-panel" role="dialog" aria-label="How to read the shelf">
        <button className="overlay-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
        <div className="scroll-crest">
          <StreamLine text="HOW TO READ THE SHELF" active={step >= titleAt} as="h3" cps={26} />
          <p className="scroll-sub">
            <StreamLine text="a field guide to the collection" active={step >= subAt} cps={34} />
          </p>
        </div>

        <dl className="scroll-rows">
          {ROWS.map(([term, desc], i) => (
            <div className={`scroll-row${step >= rowAt(i) ? ' on' : ''}`} key={term}>
              <StreamTerm term={term} active={step >= rowAt(i)} />
              <dd>{desc}</dd>
            </div>
          ))}
        </dl>

        <h4 className="scroll-h4">
          <StreamLine text="THE TECHNIQUE GLYPHS" active={step >= glyphHeadAt} cps={30} />
        </h4>
        <div className="glyph-grid">
          {GLYPHS.map(([id, label], i) => (
            <div className={`glyph-cell${step >= glyphAt(i) ? ' on' : ''}`} key={id}>
              <TechniqueGlyph id={id} size={19} />
              <span>{label}</span>
            </div>
          ))}
        </div>

        <h4 className="scroll-h4">
          <StreamLine text="AT THE DESK" active={step >= keyHeadAt} cps={30} />
        </h4>
        <dl className="scroll-rows keys">
          {KEYS.map(([k, v], i) => (
            <div className={`scroll-row${step >= keyAt(i) ? ' on' : ''}`} key={k}>
              <dt>
                <kbd>{k}</kbd>
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <p className="scroll-foot">The archive remembers what you read — bookmarks grow with depth.</p>
      </div>
    </div>
  );
}
