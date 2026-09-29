'use client';

/**
 * Favorite state for /mods/[id], hydrated from the server (Cass, E138,
 * 2026-09-29).
 *
 * Until E138 `ModDetailClient` did `useState(false)` and never asked the
 * server, so a signed-in visitor who had already saved the mod saw "Add to
 * Favorites" and the E130 "Save this find" offer as if nothing were saved,
 * and a click on the heart POSTed a duplicate (400) instead of removing it.
 *
 * Rules this hook keeps:
 *   - Anonymous visitors make **no** request: the GET fires only once
 *     `useSession()` reports `authenticated` (the session itself is already
 *     fetched once per page by the root SessionProvider).
 *   - One request per mod per mount.
 *   - A visitor action wins over a late read: if the visitor saved or
 *     removed the favorite (or the `?fav=` resume path did) before the GET
 *     resolved, the read is discarded.
 *   - Any failure (401, 5xx, network) leaves the state untouched — the page
 *     behaves exactly as it did before E138.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';

/** GET endpoint, trailing slash included (`trailingSlash: true` is global). */
export function favoriteStateUrl(modId: string): string {
  return `/api/mods/${encodeURIComponent(modId)}/favorite/`;
}

export function useModFavoriteState(
  modId: string,
): [boolean, (next: boolean) => void] {
  const { status } = useSession();
  const [isFavorited, setIsFavoritedState] = useState(false);
  const touched = useRef(false);
  const hydratedFor = useRef<string | null>(null);

  const setIsFavorited = useCallback((next: boolean) => {
    touched.current = true;
    setIsFavoritedState(next);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (hydratedFor.current === modId) return;
    hydratedFor.current = modId;

    let cancelled = false;
    let done = false;
    (async () => {
      try {
        // Per-request nonce: next.config.js stamps every /api/* response with
        // `public, s-maxage=60` (overriding the route's no-store), so without
        // a unique URL a shared cache could hand one visitor's answer to
        // another. Production read MISS ×3 on 09-29, but never rely on that.
        const res = await fetch(`${favoriteStateUrl(modId)}?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!res.ok) return;
        const body = (await res.json()) as { favorited?: unknown };
        if (cancelled || touched.current) return;
        if (typeof body.favorited === 'boolean') setIsFavoritedState(body.favorited);
      } catch {
        // Fail open to the pre-E138 behaviour: start unfavorited.
      } finally {
        done = true;
      }
    })();
    return () => {
      cancelled = true;
      // An effect torn down mid-flight (React strict-mode double invoke,
      // a status flip) may read again on the next run.
      if (!done) hydratedFor.current = null;
    };
  }, [status, modId]);

  return [isFavorited, setIsFavorited];
}
