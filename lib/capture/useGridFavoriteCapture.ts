'use client';

import { useCallback, useEffect, useRef } from 'react';
import {
  GRID_FAVORITE_EVENTS,
  gridFavoriteSignInHref,
  readGridResumeMod,
  stripGridResumeMarker,
  type GridFavoriteSource,
} from './gridFavorite';

type Gtag = (...args: unknown[]) => void;

function fireGtag(event: string, params: Record<string, string>) {
  (window as unknown as { gtag?: Gtag }).gtag?.('event', event, params);
}

/**
 * E279 — the grid-heart account capture, shared by every mod grid.
 *
 * Returns `onUnauthorized(modId)`, which the page calls instead of the old
 * `alert()` when the favorite POST answers 401: it fires the redirect event
 * and sends the visitor to the save-intent sign-up. On mount, if the URL
 * carries the resume marker, it strips the marker first (so a reload or a
 * shared link never repeats it), POSTs the favorite once and, on success,
 * fires the after-signin event and calls `onSaved(modId)` so the page can
 * mark the heart. Never navigates from the resume path, never DELETEs.
 */
export function useGridFavoriteCapture(
  source: GridFavoriteSource,
  onSaved?: (modId: string) => void,
): { onUnauthorized: (modId: string) => void } {
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const resumeAttempted = useRef(false);
  useEffect(() => {
    if (resumeAttempted.current) return;
    const { pathname, search, hash } = window.location;
    const modId = readGridResumeMod(search);
    if (!modId) return;
    resumeAttempted.current = true;
    window.history.replaceState(window.history.state, '', stripGridResumeMarker(pathname, search, hash));
    (async () => {
      try {
        const response = await fetch(`/api/mods/${encodeURIComponent(modId)}/favorite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) return;
        fireGtag(GRID_FAVORITE_EVENTS.afterSignin, { source, mod_id: modId });
        onSavedRef.current?.(modId);
      } catch (error) {
        console.error('Error resuming favorite:', error);
      }
    })();
  }, [source]);

  const onUnauthorized = useCallback(
    (modId: string) => {
      fireGtag(GRID_FAVORITE_EVENTS.signinRedirect, { source, mod_id: modId });
      const { pathname, search } = window.location;
      window.location.assign(gridFavoriteSignInHref(source, pathname, search, modId));
    },
    [source],
  );

  return { onUnauthorized };
}
