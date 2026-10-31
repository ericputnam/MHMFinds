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

// Homepage shell: SSR shell 2026-09-08 (PR #48); app/page.tsx + HomeCapture
// 2026-10-26 and app/layout.tsx + HomeJsonLd 2026-10-27 (#389). Bump when
// app-level pages actually change — the git guard below fails if you forget.
// HOME_SHELL_LASTMOD in lib/seo/siteLastmod.ts restates this; bump both.
export const APP_LASTMOD = '2026-10-27';

// /games/[game]/[topic] template — trailing-slash canonical fix 2026-07-03;
// og:image on every collection page 2026-10-30 (E298, #410). Bump when the
// template changes.
export const COLLECTION_TEMPLATE_LASTMOD = '2026-10-30';

// /creator/[slug]/ template (E299, Sage, 2026-10-30). Every creator page's
// title + meta changed on 2026-10-27 (E267) and every page gained its
// collection-hub links on 2026-10-30 (E292), while /sitemap-creators.xml
// still dated 526 of 554 entries by their newest mod alone (169 said
// January 2026), so Google had no recrawl signal — /creator/orchiona/ was
// last crawled 2026-09-24. Bump by hand when the creator template changes;
// never derive it from "today".
export const CREATOR_TEMPLATE_LASTMOD = '2026-10-30';

/**
 * Which source files each template constant stands for (E303, Sage,
 * 2026-10-31). `__tests__/unit/template-lastmod-git-guard.test.ts` runs
 * `git log -1 --format=%cs -- <paths>` for each entry and fails when the
 * constant is older than the newest commit touching those paths — the
 * failure E299 found by hand (169 creator entries dated January after two
 * template rewrites) and that this guard found again the next day:
 * COLLECTION_TEMPLATE_LASTMOD still said 2026-07-03 after E298 added
 * og:image to every collection page on 2026-10-30, and APP_LASTMOD said
 * 2026-09-08 after the homepage shell changed on 10-26/10-27 (#389).
 *
 * A path listed here must exist; a renamed file is a test failure, not a
 * silent skip. Keep each set to the template itself (route dir, its
 * metadata builder, its own components) — not the data registries, which
 * change whenever a page is *added* and would force a bump that says every
 * existing page changed.
 */
export const TEMPLATE_LASTMOD_SOURCES: ReadonlyArray<{
  name: 'APP_LASTMOD' | 'COLLECTION_TEMPLATE_LASTMOD' | 'CREATOR_TEMPLATE_LASTMOD';
  lastmod: string;
  paths: readonly string[];
}> = [
  {
    // Homepage shell: the page, the root layout it renders inside, and the
    // homepage-only components. HOME_SHELL_LASTMOD in lib/seo/siteLastmod.ts
    // restates this value; bump both.
    name: 'APP_LASTMOD',
    lastmod: APP_LASTMOD,
    paths: [
      'app/page.tsx',
      'app/layout.tsx',
      'components/Hero.tsx',
      'components/HomeCapture.tsx',
      'components/HomeJsonLd.tsx',
    ],
  },
  {
    name: 'COLLECTION_TEMPLATE_LASTMOD',
    lastmod: COLLECTION_TEMPLATE_LASTMOD,
    paths: ['app/games/[game]/[topic]', 'lib/seo/collectionMetadata.ts', 'lib/seo/collectionMoreLinks.ts'],
  },
  {
    name: 'CREATOR_TEMPLATE_LASTMOD',
    lastmod: CREATOR_TEMPLATE_LASTMOD,
    paths: [
      'app/creator/[slug]',
      'components/creator',
      'lib/creators.ts',
      'lib/creatorSlug.ts',
      'lib/creatorMods.ts',
      'lib/creatorBadge.ts',
      'lib/creatorHubLinks.ts',
      'lib/creatorHubRelated.ts',
      'lib/seo/creatorMeta.ts',
    ],
  },
];

/**
 * /creator/[slug]/ lastmod: later of the creator template change and the
 * creator's newest mod (listCreators().latest), as YYYY-MM-DD. Lives here,
 * not in the route file, because Next.js only allows HTTP-method and config
 * exports from a route.ts.
 */
export function creatorLastmod(latest: Date | string | null | undefined): string {
  const newest = latest ? toDateStamp(new Date(latest)) : null;
  return laterOf(CREATOR_TEMPLATE_LASTMOD, newest);
}

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
