/**
 * Account capture through the favorite button on /mods/[id] (Cass, E107,
 * 2026-09-25).
 *
 * Until E107 the mod detail page's "Add to Favorites" button was a `// TODO`
 * that toggled local state and never called the API — on the largest
 * Next.js surface (3,961 landing sessions/7d, 09-17→09-23), from the action
 * that creates most registered accounts. This module holds the constants the
 * page, the scoreboard and the guard test share, so a rename in one place
 * fails CI rather than silently breaking attribution.
 *
 * Flow: click → POST /api/mods/[id]/favorite → 401 → `favorite_signin_redirect`
 * → /sign-in/?mode=signup&ref=mod-detail-favorite&redirect=/mods/<id>/?fav=1
 * → the page sees `?fav=1`, POSTs once, fires `favorite_after_signin`, and
 * strips the marker. An unauthenticated visitor carrying `?fav=1` gets a 401
 * and nothing else — the resume path never redirects, so there is no loop.
 */

/** `ref` on the sign-in URL and `source` on every event this surface fires. */
export const MOD_DETAIL_FAVORITE_SOURCE = 'mod-detail-favorite';

/** Query marker the sign-in page returns with, so the save completes. */
export const RESUME_FAVORITE_PARAM = 'fav';

/** GA4 event names — each placement gets its own name (E99 lesson). */
export const MOD_DETAIL_FAVORITE_EVENTS = {
  /** A signed-out visitor clicked the heart and was sent to sign-in. */
  signinRedirect: 'favorite_signin_redirect',
  /** The save completed on return from sign-in (the funnel's success). */
  afterSignin: 'favorite_after_signin',
} as const;

/** Path of a mod page — `trailingSlash: true` is global, keep the slash. */
export function modDetailPath(modId: string): string {
  return `/mods/${encodeURIComponent(modId)}/`;
}

/** Where the sign-in page should send the visitor back to. */
export function resumeFavoriteHref(modId: string): string {
  return `${modDetailPath(modId)}?${RESUME_FAVORITE_PARAM}=1`;
}

/** The sign-in URL a signed-out favorite click goes to. */
export function favoriteSignInHref(modId: string): string {
  const redirect = encodeURIComponent(resumeFavoriteHref(modId));
  return `/sign-in/?mode=signup&ref=${MOD_DETAIL_FAVORITE_SOURCE}&redirect=${redirect}`;
}

/** True when `search` (e.g. `window.location.search`) carries the marker. */
export function hasResumeFavoriteMarker(search: string): boolean {
  return new URLSearchParams(search).get(RESUME_FAVORITE_PARAM) === '1';
}

/*
 * E130 (Cass, 2026-09-28) — the "Save this find" offer under the hero image.
 *
 * Replaces the E10 email box at the bottom of the left column, which produced
 * 0 `waitlist` rows in its whole life (source `mod-detail`, killed 09-21).
 * Same 401 → sign-up → return-and-save flow as the favorite button, but with
 * its own `ref`, its own resume marker value and its own two event names, so
 * the two surfaces never share a count: `?fav=1` is the button (E107),
 * `?fav=save` is the offer (E130). The offer lives outside the right-column
 * `.mv-ads` wrapper — a sibling, never a child — because that wrapper's
 * geometry is Mediavine's.
 */

/** `ref` on the sign-in URL and `source` on every event the offer fires. */
export const MOD_DETAIL_SAVE_SOURCE = 'mod-detail-save';

/** Value of the resume marker when the visitor came from the offer. */
export const RESUME_SAVE_VALUE = 'save';

/** GA4 event names — distinct from E107's so each surface reads alone. */
export const MOD_DETAIL_SAVE_EVENTS = {
  /** A signed-out visitor clicked the offer and was sent to sign-up. */
  signinRedirect: 'save_finds_signin_redirect',
  /** The save completed on return from sign-up (the offer's success). */
  afterSignin: 'save_finds_after_signin',
} as const;

/** Where the sign-in page should send an offer visitor back to. */
export function resumeSaveHref(modId: string): string {
  return `${modDetailPath(modId)}?${RESUME_FAVORITE_PARAM}=${RESUME_SAVE_VALUE}`;
}

/** The sign-up URL a signed-out offer click goes to. */
export function saveFindsSignInHref(modId: string): string {
  const redirect = encodeURIComponent(resumeSaveHref(modId));
  return `/sign-in/?mode=signup&ref=${MOD_DETAIL_SAVE_SOURCE}&redirect=${redirect}`;
}

/** True when `search` carries the offer's marker (exactly `fav=save`). */
export function hasResumeSaveMarker(search: string): boolean {
  return new URLSearchParams(search).get(RESUME_FAVORITE_PARAM) === RESUME_SAVE_VALUE;
}
