import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getShelfOrder } from '@/lib/content';
import ShelfWall, { ShelfVolume } from '@/components/shelf/ShelfWall';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'The Archive · Shelf',
};

type Lens = 'industry' | 'capability' | 'impact' | 'newest';

export default async function ShelfPage({
  searchParams,
}: {
  searchParams: { lens?: string; q?: string };
}) {
  const volumes: ShelfVolume[] = getShelfOrder().map((v) => ({
    slug: v.slug,
    codename: v.codename,
    objectType: v.objectType,
    domain: v.domain,
    sectorTag: v.sectorTag,
    year: v.year,
    status: v.status,
    complexity: v.complexity,
    impactTier: v.impactTier,
    techniques: [...v.techniques],
    hook: v.hook,
  }));
  const lens: Lens = (['industry', 'capability', 'impact', 'newest'] as Lens[]).includes(
    searchParams.lens as Lens,
  )
    ? (searchParams.lens as Lens)
    : 'newest';

  return (
    <Suspense fallback={null}>
      <ShelfWall volumes={volumes} initialLens={lens} initialQuery={searchParams.q ?? ''} />
    </Suspense>
  );
}
