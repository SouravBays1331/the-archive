import { volumeSchema, Volume } from '@/lib/schema';
import batchproof from '@/content/volumes/batchproof.json';
import finlineage from '@/content/volumes/finlineage.json';
import answerrank from '@/content/volumes/answerrank.json';
import reconcile from '@/content/volumes/reconcile.json';
import specforge from '@/content/volumes/specforge.json';
import triageEngine from '@/content/volumes/triage-engine.json';

function loadAll(): Volume[] {
  const raw = [batchproof, finlineage, answerrank, reconcile, specforge, triageEngine];
  const volumes = raw.map((v) => volumeSchema.parse(v));

  // Cross-validation: edges reference existing stages; related references existing slugs.
  const slugs = new Set(volumes.map((v) => v.slug));
  for (const v of volumes) {
    const ids = new Set(v.approach.stages.map((s) => s.id));
    for (const [a, b] of v.approach.edges) {
      if (!ids.has(a) || !ids.has(b)) {
        throw new Error(`${v.slug}: edge [${a}, ${b}] references an unknown stage id`);
      }
    }
    for (const r of v.related) {
      if (!slugs.has(r)) throw new Error(`${v.slug}: related slug '${r}' does not exist`);
    }
  }
  return volumes;
}

const VOLUMES: Volume[] = loadAll();

export function getAllVolumes(): Volume[] {
  return VOLUMES;
}

export function getVolume(slug: string): Volume | undefined {
  return VOLUMES.find((v) => v.slug === slug);
}

// Default shelf order: newest first, then codename for stability.
export function getShelfOrder(): Volume[] {
  return [...VOLUMES].sort(
    (a, b) => b.year - a.year || a.codename.localeCompare(b.codename),
  );
}

export function getRelated(volume: Volume): Volume[] {
  const direct = volume.related
    .map((slug) => VOLUMES.find((v) => v.slug === slug))
    .filter((v): v is Volume => !!v);
  if (direct.length >= 3) return direct.slice(0, 3);
  // Fill with volumes sharing techniques or domain.
  const extra = VOLUMES.filter(
    (v) =>
      v.slug !== volume.slug &&
      !direct.includes(v) &&
      (v.techniques.some((t) => volume.techniques.includes(t)) || v.domain === volume.domain),
  );
  return [...direct, ...extra].slice(0, 3);
}
