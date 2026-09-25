import { ArchiveProvider } from '@/lib/store';
import { getAllVolumes } from '@/lib/content';
import ReadingListTray from '@/components/shelf/ReadingListTray';

export const dynamic = 'force-dynamic';

// Persistent archive shell: the provider and reading-list tray live across
// the shelf and every volume (spec §03).
export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const meta = getAllVolumes().map((v) => ({
    slug: v.slug,
    codename: v.codename,
    domain: v.domain,
    hook: v.hook,
  }));
  return (
    <ArchiveProvider>
      {children}
      <ReadingListTray meta={meta} />
    </ArchiveProvider>
  );
}
