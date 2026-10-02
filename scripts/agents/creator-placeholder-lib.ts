/**
 * Pure planning for creator-placeholder-unverify.ts (Nova, E158, 2026-10-02).
 *
 * A CreatorProfile whose User is a script-minted placeholder account
 * (lib/creatorClaim.ts PLACEHOLDER_ACCOUNT_DOMAINS) and has never signed in
 * (0 OAuth Account rows) cannot have been claimed by anyone, so it must not
 * carry `isVerified: true`. That flag drives the "Verified creator" badge on
 * /creator/<slug>/, /mods/<id>/, ModCard, /top-creators/ and collection grids,
 * and hides the E144 claim card. Un-verifying is the class fix: every reader
 * inherits it, where a reader-side guard only covers the one page.
 *
 * No email address ever enters a plan row: the DB read reduces it to a
 * boolean before it reaches this module.
 */

export interface ProfileRow {
  id: string;
  handle: string;
  isVerified: boolean;
  /** Computed in SQL from the domain; the address itself is never selected into a plan. */
  placeholderAccount: boolean;
  oauthAccounts: number;
  /** SFW mods whose author slug equals the handle (a live page needs >= 5). */
  pageMods: number;
}

export interface PlanRow {
  id: string;
  handle: string;
  priorIsVerified: true;
  pageMods: number;
}

/** A row is a target only on positive evidence on all three counts. */
export function isUnverifyTarget(r: ProfileRow): boolean {
  return r.isVerified === true && r.placeholderAccount === true && r.oauthAccounts === 0;
}

export function planUnverify(rows: ProfileRow[]): PlanRow[] {
  return rows
    .filter(isUnverifyTarget)
    .map((r) => ({ id: r.id, handle: r.handle, priorIsVerified: true as const, pageMods: r.pageMods }))
    .sort((a, b) => a.handle.localeCompare(b.handle));
}

/**
 * The plan file is the rollback artifact. A dry run after --apply plans 0
 * rows, and on 2026-10-02 the first version of this script overwrote the
 * 20-row plan with that empty one. Only write when no plan with rows
 * exists yet, unless the caller explicitly asks to replace it.
 */
export function shouldWritePlan(existingRows: number | null, replace: boolean): boolean {
  if (replace) return true;
  return existingRows === null || existingRows === 0;
}

/** Hard ceiling from autonomy.md "Catalog data" (<= 5,000 rows per run); far above today's 20. */
export const MAX_ROWS = 5000;

/**
 * At --apply time, the frozen plan is re-checked against the live rows: an id
 * that is no longer a target (someone signed in, or it was already flipped) is
 * skipped, never written. An id missing from the DB is skipped too.
 */
export function idsStillTargets(plan: PlanRow[], live: ProfileRow[]): { apply: string[]; skipped: string[] } {
  const byId = new Map(live.map((r) => [r.id, r]));
  const apply: string[] = [];
  const skipped: string[] = [];
  for (const p of plan) {
    const r = byId.get(p.id);
    if (r && isUnverifyTarget(r)) apply.push(p.id);
    else skipped.push(p.id);
  }
  return { apply, skipped };
}
