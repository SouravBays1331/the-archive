// Technique glyph set v1 (spec §05): 24px SVGs, 1.5px stroke, rounded caps/joins.
// Extend the set only with the same construction rules.
import React from 'react';

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export const TECHNIQUE_LABELS: Record<string, string> = {
  agents: 'Agents',
  retrieval: 'Retrieval',
  simulation: 'Simulation',
  forecasting: 'Forecasting',
  signal: 'Signal detection',
  language: 'Language',
  vision: 'Vision',
  optimisation: 'Optimisation',
};

function Agents() {
  return (
    <g {...stroke}>
      <circle cx="12" cy="5.5" r="2" />
      <circle cx="5.5" cy="17.5" r="2" />
      <circle cx="18.5" cy="17.5" r="2" />
      <path d="M10.9 7.2 7 15.7M13.1 7.2 17 15.7M7.5 17.5h9" />
    </g>
  );
}
function Retrieval() {
  return (
    <g {...stroke}>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="m14.8 14.8 5 5" />
    </g>
  );
}
function Simulation() {
  return (
    <g {...stroke}>
      <ellipse cx="12" cy="12" rx="8.5" ry="5" />
      <circle cx="12" cy="12" r="1.8" />
    </g>
  );
}
function Forecasting() {
  return (
    <g {...stroke}>
      <path d="M4 18 9.5 12l3.5 3L20 6.5" />
      <path d="M15.5 6.5H20V11" />
    </g>
  );
}
function Signal() {
  return (
    <g {...stroke}>
      <path d="M3 12h4l2.5-6 4 12 2.5-6H21" />
    </g>
  );
}
function Language() {
  return (
    <g {...stroke}>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 14.5z" />
    </g>
  );
}
function Vision() {
  return (
    <g {...stroke}>
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </g>
  );
}
function Optimisation() {
  return (
    <g {...stroke}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </g>
  );
}

const GLYPHS: Record<string, () => React.ReactElement> = {
  agents: Agents,
  retrieval: Retrieval,
  simulation: Simulation,
  forecasting: Forecasting,
  signal: Signal,
  language: Language,
  vision: Vision,
  optimisation: Optimisation,
};

export function TechniqueGlyph({ id, size = 24 }: { id: string; size?: number }) {
  const G = GLYPHS[id];
  if (!G) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <G />
    </svg>
  );
}
