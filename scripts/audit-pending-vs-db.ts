/**
 * Audit: are the "pending" URLs (per CSV) actually unscraped (per DB)?
 *
 * Compares mhmScraper's pending list vs. distinct sourceUrl in the Mod table.
 * Flags any pending URL that already has mods → CSV/DB drift.
 */
import './lib/setup-env';

import { prisma } from '@/lib/prisma';
import { mhmScraper } from '@/lib/services/mhmScraper';

async function main() {
  // 1. Get sitemap URLs (mirrors what scrape-next-mhm-post.ts does)
  const sitemapUrls = await mhmScraper.getAllBlogPostUrls();
  console.log(`Sitemap URLs:   ${sitemapUrls.length}`);

  // 2. Filter to "pending" per CSV
  const pending = sitemapUrls.filter(u => !mhmScraper.hasUrlBeenScrapedEver(u));
  console.log(`Pending (CSV):  ${pending.length}`);

  // 3. Check DB for any of these URLs
  const inDb = await prisma.mod.groupBy({
    by: ['sourceUrl'],
    where: { sourceUrl: { in: pending } },
    _count: { _all: true },
  });

  if (inDb.length === 0) {
    console.log('\n✅ All pending URLs are truly unscraped — no DB overlap.');
  } else {
    console.log(`\n⚠️  CSV/DB drift: ${inDb.length} pending URLs already have mods in the DB:`);
    for (const row of inDb.sort((a, b) => b._count._all - a._count._all)) {
      console.log(`   ${String(row._count._all).padStart(3)} mods  ${row.sourceUrl}`);
    }
    const totalDriftMods = inDb.reduce((s, r) => s + r._count._all, 0);
    console.log(`\n   ${totalDriftMods} mods total would be duplicated/skipped.`);
    console.log('   Run scripts/backfill-mhm-scraped-urls.ts to add these to the CSV.');
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
