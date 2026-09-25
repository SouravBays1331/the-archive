'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type Edition = 'exec' | 'tech';
export type VisitedMap = Record<string, number>; // slug -> reading depth 0..1

interface ArchiveState {
  edition: Edition;
  setEdition: (e: Edition) => void;
  editionChosen: boolean;
  readingList: string[];
  toggleReadingList: (slug: string) => void;
  removeFromReadingList: (slug: string) => void;
  inReadingList: (slug: string) => boolean;
  visited: VisitedMap;
  markVisited: (slug: string, depth: number) => void;
  roiEstimate: string | null;
  setRoiEstimate: (s: string | null) => void;
  trayOpen: boolean;
  setTrayOpen: (b: boolean) => void;
}

const Ctx = createContext<ArchiveState | null>(null);

function readLS<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function ArchiveProvider({ children }: { children: React.ReactNode }) {
  const [edition, setEditionState] = useState<Edition>('exec');
  const [editionChosen, setEditionChosen] = useState(false);
  const [readingList, setReadingList] = useState<string[]>([]);
  const [visited, setVisited] = useState<VisitedMap>({});
  const [roiEstimate, setRoiEstimate] = useState<string | null>(null);
  const [trayOpen, setTrayOpen] = useState(false);

  useEffect(() => {
    setReadingList(readLS('archive.readingList', []));
    setVisited(readLS('archive.visited', {}));
    const e = window.sessionStorage.getItem('archive.edition');
    if (e === 'tech' || e === 'exec') {
      setEditionState(e);
      setEditionChosen(true);
    }
  }, []);

  const setEdition = useCallback((e: Edition) => {
    setEditionState(e);
    setEditionChosen(true);
    try {
      window.sessionStorage.setItem('archive.edition', e);
    } catch {}
  }, []);

  const toggleReadingList = useCallback((slug: string) => {
    setReadingList((prev) => {
      const next = prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug];
      try {
        window.localStorage.setItem('archive.readingList', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const removeFromReadingList = useCallback((slug: string) => {
    setReadingList((prev) => {
      const next = prev.filter((s) => s !== slug);
      try {
        window.localStorage.setItem('archive.readingList', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const inReadingList = useCallback((slug: string) => readingList.includes(slug), [readingList]);

  const markVisited = useCallback((slug: string, depth: number) => {
    setVisited((prev) => {
      if ((prev[slug] ?? 0) >= depth) return prev;
      const next = { ...prev, [slug]: depth };
      try {
        window.localStorage.setItem('archive.visited', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      edition,
      setEdition,
      editionChosen,
      readingList,
      toggleReadingList,
      removeFromReadingList,
      inReadingList,
      visited,
      markVisited,
      roiEstimate,
      setRoiEstimate,
      trayOpen,
      setTrayOpen,
    }),
    [
      edition,
      setEdition,
      editionChosen,
      readingList,
      toggleReadingList,
      removeFromReadingList,
      inReadingList,
      visited,
      markVisited,
      roiEstimate,
      trayOpen,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useArchive(): ArchiveState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useArchive must be used inside ArchiveProvider');
  return v;
}
