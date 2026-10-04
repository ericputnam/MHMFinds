/**
 * One-click weekly-email opt-in for visitors who just came back from Patreon
 * connect on /go/[modId] (Cass, E173, 2026-10-04).
 *
 * Why this surface: the sign-up form's default-off opt-in (E86,
 * `signup-optin`) is the best email source on the site — 37 of 80 password
 * sign-ups since 09-23 ticked it (46%). But 66 of the 148 accounts created
 * since 09-23 (43 of 93 in the 7 days to 10-04) were created by Patreon OAuth
 * on /go, which never shows that form. Those accounts are offered no email
 * at all: 2 of 66 are subscribed, both through other surfaces. The visitor
 * lands back on /go with `?patreon=connected` (E74), signed in, with an
 * email address on the session — the one moment an explicit one-click
 * opt-in needs no typing.
 *
 * Consent: the visitor clicks a button whose label says what they get and
 * the copy names the address it goes to. Nothing is pre-ticked, nothing is
 * sent on view, and the request carries only the session's own address.
 */

/** `waitlist.source` for rows this surface creates (scoreboard attribution). */
export const PATREON_CONNECT_OPTIN_SOURCE = 'patreon-connect-optin';

/** GA4 events. `newsletter_signup` is the shared conversion; the view is ours. */
export const PATREON_CONNECT_OPTIN_EVENTS = {
  /** The offer rendered for a signed-in post-connect visitor (denominator). */
  view: 'patreon_connect_optin_view',
  /** A NEW waitlist row was created (never fired for an existing address). */
  signup: 'newsletter_signup',
} as const;

/** The endpoint the opt-in posts to (`trailingSlash: true` is global). */
export const PATREON_CONNECT_OPTIN_ENDPOINT = '/api/waitlist/';

export interface ConnectOptInVisibility {
  /** `?patreon=connected` is on the URL (E74 marker). */
  postConnect: boolean;
  /** next-auth `useSession().status`. */
  sessionStatus: 'authenticated' | 'unauthenticated' | 'loading';
  /** `session.user.email`, if any. */
  email: string | null | undefined;
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Show the offer only to a signed-in visitor who just came back from Patreon
 * connect and whose session carries a usable address. A signed-out visitor
 * (or a stale marker on a shared link) never sees it.
 */
export function shouldShowConnectOptIn(v: ConnectOptInVisibility): boolean {
  return (
    v.postConnect &&
    v.sessionStatus === 'authenticated' &&
    typeof v.email === 'string' &&
    EMAIL_SHAPE.test(v.email.trim())
  );
}

export type ConnectOptInResult = 'subscribed' | 'already' | 'error';

/** Interpret a `/api/waitlist` response body. Only a new row is `subscribed`. */
export function interpretWaitlistResponse(
  ok: boolean,
  body: { success?: unknown; alreadyExists?: unknown } | null | undefined
): ConnectOptInResult {
  if (!ok || !body || body.success !== true) return 'error';
  return body.alreadyExists ? 'already' : 'subscribed';
}
