/**
 * Admin review of creator claims (Nova, E129, 2026-09-28).
 *
 * E122 (#195) made "Claim this page" on /creator/[slug]/ create a
 * CreatorProfile for the signed-in claimant under a `pending-<slug>-<id8>`
 * handle, so a claim can never squat a real creator's public page before a
 * human has looked at it. But nothing in the admin could *find* those rows
 * or turn one into the public handle: /admin/creators lists profiles with
 * no notion of "pending", and its PATCH accepts any handle with no check.
 * A submitted claim sat invisible and no claimant could ever reach a live,
 * attributed creator page.
 *
 * This module is the pure half — every decision the admin route makes,
 * testable without Prisma or a session. The route lives at
 * app/api/admin/creator-claims/.
 */

import { isPendingHandle, parseClaimSlug, PENDING_HANDLE_PREFIX } from './creatorClaim';

/** `AdminAuditLog.resource` for every claim review action. */
export const CLAIM_AUDIT_RESOURCE = 'creator-claim';

/** Longest rejection reason stored in the audit log. */
export const MAX_REJECT_REASON = 500;

/**
 * The creator slug a pending handle was created for, or null.
 *
 * pendingProfileHandle() emits `pending-<slug>-<last 8 of userId>`; the
 * slug itself may contain hyphens, so strip the prefix and the final
 * segment only, then re-validate with the same parser the claim form uses.
 */
export function slugFromPendingHandle(handle: string): string | null {
  if (typeof handle !== 'string' || !isPendingHandle(handle)) return null;
  const rest = handle.slice(PENDING_HANDLE_PREFIX.length);
  const cut = rest.lastIndexOf('-');
  if (cut <= 0) return null;
  const slug = parseClaimSlug(rest.slice(0, cut));
  if (!slug || isPendingHandle(slug)) return null;
  return slug;
}

export type ReviewAction =
  | { action: 'promote'; slug: string | null }
  | { action: 'reject'; reason: string };

/**
 * Parse the admin's POST body. Unknown shapes are null (→ 400), never
 * coerced into an action — a malformed request must not promote anything.
 */
export function parseReviewAction(body: unknown): ReviewAction | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  if (b.action === 'promote') {
    if (b.slug === undefined || b.slug === null || b.slug === '') {
      return { action: 'promote', slug: null };
    }
    const slug = parseClaimSlug(b.slug);
    // An explicit but invalid slug is an error, not "use the default".
    if (!slug) return null;
    return { action: 'promote', slug };
  }
  if (b.action === 'reject') {
    const reason = typeof b.reason === 'string' ? b.reason.trim().slice(0, MAX_REJECT_REASON) : '';
    return { action: 'reject', reason };
  }
  return null;
}

export type ReviewDecision =
  | { ok: true; handle: string }
  | { ok: false; status: 400 | 404 | 409; error: string };

/**
 * Decide a promotion. `conflictingProfileId` is the id of any *other*
 * CreatorProfile already holding the target handle (null when free).
 * The unique index on handle is the last line of defence against a race;
 * this is the readable one.
 */
export function planPromotion(input: {
  currentHandle: string;
  requestedSlug: string | null;
  conflictingProfileId: string | null;
  profileId: string;
}): ReviewDecision {
  if (!isPendingHandle(input.currentHandle)) {
    return { ok: false, status: 409, error: 'Profile is not a pending claim' };
  }
  const target = input.requestedSlug ?? slugFromPendingHandle(input.currentHandle);
  if (!target || !parseClaimSlug(target) || isPendingHandle(target)) {
    return { ok: false, status: 400, error: 'No valid creator slug to promote to' };
  }
  if (input.conflictingProfileId && input.conflictingProfileId !== input.profileId) {
    return { ok: false, status: 409, error: `Handle "${target}" already belongs to another profile` };
  }
  return { ok: true, handle: target };
}

/**
 * Decide a rejection. A rejected claim's pending profile is deleted (so it
 * stops counting as "creators onboarded"), but never when mods already
 * point at it: Mod.creatorId would be silently nulled, detaching approved
 * mods from their account. Those need a human, not a button.
 */
export function planRejection(input: {
  currentHandle: string;
  linkedModCount: number;
}): { ok: true } | { ok: false; status: 409; error: string } {
  if (!isPendingHandle(input.currentHandle)) {
    return { ok: false, status: 409, error: 'Profile is not a pending claim' };
  }
  if (input.linkedModCount > 0) {
    return {
      ok: false,
      status: 409,
      error: `${input.linkedModCount} mod(s) already link to this profile; promote it or detach them first`,
    };
  }
  return { ok: true };
}
