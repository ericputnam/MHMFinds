/**
 * Where /sign-in/ sends a visitor after a successful sign-in or sign-up
 * (Cass, E118, 2026-09-26).
 *
 * Before E118 both success branches did
 * `router.push(searchParams.get('redirect') || '/')`, which had two faults:
 *
 * 1. Open redirect. `?redirect=https://evil.example/` or `//evil.example`
 *    went to `router.push` verbatim, i.e. a phishing hop that starts on our
 *    own sign-in form.
 * 2. Everyone without an explicit `redirect` went to `/`. The Navbar's
 *    "Sign in" link carries no parameter, and GA4 shows most /sign-in/ views
 *    arrive from collection, search and mod pages — yet 11 of the 12
 *    page_views referred by /sign-in/ (09-12→09-25) were the homepage. A
 *    visitor who signed up to save a find lost the page they found it on.
 *
 * Resolution order, first safe value wins:
 *   `redirect` → `callbackUrl` (NextAuth's name) → same-origin
 *   `document.referrer` → `/`.
 *
 * "Safe" means a same-origin, relative path. Anything else — an absolute
 * URL to another host, a protocol-relative `//host`, a backslash trick
 * (`/\host`, which browsers normalise to `//host`), a `javascript:` URL,
 * control characters — is dropped, never "cleaned up". Auth pages
 * themselves are never a return target, so a visitor cannot bounce back
 * into the form they just submitted.
 *
 * Client-only helper; the NextAuth server config is untouched (Tier 2).
 */

/** Where a visitor goes when nothing better is known. */
export const SIGNIN_RETURN_FALLBACK = '/';

/**
 * Paths that must never be a post-sign-in destination. Matched on the path
 * segment, so `/sign-in-tips/` (hypothetical) would still be allowed.
 */
export const NON_RETURN_PATHS = [
  '/sign-in',
  '/forgot-password',
  '/set-password',
  '/admin/login',
  '/api',
] as const;

function isNonReturnPath(pathname: string): boolean {
  const lower = pathname.toLowerCase();
  return NON_RETURN_PATHS.some(
    (p) => lower === p || lower === `${p}/` || lower.startsWith(`${p}/`)
  );
}

// Any ASCII control character, or a backslash. `new URL` silently strips
// tab/newline, which is how `/\t/evil.example` becomes `//evil.example`, and
// browsers treat `\` as `/`, which is how `/\evil.example` does.
// eslint-disable-next-line no-control-regex
const UNSAFE_CHARS = /[\u0000-\u001f\u007f\\]/;

/**
 * Returns `raw` as a same-origin relative path (pathname + search + hash),
 * or `null` if it is not one. `origin` is the site's own origin, e.g.
 * `window.location.origin`.
 */
export function safeReturnPath(
  raw: string | null | undefined,
  origin: string
): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  if (UNSAFE_CHARS.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, origin);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  if (isNonReturnPath(url.pathname)) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Returns the path of `referrer` when it is an absolute URL on `origin`,
 * otherwise `null`. Used only as a fallback — a cross-site referrer (Google,
 * Pinterest) is never a destination.
 */
export function safeReferrerPath(
  referrer: string | null | undefined,
  origin: string
): string | null {
  if (typeof referrer !== 'string' || referrer.length === 0) return null;
  let url: URL;
  try {
    url = new URL(referrer);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  return safeReturnPath(`${url.pathname}${url.search}${url.hash}`, origin);
}

export interface SignInReturnInput {
  /** `?redirect=` — what the site's own capture surfaces send (E107). */
  redirect?: string | null;
  /** `?callbackUrl=` — what NextAuth and middleware conventionally send. */
  callbackUrl?: string | null;
  /** `document.referrer` at the time the sign-in page loaded. */
  referrer?: string | null;
  /** `window.location.origin`. */
  origin: string;
}

/** The single place the sign-in page decides where to send a visitor. */
export function resolveSignInReturn(input: SignInReturnInput): string {
  return (
    safeReturnPath(input.redirect, input.origin) ??
    safeReturnPath(input.callbackUrl, input.origin) ??
    safeReferrerPath(input.referrer, input.origin) ??
    SIGNIN_RETURN_FALLBACK
  );
}
