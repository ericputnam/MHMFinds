/**
 * One-click consent links for the re-permission campaign (Cass, 2026-09-10)
 *
 * The re-permission email (`reports/funnel/drafts/re-permission-email-2026-09-08.md`)
 * asks ~788 registered account-holders one time whether they want the weekly email.
 * The only thing that records a "yes" is a click on a link built here.
 *
 * Design, and why each part is the way it is:
 *
 * - **Consent is the existence of a `waitlist` row** with `source = 're-permission'`.
 *   There is no marketing-consent column anywhere in the schema and adding one is a
 *   Tier 2 migration, so this endpoint writes only to columns that already exist. The
 *   scoreboard's "Subscribers by source" line then attributes the whole campaign for
 *   free, exactly as it does for `footer` / `go-interstitial` / `collection-page`.
 *
 * - **The token is domain-separated from the unsubscribe token** (`signPurposeToken`
 *   with the purpose below). Same signing key, different message, so a confirm token
 *   cannot be replayed against `/api/unsubscribe/` and an unsubscribe token cannot
 *   subscribe anybody. Without that separation the "yes, send it" link in the email
 *   would double as an unsubscribe link for the same address.
 *
 * - **The address is never in a link without its HMAC.** The endpoint does no lookup on
 *   `e` alone, which is what stops a stranger from subscribing someone else's address by
 *   editing a query string — the failure mode that turns a permission email into spam.
 *
 * - **Trailing slash on the path**: `next.config.js` sets `trailingSlash: true`, so the
 *   bare `/api/subscribe/confirm` answers 308. Browsers follow it, but a 308 on a link
 *   we control is a needless round-trip and, on the unsubscribe route, a real bug
 *   (PR #67). Every URL that leaves this module carries the slash.
 */

import {
  baseUrl,
  encodeEmailParam,
  decodeEmailParam,
  normalizeEmail,
  signPurposeToken,
  verifyPurposeToken,
} from './unsubscribe';

/** HMAC purpose string. Changing it invalidates every confirm link already in an inbox. */
export const CONFIRM_PURPOSE = 'subscribe-confirm';

/** Trailing slash on purpose — see the header comment. */
export const CONFIRM_PATH = '/api/subscribe/confirm/';

/** `waitlist.source` written by a confirmed click. The campaign's attribution key. */
export const CONFIRM_SOURCE = 're-permission';

/** Deterministic per-recipient consent token. Same address + same key => same token. */
export function signConfirmToken(email: string): string {
  return signPurposeToken(CONFIRM_PURPOSE, email);
}

/** Timing-safe check. Returns false on any malformed input rather than throwing. */
export function verifyConfirmToken(email: string, token: string): boolean {
  return verifyPurposeToken(CONFIRM_PURPOSE, email, token);
}

/** Inverse of the `e` parameter. Null when the value is not a decodable address. */
export function decodeConfirmEmail(e: string): string | null {
  return decodeEmailParam(e);
}

/** The link behind "YES, SEND IT" in the re-permission email. */
export function buildConfirmUrl(email: string, site?: string): string {
  const normalized = normalizeEmail(email);
  return `${baseUrl(site)}${CONFIRM_PATH}?e=${encodeEmailParam(
    normalized
  )}&t=${signConfirmToken(normalized)}`;
}
