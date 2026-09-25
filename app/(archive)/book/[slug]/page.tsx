import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAllVolumes, getRelated, getVolume } from '@/lib/content';
import Reader from '@/components/reader/Reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const volume = getVolume(params.slug);
  return { title: volume ? `The Archive · ${volume.codename}` : 'The Archive' };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { mode?: string };
}) {
  const volume = getVolume(params.slug);
  if (!volume) notFound();

  const related = getRelated(volume).map((v) => ({
    slug: v.slug,
    codename: v.codename,
    domain: v.domain,
    hook: v.hook,
  }));

  return (
    <Reader
      volume={volume}
      related={related}
      mode={searchParams.mode === 'flat' ? 'flat' : 'spread'}
      allSlugs={getAllVolumes().map((v) => v.slug)}
    />
  );
}
