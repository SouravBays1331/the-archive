'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useRouter } from 'next/navigation';
import { Html } from '@react-three/drei';
import { useScene, openingClock, type ShelfVolume } from '@/lib/scene-store';
import { spineTexture } from '@/lib/spine-texture';
import { rngFor } from '@/lib/seed';
import { accentFor } from '@/lib/tokens';
import { play } from '@/lib/sound';
import { track } from '@/lib/analytics';

const BASE_H: Record<ShelfVolume['objectType'], number> = {
  hardcover: 3.0,
  binder: 2.85,
  dossier: 2.72,
  notebook: 2.4,
  boxed: 3.12,
};

function volWidth(v: ShelfVolume): number {
  const base = 0.52 + v.complexity * 0.12;
  return v.objectType === 'boxed' ? base * 1.5 : base;
}
function volHeight(v: ShelfVolume): number {
  const rng = rngFor(v.slug);
  return BASE_H[v.objectType] * (1 + (rng() * 0.06 - 0.03));
}

function matches(v: ShelfVolume, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const hay = `${v.codename} ${v.hook} ${v.domain} ${v.sectorTag} ${v.techniques.join(' ')} ${v.objectType}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

function orderVolumes(volumes: ShelfVolume[], lens: string): ShelfVolume[] {
  const arr = [...volumes];
  if (lens === 'impact') {
    return arr.sort((a, b) => b.impactTier - a.impactTier || b.year - a.year || a.codename.localeCompare(b.codename));
  }
  if (lens === 'capability') {
    const order = ['agents', 'retrieval', 'simulation', 'forecasting', 'signal', 'language', 'vision', 'optimisation'];
    return arr.sort(
      (a, b) =>
        order.indexOf(a.techniques[0]) - order.indexOf(b.techniques[0]) ||
        b.year - a.year ||
        a.codename.localeCompare(b.codename),
    );
  }
  if (lens === 'industry') {
    return arr.sort((a, b) => a.sectorTag.localeCompare(b.sectorTag) || b.year - a.year);
  }
  return arr.sort((a, b) => b.year - a.year || a.codename.localeCompare(b.codename));
}

const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);
const clamp01 = (p: number) => Math.max(0, Math.min(1, p));

/* ------------------------------------------------------------------ */

function CameraRig() {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 1.5, 0), []);
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpLook = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const s = useScene.getState();
    if (openingClock.slug) {
      const p = easeOutCubic(clamp01((performance.now() - openingClock.t0) / 1700));
      tmpPos.set(openingClock.x * 0.45, 1.7 + p * 0.25, 7.4 - p * 1.9);
      tmpLook.set(openingClock.x * 0.62, 1.4, 0.3);
    } else if (s.phase === 'shelf') {
      tmpPos.set(0, 1.58, 10.4);
      tmpLook.set(0, 1.32, 0);
    } else {
      return; // reading: canvas paused
    }
    cam.position.lerp(tmpPos, 0.055);
    look.lerp(tmpLook, 0.055);
    cam.lookAt(look);
  });
  return null;
}

function ReadingLamp() {
  const light = useRef<THREE.SpotLight>(null);
  const target = useMemo(() => new THREE.Object3D(), []);
  useFrame((state, delta) => {
    if (!light.current) return;
    const k = 1 - Math.exp(-delta * 5);
    const tx = state.pointer.x * 5.2;
    const ty = 1.1 + state.pointer.y * 1.4;
    light.current.position.lerp(tmpVec.set(tx, 3.6, 2.6), k);
    target.position.set(light.current.position.x * 0.9, 0.9, 0.3);
    target.updateMatrixWorld();
  });
  return (
    <>
      <spotLight
        ref={light}
        position={[0, 3.6, 2.6]}
        target={target}
        angle={0.46}
        penumbra={0.9}
        intensity={2.4}
        color="#ffe6bd"
        distance={14}
      />
      <primitive object={target} />
    </>
  );
}
const tmpVec = new THREE.Vector3();

function Room() {
  return (
    <>
      <ambientLight intensity={0.14} />
      {/* back wall */}
      <mesh position={[0, 3.2, -1.4]}>
        <planeGeometry args={[26, 12]} />
        <meshStandardMaterial color="#131318" roughness={1} />
      </mesh>
      {/* the plank */}
      <mesh position={[0, -0.045, 0.1]}>
        <boxGeometry args={[8.9, 0.09, 0.62]} />
        <meshStandardMaterial color="#212127" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* LED strip */}
      <mesh position={[0, -0.1, 0.38]}>
        <boxGeometry args={[8.3, 0.025, 0.04]} />
        <meshStandardMaterial color="#ffd9a0" emissive="#ffd9a0" emissiveIntensity={1.6} />
      </mesh>
      <pointLight position={[0, 0.1, 0.8]} intensity={1.4} distance={5.5} decay={2} color="#ffd9a0" />
      <pointLight position={[-3.4, 2.8, 2.4]} intensity={0.35} distance={9} color="#8fa3b8" />
      <pointLight position={[3.4, 2.8, 2.4]} intensity={0.35} distance={9} color="#8fa3b8" />
    </>
  );
}

function Volume({
  v,
  slotX,
  dimmed,
  fontsReady,
}: {
  v: ShelfVolume;
  slotX: number;
  dimmed: boolean;
  fontsReady: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);
  const spineMat = useRef<THREE.MeshBasicMaterial>(null);
  const { camera } = useThree();
  const setHovered = useScene((s) => s.setHovered);
  const opening = useScene((s) => s.opening);
  const setOpening = useScene((s) => s.setOpening);
  const setHandoff = useScene((s) => s.setHandoff);
  const setLastOpened = useScene((s) => s.setLastOpened);
  const lastOpened = useScene((s) => s.lastOpened);
  const isHovered = useScene((s) => s.hovered === v.slug);
  const router = useRouter();
  const w = volWidth(v);
  const h = volHeight(v);
  const accent = accentFor(v.domain);

  const spineCanvas = useMemo(() => {
    if (!fontsReady) return null;
    return spineTexture(v, accent);
  }, [v, fontsReady, accent]);
  const spineTex = useMemo(() => {
    if (!spineCanvas) return null;
    const t = new THREE.CanvasTexture(spineCanvas);
    t.anisotropy = 4;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [spineCanvas]);

  const settleStart = useRef<number | null>(null);
  useEffect(() => {
    if (lastOpened === v.slug) settleStart.current = performance.now();
  }, [lastOpened, v.slug]);

  const opened = useRef(false);
  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const s = useScene.getState();
    const k = 1 - Math.exp(-delta * 7.5);

    // --- opening shot -------------------------------------------------
    if (openingClock.slug === v.slug) {
      const p = easeOutCubic(clamp01((performance.now() - openingClock.t0) / 1700));
      openingClock.progress = p;
      g.position.x += (slotX - g.position.x) * k;
      g.position.y = p * 0.42;
      g.position.z = 0.3 + 1.55 * p;
      g.rotation.y = p * (Math.PI / 2) * 0.96;
      if (p >= 0.97 && !opened.current) {
        opened.current = true;
        setHandoff(true);
        setOpening(null);
        setLastOpened(v.slug);
        openingClock.slug = null;
        const w = window as unknown as { __dbg?: Record<string, string> };
        w.__dbg = { ...(w.__dbg ?? {}), handoff: 'fired' };
        try {
          router.push(`/book/${v.slug}`);
          w.__dbg.push = 'called';
        } catch (e) {
          w.__dbg.push = 'ERR ' + String(e);
        }
      }
      return;
    }
    opened.current = false;

    // --- settle-in after reading --------------------------------------
    if (settleStart.current) {
      const p = clamp01((performance.now() - settleStart.current) / 800);
      const e = easeOutCubic(p);
      g.position.x = slotX;
      g.position.z = 0.3 + 1.35 * (1 - e);
      g.position.y = 0.45 * (1 - e);
      g.rotation.y = (Math.PI / 2) * 0.96 * (1 - e);
      if (p >= 1) {
        settleStart.current = null;
        useScene.getState().setLastOpened(null);
      }
      return;
    }

    // --- hover / dim / idle --------------------------------------------
    const hovered = s.hovered === v.slug;
    const targetZ = 0.3 + (hovered ? 0.26 : 0) + (dimmed ? -0.06 : 0);
    g.position.x += (slotX - g.position.x) * k;
    g.position.z += (targetZ - g.position.z) * k;
    g.position.y += (0 - g.position.y) * k;
    const targetRot = hovered ? 0.16 : 0;
    g.rotation.y += (targetRot - g.rotation.y) * k;

    const targetOpacity = dimmed ? 0.22 : 1;
    if (bodyMat.current) {
      bodyMat.current.transparent = targetOpacity < 1;
      bodyMat.current.opacity += (targetOpacity - bodyMat.current.opacity) * k;
    }
    if (spineMat.current) {
      spineMat.current.transparent = targetOpacity < 1;
      spineMat.current.opacity += (targetOpacity - spineMat.current.opacity) * k;
    }
    if (hovered) {
      // lean toward the cursor
      g.rotation.y += (state.pointer.x * 0.12 - g.rotation.y) * 0.08;
    }
    void camera;
  });

  const visitedDepth = useMemo(() => {
    try {
      const raw = window.localStorage.getItem('archive.visited');
      return raw ? (JSON.parse(raw)[v.slug] ?? 0) : 0;
    } catch {
      return 0;
    }
  }, [v.slug]);

  return (
    <group
      ref={group}
      position={[slotX, 0, 0.3]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(v.slug);
        document.body.style.cursor = 'pointer';
        play('slide');
      }}
      onPointerOut={() => {
        setHovered(null);
        document.body.style.cursor = '';
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (openingClock.slug) return;
        play('open');
        openingClock.slug = v.slug;
        openingClock.t0 = performance.now();
        openingClock.x = group.current?.position.x ?? slotX;
        openingClock.progress = 0;
        setOpening(v.slug);
        setHovered(null);
        track('volume_open', { slug: v.slug, source: 'shelf3d' });
      }}
    >
      {/* body */}
      <mesh>
        <boxGeometry args={[w, h, 0.52]} />
        <meshStandardMaterial ref={bodyMat} color="#1d1d22" roughness={0.82} metalness={0.08} />
      </mesh>
      {/* spine art */}
      {spineTex && (
        <mesh position={[0, 0, 0.265]}>
          <planeGeometry args={[w * 0.985, h * 0.985]} />
          <meshBasicMaterial ref={spineMat} map={spineTex} toneMapped={false} />
        </mesh>
      )}
      {/* page edges (right side) */}
      <mesh position={[w / 2 + 0.02, 0, 0]}>
        <boxGeometry args={[0.05, h * 0.94, 0.4]} />
        <meshStandardMaterial color="#e6ddc8" roughness={0.9} />
      </mesh>
      {/* in-progress seal */}
      {v.status === 'in-progress' && (
        <mesh position={[0, h / 2 - 0.28, 0.28]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color="#b8322a" emissive="#b8322a" emissiveIntensity={0.5} />
        </mesh>
      )}
      {/* visited bookmark */}
      {visitedDepth > 0 && (
        <mesh position={[0, h / 2 + 0.06, 0.2]}>
          <boxGeometry args={[w * 0.16, 0.16, 0.02]} />
          <meshBasicMaterial color={accent} toneMapped={false} />
        </mesh>
      )}
      {/* hover ribbon with the hook */}
      <Html
        position={[0, h / 2 + 0.34, 0.4]}
        center
        zIndexRange={[30, 0]}
        style={{ pointerEvents: 'none', opacity: isHovered ? 1 : 0, transition: 'opacity 200ms ease' }}
      >
        <div className="html-ribbon">{v.hook}</div>
      </Html>
    </group>
  );
}

function Volumes({ volumes }: { volumes: ShelfVolume[] }) {
  const lens = useScene((s) => s.lens);
  const query = useScene((s) => s.query);
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    const fonts = (document as unknown as { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(() => alive && setFontsReady(true));
    } else {
      setFontsReady(true);
    }
    return () => {
      alive = false;
    };
  }, []);

  const terms = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);
  const ordered = useMemo(() => orderVolumes(volumes, lens), [volumes, lens]);
  const slots = useMemo(() => {
    let cum = 0;
    const gap = 0.16;
    const widths = ordered.map(volWidth);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (ordered.length - 1);
    return ordered.map((_, i) => {
      const x = -total / 2 + cum + widths[i] / 2;
      cum += widths[i] + gap;
      return x;
    });
  }, [ordered]);

  return (
    <>
      {ordered.map((v, i) => (
        <Volume key={v.slug} v={v} slotX={slots[i]} dimmed={!matches(v, terms)} fontsReady={fontsReady} />
      ))}
    </>
  );
}

export default function ArchiveCanvas({ volumes }: { volumes: ShelfVolume[] }) {
  const phase = useScene((s) => s.phase);
  const tier = useScene((s) => s.tier);
  const router = useRouter();

  // prefetch every volume so the opening-shot handoff navigates instantly
  useEffect(() => {
    volumes.forEach((v) => router.prefetch(`/book/${v.slug}`));
  }, [volumes, router]);

  return (
    <div className="scene-canvas" aria-hidden="true">
      <Canvas
        camera={{ position: [0, 1.58, 10.4], fov: 30 }}
        dpr={[1, 1.75]}
        frameloop={phase === 'reading' ? 'never' : 'always'}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
        }}
      >
        <color attach="background" args={['#101014']} />
        <CameraRig />
        <ReadingLamp />
        <Room />
        <Volumes volumes={volumes} />
        {tier >= 3 && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.85} luminanceSmoothing={0.2} intensity={0.45} />
            <Vignette offset={0.24} darkness={0.72} />
            <Noise opacity={0.045} />
          </EffectComposer>
        )}
        {tier === 2 && (
          <EffectComposer>
            <Bloom luminanceThreshold={0.85} intensity={0.3} />
            <Noise opacity={0.04} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
