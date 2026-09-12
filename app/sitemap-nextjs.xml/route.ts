import { NextResponse } from 'next/server';
import { getAllCollectionRoutes } from '../../lib/collections';
import { getAllGameSlugs } from '../../lib/gameRoutes';
import {
  APP_LASTMOD,
  collectionLastmod,
  laterOf,
} from '../../lib/sitemapLastmod';

// This sitemap reads the catalog to derive per-collection <lastmod>, so it
// must render per request (the CDN cache below keeps it cheap). See
// lib/sitemapLastmod.ts for why lastmod is per-URL and createdAt-based.
export const dynamic = 'force-dynamic';

export async function GET() {
  const baseUrl = 'https://musthavemods.com';

  // Per-collection lastmod, queried in parallel; each entry degrades to the
  // template date on its own if the DB is unreachable.
  const routes = getAllCollectionRoutes();
  const collectionStamps = await Promise.all(
    routes.map(async (r) => ({
      ...r,
      lastmod: await collectionLastmod(r.gameSlug, r.topicSlug),
    })),
  );

  // A game hub (/games/sims-4/) lists its collections, so it changed when
  // its newest collection did. Games with no collections use the app date.
  const gameLastmod = new Map<string, string>();
  for (const c of collectionStamps) {
    gameLastmod.set(
      c.gameSlug,
      laterOf(gameLastmod.get(c.gameSlug) ?? APP_LASTMOD, c.lastmod),
    );
  }
  // The homepage lists collections and newest mods, so it moves with them.
  const homeLastmod = collectionStamps.reduce(
    (acc, c) => laterOf(acc, c.lastmod),
    APP_LASTMOD,
  );

  // /blog is omitted here — it lives in sitemap-blog-pages.xml as /blog/
  // to avoid duplicate entries across sitemaps.

  // All locs use trailing slashes: next.config.js sets trailingSlash:
  // true, so non-slash URLs 308-redirect. Sitemap entries pointing at
  // redirects split indexing signals with the canonical variant.
  // /mods/ (no such route — 404s) and /creators/ (307s to /sign-in for
  // logged-out visitors, i.e. every crawler) are intentionally absent.
  const staticUrls = [
    { loc: `${baseUrl}/`, lastmod: homeLastmod, priority: '1.0', changefreq: 'daily' },
    ...getAllGameSlugs().map((slug) => ({
      loc: `${baseUrl}/games/${slug}/`,
      lastmod: gameLastmod.get(slug) ?? APP_LASTMOD,
      priority: '0.9',
      changefreq: 'daily',
    })),
    { loc: `${baseUrl}/top-creators/`, lastmod: APP_LASTMOD, priority: '0.5', changefreq: 'weekly' },
    { loc: `${baseUrl}/about/`, lastmod: APP_LASTMOD, priority: '0.3', changefreq: 'monthly' },
    { loc: `${baseUrl}/submit-mod/`, lastmod: APP_LASTMOD, priority: '0.3', changefreq: 'monthly' },
    { loc: `${baseUrl}/privacy-policy/`, lastmod: APP_LASTMOD, priority: '0.1', changefreq: 'yearly' },
    { loc: `${baseUrl}/terms/`, lastmod: APP_LASTMOD, priority: '0.1', changefreq: 'yearly' },
  ];

  // Collection topic pages — /games/[game]/[topic]. Higher priority
  // than bare /games/[game] because these are the Pinterest funnel
  // entry points (Revenue Pivot Initiative 1).
  const collectionUrls = collectionStamps.map((c) => ({
    loc: `${baseUrl}/games/${c.gameSlug}/${c.topicSlug}/`,
    lastmod: c.lastmod,
    priority: '0.85',
    changefreq: 'weekly',
  }));

  const allUrls = [...staticUrls, ...collectionUrls];

  const urlEntries = allUrls
    .map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n');

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      'Content-Type': 'application/xml',
      // 18 aggregate queries per render; an hour at the CDN is plenty for
      // a file Google fetches at most a few times a day.
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
