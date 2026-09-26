// Device tiering (spec §19). Tier 3 = full 3D with the works; tier 2 = 3D without
// heavy postprocessing; tier 1 = the DOM shelf (also the reduced-motion and
// ?flat=1 path).
export type DeviceTier = 1 | 2 | 3;

export function detectTier(): DeviceTier {
  if (typeof window === 'undefined') return 1;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('flat') === '1') return 1;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 1;
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return 1;
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
    // 2019+ corporate laptop floor → tier 3
    return cores >= 4 && mem >= 4 ? 3 : 2;
  } catch {
    return 1;
  }
}
