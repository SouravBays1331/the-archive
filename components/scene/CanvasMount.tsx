'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { useScene } from '@/lib/scene-store';
import { detectTier } from '@/lib/tier';
import type { ShelfVolume } from '@/lib/scene-store';

const ArchiveCanvas = dynamic(() => import('./ArchiveCanvas'), { ssr: false });

// Mounts the persistent 3D canvas on tier-2+ devices; tier-1 keeps the DOM shelf.
export default function CanvasMount({ volumes }: { volumes: ShelfVolume[] }) {
  const tier = useScene((s) => s.tier);

  useEffect(() => {
    useScene.getState().setTier(detectTier());
  }, []);

  if (tier < 2) return null;
  return <ArchiveCanvas volumes={volumes} />;
}
