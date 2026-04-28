/**
 * Show the next N pending MHM URLs so we can preview slug-driven detection
 * outcomes BEFORE running the scraper. Helps decide if new slug rules need
 * to be added (per the "more weight on slug" policy).
 *
 * Usage:
 *   npx tsx scripts/peek-next-pending.ts          # next 5
 *   npx tsx scripts/peek-next-pending.ts --n=15
 */
import './lib/setup-env';

import { mhmScraper } from '@/lib/services/mhmScraper';
import {
  detectContentTypeFromUrl,
  detectGameFromUrl,
} from '@/lib/services/mhmScraperUtils';
import * as fs from 'fs';
import * as path from 'path';

const args = process.argv.slice(2);
const nArg = args.find(a => a.startsWith('--n='))?.split('=')[1];
const N = nArg ? parseInt(nArg, 10) : 5;

async function main() {
  // Load already-scraped URLs from CSV
  const csvPath = path.join(process.cwd(), 'data', 'mhm-scraped-urls.csv');
  const scraped = new Set<string>();
  if (fs.existsSync(csvPath)) {
    const csv = fs.readFileSync(csvPath, 'utf-8');
    for (const line of csv.split('\n').slice(1)) {
      const url = line.split(',')[0]?.trim();
      if (url) scraped.add(url);
    }
  }

  // Sitemap order matches MHM publishing order
  const all = await mhmScraper.getAllBlogPostUrls();
  const pending = all.filter(u => !scraped.has(u));

  console.log(`\n📋 Total pending: ${pending.length}`);
  console.log(`   Showing next ${N}:\n`);

  for (const url of pending.slice(0, N)) {
    const game = detectGameFromUrl(url);
    const contentType = detectContentTypeFromUrl(url);
    const slug = new URL(url).pathname.replace(/^\/|\/$/g, '');

    const ctLabel = contentType ? `\x1b[32m${contentType}\x1b[0m` : '\x1b[33mNULL (no rule)\x1b[0m';
    const gameLabel = `\x1b[36m${game || 'unknown'}\x1b[0m`;

    console.log(`  ${slug}`);
    console.log(`     game: ${gameLabel}    contentType: ${ctLabel}`);
    console.log();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
