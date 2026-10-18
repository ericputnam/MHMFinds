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
 */

export interface InflowRow {
  sourceUrl: string | null;
  createdAt: Date;
}

export interface CatalogInflowSummary {
  /** Rows with createdAt in [now−7d, now). Same predicate as the old count. */
  newMods7d: number;
  /** Rows with createdAt in [now−14d, now−7d). */
  newModsPrior7d: number;
  /** Distinct non-null sourceUrl among newMods7d rows. */
  posts7d: number;
  /** Distinct non-null sourceUrl among newModsPrior7d rows. */
  postsPrior7d: number;
  /** newMods7d / posts7d, null when posts7d is 0. */
  perPost7d: number | null;
  /** newModsPrior7d / postsPrior7d, null when postsPrior7d is 0. */
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
  const posts7d = new Set<string>();
  const postsPrior7d = new Set<string>();
  for (const r of rows) {
    const c = r.createdAt.getTime();
    if (Number.isNaN(c) || c >= t || c < d14) continue;
    if (c >= d7) {
      newMods7d++;
      if (r.sourceUrl) posts7d.add(r.sourceUrl);
    } else {
      newModsPrior7d++;
      if (r.sourceUrl) postsPrior7d.add(r.sourceUrl);
    }
  }
  return {
    newMods7d,
    newModsPrior7d,
    posts7d: posts7d.size,
    postsPrior7d: postsPrior7d.size,
    perPost7d: posts7d.size ? newMods7d / posts7d.size : null,
    perPostPrior7d: postsPrior7d.size ? newModsPrior7d / postsPrior7d.size : null,
  };
}

function perPost(n: number | null): string {
  return n == null ? '—/post' : `${n.toFixed(1)}/post`;
}

/**
 * One scoreboard cell: `80 from 4 posts, 20.0/post (130 from 5, 26.0/post)`.
 * Leads with the raw count so the old "80 (130)" reading is still there.
 */
export function formatCatalogInflow(s: CatalogInflowSummary): string {
  const posts = (n: number) => `${n} post${n === 1 ? '' : 's'}`;
  return `${s.newMods7d} from ${posts(s.posts7d)}, ${perPost(s.perPost7d)} (${s.newModsPrior7d} from ${s.postsPrior7d}, ${perPost(s.perPostPrior7d)})`;
}
