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
  const [open, setOpen] = useState(false);

  // scroll overlay: esc closes
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // the furled scroll lying at the end of the tier — click to unroll
  return (
    <>
      <aside
        className="legend-scroll"
        role="button"
        tabIndex={0}
        aria-label="Field guide — click to unroll"
        title="How to read the shelf — click to unroll"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <FurledScrollSvg />
        <div className="ls-tag">
          <StreamLine text="FIELD GUIDE" active cps={22} />
        </div>
      </aside>

      {open && <LegendScroll onClose={() => setOpen(false)} />}
    </>
  );
}

/* Hand-drawn furled scroll: cylinder with an open spiral end, a peeling flap
   and a twine tie — all vector, so it stays crisp and theme-consistent. */
function FurledScrollSvg() {
  return (
    <svg
      width="228"
      height="172"
      viewBox="0 0 240 170"
      aria-hidden="true"
      className="ls-svg"
    >
      <defs>
        <linearGradient id="ls-cyl" x1="0" y1="51" x2="0" y2="119" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#9c7a40" />
          <stop offset="0.08" stopColor="#e8d4a0" />
          <stop offset="0.22" stopColor="#f9efcf" />
          <stop offset="0.45" stopColor="#eedaa4" />
          <stop offset="0.7" stopColor="#c8a968" />
          <stop offset="0.92" stopColor="#7c5c2c" />
          <stop offset="1" stopColor="#6a4c24" />
        </linearGradient>
        <linearGradient id="ls-rope" x1="0" y1="48" x2="0" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#e2c68c" />
          <stop offset="0.5" stopColor="#c4a25e" />
          <stop offset="1" stopColor="#8a6a34" />
        </linearGradient>
        <linearGradient id="ls-flap" x1="0" y1="96" x2="0" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#f2e4bc" />
          <stop offset="1" stopColor="#c9a76a" />
        </linearGradient>
        <filter id="ls-blur4" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
        <filter id="ls-blur7" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      {/* ground shadow */}
      <ellipse cx="126" cy="153" rx="94" ry="9" fill="#000" opacity="0.5" filter="url(#ls-blur7)" />

      <g transform="rotate(-13 120 85)">
        {/* peeling flap under the tube */}
        <path
          d="M 44 98 C 38 118 50 140 84 148 C 74 152 48 150 32 136 C 22 127 24 106 34 97 Z"
          fill="url(#ls-flap)"
          stroke="#a9894e"
          strokeWidth="1.2"
        />
        <path
          d="M 36 104 C 34 116 44 132 68 141"
          fill="none"
          stroke="#8a6a34"
          strokeOpacity="0.4"
          strokeWidth="1"
        />

        {/* cylinder body */}
        <rect x="38" y="51" width="158" height="68" rx="34" fill="url(#ls-cyl)" />
        {/* aged mottling */}
        <ellipse cx="90" cy="98" rx="26" ry="8" fill="#6a4c24" opacity="0.1" filter="url(#ls-blur4)" />
        <ellipse cx="150" cy="66" rx="22" ry="6" fill="#8a6a34" opacity="0.09" filter="url(#ls-blur4)" />
        {/* top light band */}
        <ellipse cx="117" cy="64" rx="72" ry="7" fill="#fff7e0" opacity="0.35" filter="url(#ls-blur4)" />
        {/* bottom contact shade */}
        <ellipse cx="117" cy="112" rx="76" ry="7" fill="#4a3412" opacity="0.22" filter="url(#ls-blur4)" />

        {/* left rolled cap */}
        <ellipse cx="42" cy="85" rx="12" ry="33" fill="#7a5c30" />
        <ellipse cx="43.5" cy="85" rx="8.5" ry="26" fill="#ead9ae" />
        <ellipse cx="45" cy="85" rx="4.5" ry="14" fill="#c9ab6e" />

        {/* open spiral end (right) */}
        <ellipse cx="193" cy="85" rx="14" ry="34" fill="#6b512a" />
        <ellipse cx="191.5" cy="85" rx="10.5" ry="27.5" fill="#ecd9ac" />
        <ellipse cx="190.5" cy="85" rx="7" ry="19.5" fill="#c9ab6e" />
        <ellipse cx="190" cy="85.5" rx="3.6" ry="11" fill="#3f2c12" />

        {/* twine bands + knot */}
        <g>
          <rect x="99" y="49" width="11" height="72" rx="5" fill="url(#ls-rope)" />
          <path d="M 102.5 52 V 118 M 106 52 V 118" stroke="#8a6a34" strokeWidth="1" strokeOpacity="0.7" fill="none" />
          <rect x="124" y="49" width="11" height="72" rx="5" fill="url(#ls-rope)" />
          <path d="M 127.5 52 V 118 M 131 52 V 118" stroke="#8a6a34" strokeWidth="1" strokeOpacity="0.7" fill="none" />
          {/* knot + frayed ends on the front band */}
          <circle cx="104.5" cy="52" r="4.6" fill="url(#ls-rope)" stroke="#8a6a34" strokeWidth="0.8" />
          <circle cx="109" cy="55" r="3.8" fill="url(#ls-rope)" stroke="#8a6a34" strokeWidth="0.8" />
          <path d="M 101 56 C 96 66 98 78 92 86 C 90 78 92 66 97 58 Z" fill="#c4a25e" />
          <path d="M 108 58 C 106 70 108 82 104 92" stroke="#c4a25e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

function LegendScroll({ onClose }: { onClose: () => void }) {
  const total = 4 + ROWS.length + GLYPHS.length + KEYS.length;
  const [step, setStep] = useState(0);
  const [unrolled, setUnrolled] = useState(false);
  const paperRef = useRef<HTMLDivElement>(null);

  // the unroll: parchment grows out of the top rod, the bottom rod rides its edge
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const paper = paperRef.current;
    if (!paper) return;
    if (reduced) {
      setUnrolled(true);
      return;
    }
    const target = paper.scrollHeight;
    paper.style.height = '0px';
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        paper.style.transition = 'height 950ms cubic-bezier(0.65, 0, 0.35, 1)';
        paper.style.height = `${target}px`;
      });
    });
    const t = setTimeout(() => {
      paper.style.transition = '';
      paper.style.height = 'auto';
      setUnrolled(true);
    }, 1020);
    return () => clearTimeout(t);
  }, []);

  // ink streams in once the scroll is open
  useEffect(() => {
    if (!unrolled) return;
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
  }, [unrolled, total]);

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
      <div className="scroll-stage">
        <div className="scroll-rod" aria-hidden="true" />
        <div className="scroll-paper" ref={paperRef} role="dialog" aria-label="How to read the shelf">
          <div className="scroll-inner">
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
        <div className="scroll-rod" aria-hidden="true" />
        <button className="scroll-close" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>
    </div>
  );
}
