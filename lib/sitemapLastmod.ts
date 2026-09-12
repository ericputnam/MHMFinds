/**
 * Per-collection <lastmod> for /sitemap-nextjs.xml (E37, 2026-09-12).
 *
 * A sitemap <lastmod> is only useful to Google when it is honest per URL —
 * a single constant across every entry is ignored, and that is exactly what
 * the sitemap did until 2026-09-12 (every URL said 2026-07-03, including
 * collections created in September). Google's last crawl of
 * /games/sims-4/hair-cc/ was 2026-04-29 and it sat in "Crawled - currently
 * not indexed" with no recrawl signal.
 *
 * Lives outside the route file because Next.js only allows HTTP-method and
 * config exports from a route.ts.
 */

import { buildWhereClause, getCollection } from './collections';
import { prisma } from './prisma';

// The homepage shell was last changed 2026-09-08 (SSR shell, PR #48).
// Bump when app-level pages actually change.
export const APP_LASTMOD = '2026-09-08';

// /games/[game]/[topic] template — trailing-slash canonical fix (July
// 2026). Bump when the template changes.
export const COLLECTION_TEMPLATE_LASTMOD = '2026-07-03';

/** YYYY-MM-DD in UTC. */
export function toDateStamp(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Later of two YYYY-MM-DD stamps (string compare is safe for this shape). */
export function laterOf(a: string, b: string | null | undefined): string {
  if (!b) return a;
  return b > a ? b : a;
}

/**
 * Newest mod *created* inside a collection, as a date stamp — or null if
 * the DB is unreachable or the collection is empty.
 *
 * Why createdAt and not updatedAt: a maintenance job touches ~500 rows a
 * day, so max(updatedAt) is "today" for 17 of 18 collections (probed
 * 2026-09-12). createdAt varies honestly (2026-01-25 for the oldest
 * collections, 2026-09-10 for hair-cc), which is the whole point.
 *
 * Never throws: a DB hiccup must not turn the sitemap into a 500 — a
 * crawler that gets an error may not come back for a while.
 */
export async function newestModCreatedAt(
  gameSlug: string,
  topicSlug: string,
): Promise<string | null> {
  const collection = getCollection(gameSlug, topicSlug);
  if (!collection) return null;
  try {
    const agg = await prisma.mod.aggregate({
      where: {
        ...buildWhereClause(collection.filter),
        gameVersion: collection.game,
        isNSFW: false,
      },
      _max: { createdAt: true },
    });
    const newest = agg._max.createdAt;
    return newest ? toDateStamp(newest) : null;
  } catch {
    return null;
  }
}

/** Collection page lastmod: later of the template date and the newest mod. */
export async function collectionLastmod(
  gameSlug: string,
  topicSlug: string,
): Promise<string> {
  return laterOf(
    COLLECTION_TEMPLATE_LASTMOD,
    await newestModCreatedAt(gameSlug, topicSlug),
  );
}
