/**
 * "Save this mod" account offer on /go/[modId] (Cass, E152, 2026-10-01).
 *
 * Replaces the E4 email box ("Get new mods weekly", source `go-interstitial`)
 * in the same slot — a sibling of the `.mv-ads` wrapper, below it, never a
 * child of it and never inside `<aside id="secondary">`. E4 was killed on
 * 09-30 at 6 subscribers / 4,125 sessions = 1.45/1K over 28 days, under its
 * ≥2/1K bar. Accounts, not email, are where owned adds come from (91 of 119
 * in the week to 09-30), and since #223 a saved mod has a page to live on
 * (`/account/favorites/`), so the offer can promise "find it again".
 *
 * Flow (same shape as E107/E130 on /mods/[id], own names so it reads alone):
 *   click → POST /api/mods/[id]/favorite
 *     ok / 400 "already favorited" → saved (signed-in visitor)
 *     401 → `go_save_signin_redirect`
 *         → /sign-in/?mode=signup&ref=go-save&redirect=/go/<id>/?save=1
 *         → back on /go, the page sees `?save=1`, POSTs once, fires
 *           `go_save_after_signin`, and removes only that marker.
 * A signed-out visitor carrying the marker gets a 401 and nothing else — the
 * resume path never navigates to sign-in, so there is no loop.
 *
 * Client-safe: no server imports (lib/favorites.ts pulls in Prisma; the
 * path comes from the client-safe lib/favoritesPath.ts).
 */
import { FAVORITES_PATH } from '../../../lib/favoritesPath';

/** `ref` on the sign-in URL and `source` on every event this surface fires. */
export const GO_SAVE_SOURCE = 'go-save';

/** Query marker the sign-in page returns with, so the save completes. */
export const GO_SAVE_RESUME_PARAM = 'save';

/** GA4 event names — distinct from every other capture event (E99 lesson). */
export const GO_SAVE_EVENTS = {
  /** A signed-out visitor clicked the offer and was sent to sign-up. */
  signinRedirect: 'go_save_signin_redirect',
  /** The save completed on return from sign-up (the offer's success). */
  afterSignin: 'go_save_after_signin',
} as const;

/** The signed-in favorites page (Rowan, E140, #223) — the real constant. */
export const GO_SAVE_FAVORITES_PATH = FAVORITES_PATH;

/** Path of the interstitial — `trailingSlash: true` is global, keep the slash. */
export function goPath(modId: string): string {
  return `/go/${encodeURIComponent(modId)}/`;
}

/** Where the sign-in page should send an offer visitor back to. */
export function goSaveResumeHref(modId: string): string {
  return `${goPath(modId)}?${GO_SAVE_RESUME_PARAM}=1`;
}

/** The sign-up URL a signed-out offer click goes to. */
export function goSaveSignInHref(modId: string): string {
  const redirect = encodeURIComponent(goSaveResumeHref(modId));
  return `/sign-in/?mode=signup&ref=${GO_SAVE_SOURCE}&redirect=${redirect}`;
}

/** True when `search` (e.g. `window.location.search`) carries the marker. */
export function hasGoSaveMarker(search: string): boolean {
  return new URLSearchParams(search).get(GO_SAVE_RESUME_PARAM) === '1';
}

/**
 * `search` with only the resume marker removed, so a reload does not repeat
 * the save while other markers (e.g. `?patreon=connected`, E74) survive.
 * Returns '' or a string starting with '?'.
 */
export function stripGoSaveMarker(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(GO_SAVE_RESUME_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
