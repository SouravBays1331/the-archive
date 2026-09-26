'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Volume } from '@/lib/schema';
import { Edition, useArchive } from '@/lib/store';
import { accentFor, DOMAIN_LABEL } from '@/lib/tokens';
import { TechniqueGlyph, TECHNIQUE_LABELS } from '@/lib/glyphs';
import { rngFor } from '@/lib/seed';
import { runFormula } from '@/lib/safeEval';
import { track } from '@/lib/analytics';
import CheckoutCard from '@/components/book/CheckoutCard';

export interface RelatedMeta {
  slug: string;
  codename: string;
  domain: string;
  hook: string;
}

export interface ChapterProps {
  volume: Volume;
  edition: Edition;
  revealed: boolean;
  related: RelatedMeta[];
  openVolume: (slug: string) => void;
}

export interface Chapter {
  id: string;
  num: string;
  title: string;
  short: string;
  left?: (p: ChapterProps) => React.ReactNode;
  right: (p: ChapterProps) => React.ReactNode;
}

const OBJECT_LABEL: Record<string, string> = {
  hardcover: 'Hardcover · flagship platform',
  binder: 'Binder · operational system',
  dossier: 'Dossier · sensitive engagement',
  notebook: 'Notebook · prototype',
  boxed: 'Boxed set · multi-phase programme',
};

/* Left pages render as archival plates: labelled frame, filled composition,
   footnote rule — so no spread ever looks half-empty. */
function Plate({
  num,
  name,
  footLeft,
  footRight,
  children,
}: {
  num: string;
  name: string;
  footLeft: string;
  footRight?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="plate">
      <div className="plate-head">
        <span className="pt">Plate {num}</span>
        <span className="pn">{name}</span>
      </div>
      <div className="plate-body">{children}</div>
      <div className="plate-foot">
        <span>{footLeft}</span>
        {footRight && <span className="pfr">{footRight}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 0 · Title page                                                      */
/* ------------------------------------------------------------------ */

function CoverArt({ volume }: { volume: Volume }) {
  const arcs = useMemo(() => {
    const rng = rngFor(volume.slug + ':cover');
    return Array.from({ length: 7 }, () => ({
      cx: 20 + rng() * 60,
      cy: 20 + rng() * 60,
      r: 12 + rng() * 34,
      a0: rng() * 360,
      dash: rng() > 0.6,
      first: false,
    })).map((a, i) => ({ ...a, first: i === 0 }));
  }, [volume.slug]);
  const acc = accentFor(volume.domain);
  return (
    <svg viewBox="0 0 100 120" style={{ width: '100%', height: '100%' }} aria-hidden="true">
      <defs>
        <linearGradient id={`cg-${volume.slug}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2b2b31" />
          <stop offset="1" stopColor="#1b1b20" />
        </linearGradient>
      </defs>
      <rect width="100" height="120" rx="3" fill={`url(#cg-${volume.slug})`} />
      {arcs.map((a, i) => (
        <circle
          key={i}
          cx={a.cx}
          cy={a.cy}
          r={a.r}
          fill="none"
          stroke={a.first ? acc : '#4a4a52'}
          strokeOpacity={a.first ? 0.9 : 0.35}
          strokeWidth={a.first ? 0.8 : 0.4}
          strokeDasharray={a.dash ? '2 2' : undefined}
          transform={`rotate(${a.a0} ${a.cx} ${a.cy})`}
        />
      ))}
      <rect x="6" y="6" width="88" height="5" rx="2" fill={acc} opacity="0.9" />
      {volume.techniques.slice(0, 3).map((t, i) => (
        <g key={t} transform={`translate(${10 + i * 30} 82) scale(0.8)`} color="#b9b4a8">
          <TechniqueGlyph id={t} size={22} />
        </g>
      ))}
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fill="#ede9e1"
        style={{ font: '10px var(--font-serif), Georgia, serif', letterSpacing: '0.3em' }}
      >
        {volume.codename}
      </text>
    </svg>
  );
}

const titleChapter: Chapter = {
  id: 'title',
  num: '0',
  title: 'Title page',
  short: 'Title',
  left: ({ volume }) => (
    <Plate
      num="0"
      name="The cover"
      footLeft="generative composition · seeded by the volume"
      footRight="one accent, one story"
    >
      <div className="tp-left rv" style={{ ['--i' as string]: 0 }}>
        <div className="tp-cover">
          <CoverArt volume={volume} />
        </div>
      </div>
    </Plate>
  ),
  right: ({ volume }) => (
    <div className="tp-right">
      <div className="kicker rv" style={{ ['--i' as string]: 0 }}>
        {DOMAIN_LABEL[volume.domain] ?? volume.domain} · {volume.year} · {OBJECT_LABEL[volume.objectType]}
      </div>
      <h1 className="tp-codename rv" style={{ ['--i' as string]: 1 }}>
        <span className="foil">{volume.codename}</span>
      </h1>
      <p className="tp-hook rv" style={{ ['--i' as string]: 2 }}>
        {volume.hook}
      </p>
      <div className="tp-chips rv" style={{ ['--i' as string]: 3 }}>
        {volume.techniques.map((t) => (
          <span className="chip" key={t}>
            <TechniqueGlyph id={t} size={13} />
            {TECHNIQUE_LABELS[t] ?? t}
          </span>
        ))}
      </div>
      {volume.status === 'in-progress' && (
        <div className="tp-status rv" style={{ ['--i' as string]: 4 }}>
          <i /> In progress — active engagement
        </div>
      )}
      <div className="tp-meta mono rv" style={{ ['--i' as string]: 4 }}>
        <span>Sector: {volume.sectorTag}</span>
      </div>
      <EditionCards />
      <button
        className="open-cta rv"
        style={{ ['--i' as string]: 6 }}
        onClick={() =>
          window.dispatchEvent(new CustomEvent('archive:goto', { detail: { id: 'problem' } }))
        }
      >
        Open the volume ↓
      </button>
    </div>
  ),
};

function EditionCards() {
  const { edition, editionChosen, setEdition } = useArchive();
  if (!editionChosen) {
    return (
      <div className="tp-editions">
        <button
          className={`edition-card${edition === 'exec' ? ' on' : ''}`}
          onClick={() => setEdition('exec')}
        >
          <div className="en">Executive Edition</div>
          <div className="ed">4 min · outcomes, value and return</div>
        </button>
        <button
          className={`edition-card${edition === 'tech' ? ' on' : ''}`}
          onClick={() => setEdition('tech')}
        >
          <div className="en">Technical Edition</div>
          <div className="ed">9 min · architecture, methods and evaluation</div>
        </button>
      </div>
    );
  }
  return (
    <div className="tp-switchline">
      Reading the {edition === 'exec' ? 'Executive' : 'Technical'} Edition ·{' '}
      <button onClick={() => setEdition(edition === 'exec' ? 'tech' : 'exec')}>switch</button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1 · The Problem — generative tangle                                 */
/* ------------------------------------------------------------------ */

function Tangle({ slug, accent, active }: { slug: string; accent: string; active: boolean }) {
  const [tension, setTension] = useState(1); // 1 = loose chaos → 0 = tight knot
  const [scrubbing, setScrubbing] = useState(false);
  useEffect(() => {
    if (!active) return;
    // scrub-driven: while the visitor scrubs the turn away from this chapter,
    // the knot tightens with the page (spec §10: scroll scrubs)
    const onScrub = (e: Event) => {
      const p = Math.max(0, Math.min(1, (e as CustomEvent).detail?.p ?? 0));
      setScrubbing(true);
      setTension(1 - p * 0.85);
    };
    const onEnd = () => setScrubbing(false);
    window.addEventListener('archive:turnscrub', onScrub);
    window.addEventListener('archive:turnscrub-end', onEnd);
    return () => {
      window.removeEventListener('archive:turnscrub', onScrub);
      window.removeEventListener('archive:turnscrub-end', onEnd);
    };
  }, [active]);
  useEffect(() => {
    if (!active || scrubbing) return;
    let raf = 0;
    const t0 = performance.now();
    const from = tension;
    const dur = 900;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setTension(from + (0.15 - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, scrubbing]);

  const paths = useMemo(() => {
    const rng = rngFor(slug + ':tangle');
    return Array.from({ length: 24 }, () => {
      const pts = Array.from({ length: 6 }, (_, i) => ({
        x: 6 + (88 / 5) * i + (rng() - 0.5) * 26,
        y: 8 + rng() * 84,
        tx: 50 + (rng() - 0.5) * 26,
        ty: 50 + (rng() - 0.5) * 34,
      }));
      return { pts, w: 0.5 + rng() * 0.6, o: 0.25 + rng() * 0.45 };
    });
  }, [slug]);

  return (
    <svg viewBox="0 0 100 100" style={{ width: 'min(88%, 420px)', maxHeight: '100%' }} aria-hidden="true">
      {paths.map(({ pts, w, o }, j) => {
        const t = tension;
        const P = pts.map((p) => ({
          x: p.x + (p.tx - p.x) * (1 - t),
          y: p.y + (p.ty - p.y) * (1 - t),
        }));
        let d = `M ${P[0].x.toFixed(1)} ${P[0].y.toFixed(1)}`;
        for (let i = 1; i < P.length; i++) {
          const a = P[i - 1];
          const b = P[i];
          d += ` Q ${a.x.toFixed(1)} ${a.y.toFixed(1)} ${((a.x + b.x) / 2).toFixed(1)} ${((a.y + b.y) / 2).toFixed(1)}`;
        }
        return (
          <path
            key={j}
            d={d}
            fill="none"
            stroke="var(--ink-soft)"
            strokeWidth={w}
            strokeOpacity={o}
            strokeLinecap="round"
          />
        );
      })}
      <path
        d="M 8 78 Q 40 60 52 48 T 92 30"
        fill="none"
        stroke={accent}
        strokeWidth="1.4"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={active ? 0 : 1}
        style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.65,0,0.35,1) 1.35s' }}
      />
    </svg>
  );
}

const problemChapter: Chapter = {
  id: 'problem',
  num: '1',
  title: 'The problem',
  short: 'Problem',
  left: ({ volume, revealed }) => (
    <Plate
      num="1"
      name="The tangle"
      footLeft="generative exhibit · the pain, knotted"
      footRight="one thread lifts out ↗"
    >
      <div className="tangle-wrap">
        <Tangle slug={volume.slug} accent={accentFor(volume.domain)} active={revealed} />
      </div>
    </Plate>
  ),
  right: ({ volume, edition }) => {
    const p = volume.problem;
    const statement = (edition === 'tech' ? p.statementTech : undefined) ?? p.statementExec;
    const words = statement.split(' ');
    return (
      <div>
        <div className="kicker rv" style={{ ['--i' as string]: 0 }}>
          Chapter 1 · The problem
        </div>
        <p className="lede" style={{ fontSize: 'clamp(20px,1.9vw,26px)', lineHeight: 1.35 }}>
          {words.map((w, i) => (
            <span
              key={i}
              className="word rv"
              style={{ ['--i' as string]: i, display: 'inline-block', marginRight: '0.28em' }}
            >
              {w}
            </span>
          ))}
        </p>
        <ol className="pain-list" style={{ marginTop: 26 }}>
          {p.painPoints.map((pp, i) => (
            <li key={i} className="rv" style={{ ['--i' as string]: 10 + i * 2 }}>
              {pp}
            </li>
          ))}
        </ol>
        {edition === 'tech' && p.marginNotes && p.marginNotes.length > 0 && (
          <div style={{ marginTop: 22 }}>
            {p.marginNotes.map((mn, i) => (
              <div
                className="margin-note rv"
                key={i}
                style={{ ['--i' as string]: 16 + i }}
              >
                <svg width="26" height="12" viewBox="0 0 26 12" fill="none" aria-hidden="true">
                  <path
                    d="M1 8 Q 12 2 25 6"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M20 3 L25 6 L20 9"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                {mn}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
};

/* ------------------------------------------------------------------ */
/* 2 · The Approach — the pop-up                                       */
/* ------------------------------------------------------------------ */

function AgentFigure() {
  return (
    <svg className="fig" width="16" height="20" viewBox="0 0 16 20" fill="none" aria-hidden="true">
      <path d="M8 1 L15 9 L8 19 L1 9 Z" stroke="currentColor" strokeWidth="1.2" fill="rgba(255,255,255,0.4)" />
      <path d="M8 1 V 19" stroke="currentColor" strokeWidth="0.7" />
    </svg>
  );
}

function PopUpScene({
  volume,
  edition,
  revealed,
}: {
  volume: Volume;
  edition: Edition;
  revealed: boolean;
}) {
  const stages = volume.approach.stages;
  const n = stages.length;
  const acc = accentFor(volume.domain);
  const [reduced, setReduced] = useState(false);
  const [tour, setTour] = useState(-1);
  const tourTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  // guided tour: on reveal, highlight each stage in order so the hover
  // captions announce themselves; any pointer interaction cancels it.
  useEffect(() => {
    tourTimers.current.forEach(clearTimeout);
    tourTimers.current = [];
    if (!revealed || reduced) {
      setTour(-1);
      return;
    }
    for (let i = 0; i < n; i++) {
      tourTimers.current.push(setTimeout(() => setTour(i), 1400 + i * 850));
    }
    tourTimers.current.push(setTimeout(() => setTour(-1), 1400 + n * 850));
    return () => {
      tourTimers.current.forEach(clearTimeout);
      tourTimers.current = [];
    };
  }, [revealed, reduced, n]);

  return (
    <div
      className={`popup-scene${revealed ? ' revealed' : ' stage-flat'}`}
      onMouseEnter={() => {
        tourTimers.current.forEach(clearTimeout);
        tourTimers.current = [];
        setTour(-1);
      }}
    >
      {/* ghost numeral fills the upper plate — like a classic drawing sheet */}
      <div className="plate-ghost" aria-hidden="true">
        {stages.length}
      </div>
      <div className="fold-line" aria-hidden="true" />
      <svg className="popup-track" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true">
        {stages.slice(0, -1).map((s, i) => {
          const x1 = 15 + (i * 70) / Math.max(1, n - 1) + 5;
          const x2 = 15 + ((i + 1) * 70) / Math.max(1, n - 1) - 5;
          return (
            <g key={s.id}>
              <line x1={x1} y1={4} x2={x2} y2={4} stroke={acc} strokeOpacity="0.45" strokeWidth="0.35" />
              {!reduced && (
                <circle r="1.4" fill={acc}>
                  <animateMotion dur={`${2.6 + (i % 3) * 0.7}s`} repeatCount="indefinite" path={`M ${x1} 4 L ${x2} 4`} />
                </circle>
              )}
            </g>
          );
        })}
      </svg>
      {stages.map((s, i) => {
        const pct = 15 + (i * 70) / Math.max(1, n - 1);
        return (
          <div
            key={s.id}
            className={`popup-stage${tour === i ? ' touring' : ''}`}
            style={{
              left: `calc(${pct}% - 75px)`,
              bottom: `calc(24% + ${(i % 2) * 5}%)`,
              width: 'min(150px, 26%)',
              zIndex: 2,
              ['--i' as string]: i,
            }}
            tabIndex={0}
            aria-label={`${s.label}: ${(edition === 'tech' ? s.captionTech : undefined) ?? s.captionExec}`}
          >
            <span className="snum">{i + 1}</span>
            <span className="slabel">
              {s.agent && <AgentFigure />}
              {s.label}
            </span>
            <span
              className={`stage-caption${i === 0 ? ' cap-left' : ''}${i === n - 1 ? ' cap-right' : ''}`}
            >
              {(edition === 'tech' ? s.captionTech : undefined) ?? s.captionExec}
            </span>
          </div>
        );
      })}
    </div>
  );
}

const approachChapter: Chapter = {
  id: 'approach',
  num: '2',
  title: 'The approach',
  short: 'Approach',
  left: ({ volume, edition, revealed }) => (
    <Plate
      num="2"
      name="The build, stage by stage"
      footLeft="hover or focus any stage for detail"
      footRight="paper tracks carry the flow"
    >
      <PopUpScene volume={volume} edition={edition} revealed={revealed} />
    </Plate>
  ),
  right: ({ volume, edition }) => (
    <div>
      <div className="kicker rv" style={{ ['--i' as string]: 0 }}>
        Chapter 2 · The approach
      </div>
      <h2 className="chapter-title rv" style={{ ['--i' as string]: 1 }}>
        How it works.
      </h2>
      <p className="lede rv" style={{ ['--i' as string]: 2, fontSize: 15.5 }}>
        {volume.approach.summaryExec}
      </p>
      <ol style={{ listStyle: 'none', marginTop: 18 }}>
        {volume.approach.stages.map((s, i) => (
          <li
            key={s.id}
            className="rv"
            style={{
              ['--i' as string]: 3 + i,
              display: 'flex',
              gap: 10,
              padding: '8px 0',
              borderTop: '1px solid var(--rule)',
              fontSize: 13.5,
              lineHeight: 1.5,
            }}
          >
            <span className="serif" style={{ fontSize: 18, color: 'var(--ink-soft)', flex: '0 0 22px' }}>
              {i + 1}
            </span>
            <span>
              <b
                style={{
                  fontFamily: 'var(--font-mono), monospace',
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  display: 'block',
                }}
              >
                {s.label}
              </b>
              {(edition === 'tech' ? s.captionTech : undefined) ?? s.captionExec}
            </span>
          </li>
        ))}
      </ol>
    </div>
  ),
};

/* ------------------------------------------------------------------ */
/* 3 · Under the Hood — the vellum (technical edition)                 */
/* ------------------------------------------------------------------ */

function VellumOverlay({ volume, revealed }: { volume: Volume; revealed: boolean }) {
  const bp = volume.engine?.blueprint ?? [];
  const [pos, setPos] = useState(1); // 1 = covering, 0 = slid away
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ startX: number; startPos: number } | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  function onPointerDown(e: React.PointerEvent) {
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    drag.current = { startX: e.clientX, startPos: pos };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current || !elRef.current) return;
    const dx = e.clientX - drag.current.startX;
    const w = elRef.current.offsetWidth || 1;
    setPos(Math.max(0, Math.min(1, drag.current.startPos - dx / w)));
  }
  function onPointerUp() {
    drag.current = null;
    setDragging(false);
    setPos((p) => (p > 0.75 ? 1 : p > 0.25 ? 0.5 : 0));
  }

  return (
    <div className="vellum-stage">
      {/* flattened business diagram underneath */}
      <svg viewBox="0 0 100 60" style={{ width: '86%', maxHeight: '60%', opacity: 0.55 }} aria-hidden="true">
        {volume.approach.stages.map((s, i) => {
          const x = 10 + (i * 80) / Math.max(1, volume.approach.stages.length - 1);
          return (
            <g key={s.id}>
              <rect x={x - 7} y={22} width={14} height={12} rx="1.5" fill="var(--paper-2)" stroke="var(--rule)" />
              <text x={x} y={40} textAnchor="middle" style={{ font: '3.2px var(--font-mono), monospace', fill: 'var(--ink-soft)' }}>
                {s.label.slice(0, 9)}
              </text>
              {i > 0 && <line x1={x - 9} y1={28} x2={x - 7} y2={28} stroke="var(--rule)" strokeWidth="0.5" />}
            </g>
          );
        })}
      </svg>

      {/* the vellum with blueprint line-work */}
      <div
        ref={elRef}
        className="vellum"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          transform: `translateX(${(1 - pos) * -92}%)`,
          transition: dragging ? 'none' : 'transform 480ms cubic-bezier(0.65,0,0.35,1)',
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {bp.slice(0, -1).map((it, i) => {
            const a = bp[i];
            const b = bp[i + 1];
            return (
              <line
                key={it.id}
                className="bp-edge"
                x1={a.x * 100}
                y1={a.y * 100}
                x2={b.x * 100}
                y2={b.y * 100}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={revealed ? 0 : 1}
                style={{ transition: 'stroke-dashoffset 1200ms ease 300ms' }}
              />
            );
          })}
        </svg>
        {bp.map((it, i) => (
          <div
            key={it.id}
            className="bp-item"
            style={{
              position: 'absolute',
              left: `${it.x * 100}%`,
              top: `${it.y * 100}%`,
              transform: 'translate(-50%,-50%)',
              opacity: revealed ? 1 : 0,
              transition: `opacity 500ms ease ${200 + i * 140}ms`,
            }}
          >
            <div
              style={{
                border: '1.2px solid var(--blueprint)',
                borderRadius: 3,
                padding: '4px 8px',
                background: 'rgba(243,239,230,0.85)',
                fontFamily: 'var(--font-mono), monospace',
                fontSize: 9,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--blueprint)',
                whiteSpace: 'nowrap',
              }}
            >
              {it.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const engineChapter: Chapter = {
  id: 'engine',
  num: '3',
  title: 'Under the hood',
  short: 'Engine',
  left: ({ volume, revealed }) => (
    <Plate
      num="3"
      name="The blueprint on vellum"
      footLeft="drag the vellum sideways"
      footRight="engineering ↔ business view"
    >
      <VellumOverlay volume={volume} revealed={revealed} />
    </Plate>
  ),
  right: ({ volume }) => (
    <div>
      <div className="kicker rv" style={{ ['--i' as string]: 0 }}>
        Chapter 3 · Under the hood
      </div>
      <h2 className="chapter-title rv" style={{ ['--i' as string]: 1, fontSize: 'var(--fs-h3)' }}>
        Parts list.
      </h2>
      <table className="parts-table rv" style={{ ['--i' as string]: 2 }}>
        <thead>
          <tr>
            <th>Component</th>
            <th>Role</th>
            <th>Family</th>
          </tr>
        </thead>
        <tbody>
          {volume.engine?.parts.map((p, i) => (
            <tr key={i}>
              <td>{p.component}</td>
              <td>{p.role}</td>
              <td>{p.family}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="eval-note rv" style={{ ['--i' as string]: 3 }}>
        <b
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}
        >
          How we evaluated it —{' '}
        </b>
        {volume.engine?.evaluation}
      </div>
    </div>
  ),
};

/* ------------------------------------------------------------------ */
/* 4 · The Value — stamped outcomes                                    */
/* ------------------------------------------------------------------ */

function StampValue({ raw }: { raw: string }) {
  const m = useMemo(() => /^-?([\d,]+(?:\.\d+)?)(%?)$/.exec(raw.replace(/\s/g, '')), [raw]);
  const [shown, setShown] = useState(m ? '0' : raw);
  useEffect(() => {
    if (!m) return;
    const target = Number(m[1].replace(/,/g, ''));
    let raf = 0;
    const timer = setTimeout(() => {
      const t0 = performance.now();
      const dur = 700;
      const tick = (t: number) => {
        const p = Math.min(1, (t - t0) / dur);
        const v = Math.round(target * (1 - Math.pow(1 - p, 3)));
        setShown(m[2] === '%' ? `${v}%` : String(v));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, 600);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [m]);
  return <>{shown}</>;
}

const valueChapter: Chapter = {
  id: 'value',
  num: '4',
  title: 'The value',
  short: 'Value',
  left: ({ volume }) => (
    <Plate
      num="4"
      name="Before → after"
      footLeft="the shift, side by side"
      footRight={`${volume.value.metrics.length} metrics stamped →`}
    >
      <div className="ba-wrap">
        <div className="ba-block before rv" style={{ ['--i' as string]: 0 }}>
          <svg className="before-docs" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {Array.from({ length: 9 }).map((_, i) => (
              <rect
                key={i}
                x={(i * 13) % 80}
                y={(i * 17) % 70}
                width={22}
                height={26}
                rx="1"
                fill="var(--ink)"
                transform={`rotate(${(i * 11) % 30} 50 50)`}
              />
            ))}
          </svg>
          <div className="ba-lbl">Before</div>
          {volume.value.before}
        </div>
        <div className="ba-block after rv" style={{ ['--i' as string]: 1 }}>
          <div className="ba-lbl">After</div>
          {volume.value.after}
        </div>
      </div>
    </Plate>
  ),
  right: ({ volume }) => (
    <div>
      <div className="kicker rv" style={{ ['--i' as string]: 0 }}>
        Chapter 4 · The value
      </div>
      <h2
        className="chapter-title rv"
        style={{ ['--i' as string]: 1, fontSize: 'var(--fs-h3)', marginBottom: 16 }}
      >
        Stamped outcomes.
      </h2>
      <div className="stamps rv" style={{ ['--i' as string]: 2 }}>
        {volume.value.metrics.map((mt, i) => (
          <div
            key={i}
            className="stamp rv"
            style={{
              ['--i' as string]: 3 + i * 2,
              ['--rot' as string]: `${i % 2 === 0 ? -1.4 : 1.2}deg`,
            }}
          >
            <div className="sval">
              <StampValue raw={mt.value} />
            </div>
            <div className="slbl">{mt.label}</div>
            <div className="metric-src">{mt.sourceNote}</div>
          </div>
        ))}
      </div>
    </div>
  ),
};

/* ------------------------------------------------------------------ */
/* 5 · Your Return — the ledger                                        */
/* ------------------------------------------------------------------ */

function RollingText({ text }: { text: string }) {
  const m = useMemo(() => /^([^\d]*)([\d,]+)(.*)$/.exec(text), [text]);
  const target = m ? Number(m[2].replace(/,/g, '')) : 0;
  const [n, setN] = useState(target);
  const prev = useRef(target);
  useEffect(() => {
    if (!m) return;
    const from = prev.current;
    prev.current = target;
    if (from === target) return;
    let raf = 0;
    const t0 = performance.now();
    const dur = 420;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setN(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, m]);
  if (!m) return <>{text}</>;
  return (
    <>
      {m[1]}
      {n.toLocaleString()}
      {m[3]}
    </>
  );
}

function LedgerInputs({ volume }: { volume: Volume }) {
  const roi = volume.roi!;
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(roi.inputs.map((i) => [i.id, i.default])),
  );
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('archive:roi', {
          detail: {
            slug: volume.slug,
            vals: Object.fromEntries(Object.entries(vals).map(([k, v]) => [k, Math.round(v * 100) / 100])),
          },
        }),
      );
      track('roi_calculated', { slug: volume.slug });
    }, 900);
    return () => clearTimeout(t);
  }, [vals, volume.slug]);

  return (
    <Plate
      num="5"
      name="Your numbers"
      footLeft="adjust any input — totals roll live"
      footRight="see the facing page"
    >
      <div className="ledger-inputs" style={{ marginTop: 2 }}>
        {roi.inputs.map((inp) => (
          <label key={inp.id} className="rv" style={{ ['--i' as string]: 2 }}>
            <span className="ll">{inp.label}</span>
            <span style={{ display: 'flex', alignItems: 'baseline' }}>
              <input
                type="number"
                value={vals[inp.id]}
                min={inp.min}
                max={inp.max}
                step={inp.step ?? 1}
                onChange={(e) =>
                  setVals((v) => ({
                    ...v,
                    [inp.id]: Math.max(
                      inp.min ?? -Infinity,
                      Math.min(inp.max ?? Infinity, Number(e.target.value) || 0),
                    ),
                  }))
                }
              />
              {inp.unit && <span className="unit">{inp.unit}</span>}
            </span>
          </label>
        ))}
      </div>
    </Plate>
  );
}

function LedgerOutputs({ volume }: { volume: Volume }) {
  const roi = volume.roi!;
  const [vals, setVals] = useState<Record<string, number>>(() =>
    Object.fromEntries(roi.inputs.map((i) => [i.id, i.default])),
  );
  const { setRoiEstimate } = useArchive();

  useEffect(() => {
    function onRoi(e: Event) {
      const d = (e as CustomEvent).detail;
      if (d.slug === volume.slug) setVals(d.vals);
    }
    window.addEventListener('archive:roi', onRoi);
    return () => window.removeEventListener('archive:roi', onRoi);
  }, [volume.slug]);

  let outputs: { id: string; text: string }[] = [];
  let bad = false;
  try {
    const res = runFormula(roi.formula, vals);
    outputs = roi.outputs.map((id) => ({
      id,
      text:
        id.includes('hour')
          ? `${Math.round(res[id] ?? 0).toLocaleString()} hrs / month`
          : `≈ $${Math.round(res[id] ?? 0).toLocaleString()} / month`,
    }));
  } catch {
    outputs = [];
    bad = true;
  }

  return (
    <div className="ledger rv" style={{ ['--i' as string]: 2 }}>
      <div className="ledger-totals">
        {outputs.map((o) => (
          <div className="ledger-total" key={o.id}>
            <div className="tlabel">{o.id}</div>
            <div className="tval">
              <RollingText text={o.text} />
            </div>
          </div>
        ))}
        {bad && (
          <div className="tlabel" style={{ color: 'var(--stamp)' }}>
            CHECK THE INPUTS
          </div>
        )}
      </div>
      <div className="ledger-foot">
        <span>
          {roi.footnote ??
            'Illustrative estimate based on outcomes observed in comparable engagements. Not a quote.'}
        </span>
        <button
          className="ledger-send"
          onClick={() => {
            setRoiEstimate(outputs.map((o) => o.text).join(' · '));
            window.dispatchEvent(new CustomEvent('archive:goto', { detail: { id: 'checkout' } }));
          }}
        >
          Send me this estimate
        </button>
      </div>
    </div>
  );
}

const roiChapter: Chapter = {
  id: 'roi',
  num: '5',
  title: 'Your return',
  short: 'Return',
  left: ({ volume }) =>
    volume.roi ? <LedgerInputs volume={volume} /> : <div className="tangle-wrap mono">No ledger for this volume.</div>,
  right: ({ volume }) => (volume.roi ? <LedgerOutputs volume={volume} /> : <div />),
};

/* ------------------------------------------------------------------ */
/* E · Checkout — the borrowing card                                   */
/* ------------------------------------------------------------------ */

function CheckoutLeft({ volume }: { volume: Volume }) {
  const { readingList, roiEstimate } = useArchive();
  const [stamped, setStamped] = useState(false);
  const [done, setDone] = useState(false);
  const today = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const slugs = [volume.slug, ...readingList.filter((s) => s !== volume.slug)].slice(0, 6);
  const pre = [
    volume.codename,
    roiEstimate ? `Estimate: ${roiEstimate}` : null,
    readingList.length > 1 ? `Reading list: ${readingList.length} volumes` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Plate
      num="E"
      name="The borrowing card"
      footLeft="fill the card, take the volume"
      footRight="we reply within one business day"
    >
      <div className="pocket rv" style={{ ['--i' as string]: 0 }}>
        <div className={`checkout-card${done ? ' slid' : ''}`}>
          {stamped && <div className="date-stamp on">{today} · CHECKED OUT</div>}
          <CheckoutCard
            slugs={slugs}
            prePrinted={pre}
            onDone={() => {
              setStamped(true);
              setTimeout(() => setDone(true), 1400);
            }}
          />
        </div>
      </div>
    </Plate>
  );
}

function CheckoutRight({ related, openVolume }: ChapterProps) {
  return (
    <div className="rv" style={{ ['--i' as string]: 1 }}>
      <div className="kicker">Epilogue · Related reading</div>
      <h2 className="chapter-title" style={{ fontSize: 'var(--fs-h3)', marginBottom: 14 }}>
        Where next?
      </h2>
      <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
        Volumes shelved nearby — chosen for shared techniques and domain. Opening one keeps your
        place; the shelf remembers what you have read.
      </p>
      <div className="related-reading">
        <div className="related-spines">
          {related.map((r) => (
            <button key={r.slug} className="rel-spine" onClick={() => openVolume(r.slug)}>
              <span className="band" style={{ background: accentFor(r.domain) }} />
              <span className="nm">{r.codename}</span>
              <span className="hk">{r.hook}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const checkoutChapter: Chapter = {
  id: 'checkout',
  num: 'E',
  title: 'Checkout',
  short: 'Checkout',
  left: ({ volume }) => <CheckoutLeft volume={volume} />,
  right: (p) => <CheckoutRight {...p} />,
};

/* ------------------------------------------------------------------ */
/* chapter assembly                                                    */
/* ------------------------------------------------------------------ */

export function buildChapters(volume: Volume, edition: Edition): Chapter[] {
  const chs: Chapter[] = [titleChapter, problemChapter, approachChapter];
  if (volume.engine && edition === 'tech') chs.push(engineChapter);
  chs.push(valueChapter);
  if (volume.roi) chs.push(roiChapter);
  chs.push(checkoutChapter);
  return chs;
}
