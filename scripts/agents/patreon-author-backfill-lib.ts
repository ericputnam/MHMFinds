/**
 * Pure planning for patreon-author-backfill.ts (Nova, E370, 2026-11-07).
 *
 * After E340 (CurseForge, 470 rows) the largest unattributed block in the
 * SFW catalog is Patreon: on 2026-11-07, 3,683 of the 3,989 SFW mods with
 * no usable author link a `patreon.com/posts/<slug>-<id>` URL. Their author
 * is NULL or the scraper's slug-plus-post-id fallback ("Iyah Locs Hair
 * 120775816", "Messy Mod 118490560", "53290860"), so they roll up to no
 * /creator/[slug]/ page, show no "More from <creator>", and put junk in the
 * mod page's JSON-LD `author`.
 *
 * Patreon's public post endpoint (`/api/posts/<id>?include=campaign`) answers
 * an honestly identified client with HTTP 200 and names the post's campaign
 * (name, vanity, is_nsfw). That is the creator who published the post — the
 * same evidence a reader sees on the page.
 *
 * Rules, each a "prefer NULL to a guess" choice:
 *   - target only rows whose current author is unusable (`isUnusableAuthor`,
 *     shared with E340); a row with a real author is never touched;
 *   - exact host allowlist on the parsed host, numeric post id only;
 *   - skip any campaign Patreon itself flags `is_nsfw` — no SFW creator page
 *     is built around an adult campaign;
 *   - the written name must itself be usable (tagline tail cut at " | ", no
 *     letters lost to the ASCII slug); otherwise the vanity, otherwise skip;
 *   - if the vanity already owns a page and the name does not, write the
 *     page's spelling only when one key is a prefix of the other (one
 *     creator, one page — the E293 class); unrelated keys skip as
 *     `ambiguous-identity` rather than guess (see resolveSpelling).
 *
 * No I/O here — `__tests__/unit/patreon-author-backfill.test.ts` imports it.
 */

import { authorSlug, creatorKey, MOVED_CREATOR_KEYS } from '../../lib/creatorSlug';
import { isUnusableAuthor, preferExistingPage } from './curseforge-author-backfill-lib';

export { isUnusableAuthor };

/** Hard per-run ceiling (autonomy.md Tier 0 catalog data: ≤5,000 rows). */
export const MAX_PATREON_BACKFILL_ROWS = 4000;

/** Exact host allowlist on the parsed host — never a substring test. */
export const PATREON_BACKFILL_HOSTS: ReadonlySet<string> = new Set(['www.patreon.com', 'patreon.com']);

/**
 * The numeric post id of a Patreon post URL, else null. Accepts
 * `/posts/<slug>-<id>`, `/posts/<id>` and `/<vanity>/posts/<slug>-<id>`;
 * query strings (utm_*) are ignored.
 */
export function patreonPostId(url: string | null | undefined): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
  if (!PATREON_BACKFILL_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  const parts = parsed.pathname.split('/').filter(Boolean);
  const i = parts.findIndex((p) => p.toLowerCase() === 'posts');
  if (i < 0 || i > 1 || parts.length !== i + 2) return null;
  const m = /(?:^|-)(\d{5,12})$/.exec(parts[i + 1]);
  return m ? m[1] : null;
}

export interface BackfillRow {
  id: string;
  title: string;
  author: string | null;
  downloadUrl: string | null;
  sourceUrl: string | null;
}

export type PostLookup =
  | { kind: 'found'; campaignId: string | null; name: string | null; vanity: string | null; isNsfw: boolean }
  | { kind: 'not-found' }
  | { kind: 'forbidden' }
  | { kind: 'unreachable'; detail: string };

export type SkipReason =
  | 'has-author'
  | 'no-patreon-post'
  | 'not-found'
  | 'forbidden'
  | 'unreachable'
  | 'no-campaign'
  | 'nsfw-campaign'
  | 'author-unusable';

export type BackfillDecision =
  | { id: string; action: 'set'; postId: string; campaignId: string | null; vanity: string | null; prior: string | null; next: string; title: string }
  | { id: string; action: 'skip'; reason: SkipReason; postId: string | null; title: string };

export type SetDecision = Extract<BackfillDecision, { action: 'set' }>;

/** The Patreon post id a row would be looked up by, or null if it is not a target. */
export function targetPostId(row: BackfillRow): string | null {
  if (!isUnusableAuthor(row.author)) return null;
  return patreonPostId(row.downloadUrl) ?? patreonPostId(row.sourceUrl);
}

/**
 * Campaign names are free text and some are taglines ("SNOOTYSIMS | SIMS 4
 * CC | Cute Decor, Furniture, Clutter, ..." in the 11-07 probe). Keep the
 * part before the first " | " separator.
 */
export function cleanCampaignName(name: string | null | undefined): string | null {
  if (typeof name !== 'string') return null;
  const head = name.split(/\s+[|•·]\s+/)[0].trim();
  return head || null;
}

/**
 * True when the URL slug would drop letters or digits from the name
 * ("✨ qmbıbı ✨" → "qmb-b"): such a page would be unfindable by its name,
 * so the vanity (ASCII by construction) is written instead.
 */
export function slugLosesLetters(name: string): boolean {
  const kept = (authorSlug(name).match(/[a-z0-9]/g) ?? []).length;
  // RegExp constructor: tsconfig targets ES5, which rejects the `u` flag on a literal.
  const had = (name.match(new RegExp('[\\p{L}\\p{N}]', 'gu')) ?? []).length;
  return kept < had;
}

export function planRow(row: BackfillRow, lookup: PostLookup | undefined): BackfillDecision {
  const base = { id: row.id, title: row.title };
  if (!isUnusableAuthor(row.author)) return { ...base, action: 'skip', reason: 'has-author', postId: null };
  const postId = patreonPostId(row.downloadUrl) ?? patreonPostId(row.sourceUrl);
  if (!postId) return { ...base, action: 'skip', reason: 'no-patreon-post', postId: null };
  if (!lookup || lookup.kind === 'unreachable') return { ...base, action: 'skip', reason: 'unreachable', postId };
  if (lookup.kind === 'not-found') return { ...base, action: 'skip', reason: 'not-found', postId };
  if (lookup.kind === 'forbidden') return { ...base, action: 'skip', reason: 'forbidden', postId };
  if (!lookup.name && !lookup.vanity) return { ...base, action: 'skip', reason: 'no-campaign', postId };
  if (lookup.isNsfw) return { ...base, action: 'skip', reason: 'nsfw-campaign', postId };
  const name = cleanCampaignName(lookup.name);
  const vanity = lookup.vanity?.trim() || null;
  const nameOk = name !== null && !isUnusableAuthor(name) && !slugLosesLetters(name);
  const next = nameOk ? name : vanity && !isUnusableAuthor(vanity) ? vanity : null;
  if (!next) return { ...base, action: 'skip', reason: 'author-unusable', postId };
  return { ...base, action: 'set', postId, campaignId: lookup.campaignId, vanity, prior: row.author ?? null, next };
}

/**
 * The spelling to write so the row lands on an existing page when one is
 * already this creator's, or null when the evidence points two ways:
 *   1. a key folded by E356 (MOVED_CREATOR_KEYS) writes the target's spelling;
 *   2. the name's own key has a page → keep the name;
 *   3. the vanity's key has a page and one key is a prefix of the other
 *      ("HappyLifeSims (Koonam)" / vanity "happylifesims") → that page's spelling;
 *   4. the vanity's key has a page but the keys are unrelated ("BeckySims" /
 *      a vanity owning "Daisy-Sims" in the 11-07 probe) → null: skip, never guess
 *      which identity is current;
 *   5. else E340's suffix rule (`preferExistingPage`) on the name.
 */
export function resolveSpelling(
  d: Pick<SetDecision, 'next' | 'vanity'>,
  keyCounts: ReadonlyMap<string, number>,
  spellingOf: ReadonlyMap<string, string>,
  minMods: number,
): string | null {
  const moved = (s: string): string | null => {
    const target = MOVED_CREATOR_KEYS[creatorKey(s)];
    return target ? (spellingOf.get(creatorKey(target)) ?? null) : null;
  };
  const m = moved(d.next);
  if (m) return m;
  const k = creatorKey(d.next);
  if ((keyCounts.get(k) ?? 0) >= minMods) return d.next;
  if (d.vanity && !isUnusableAuthor(d.vanity)) {
    const mv = moved(d.vanity);
    if (mv) return mv;
    const vk = creatorKey(d.vanity);
    if (vk !== k && (keyCounts.get(vk) ?? 0) >= minMods) {
      const related = vk.length >= 4 && k.length >= 4 && (k.startsWith(vk) || vk.startsWith(k));
      return related ? (spellingOf.get(vk) ?? d.next) : null;
    }
  }
  return preferExistingPage(d.next, keyCounts, spellingOf, minMods, creatorKey);
}

export function planBackfill(rows: BackfillRow[], lookups: Map<string, PostLookup>): BackfillDecision[] {
  return rows.map((row) => {
    const id = targetPostId(row);
    return planRow(row, id ? lookups.get(id) : undefined);
  });
}

export function settable(decisions: BackfillDecision[]): SetDecision[] {
  return decisions.filter((d): d is SetDecision => d.action === 'set');
}

/** Apply-time drift guard: write a frozen row only if its live author still equals the plan's prior. */
export function stillApplicable(frozen: SetDecision[], liveAuthor: Map<string, string | null>): { apply: SetDecision[]; drifted: string[] } {
  const apply: SetDecision[] = [];
  const drifted: string[] = [];
  for (const d of frozen) {
    if (liveAuthor.has(d.id) && (liveAuthor.get(d.id) ?? null) === d.prior) apply.push(d);
    else drifted.push(d.id);
  }
  return { apply, drifted };
}

/** Rollback guard: restore the prior only where the row still holds what we wrote. */
export function rollbackable(rows: SetDecision[], liveAuthor: Map<string, string | null>): SetDecision[] {
  return rows.filter((d) => liveAuthor.get(d.id) === d.next);
}

/**
 * The run aborts (no plan written) when Patreon stops answering like a
 * public API: more than 10% unreachable, or any rate-limit / blanket
 * refusal. "Scraping sources that 403 us" is in autonomy.md's Never list,
 * so a run that starts getting refused stops rather than retries.
 */
export function shouldAbort(counts: { done: number; unreachable: number; forbidden: number; rateLimited: number }): string | null {
  if (counts.rateLimited > 0) return `rate-limited (${counts.rateLimited} × HTTP 429)`;
  if (counts.done >= 50 && counts.forbidden > counts.done / 2) return `refused (${counts.forbidden}/${counts.done} × HTTP 401/403)`;
  if (counts.done >= 50 && counts.unreachable > counts.done / 10) return `unreachable (${counts.unreachable}/${counts.done})`;
  return null;
}

/** `patreon-authors-YYYY-MM-DD.json` — a basename, never a path. */
export function parsePlanName(argv: readonly string[]): string | null {
  const arg = argv.find((a) => a.startsWith('--plan='));
  if (!arg) return null;
  const name = arg.slice('--plan='.length);
  return /^patreon-authors-\d{4}-\d{2}-\d{2}\.json$/.test(name) ? name : '';
}

export const KNOWN_FLAGS: ReadonlySet<string> = new Set(['--apply', '--rollback', '--replace-plan']);

export function unknownFlags(argv: readonly string[]): string[] {
  return argv.filter((a) => a.startsWith('--') && !KNOWN_FLAGS.has(a) && !a.startsWith('--plan=') && !a.startsWith('--limit='));
}

/** `--limit=N` (dry run only): look up at most N distinct posts. */
export function parseLimit(argv: readonly string[]): number | null {
  const arg = argv.find((a) => a.startsWith('--limit='));
  if (!arg) return null;
  const n = Number(arg.slice('--limit='.length));
  return Number.isInteger(n) && n > 0 ? n : NaN;
}
