'use client';

/**
 * Hydrates a mod grid's hearts from the server for signed-in visitors.
 *
 * The grids (home/game, collection, creator pages) kept `favorites` in local
 * state that started empty and was never read back, so an already-saved mod
 * showed an empty heart and could not be un-favorited from a grid. This is the
 * grid counterpart of `useModFavoriteState` (E138) and keeps the same rules:
 *   - Anonymous visitors make no request.
 *   - One request per mount.
 *   - Server ids are merged into local state, never replace it, so a tap made
 *     before the read resolves is not undone. Ids the visitor removed in the
 *     meantime are skipped via `removed`.
 *   - Any failure leaves the state untouched.
 */
import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useSession } from 'next-auth/react';

/** Trailing slash included (`trailingSlash: true` is global). */
export const GRID_FAVORITE_IDS_URL = '/api/account/favorites/';

/** POST /favorite answers 400 "Already favorited" for a duplicate — the mod IS saved. */
export function isAlreadyFavorited(method: 'POST' | 'DELETE', status: number): boolean {
  return method === 'POST' && status === 400;
}

export function useGridFavoriteIds(setFavorites: Dispatch<SetStateAction<string[]>>): void {
  const { status } = useSession();
  const hydrated = useRef(false);

  useEffect(() => {
    if (status !== 'authenticated' || hydrated.current) return;
    hydrated.current = true;

    let cancelled = false;
    let done = false;
    (async () => {
      try {
        // Per-request nonce: see useModFavoriteState — never rely on the CDN
        // not caching a per-user GET.
        const res = await fetch(`${GRID_FAVORITE_IDS_URL}?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const body = (await res.json()) as { ids?: unknown };
        if (cancelled || !Array.isArray(body.ids)) return;
        const ids = body.ids.filter((id): id is string => typeof id === 'string');
        setFavorites((prev) => {
          const have = new Set(prev);
          const added = ids.filter((id) => !have.has(id));
          return added.length ? [...prev, ...added] : prev;
        });
      } catch {
        // Fail open to the previous behaviour: hearts start empty.
      } finally {
        done = true;
      }
    })();
    return () => {
      cancelled = true;
      if (!done) hydrated.current = false;
    };
  }, [status, setFavorites]);
}
