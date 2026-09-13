import { NextResponse } from 'next/server';

import { buildWhereClause, getCollection } from '@/lib/collections';
import {
  FEED_CACHE_CONTROL,
  FEED_ITEM_LIMIT,
  FEED_MOD_SELECT,
  SITE,
  buildRssFeed,
  collectionFeedPath,
  toFeedItem,
  type FeedModRow,
} from '@/lib/feeds';
import { prisma } from '@/lib/prisma';

/**
 * /feeds/{game}/{collection}/ — RSS 2.0 of the newest mods in one curated
 * collection (E42), e.g. /feeds/sims-4/hair-cc/. Uses the collection page's
 * exact where-clause so the feed and the page never disagree about membership.
 * Unknown slug → 404 (a feed for a page that does not exist must not exist).
 * DB failure → empty valid feed, 200.
 */

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ game: string; slug: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { game, slug } = await context.params;
  const collection = getCollection(game, slug);
  if (!collection) {
    return new NextResponse('Not found', { status: 404 });
  }

  let rows: FeedModRow[] = [];
  try {
    rows = await prisma.mod.findMany({
      where: { ...buildWhereClause(collection.filter), gameVersion: collection.game, isNSFW: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: FEED_ITEM_LIMIT,
      select: FEED_MOD_SELECT,
    });
  } catch (error) {
    console.error(`[feeds/${game}/${slug}] query failed:`, error);
  }

  const pageUrl = `${SITE}/games/${collection.gameSlug}/${collection.slug}/`;
  const body = buildRssFeed(
    {
      title: `MustHaveMods — new ${collection.heading}`,
      description: `${collection.tagline}. The newest additions to the ${collection.title} collection on MustHaveMods.`,
      homePageUrl: pageUrl,
      feedUrl: `${SITE}${collectionFeedPath(collection.gameSlug, collection.slug)}`,
    },
    rows.map(toFeedItem),
  );

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': FEED_CACHE_CONTROL,
    },
  });
}
