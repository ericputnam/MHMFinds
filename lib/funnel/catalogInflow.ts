/**
 * "New mods 7d (prior 7d)" with its denominator, as pure math (Nova, E232,
 * 2026-10-18). The DB read lives in scripts/agents/funnel-scoreboard.ts; this
 * module only buckets rows.
 *
 * Why this exists: on 2026-10-18 the scoreboard printed "New mods 7d (prior
 * 7d): 80 (130)" — a −38% week-over-week drop that read as a supply failure.
 * The ingest had run OK on 7/7 mornings with errors=0; every row in 28 days
 * came from one path (the writer's blog posts via `catalog-ingest-daily.sh`).
 * The drop was 5 posts → 4 posts (writer cadence) × 26 → 20 rows per post
 * (one of the 4 was a re-dated 2025 post: 48 items found, 17 created, 31
 * already in the catalog — dedupe working, not failing). The raw count has
 * no denominator, so it cannot tell "the scraper stopped" from "the writer
 * posted less", and the funnel runner was about to be asked to fix a
 * scraper that was fine. Reports/funnel/nova-catalog-inflow-2026-10-18.md
 * has the full read.
 *
 * A "post" here is a distinct Mod.sourceUrl with ≥1 row created in the
 * window — i.e. posts that *yielded* rows, read from the same table and the
 * same createdAt predicate as the count, so the two never disagree on the
 * window. Rows with a null sourceUrl count as mods but not as a post.
 *
 * Rejected denominators (so nobody re-proposes them):
 *   - WordPress posts published in 7d (the scoreboard's "Blog posts: N in 7d"):
 *     a different window (publish date vs ingest date, up to 31 h apart on
 *     10-15→10-16 when the sitemap lagged the publish) and it counts a
 *     re-dated old post as "new" (sims-4-halloween-loading-screens, dated
 *     2026-10-14, first ingested 2025-11-29).
 *   - ingest-log "pages scraped": includes the two posts the `--refreshed`
 *     predicate re-fetches every morning with 0 rows created.
 *
 * E253 (Nova, 2026-10-21): a "post" is a distinct sourceUrl whose parsed host
 * is the writer's blog (`WRITER_POST_HOSTS`, exact allowlist — never a
 * substring). On 10-21 the row read "92 from 8 posts, 11.5/post (189 from 8,
 * 23.6/post)" — per-post yield "halved". Four of the 8 "posts" were single
 * Manual rows the admin added 03:45–03:52Z (TSR / Patreon / CurseForge mod
 * pages, each its own sourceUrl). Writer posts only: 88 from 4, 22.0/post vs
 * 23.6 — flat. Rows from any other source (or null) still count in the raw
 * total and are printed as "+ N other", never in the per-post denominator.
 */

export const WRITER_POST_HOSTS: ReadonlySet<string> = new Set([
  'musthavemods.com',
  'www.musthavemods.com',
  'blog.musthavemods.com',
]);

/** True when `url` parses and its host is exactly one of WRITER_POST_HOSTS. */
export function isWriterPostUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return WRITER_POST_HOSTS.has(new URL(url).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export interface InflowRow {
  sourceUrl: string | null;
  createdAt: Date;
}

export interface CatalogInflowSummary {
  /** Rows with createdAt in [now−7d, now). Same predicate as the old count. */
  newMods7d: number;
  /** Rows with createdAt in [now−14d, now−7d). */
  newModsPrior7d: number;
  /** Distinct writer-post sourceUrl (isWriterPostUrl) among newMods7d rows. */
  posts7d: number;
  /** Distinct writer-post sourceUrl among newModsPrior7d rows. */
  postsPrior7d: number;
  /** newMods7d rows not from a writer post (manual adds, other hosts, null). */
  other7d: number;
  /** newModsPrior7d rows not from a writer post. */
  otherPrior7d: number;
  /** Writer-post rows 7d / posts7d, null when posts7d is 0. */
  perPost7d: number | null;
  /** Writer-post rows prior 7d / postsPrior7d, null when postsPrior7d is 0. */
  perPostPrior7d: number | null;
}

const DAY_MS = 864e5;

/**
 * Buckets rows into the last 7 days and the 7 before. Rows older than 14 d
 * or in the future are ignored, so a caller may hand it any superset.
 */
export function summarizeCatalogInflow(rows: readonly InflowRow[], now: Date = new Date()): CatalogInflowSummary {
  const t = now.getTime();
  const d7 = t - 7 * DAY_MS;
  const d14 = t - 14 * DAY_MS;
  let newMods7d = 0;
  let newModsPrior7d = 0;
  let other7d = 0;
  let otherPrior7d = 0;
  const posts7d = new Set<string>();
  const postsPrior7d = new Set<string>();
  for (const r of rows) {
    const c = r.createdAt.getTime();
    if (Number.isNaN(c) || c >= t || c < d14) continue;
    if (c >= d7) {
      newMods7d++;
      if (isWriterPostUrl(r.sourceUrl)) posts7d.add(r.sourceUrl as string);
      else other7d++;
    } else {
      newModsPrior7d++;
      if (isWriterPostUrl(r.sourceUrl)) postsPrior7d.add(r.sourceUrl as string);
      else otherPrior7d++;
    }
  }
  return {
    newMods7d,
    newModsPrior7d,
    posts7d: posts7d.size,
    postsPrior7d: postsPrior7d.size,
    other7d,
    otherPrior7d,
    perPost7d: posts7d.size ? (newMods7d - other7d) / posts7d.size : null,
    perPostPrior7d: postsPrior7d.size ? (newModsPrior7d - otherPrior7d) / postsPrior7d.size : null,
  };
}

function perPost(n: number | null): string {
  return n == null ? '—/post' : `${n.toFixed(1)}/post`;
}

/**
 * One scoreboard cell: `80 from 4 posts, 20.0/post (130 from 5, 26.0/post)`.
 * Leads with the raw count so the old "80 (130)" reading is still there.
 * With non-post rows (E253): `92 from 4 posts + 4 other, 22.0/post (189 from 8, 23.6/post)`
 * — the per-post figure divides writer-post rows only.
 */
export function formatCatalogInflow(s: CatalogInflowSummary): string {
  const posts = (n: number) => `${n} post${n === 1 ? '' : 's'}`;
  const other = (n: number) => (n > 0 ? ` + ${n} other` : '');
  return `${s.newMods7d} from ${posts(s.posts7d)}${other(s.other7d)}, ${perPost(s.perPost7d)} (${s.newModsPrior7d} from ${s.postsPrior7d}${other(s.otherPrior7d)}, ${perPost(s.perPostPrior7d)})`;
}
