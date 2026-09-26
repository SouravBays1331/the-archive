import { create } from 'zustand';

export type SceneLens = 'industry' | 'capability' | 'impact' | 'newest';
export type ScenePhase = 'shelf' | 'reading';
export type Tier = 1 | 2 | 3;

// The view-model of a volume on the shelf (shared DOM ↔ canvas).
export interface ShelfVolume {
  slug: string;
  codename: string;
  objectType: 'hardcover' | 'binder' | 'dossier' | 'notebook' | 'boxed';
  domain: string;
  sectorTag: string;
  year: number;
  status: 'delivered' | 'in-progress';
  complexity: number;
  impactTier: number;
  techniques: string[];
  hook: string;
}

interface SceneState {
  tier: Tier;
  setTier: (t: Tier) => void;
  phase: ScenePhase;
  setPhase: (p: ScenePhase) => void;
  lens: SceneLens;
  setLens: (l: SceneLens) => void;
  query: string;
  setQuery: (q: string) => void;
  hovered: string | null;
  setHovered: (s: string | null) => void;
  opening: string | null; // slug playing its opening shot
  setOpening: (s: string | null) => void;
  handoff: boolean; // paper overlay covering the screen during the DOM handoff
  setHandoff: (b: boolean) => void;
  lastOpened: string | null; // settle-in on return from reading
  setLastOpened: (s: string | null) => void;
}

// Scene-level state shared between the DOM UI and the R3F canvas.
export const useScene = create<SceneState>((set) => ({
  tier: 1,
  setTier: (tier) => set({ tier }),
  phase: 'shelf',
  setPhase: (phase) => set({ phase }),
  lens: 'newest',
  setLens: (lens) => set({ lens }),
  query: '',
  setQuery: (query) => set({ query }),
  hovered: null,
  setHovered: (hovered) => set({ hovered }),
  opening: null,
  setOpening: (opening) => set({ opening }),
  handoff: false,
  setHandoff: (handoff) => set({ handoff }),
  lastOpened: null,
  setLastOpened: (lastOpened) => set({ lastOpened }),
}));

// Module-level clock for the opening shot — read every frame by the volume,
// the camera rig and the DOM paper handoff without re-rendering React.
export const openingClock: {
  slug: string | null;
  t0: number;
  progress: number;
  x: number;
} = { slug: null, t0: 0, progress: 0, x: 0 };
