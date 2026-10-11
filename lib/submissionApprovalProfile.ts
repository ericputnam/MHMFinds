/**
 * The CreatorProfile an approved submission hangs its mod on (Nova, E183,
 * 2026-10-11).
 *
 * Before E183, approving a dashboard submission linked the new Mod to its
 * submitter only when the submitter already had a CreatorProfile — and the
 * dashboard path never creates one. DB 2026-10-11: 3 of 3 real submitter
 * accounts hold no profile, so every approved mod was hosted by its free-text
 * `author` string alone (Mod.creatorId null), invisible to the claim queue
 * and to anything that joins on the profile.
 *
 * Approval now ensures a profile, under the same rules as a claim (E122):
 *  - the handle is `pending-<slug>-<id8>` (pendingProfileHandle), never the
 *    public slug. The `author` field is free text — one approved submission
 *    on 2026-01-06 names a different person than the account that sent it —
 *    so approving a *mod* is not a review of the account's *identity*, and
 *    must not let the account occupy /creator/<slug>/;
 *  - isVerified is false (E151: only promotion, the human identity review,
 *    verifies a row);
 *  - the row then appears in /admin/creator-claims (it lists every
 *    `pending-*` handle), where promotion verifies it and frees a seed-held
 *    handle in one transaction (E166). Approval reuses that path rather than
 *    growing a second copy of the seed-displacement logic.
 *
 * This module is the pure half; the route is
 * app/api/admin/submissions/[id]/approve/.
 */

import { authorSlug } from './creatorSlug';
import { parseClaimSlug, pendingProfileHandle } from './creatorClaim';

export interface ApprovalProfileInput {
  isEdit: boolean;
  userId: string | null;
  submitterIsAdmin: boolean;
  /** Id of the submitter's existing CreatorProfile (CreatorProfile.userId is unique). */
  existingProfileId: string | null;
  author: string | null;
  displayName: string | null;
  username: string | null;
}

export type ApprovalProfilePlan =
  | { kind: 'link'; profileId: string }
  | {
      kind: 'create';
      slug: string;
      data: { userId: string; handle: string; isVerified: false };
    }
  | { kind: 'none'; reason: 'edit' | 'anonymous' | 'admin' | 'no-valid-slug' };

/**
 * The creator slug the pending handle is built from: the first of author,
 * display name, username that survives the claim form's own slug parser
 * (so a junk or platform author like "CurseForge" is never a handle).
 */
export function approvalSlug(input: Pick<ApprovalProfileInput, 'author' | 'displayName' | 'username'>): string | null {
  for (const raw of [input.author, input.displayName, input.username]) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const slug = parseClaimSlug(authorSlug(raw));
    if (slug) return slug;
  }
  return null;
}

export function planApprovalProfile(input: ApprovalProfileInput): ApprovalProfilePlan {
  // An edit updates a mod that already exists; its attribution is not ours to move.
  if (input.isEdit) return { kind: 'none', reason: 'edit' };
  if (!input.userId) return { kind: 'none', reason: 'anonymous' };
  // Idempotent: an existing profile (claim, earlier approval, or seed) is reused, never duplicated.
  if (input.existingProfileId) return { kind: 'link', profileId: input.existingProfileId };
  // Staff test submissions must not mint a creator (the onboarded count excludes admins too).
  if (input.submitterIsAdmin) return { kind: 'none', reason: 'admin' };
  const slug = approvalSlug(input);
  if (!slug) return { kind: 'none', reason: 'no-valid-slug' };
  return {
    kind: 'create',
    slug,
    data: { userId: input.userId, handle: pendingProfileHandle(slug, input.userId), isVerified: false },
  };
}
