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
import { resolveIngestContentType } from './services/contentTypeDetector';

/** The submission columns a new catalog row is built from (ModSubmission, non-edit). */
export interface SubmissionModSource<Img = string | null, Imgs = string[], Price = unknown> {
  modName: string;
  description: string;
  shortDescription: string | null;
  version: string | null;
  gameVersion: string | null;
  category: string;
  tags: string[];
  thumbnail: Img;
  images: Imgs;
  modUrl: string;
  downloadUrl: string | null;
  sourceUrl: string | null;
  source: string | null;
  author: string | null;
  isFree: boolean;
  price: Price;
  currency: string | null;
  isNSFW: boolean;
}

/**
 * The `Mod` row an approved (non-edit) submission becomes — one builder for
 * the admin approve route and for scripts/agents/approve-submissions.ts
 * (E304, 2026-10-31), so a scripted approval and a dashboard click write
 * the same row.
 *
 * E304 also sets `contentType` here, the way every other ingest path does
 * (`resolveIngestContentType`, E168: confident title answer, else the
 * title+description detector, then the room/holiday guards; `null` when
 * nothing confident — NULL beats a guess). Before E304 the route never
 * wrote the column, so an approved mod joined no `/games/sims-4/*` facet
 * page until a later retag pass happened to fill it (the 3 approved mods
 * on 2026-10-31 carry a type, none of it written at approval). The
 * description here is the creator's own text for one item, not a shared
 * blog-post description, so it cannot contaminate a whole facet.
 */
export function newModDataFromSubmission<S extends SubmissionModSource>(
  s: S,
  rehosted: { thumbnail: S['thumbnail']; images: S['images'] },
) {
  return {
    title: s.modName,
    description: s.description,
    shortDescription: s.shortDescription,
    version: s.version,
    gameVersion: s.gameVersion,
    category: s.category,
    tags: s.tags.length > 0 ? s.tags : [s.category],
    thumbnail: rehosted.thumbnail,
    images: rehosted.images,
    downloadUrl: s.downloadUrl || s.modUrl,
    sourceUrl: s.sourceUrl || s.modUrl,
    source: s.source || 'User Submission',
    author: s.author,
    isFree: s.isFree,
    price: s.price as S['price'],
    currency: s.currency,
    isNSFW: s.isNSFW,
    contentType: resolveIngestContentType(s.modName, s.description, null) ?? null,
  };
}

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
