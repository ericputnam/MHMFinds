import { NextResponse } from 'next/server';

import {
  FEED_CACHE_CONTROL,
  FEED_ITEM_LIMIT,
  FEED_MOD_SELECT,
  FEEDS_JSON_PATH,
  SITE,
  buildJsonFeed,
  toFeedItem,
  type FeedModRow,
} from '@/lib/feeds';
import { prisma } from '@/lib/prisma';

/**
 * /feeds/mods.json — JSON Feed 1.1 of the newest Sims 4 mods and CC (E42).
 * Same public filter as every other surface (Sims 4, SFW). A DB failure
 * serves an empty-but-valid feed with a 200 rather than a 500: a poller that
 * gets an error may back off for days.
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
    console.error('[feeds/mods.json] query failed:', error);
    return [];
  }
}

export async function GET() {
  const rows = await fetchNewest();
  const body = buildJsonFeed(
    {
      title: 'MustHaveMods — new Sims 4 mods & CC',
      description:
        'The newest Sims 4 mods and custom content added to MustHaveMods, with creator credit and a checked download link on every mod page.',
      homePageUrl: `${SITE}/`,
      feedUrl: `${SITE}${FEEDS_JSON_PATH}`,
    },
    rows.map(toFeedItem),
  );

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/feed+json; charset=utf-8',
      'Cache-Control': FEED_CACHE_CONTROL,
    },
  });
}
