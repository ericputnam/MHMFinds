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

/*
 * E305 (Cass, 2026-10-31) — copy split-test on this surface.
 *
 * Why here: Patreon OAuth made 52 of the 102 accounts created 10-24→10-30 and
 * 1 of those 52 is on the email list, against 21 of 50 password sign-ups
 * (the E86 checkbox). This offer is the only email ask that cohort gets, and
 * it converted 3 of 77 viewers (3.9%, GA4 10-17→10-30). B1's kill rule
 * (10-15) says the lever is offer quality, not coverage — so this tests copy,
 * not a new surface.
 *
 * Arms are assigned by a stable hash of the session's own address, so a
 * visitor sees one arm on every device and no storage is written. Each arm
 * writes its own `waitlist.source` and puts it on both GA4 events, so the
 * read is `newsletter_signup` users / `patreon_connect_optin_view` users per
 * `customEvent:source` (registered) and rows per source in the DB. The
 * control keeps E173's source so the scoreboard series does not break.
 *
 * Cadence: both arms say "every two weeks" — E184 moved the newsletter to a
 * biweekly cadence on 10-29, and "once a week" was no longer true.
 *
 * Decision (pre-committed, read 2026-11-15 on 11-01→11-14): KEEP B as the
 * only copy if B's conversion ≥ 2× A's AND B wrote ≥ 4 rows; KILL B (back to
 * A only) if B ≤ A; otherwise extend once by 14 days.
 */

export type ConnectOptInArm = 'a' | 'b';

/** `waitlist.source` per arm. `a` is E173's source, unchanged. */
export const CONNECT_OPTIN_ARM_SOURCE: Record<ConnectOptInArm, string> = {
  a: PATREON_CONNECT_OPTIN_SOURCE,
  b: 'patreon-connect-optin-b',
};

export interface ConnectOptInCopy {
  /** Optional bold lead before the body sentence. */
  lead?: string;
  body: string;
  button: string;
  subscribed: string;
}

/** User-visible copy per arm. `a` is E173's copy with the cadence corrected. */
export const CONNECT_OPTIN_COPY: Record<ConnectOptInArm, ConnectOptInCopy> = {
  a: {
    body: 'Get the best new Sims 4 CC finds by email, every two weeks.',
    button: 'Email me new finds',
    subscribed: "You're on the list. The best new Sims 4 CC finds, every two weeks.",
  },
  b: {
    lead: 'Liked this find? Get the next ones.',
    body: 'The best new Sims 4 CC from MustHaveMods, in your inbox every two weeks.',
    button: 'Yes, send me the next ones',
    subscribed: "You're on the list. Your next finds arrive within two weeks.",
  },
};

/** FNV-1a 32-bit over the normalised address. Deterministic, no storage. */
function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Stable 50/50 arm for an address (trimmed, lower-cased). */
export function assignConnectOptInArm(email: string): ConnectOptInArm {
  return fnv1a(email.trim().toLowerCase()) % 2 === 0 ? 'a' : 'b';
}
