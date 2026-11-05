/**
 * Pure planning for curseforge-author-backfill.ts (Nova, E340, 2026-11-05).
 *
 * 447 SFW mods link a CurseForge Sims 4 project but carry no usable author
 * (NULL, a junk fallback like "Title 12345678", or the scraper's
 * "CurseForge Creator" placeholder), so they roll up to no /creator/[slug]/
 * page and their mod page shows no "More from <creator>". A dry probe on
 * 2026-11-05 resolved 443/447 through the CurseForge API (the same
 * `/v1/mods/search?gameId=78062&slug=` lookup E304 gates approvals on):
 * 231 distinct authors, 58 existing creator pages grow, 20 cross
 * MIN_MODS_FOR_PAGE (5) and become new pages.
 *
 * Rules, each a "prefer NULL to a guess" choice:
 *   - target only rows whose current author is unusable (see `isUnusableAuthor`);
 *     a row with a real author is never touched, even if CurseForge disagrees;
 *   - write only when the API returns the exact slug and exactly ONE author
 *     (3 multi-author projects in the probe are skipped, not guessed);
 *   - the new author must itself be usable (a name that slugs to junk or to a
 *     platform would just move the row from one dead bucket to another).
 *
 * No I/O here — `__tests__/unit/curseforge-author-backfill.test.ts` imports it.
 */

import { authorSlug, isJunkAuthorSlug, NON_CREATOR_SLUGS } from '../../lib/creatorSlug';

/** Hard per-run ceiling (autonomy.md Tier 0 catalog data: ≤5,000 rows). */
export const MAX_BACKFILL_ROWS = 1000;

/** Exact host allowlist on the parsed host — never a substring test. */
export const CURSEFORGE_BACKFILL_HOSTS: ReadonlySet<string> = new Set([
  'www.curseforge.com',
  'curseforge.com',
  'legacy.curseforge.com',
]);

/** `/sims4/<class>/<slug>` on an exact CurseForge host, else null. */
export function curseforgeProjectSlug(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!CURSEFORGE_BACKFILL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (parts.length < 3 || parts[0].toLowerCase() !== 'sims4') return null;
  const slug = parts[2].toLowerCase();
  return /^[a-z0-9][a-z0-9-]*$/.test(slug) ? slug : null;
}

/** NULL, blank, junk-slugged, or a platform placeholder ("CurseForge Creator"). */
export function isUnusableAuthor(author: string | null | undefined): boolean {
  if (typeof author !== 'string' || !author.trim()) return true;
  const slug = authorSlug(author.trim());
  return !slug || isJunkAuthorSlug(slug) || NON_CREATOR_SLUGS.has(slug);
}

export interface BackfillRow {
  id: string;
  title: string;
  author: string | null;
  downloadUrl: string | null;
  sourceUrl: string | null;
}

export type AuthorLookup =
  | { kind: 'found'; projectId: number; authors: string[] }
  | { kind: 'not-found' }
  | { kind: 'unreachable'; detail: string };

export type SkipReason = 'has-author' | 'no-curseforge-slug' | 'not-found' | 'unreachable' | 'multi-author' | 'no-author' | 'author-unusable';

export type BackfillDecision =
  | { id: string; action: 'set'; slug: string; projectId: number; prior: string | null; next: string; title: string }
  | { id: string; action: 'skip'; reason: SkipReason; slug: string | null; title: string };

export type SetDecision = Extract<BackfillDecision, { action: 'set' }>;

/** The CurseForge slug a row would be looked up by, or null if it is not a target. */
export function targetSlug(row: BackfillRow): string | null {
  if (!isUnusableAuthor(row.author)) return null;
  return curseforgeProjectSlug(row.downloadUrl) ?? curseforgeProjectSlug(row.sourceUrl);
}

export function planRow(row: BackfillRow, lookup: AuthorLookup | undefined): BackfillDecision {
  const base = { id: row.id, title: row.title };
  if (!isUnusableAuthor(row.author)) return { ...base, action: 'skip', reason: 'has-author', slug: null };
  const slug = curseforgeProjectSlug(row.downloadUrl) ?? curseforgeProjectSlug(row.sourceUrl);
  if (!slug) return { ...base, action: 'skip', reason: 'no-curseforge-slug', slug: null };
  if (!lookup || lookup.kind === 'unreachable') return { ...base, action: 'skip', reason: 'unreachable', slug };
  if (lookup.kind === 'not-found') return { ...base, action: 'skip', reason: 'not-found', slug };
  const names = lookup.authors.map((a) => a.trim()).filter(Boolean);
  if (names.length === 0) return { ...base, action: 'skip', reason: 'no-author', slug };
  if (names.length > 1) return { ...base, action: 'skip', reason: 'multi-author', slug };
  const next = names[0];
  if (isUnusableAuthor(next)) return { ...base, action: 'skip', reason: 'author-unusable', slug };
  return { ...base, action: 'set', slug, projectId: lookup.projectId, prior: row.author ?? null, next };
}

/**
 * Suffixes creators bolt onto the same name across platforms. Dry run
 * 2026-11-05: CurseForge "Boschiana" (2 mods here) vs catalog "BoschianaCC"
 * (15, a live page) — writing the CurseForge spelling would have minted a
 * duplicate 5-mod page next to the real one (the E293 class).
 */
export const SPELLING_SUFFIXES: readonly string[] = ['sims4cc', 'simscc', 'sims4', 'sims', 'mods', 'cc', 'ts4'];

/**
 * If `next` has no page of its own (< minMods existing rows under its key)
 * but a suffix variant of it does, return that page's spelling; else `next`.
 * Pairs where BOTH spellings already have a page (sixam/sixamcc, miiko/
 * miikocc) are pre-existing splits and are left as they are — folding them
 * is a creator-key change, not a backfill decision.
 */
export function preferExistingPage(
  next: string,
  keyCounts: ReadonlyMap<string, number>,
  spellingOf: ReadonlyMap<string, string>,
  minMods: number,
  keyOf: (s: string) => string,
): string {
  const k = keyOf(next);
  if ((keyCounts.get(k) ?? 0) >= minMods) return next;
  let best: { key: string; n: number } | null = null;
  for (const s of SPELLING_SUFFIXES) {
    const variants = [k + s, k.endsWith(s) ? k.slice(0, -s.length) : ''];
    for (const v of variants) {
      if (!v || v === k) continue;
      const n = keyCounts.get(v) ?? 0;
      if (n >= minMods && (!best || n > best.n)) best = { key: v, n };
    }
  }
  return best ? (spellingOf.get(best.key) ?? next) : next;
}

export function planBackfill(rows: BackfillRow[], lookups: Map<string, AuthorLookup>): BackfillDecision[] {
  return rows.map((row) => {
    const slug = targetSlug(row);
    return planRow(row, slug ? lookups.get(slug) : undefined);
  });
}

export function settable(decisions: BackfillDecision[]): SetDecision[] {
  return decisions.filter((d): d is SetDecision => d.action === 'set');
}

/**
 * Apply-time drift guard: a frozen row is written only if the live author is
 * still exactly the prior the plan recorded (nobody fixed it by hand since).
 */
export function stillApplicable(frozen: SetDecision[], liveAuthor: Map<string, string | null>): { apply: SetDecision[]; drifted: string[] } {
  const apply: SetDecision[] = [];
  const drifted: string[] = [];
  for (const d of frozen) {
    if (!liveAuthor.has(d.id)) {
      drifted.push(d.id);
      continue;
    }
    const live = liveAuthor.get(d.id) ?? null;
    if (live === d.prior) apply.push(d);
    else drifted.push(d.id);
  }
  return { apply, drifted };
}

/** Rollback guard: restore the prior only where the row still holds what we wrote. */
export function rollbackable(applied: SetDecision[], liveAuthor: Map<string, string | null>): SetDecision[] {
  return applied.filter((d) => liveAuthor.get(d.id) === d.next);
}

/** `curseforge-authors-YYYY-MM-DD.json` — a basename, never a path. */
export function parsePlanName(argv: readonly string[]): string | null {
  const arg = argv.find((a) => a.startsWith('--plan='));
  if (!arg) return null;
  const name = arg.slice('--plan='.length);
  return /^curseforge-authors-\d{4}-\d{2}-\d{2}\.json$/.test(name) ? name : '';
}

export const KNOWN_FLAGS: ReadonlySet<string> = new Set(['--apply', '--rollback', '--replace-plan']);

export function unknownFlags(argv: readonly string[]): string[] {
  return argv.filter((a) => a.startsWith('--') && !KNOWN_FLAGS.has(a) && !a.startsWith('--plan='));
}
