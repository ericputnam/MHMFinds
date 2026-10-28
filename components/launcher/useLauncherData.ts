'use client';

import { useEffect, useState } from 'react';
import { GAMES } from './games';

export interface FacetOption {
  value: string;
  displayName: string;
  count: number;
  sortOrder?: number;
}

/**
 * Content-type and visual-style options from /api/facets, counted within the
 * selected game ('' = every game) so a Minecraft view never offers Sims hair.
 */
export function useFacetOptions(gameVersion = '') {
  const [types, setTypes] = useState<FacetOption[] | null>(null);
  const [styles, setStyles] = useState<FacetOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const qs = gameVersion ? `?${new URLSearchParams({ gameVersion })}` : '';
    fetch(`/api/facets${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        if (cancelled) return;
        const byCount = (a: FacetOption, b: FacetOption) => (b.count ?? 0) - (a.count ?? 0);
        const clean = (list: FacetOption[] | undefined) =>
          (list ?? []).filter((f) => f && f.value && (f.count ?? 0) > 0).sort(byCount);
        setTypes(clean(data?.facets?.contentType));
        setStyles(clean(data?.facets?.visualStyle));
      })
      .catch(() => {
        if (cancelled) return;
        setTypes([]);
        setStyles([]);
      });
    return () => {
      cancelled = true;
    };
  }, [gameVersion]);

  return { types, styles };
}

/** Per-game mod totals for the switcher (one limit=1 request per game). */
export function useGameCounts() {
  const [counts, setCounts] = useState<Record<string, number | undefined>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      GAMES.map(async (g) => {
        const qs = new URLSearchParams({ limit: '1' });
        if (g.value) qs.set('gameVersion', g.value);
        try {
          const r = await fetch(`/api/mods?${qs.toString()}`);
          if (!r.ok) return [g.value, undefined] as const;
          const d = await r.json();
          const total = d?.pagination?.total;
          return [g.value, typeof total === 'number' ? total : undefined] as const;
        } catch {
          return [g.value, undefined] as const;
        }
      })
    ).then((pairs) => {
      if (cancelled) return;
      setCounts(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
