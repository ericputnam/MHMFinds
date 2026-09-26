/**
 * "More Sims 4 CC creators" on /creator/[slug]/ (Nova, E113, 2026-09-26).
 *
 * Before E113 a leaf creator page linked only up (breadcrumb → /creator/)
 * and to its own mods. The only crawlable inbound paths to the ~534 leaves
 * were the hub (top 24 by downloads + an A–Z list) and the mod pages of
 * that creator — so a long-tail creator got one hub link and nothing from
 * its peers. This block gives every leaf 8 server-rendered links to the
 * creators ranked next to it by downloads (4 above, 4 below; filled from
 * the other side at the ends), so every leaf receives ~8 inbound links
 * from pages of similar size and the leaf graph is connected without a hop
 * through the hub.
 *
 * Population: listCreators() minus NON_CREATOR_SLUGS — exactly the hub's
 * population (listHubCreators), so this block can never link a slug the
 * hub, sitemap or leaf route would 404 ("never emit a link the target
 * would 404").
 *
 * Cost: listCreators is one aggregate over the catalog. The leaf is
 * force-dynamic, so the list is memoised per server instance for an hour
 * (stale rows are served while a refresh runs) and a cold render waits at
 * most RELATED_TIMEOUT_MS for it; on timeout or error the block renders
 * nothing and the page is unaffected. Measured 2026-09-26 from the operator
 * host: 4.9 s cold, and one 610 s stall on a degraded network — hence the
 * short cap and stale-while-revalidate rather than awaiting the query.
 */

import { listCreators, type CreatorListRow } from './creators';
import { isNonCreatorSlug } from './creatorSlug';
import { rankByDownloads } from './creatorHub';

/** Links in the block. Even, so the window is symmetric. */
export const RELATED_CREATORS = 8;
export const RELATED_TIMEOUT_MS = 800;
const TTL_MS = 60 * 60 * 1000;

export interface RelatedCreator {
  slug: string;
  displayName: string;
  mods: number;
}

/**
 * Pure: the `n` creators ranked next to `slug` by downloads, excluding
 * `slug` itself. [] when `slug` is not in `rows` (it has no page, so it
 * should not be joined into the graph either).
 */
export function neighbourCreators<T extends { slug: string; mods: number; downloads: number }>(
  rows: T[],
  slug: string,
  n: number = RELATED_CREATORS,
): T[] {
  const ranked = rankByDownloads(rows);
  const i = ranked.findIndex((r) => r.slug === slug);
  if (i < 0) return [];
  const half = Math.floor(n / 2);
  let start = Math.max(0, i - half);
  let end = Math.min(ranked.length, start + n + 1); // +1: self is inside the window
  start = Math.max(0, end - (n + 1));
  end = Math.min(ranked.length, start + n + 1);
  return ranked.slice(start, end).filter((r) => r.slug !== slug).slice(0, n);
}

let memo: { at: number; rows: CreatorListRow[] } | null = null;
let inflight: Promise<CreatorListRow[]> | null = null;

async function hubRowsMemoised(): Promise<CreatorListRow[]> {
  if (memo && Date.now() - memo.at < TTL_MS) return memo.rows;
  if (!inflight) {
    refresh();
  }
  // Stale-while-revalidate: an expired memo is still a valid population.
  if (memo) return memo.rows;
  return inflight as Promise<CreatorListRow[]>;
}

function refresh(): void {
  const p = listCreators()
    .then((rows) => {
      const hub = rows.filter((r) => !isNonCreatorSlug(r.slug));
      memo = { at: Date.now(), rows: hub };
      return hub;
    })
    .finally(() => {
      inflight = null;
    });
  // A refresh nobody awaits (stale path) must not become an unhandled rejection.
  p.catch((error) => console.error('[creatorHubRelated] refresh failed:', error));
  inflight = p;
}

/** Server loader. Never throws; [] on error or timeout. */
export async function getRelatedCreators(slug: string): Promise<RelatedCreator[]> {
  try {
    const rows = await Promise.race<CreatorListRow[] | null>([
      hubRowsMemoised(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), RELATED_TIMEOUT_MS)),
    ]);
    if (!rows) return [];
    return neighbourCreators(rows, slug).map((r) => ({
      slug: r.slug,
      displayName: r.displayName,
      mods: r.mods,
    }));
  } catch (error) {
    console.error('[creatorHubRelated] getRelatedCreators failed, hiding block:', error);
    return [];
  }
}
