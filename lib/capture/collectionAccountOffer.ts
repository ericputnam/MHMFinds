/**
 * Account alternative inside the collection-hub email block (Cass, E380,
 * 2026-11-09).
 *
 * Why: the hub email block (E323, directly under the grid) had 974 GA4 form
 * viewers and 0 newsletter_signup in 11-02→11-08, on 4,700 hub sessions. The
 * homepage strip carries the same email form plus a "create a free account"
 * link (E73); that link went 4 account_cta_click → 4 sign_up{source=home-hero}
 * in the same week, and accounts are most of the owned adds (+134 of 171 in
 * the 7 days to 11-08). The hub block offered email only.
 *
 * The link reuses `collection-page` — the same source the email form writes —
 * so the surface reads as one row: newsletter_signup{collection-page} for
 * email, sign_up{collection-page} for accounts (the sign-in page copies
 * `ref` into `source`). After sign-up the visitor returns to the hub
 * (`redirect` goes through `resolveSignInReturn`, same-origin only).
 *
 * Client-safe: no server imports.
 */
export const COLLECTION_CAPTURE_SOURCE = 'collection-page';

/** GA4 event fired on click; same name the homepage strip uses. */
export const COLLECTION_ACCOUNT_CTA_EVENT = 'account_cta_click';

/** Sign-up URL for a hub at `hubPath` (keeps the trailing slash, trailingSlash: true). */
export function collectionAccountHref(hubPath: string): string {
  const params = new URLSearchParams({
    mode: 'signup',
    ref: COLLECTION_CAPTURE_SOURCE,
    redirect: hubPath,
  });
  return `/sign-in/?${params.toString()}`;
}
