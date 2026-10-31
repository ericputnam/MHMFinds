/**
 * "Creators in this collection" on /games/[game]/[topic]/ (Sage, E302,
 * 2026-10-31).
 *
 * The 35 collection hubs are the catalog's best-crawled and best-landed
 * pages (GA4 10-23→10-29: 147 Google-organic + 245 AI-referral landings;
 * hair-cc crawled 10-26, poses 10-30). The 561 /creator/[slug]/ pages are
 * reached only from mod pages, the /creator/ A–Z hub and the creators
 * sitemap: 175 of 561 got a Google landing in the 28 days to 10-29, and
 * 5 of 5 sampled pages created by E293 on 10-30 were "URL is unknown to
 * Google" on 10-31. E292 gave every creator page links *up* to its hubs;
 * nothing on the site linked *down* from a hub to the creators that fill
 * it. This block does, server-rendered, so a crawler reading a hub finds
 * the creator pages behind it in the same fetch.
 *
 * Membership is the hub's own where-clause (`buildWhereClause` +
 * gameVersion + isNSFW:false — exactly `fetchCollectionMods`), grouped by
 * the raw author string and folded onto the separator-free creator key
 * (E293), then joined to `listHubCreators()` so a link can only point at a
 * slug the /creator/ hub, the sitemap and the leaf route all serve
 * ("never emit a link the target would 404"). Ranked by how many of the
 * hub's mods the creator made, then by download clicks.
 *
 * Crawler surface: never throws. A DB error or an empty population hides
 * the block and the page renders as before. The fold is pure;
 * `__tests__/unit/collection-creators.test.ts` covers it.
 */

import { buildWhereClause, type CollectionDefinition } from './collections';
import { listHubCreators, type CreatorListRow } from './creators';
import { creatorKey } from './creatorSlug';
import { prisma } from './prisma';

/** Links in the block: one row of cards on desktop, not a directory. */
export const MAX_COLLECTION_CREATORS = 6;
/** A creator needs this many mods inside the hub to be "a creator in it". */
export const MIN_MODS_IN_COLLECTION = 2;
/** Raw author rows fetched before folding spellings — a 2× margin over the block. */
const AUTHOR_ROWS_TAKE = 60;

export interface CollectionCreator {
  /** Canonical creator slug (the one listCreators lists). */
  slug: string;
  displayName: string;
  /** How many of this hub's SFW mods the creator made. */
  count: number;
}

export interface AuthorCountRow {
  author: string | null;
  count: number;
  downloads: number;
}

/**
 * Pure: fold raw author rows by creator key, keep the ones that have a
 * page (present in `hubRows`) with at least `min` mods in the hub, rank by
 * count desc, downloads desc, slug asc, and cap at `max`.
 */
export function foldCollectionCreators(
  authorRows: ReadonlyArray<AuthorCountRow>,
  hubRows: ReadonlyArray<Pick<CreatorListRow, 'slug' | 'displayName'>>,
  max: number = MAX_COLLECTION_CREATORS,
  min: number = MIN_MODS_IN_COLLECTION,
): CollectionCreator[] {
  const pages = new Map<string, Pick<CreatorListRow, 'slug' | 'displayName'>>();
  for (const row of hubRows) {
    const key = creatorKey(row.slug);
    if (key && !pages.has(key)) pages.set(key, row);
  }

  const folded = new Map<string, { count: number; downloads: number }>();
  for (const row of authorRows) {
    if (!row.author) continue;
    const key = creatorKey(row.author);
    if (!key) continue;
    const acc = folded.get(key) ?? { count: 0, downloads: 0 };
    acc.count += row.count;
    acc.downloads += row.downloads;
    folded.set(key, acc);
  }

  const out: Array<CollectionCreator & { downloads: number }> = [];
  folded.forEach((agg, key) => {
    const page = pages.get(key);
    if (!page || agg.count < min) return;
    out.push({ slug: page.slug, displayName: page.displayName, count: agg.count, downloads: agg.downloads });
  });

  return out
    .sort((a, b) => b.count - a.count || b.downloads - a.downloads || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, Math.max(0, max))
    .map(({ slug, displayName, count }) => ({ slug, displayName, count }));
}

// One creator-population query per server process (the collection pages
// are statically generated, so this is one query per build, not per hub).
// Only a non-empty answer is kept: a transient [] must not pin every hub
// to "no creators" for the life of the process.
let hubRowsMemo: Promise<CreatorListRow[]> | null = null;

function hubRows(): Promise<CreatorListRow[]> {
  if (!hubRowsMemo) {
    hubRowsMemo = listHubCreators().then((rows) => {
      if (rows.length === 0) hubRowsMemo = null;
      return rows;
    });
  }
  return hubRowsMemo;
}

/** Server loader. Never throws; [] on any error. */
export async function getCollectionCreators(collection: CollectionDefinition): Promise<CollectionCreator[]> {
  try {
    const where = {
      ...buildWhereClause(collection.filter),
      gameVersion: collection.game,
      isNSFW: false,
      author: { not: null },
    };
    const [grouped, pages] = await Promise.all([
      prisma.mod.groupBy({
        by: ['author'],
        where,
        _count: { _all: true },
        _sum: { downloadCount: true },
        orderBy: { _count: { author: 'desc' } },
        take: AUTHOR_ROWS_TAKE,
      }),
      hubRows(),
    ]);
    return foldCollectionCreators(
      grouped.map((g) => ({
        author: g.author,
        count: g._count._all,
        downloads: g._sum.downloadCount ?? 0,
      })),
      pages,
    );
  } catch (error) {
    console.error('[collectionCreators] getCollectionCreators failed, hiding block:', error);
    return [];
  }
}
