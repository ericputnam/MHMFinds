import { NextResponse } from 'next/server';

import {
  FEED_CACHE_CONTROL,
  FEED_ITEM_LIMIT,
  FEED_MOD_SELECT,
  FEEDS_RSS_PATH,
  SITE,
  buildRssFeed,
  toFeedItem,
  type FeedModRow,
} from '@/lib/feeds';
import { prisma } from '@/lib/prisma';

/**
 * /feeds/mods.xml — RSS 2.0 of the newest Sims 4 mods and CC (E42).
 * Sibling of /feeds/mods.json; same rows, same filters, same fail-open.
 * (WordPress's own RSS stays at /feed/ — do not merge the two.)
 */

export const dynamic = 'force-dynamic';

async function fetchNewest(): Promise<FeedModRow[]> {
  try {
    return await prisma.mod.findMany({
      where: { gameVersion: 'Sims 4', isNSFW: false },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: FEED_ITEM_LIMIT,
      select: FEED_MOD_SELECT,
    });
  } catch (error) {
    console.error('[feeds/mods.xml] query failed:', error);
    return [];
  }
}

export async function GET() {
  const rows = await fetchNewest();
  const body = buildRssFeed(
    {
      title: 'MustHaveMods — new Sims 4 mods & CC',
      description:
        'The newest Sims 4 mods and custom content added to MustHaveMods, with creator credit and a checked download link on every mod page.',
      homePageUrl: `${SITE}/`,
      feedUrl: `${SITE}${FEEDS_RSS_PATH}`,
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
