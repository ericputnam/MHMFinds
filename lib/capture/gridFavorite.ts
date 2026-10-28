/**
 * Account capture through the heart on every mod *grid* (Cass, E279,
 * 2026-10-28).
 *
 * Until E279 a signed-out visitor who tapped the heart on a mod card on the
 * homepage, a game hub, a collection page or a creator page got
 * `alert('Please sign in to favorite mods')` — a dead end with no link, no
 * account offer and no event, on four of the busiest Next.js surfaces. The
 * same tap on /mods/[id] has gone to a save-intent sign-up since E107/E191,
 * and that sign-up completes for 16 of 67 offer visitors (23.9%, GA4
 * 2026-10-12→10-25) against ~6% before E191.
 *
 * Flow: click → POST /api/mods/<id>/favorite → 401 → `grid_favorite_signin_redirect{source}`
 * → /sign-in/?mode=signup&ref=<source>&redirect=<this page>?favmod=<id>
 * → the page sees `favmod`, strips it, POSTs once, fires
 * `grid_favorite_after_signin{source}`. A signed-out visitor carrying the
 * marker gets a 401 and nothing else — the resume path never redirects, so
 * there is no loop. The resume only ever *adds* a favorite.
 *
 * Every surface has its own `source`, so each one reads alone on the
 * scoreboard and in GA4 (E99 lesson). Client-safe: no server imports.
 */

/** `ref` on the sign-in URL and `source` on every event, one per grid surface. */
export const GRID_FAVORITE_SOURCES = {
  home: 'home-favorite',
  game: 'game-favorite',
  collection: 'collection-favorite',
  creator: 'creator-favorite',
} as const;

export type GridFavoriteSource =
  (typeof GRID_FAVORITE_SOURCES)[keyof typeof GRID_FAVORITE_SOURCES];

/** Query marker the sign-in page returns with; its value is the mod id. */
export const GRID_FAVORITE_PARAM = 'favmod';

/** GA4 event names — distinct from the /mods/[id] pair so the grids read alone. */
export const GRID_FAVORITE_EVENTS = {
  /** A signed-out visitor tapped a grid heart and was sent to sign-up. */
  signinRedirect: 'grid_favorite_signin_redirect',
  /** The save completed on return from sign-up (the funnel's success). */
  afterSignin: 'grid_favorite_after_signin',
} as const;

/** Mod ids are cuids; anything else in the marker is ignored, never POSTed. */
const MOD_ID_RE = /^[a-z0-9]{8,40}$/i;

export function isPlausibleModId(id: string | null | undefined): id is string {
  return typeof id === 'string' && MOD_ID_RE.test(id);
}

function withoutMarker(search: string): URLSearchParams {
  const params = new URLSearchParams(search);
  params.delete(GRID_FAVORITE_PARAM);
  return params;
}

/** The page the visitor was on, plus the resume marker for `modId`. */
export function gridResumeHref(pathname: string, search: string, modId: string): string {
  const params = withoutMarker(search);
  params.set(GRID_FAVORITE_PARAM, modId);
  return `${pathname}?${params.toString()}`;
}

/** The sign-up URL a signed-out grid heart tap goes to. */
export function gridFavoriteSignInHref(
  source: GridFavoriteSource,
  pathname: string,
  search: string,
  modId: string,
): string {
  const redirect = encodeURIComponent(gridResumeHref(pathname, search, modId));
  return `/sign-in/?mode=signup&ref=${source}&redirect=${redirect}`;
}

/** The mod id in the resume marker, or null when absent or not id-shaped. */
export function readGridResumeMod(search: string): string | null {
  const id = new URLSearchParams(search).get(GRID_FAVORITE_PARAM);
  return isPlausibleModId(id) ? id : null;
}

/** The current URL with the marker removed (for history.replaceState). */
export function stripGridResumeMarker(pathname: string, search: string, hash: string): string {
  const qs = withoutMarker(search).toString();
  return `${pathname}${qs ? `?${qs}` : ''}${hash}`;
}
