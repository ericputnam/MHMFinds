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

import type { Prisma } from '@prisma/client';
import {
  isPendingHandle,
  parseClaimSlug,
  PENDING_HANDLE_PREFIX,
  PLACEHOLDER_ACCOUNT_DOMAINS,
} from './creatorClaim';

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

/**
 * Seed-held handles (Nova, E166, 2026-10-03).
 *
 * All 20 CreatorProfile rows in the DB on 2026-10-02 were seed rows: a
 * script-minted User on a PLACEHOLDER_ACCOUNT_DOMAINS address with 0 OAuth
 * accounts. Eight of their handles equal a live /creator/<slug>/ page, so
 * before E166 the real creator claiming any of those eight pages could
 * never be promoted — planPromotion() returned 409 "already belongs to
 * another profile" for a profile nobody owns. Promotion now moves the seed
 * row aside to `seed-<handle>` in the same transaction as the promote: the
 * claimant lands on the canonical slug, and the seed row keeps its id and
 * every Mod.creatorId pointing at it until a human re-attributes them.
 */
export const SEED_HANDLE_PREFIX = 'seed-';

/** Where a displaced seed profile's handle goes. */
export function seedHandleFor(handle: string): string {
  return `${SEED_HANDLE_PREFIX}${handle}`;
}

/**
 * The profile currently holding the promotion target. The route reduces
 * the holder's email to `placeholderAccount` before calling the planner,
 * so no address ever reaches a decision, response or audit row.
 */
export interface HandleHolder {
  id: string;
  placeholderAccount: boolean;
  oauthAccounts: number;
}

/**
 * A holder may be displaced only on positive evidence on both counts:
 * a placeholder account (cannot be a person) that has never signed in.
 * The same predicate as E158's isUnverifyTarget, minus the verified flag
 * (E158 already cleared it, and a still-verified seed is no more owned).
 */
export function isSeedHolder(holder: HandleHolder | null | undefined): boolean {
  return Boolean(holder) && holder!.placeholderAccount === true && holder!.oauthAccounts === 0;
}

/**
 * The same predicate as a Prisma filter, for re-asserting it on the write:
 * if the seed account signed in (or got a real email) between the read and
 * the transaction, the rename matches 0 rows, the promote then hits the
 * unique index (P2002 → 409) and the whole transaction rolls back.
 * Derived from PLACEHOLDER_ACCOUNT_DOMAINS, never a copy of it.
 */
export function seedHolderWhere(): Prisma.CreatorProfileWhereInput {
  return {
    user: {
      OR: PLACEHOLDER_ACCOUNT_DOMAINS.map((domain) => ({
        email: { endsWith: `@${domain}`, mode: 'insensitive' as const },
      })),
      accounts: { none: {} },
    },
  };
}

export type ReviewDecision =
  | {
      ok: true;
      handle: string;
      /** Non-null when a seed profile must be renamed aside in the same transaction. */
      displaceSeed: { profileId: string; toHandle: string } | null;
    }
  | { ok: false; status: 400 | 404 | 409; error: string };

/**
 * Decide a promotion. `conflictingProfileId` is the id of any *other*
 * CreatorProfile already holding the target handle (null when free).
 * `conflictingIsSeed` says that holder passed isSeedHolder(); then the
 * holder is renamed to seed-<handle> instead of refusing (E166), unless
 * `seedHandleTaken` (another row already holds seed-<handle>) — that stays
 * a 409 for a human. The unique index on handle is the last line of
 * defence against a race; this is the readable one.
 */
export function planPromotion(input: {
  currentHandle: string;
  requestedSlug: string | null;
  conflictingProfileId: string | null;
  profileId: string;
  conflictingIsSeed?: boolean;
  seedHandleTaken?: boolean;
}): ReviewDecision {
  if (!isPendingHandle(input.currentHandle)) {
    return { ok: false, status: 409, error: 'Profile is not a pending claim' };
  }
  const target = input.requestedSlug ?? slugFromPendingHandle(input.currentHandle);
  if (!target || !parseClaimSlug(target) || isPendingHandle(target)) {
    return { ok: false, status: 400, error: 'No valid creator slug to promote to' };
  }
  if (input.conflictingProfileId && input.conflictingProfileId !== input.profileId) {
    if (input.conflictingIsSeed !== true) {
      return { ok: false, status: 409, error: `Handle "${target}" already belongs to another profile` };
    }
    if (input.seedHandleTaken !== false) {
      return {
        ok: false,
        status: 409,
        error: `Handle "${target}" is held by a seed profile and "${seedHandleFor(target)}" is taken; resolve by hand`,
      };
    }
    return {
      ok: true,
      handle: target,
      displaceSeed: { profileId: input.conflictingProfileId, toHandle: seedHandleFor(target) },
    };
  }
  return { ok: true, handle: target, displaceSeed: null };
}

/**
 * The write a promotion performs (E151, 2026-10-01).
 *
 * /creator/[slug]/ joins CreatorProfile on `handle === slug` and then gates
 * BOTH the verified badge and the claim card (E144) on `isVerified`. The
 * claim form creates the pending row at the schema default (false), and
 * before E151 promotion changed only the handle — so the first promoted
 * claimant would have landed on their own page still reading "Claim this
 * page". Promotion *is* the human review, so it is what verifies the row.
 * User.isCreator is still not touched here (its own admin screen).
 */
export function promotionData(handle: string): { handle: string; isVerified: true } {
  return { handle, isVerified: true };
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
