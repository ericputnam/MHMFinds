/**
 * Pure planning for simsfinds-author-backfill.ts (Nova, E401, 2026-11-13).
 * Page rules live in lib/services/simsfindsAuthor.ts; this file decides per
 * row and guards apply/rollback the same way E340's CurseForge backfill does.
 */

import { isUnusableAuthor } from './curseforge-author-backfill-lib';
import { type SimsfindsPageAuthor, simsfindsDownloadId } from '../../lib/services/simsfindsAuthor';

/** Hard per-run ceiling (autonomy.md Tier 0 catalog data: ≤5,000 rows). */
export const MAX_SIMSFINDS_BACKFILL_ROWS = 500;

export interface SimsfindsRow {
  id: string;
  title: string;
  author: string | null;
  downloadUrl: string | null;
}

export type PageLookup = SimsfindsPageAuthor | { kind: 'unreachable'; detail: string };

export type SimsfindsSetDecision = { id: string; action: 'set'; downloadId: string; prior: string | null; next: string; title: string };
export type SimsfindsDecision =
  | SimsfindsSetDecision
  | { id: string; action: 'skip'; reason: string; downloadId: string | null; title: string };

/** The Simsfinds download id a row would be looked up by, or null if it is not a target. */
export function targetDownloadId(row: SimsfindsRow): string | null {
  if (!isUnusableAuthor(row.author)) return null;
  return simsfindsDownloadId(row.downloadUrl);
}

export function planRow(row: SimsfindsRow, lookup: PageLookup | undefined): SimsfindsDecision {
  const base = { id: row.id, title: row.title };
  if (!isUnusableAuthor(row.author)) return { ...base, action: 'skip', reason: 'has-author', downloadId: null };
  const downloadId = simsfindsDownloadId(row.downloadUrl);
  if (!downloadId) return { ...base, action: 'skip', reason: 'not-simsfinds', downloadId: null };
  if (!lookup || lookup.kind === 'unreachable') return { ...base, action: 'skip', reason: 'unreachable', downloadId };
  if (lookup.kind === 'skip') return { ...base, action: 'skip', reason: lookup.reason, downloadId };
  return { ...base, action: 'set', downloadId, prior: row.author ?? null, next: lookup.author };
}

/** Apply-time drift guard: write only where the live author still equals the plan's prior. */
export function stillApplicable(
  frozen: SimsfindsSetDecision[],
  liveAuthor: Map<string, string | null>,
): { apply: SimsfindsSetDecision[]; drifted: string[] } {
  const apply: SimsfindsSetDecision[] = [];
  const drifted: string[] = [];
  for (const d of frozen) {
    if (liveAuthor.has(d.id) && (liveAuthor.get(d.id) ?? null) === d.prior) apply.push(d);
    else drifted.push(d.id);
  }
  return { apply, drifted };
}

/** Rollback guard: restore the prior only where the row still holds what we wrote. */
export function rollbackable(rows: SimsfindsSetDecision[], liveAuthor: Map<string, string | null>): SimsfindsSetDecision[] {
  return rows.filter((d) => liveAuthor.get(d.id) === d.next);
}

/** `simsfinds-authors-YYYY-MM-DD.json` — a basename, never a path. '' = invalid, null = absent. */
export function parsePlanName(argv: readonly string[]): string | null {
  const arg = argv.find((a) => a.startsWith('--plan='));
  if (!arg) return null;
  const name = arg.slice('--plan='.length);
  return /^simsfinds-authors-\d{4}-\d{2}-\d{2}\.json$/.test(name) ? name : '';
}

export const KNOWN_FLAGS: ReadonlySet<string> = new Set(['--apply', '--rollback', '--replace-plan']);

export function unknownFlags(argv: readonly string[]): string[] {
  return argv.filter((a) => a.startsWith('--') && !KNOWN_FLAGS.has(a) && !a.startsWith('--plan='));
}
