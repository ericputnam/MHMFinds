/**
 * Creator "claim this page" path (Nova, E122, 2026-09-27).
 *
 * Every /creator/[slug]/ page (534 of them, E85) and the /creator/ hub
 * (E97) carry an "Are you <name>? Claim this page" link. Until E122 that
 * link went to the bare /submit-mod/ form, which
 *
 *   1. wrote a ModSubmission with no `userId` and never touched
 *      CreatorProfile — while the scoreboard defines "creators onboarded"
 *      as CreatorProfile.userId ∩ ModSubmission.userId. So the only public
 *      onboarding ask on the site could not move the metric it exists for,
 *      by construction (0 onboarded since the charter, 4 submissions ever);
 *   2. carried no trace of which creator page sent the visitor, so the
 *      click could not be read in GA4 either (/submit-mod/ 6 views/28d to
 *      09-25, none attributable).
 *
 * This module is pure (no server import) so the client form and the
 * creator page can share it without pulling Prisma into the bundle. The
 * server side of the claim lives in app/api/submit-mod/route.ts.
 */

import { authorSlug, isJunkAuthorSlug, isNonCreatorSlug, creatorHref } from './creatorSlug';

/** Query-string key carried from a creator page into /submit-mod/. */
export const CLAIM_PARAM = 'creator';

/** Body field the form posts and the API reads. */
export const CLAIM_BODY_FIELD = 'claimedCreatorSlug';

/**
 * `ModSubmission.source` for a submission that arrived through a claim
 * link. The scoreboard and the admin queue can select on it; anonymous
 * form submissions keep the schema default ("Creator Upload").
 */
export const CLAIM_SOURCE = 'Creator Claim';

/** Longest slug the claim path accepts; authorSlug output is rarely >40. */
export const MAX_CLAIM_SLUG = 80;

/** Slug charset, identical to what authorSlug() can emit. */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * The claim URL for one creator page. Same trailing-slash rule as every
 * other hand-authored href (next.config.js trailingSlash: true).
 */
export function claimHref(slug: string): string {
  return `/submit-mod/?${CLAIM_PARAM}=${encodeURIComponent(slug)}`;
}

/**
 * Where an anonymous visitor goes to sign in and come back to the claim
 * form. /sign-in/ resolves `redirect` through app/sign-in/returnTo.ts
 * (E118), which only accepts same-origin relative paths — this one is.
 */
export function claimSignInHref(slug: string): string {
  return `/sign-in/?redirect=${encodeURIComponent(claimHref(slug))}`;
}

/**
 * Validate a raw `?creator=` / body value. Returns the slug when it is
 * something a creator page could exist for, else null. Never "cleans up"
 * a bad value: a slug that would not survive authorSlug() unchanged is
 * not one we emitted.
 */
export function parseClaimSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const slug = raw.trim();
  if (!slug || slug.length > MAX_CLAIM_SLUG) return null;
  if (!SLUG_RE.test(slug)) return null;
  if (authorSlug(slug) !== slug) return null;
  if (isJunkAuthorSlug(slug) || isNonCreatorSlug(slug)) return null;
  return slug;
}

/** The creator page a valid claim points back at (for copy and links). */
export function claimedPageHref(slug: string): string {
  return creatorHref(slug);
}

/** Prefix of every unreviewed claim's CreatorProfile.handle. */
export const PENDING_HANDLE_PREFIX = 'pending-';

/**
 * The CreatorProfile.handle to create for a signed-in claimant.
 *
 * Deliberately NOT the slug: /creator/[slug]/ joins CreatorProfile on
 * `handle === slug` and renders that row's bio, website and verified
 * badge. Creating the row under the public slug at claim time would let
 * any signed-in account occupy a real creator's page identity before a
 * human has looked at the submission. The pending handle never collides
 * with a page; an admin promotes it to the bare slug at review. The
 * scoreboard's "creators onboarded" counts CreatorProfile.userId ∩
 * ModSubmission.userId, so the pending row already moves the metric.
 */
export function pendingProfileHandle(slug: string, userId: string): string {
  return `${PENDING_HANDLE_PREFIX}${slug}-${userId.slice(-8).toLowerCase()}`;
}

/** True when a handle is an unreviewed claim (never a public page join). */
export function isPendingHandle(handle: string): boolean {
  return handle.startsWith(PENDING_HANDLE_PREFIX);
}
