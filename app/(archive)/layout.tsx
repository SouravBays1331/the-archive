import { ArchiveProvider } from '@/lib/store';
import { getAllVolumes } from '@/lib/content';
import ReadingListTray from '@/components/shelf/ReadingListTray';
import SessionGuard from '@/components/SessionGuard';
import CanvasMount from '@/components/scene/CanvasMount';
import PaperHandoff from '@/components/scene/PaperHandoff';

export const dynamic = 'force-dynamic';

// Persistent archive shell: provider, 3D canvas and reading-list tray live across
// the shelf and every volume (spec §03). SessionGuard enforces the per-tab
// session before first paint.
export default function ArchiveLayout({ children }: { children: React.ReactNode }) {
  const meta = getAllVolumes().map((v) => ({
    slug: v.slug,
    codename: v.codename,
    domain: v.domain,
    hook: v.hook,
  }));
  const volumes = getAllVolumes().map((v) => ({
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
  return (
    <ArchiveProvider>
      <SessionGuard />
      <CanvasMount volumes={volumes} />
      <PaperHandoff />
      {children}
      <ReadingListTray meta={meta} />
    </ArchiveProvider>
  );
}
