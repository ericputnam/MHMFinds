/**
 * Backfill the E183 approval profile for submissions approved BEFORE #274
 * (Nova, E190, 2026-10-12). Pure half; I/O is approval-profile-backfill.ts.
 *
 * E183 made the approve route mint a `pending-<slug>-<id8>` CreatorProfile
 * and set Mod.creatorId. It did not touch the 4 submissions approved
 * 2025-11-29 → 2026-01-10 (DB 2026-10-12): 2 anonymous (no account, one has
 * no mod at all), 1 whose free-text author names someone other than the
 * account that sent it, and 1 (doree) where author and account agree.
 *
 * The planner reuses E183's `planApprovalProfile` so a backfilled row gets
 * exactly the handle a live approval would have given it, and adds ONE
 * backfill-only rule: the author must name the account
 * (`authorNamesAccount`). A live approval has an admin looking at the
 * submission in that moment; a backfill has nobody, so a free-text author
 * that names someone else is skipped, never guessed. The pending profile
 * stays unverified either way — promotion in /admin/creator-claims is still
 * the identity review (E151/E166).
 */
import { planApprovalProfile } from '../../lib/submissionApprovalProfile';

/** Hard cap on rows one apply may write. The known population is 1. */
export const MAX_BACKFILL_ROWS = 5;

export interface BackfillInputRow {
  submissionId: string;
  status: string;
  isEdit: boolean;
  userId: string | null;
  submitterIsAdmin: boolean;
  existingProfileId: string | null;
  author: string | null;
  displayName: string | null;
  username: string | null;
  approvedModId: string | null;
  /** False when approvedModId is null or points at a deleted mod. */
  modExists: boolean;
  modCreatorId: string | null;
}

export type BackfillSkip =
  | 'not-approved'
  | 'edit'
  | 'anonymous'
  | 'admin'
  | 'no-mod'
  | 'already-linked'
  | 'author-not-account'
  | 'no-valid-slug';

export type BackfillDecision =
  | { submissionId: string; action: 'create'; userId: string; modId: string; handle: string }
  | { submissionId: string; action: 'link'; userId: string; modId: string; profileId: string }
  | { submissionId: string; action: 'skip'; reason: BackfillSkip };

/** Case-, accent- and punctuation-blind comparison key ("dorée" → "doree"). */
export function nameKey(s: string | null | undefined): string {
  if (typeof s !== 'string') return '';
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/** True when the free-text author is the account's own display name or username. */
export function authorNamesAccount(row: Pick<BackfillInputRow, 'author' | 'displayName' | 'username'>): boolean {
  const a = nameKey(row.author);
  if (!a) return false;
  return a === nameKey(row.displayName) || a === nameKey(row.username);
}

export function planBackfillRow(row: BackfillInputRow): BackfillDecision {
  const skip = (reason: BackfillSkip): BackfillDecision => ({ submissionId: row.submissionId, action: 'skip', reason });
  if (row.status !== 'approved') return skip('not-approved');
  if (!row.approvedModId || !row.modExists) return skip('no-mod');
  if (row.modCreatorId) return skip('already-linked');

  const plan = planApprovalProfile({
    isEdit: row.isEdit,
    userId: row.userId,
    submitterIsAdmin: row.submitterIsAdmin,
    existingProfileId: row.existingProfileId,
    author: row.author,
    displayName: row.displayName,
    username: row.username,
  });
  if (plan.kind === 'none') return skip(plan.reason);
  // Backfill-only identity rule — applies to link as well as create: a
  // profile the account already holds is still the wrong home for a mod
  // whose author names somebody else.
  if (!authorNamesAccount(row)) return skip('author-not-account');
  if (plan.kind === 'link') {
    return { submissionId: row.submissionId, action: 'link', userId: row.userId as string, modId: row.approvedModId, profileId: plan.profileId };
  }
  return { submissionId: row.submissionId, action: 'create', userId: plan.data.userId, modId: row.approvedModId, handle: plan.data.handle };
}

export function planBackfill(rows: BackfillInputRow[]): BackfillDecision[] {
  return rows.map(planBackfillRow);
}

export type WritableDecision = Exclude<BackfillDecision, { action: 'skip' }>;

export function writable(decisions: BackfillDecision[]): WritableDecision[] {
  return decisions.filter((d): d is WritableDecision => d.action !== 'skip');
}

/**
 * Which frozen-plan rows may still be written: the live re-plan must agree
 * on action, user, mod and handle/profile. Anything that drifted (mod
 * linked meanwhile, profile created by a live approval, author edited) is
 * skipped, never re-derived — the operator signed off on the frozen plan.
 */
export function stillApplicable(frozen: WritableDecision[], live: BackfillDecision[]): { apply: WritableDecision[]; drifted: string[] } {
  const bySub = new Map(live.map((d) => [d.submissionId, d]));
  const apply: WritableDecision[] = [];
  const drifted: string[] = [];
  for (const f of frozen) {
    const l = bySub.get(f.submissionId);
    if (l && JSON.stringify(l) === JSON.stringify(f)) apply.push(f);
    else drifted.push(f.submissionId);
  }
  return { apply, drifted };
}

/** A dry run must never overwrite a non-empty plan: it is the rollback artifact. */
export function shouldWritePlan(existingRows: number | null, replace: boolean): boolean {
  return existingRows == null || existingRows === 0 || replace;
}
