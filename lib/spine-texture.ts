// Spine art drawn to a canvas texture per volume (spec §19: minimal textures,
// generated at runtime). Accent band, foil bands, vertical serif codename,
// technique glyphs (same construction as the DOM set) and the year.

import type { ShelfVolume } from '@/components/shelf/ShelfWall';

// Simplified 24×24 glyph paths mirroring lib/glyphs.tsx (single-stroke forms
// that read at ~40px on a spine).
const GLYPH_PATHS: Record<string, string> = {
  agents: 'M12 5.5 L7 17.5 M12 5.5 L17 17.5 M7 17.5 H17',
  retrieval: 'M10.5 5 A5.5 5.5 0 1 0 10.5 16 A5.5 5.5 0 1 0 10.5 5 M15 15 L19.5 19.5',
  simulation: 'M4 12 A8 5 0 1 0 20 12 A8 5 0 1 0 4 12',
  forecasting: 'M4 18 L9.5 12 L13 15 L20 6.5 M15.5 6.5 H20 V11',
  signal: 'M3 12 H7 L9.5 6 L13.5 18 L16 12 H21',
  language: 'M4 6.5 A2.5 2.5 0 0 1 6.5 4 H17.5 A2.5 2.5 0 0 1 20 6.5 V14.5 A2.5 2.5 0 0 1 17.5 17 H10 L5.5 21 V17 H6.5 A2.5 2.5 0 0 1 4 14.5 Z',
  vision: 'M3 12 Q12 5 21 12 Q12 19 3 12 Z',
  optimisation: 'M12 4 A8 8 0 1 0 12.01 4 M12 7.5 A4.5 4.5 0 1 0 12.01 7.5',
};

const cache = new Map<string, HTMLCanvasElement>();

export function spineTexture(v: ShelfVolume, accentCss: string): HTMLCanvasElement {
  const key = `${v.slug}:${v.complexity}:${v.impactTier}:${v.techniques.join()}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const W = 256;
  const H = 1024;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;

  // base cloth
  const base = ctx.createLinearGradient(0, 0, W, 0);
  base.addColorStop(0, '#1a1a1e');
  base.addColorStop(0.5, '#26262b');
  base.addColorStop(1, '#17171a');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, W, H);

  // accent band (top)
  ctx.fillStyle = accentForCanvas(v.domain);
  ctx.fillRect(0, 0, W, 42);
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(0, 42, W, 6);

  // technique glyphs, top to bottom in priority order
  ctx.strokeStyle = '#b9b4a8';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  v.techniques.slice(0, 3).forEach((t, i) => {
    const d = GLYPH_PATHS[t];
    if (!d) return;
    const path = new Path2D(d);
    ctx.save();
    ctx.translate(W / 2 - 24, 108 + i * 84);
    ctx.scale(2.1, 2.1);
    ctx.lineWidth = 1.6;
    ctx.stroke(path);
    ctx.restore();
  });

  // vertical codename
  ctx.save();
  ctx.translate(W / 2, H * 0.52);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '72px "Instrument Serif", Georgia, serif';
  ctx.fillStyle = '#ede9e1';
  // letter-spaced: draw char by char
  const name = v.codename;
  const spacing = 12;
  let x = -((name.length * 62 + (name.length - 1) * spacing) / 2) + 31;
  for (const ch of name) {
    ctx.fillText(ch, x, 0);
    x += 62 + spacing;
  }
  ctx.restore();

  // foil bands (impact tier)
  for (let i = 0; i < v.impactTier; i++) {
    const y = H - 210 + i * 16;
    const g = ctx.createLinearGradient(0, y, W, y);
    g.addColorStop(0, '#8a7448');
    g.addColorStop(0.45, '#e6c88a');
    g.addColorStop(1, '#8a7448');
    ctx.fillStyle = g;
    ctx.fillRect(W * 0.19, y, W * 0.62, 5);
  }

  // year
  ctx.font = '500 34px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#6e6a63';
  ctx.textAlign = 'center';
  ctx.fillText(String(v.year), W / 2, H - 64);

  // hinge shading
  const hinge = ctx.createLinearGradient(0, 0, 26, 0);
  hinge.addColorStop(0, 'rgba(0,0,0,0.5)');
  hinge.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hinge;
  ctx.fillRect(0, 0, 26, H);

  const tex = c;
  cache.set(key, tex);
  return tex;
}

function accentForCanvas(domain: string): string {
  const map: Record<string, string> = {
    finance: '#e0a34a',
    operations: '#4fb3bf',
    simulation: '#8c7ae6',
    growth: '#7faf8a',
    risk: '#e07a5f',
    infra: '#8fa3b8',
  };
  return map[domain] ?? '#ffd9a0';
}
