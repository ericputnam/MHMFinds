// E352 (Pip, 2026-11-06) — reader-to-reader share links for mod and
// collection pages.
//
// Why a neutral `via=share` param and not UTM or `ref`: a UTM would overwrite
// the visit's real source in GA4 (a pin someone forwards would stop reading as
// Pinterest), and `ref` values already start new GA4 sessions as Unassigned
// (mod-detail-optin, 11-05). `via` is ignored by GA4's attribution, so the
// channel stays honest, while `landingPagePlusQueryString` still lets us count
// every landing that came from a shared link. The canonical tag on every page
// is the clean URL, so the param cannot create a duplicate in any index.
//
// Client-safe: no server imports.

export const SITE_ORIGIN = 'https://musthavemods.com';

/** Query param stamped on every shared URL. */
export const SHARE_PARAM = 'via';

/** Value of SHARE_PARAM. Count landings with `via=share` in GA4. */
export const SHARE_VALUE = 'share';

/** GA4 recommended event name (method / content_type / item_id). */
export const SHARE_EVENT = 'share';

export type ShareContentType = 'mod' | 'collection';
export type ShareMethod = 'web_share' | 'clipboard' | 'prompt';

/**
 * Absolute share URL for a site path. Forces the apex host and a trailing
 * slash (trailingSlash: true — a slashless URL costs a 308 on every click),
 * drops any existing query and hash, then appends `via=share`.
 */
export function buildShareUrl(path: string): string {
  let pathname = path.trim() || '/';
  try {
    // Accept an absolute URL too, but never keep its host.
    pathname = new URL(pathname, SITE_ORIGIN).pathname;
  } catch {
    pathname = '/';
  }
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;
  if (!pathname.endsWith('/')) pathname = `${pathname}/`;
  return `${SITE_ORIGIN}${pathname}?${SHARE_PARAM}=${SHARE_VALUE}`;
}

/** True when a landing URL (or query string) came from a shared link. */
export function isShareLanding(urlOrQuery: string): boolean {
  const q = urlOrQuery.includes('?') ? urlOrQuery.slice(urlOrQuery.indexOf('?') + 1) : urlOrQuery;
  return new URLSearchParams(q).get(SHARE_PARAM) === SHARE_VALUE;
}

/** Fires the GA4 `share` event. Never throws; no-ops without gtag. */
export function trackShare(params: {
  method: ShareMethod;
  contentType: ShareContentType;
  itemId: string;
}): void {
  if (typeof window === 'undefined') return;
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (!gtag) return;
  try {
    gtag('event', SHARE_EVENT, {
      method: params.method,
      content_type: params.contentType,
      item_id: params.itemId,
    });
  } catch {
    // Analytics must never break the share.
  }
}
