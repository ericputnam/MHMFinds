/**
 * Print the sitemap-position indices of the first N pending URLs (those not
 * present in the freshness CSV). Helps pick a useful --start-index for
 * `npm run scrape:mhm`.
 */
import './lib/setup-env';

import { mhmScraper } from '@/lib/services/mhmScraper';
import { shouldSkipPost } from '@/lib/services/mhmScraperUtils';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const csvPath = path.join(process.cwd(), 'data', 'mhm-scraped-urls.csv');
  const scraped = new Set<string>();
  if (fs.existsSync(csvPath)) {
    const csv = fs.readFileSync(csvPath, 'utf-8');
    for (const line of csv.split('\n').slice(1)) {
      const url = line.split(',')[0]?.trim();
      if (url) scraped.add(url);
    }
  }

  const all = await mhmScraper.getAllBlogPostUrls();
  const pendingWithIdx: { idx: number; url: string; willSkip: boolean }[] = [];
  for (let i = 0; i < all.length; i++) {
    const url = all[i];
    if (!scraped.has(url)) {
      pendingWithIdx.push({ idx: i + 1, url, willSkip: shouldSkipPost(url) });
    }
  }

  console.log(`\n📋 Total pending: ${pendingWithIdx.length}`);
  console.log(`   Showing first 20:\n`);

  for (const { idx, url, willSkip } of pendingWithIdx.slice(0, 20)) {
    const slug = new URL(url).pathname.replace(/^\/|\/$/g, '');
    const skipBadge = willSkip ? '\x1b[90m[SKIP]\x1b[0m ' : '         ';
    console.log(`  [${idx}/${all.length}] ${skipBadge}${slug}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
