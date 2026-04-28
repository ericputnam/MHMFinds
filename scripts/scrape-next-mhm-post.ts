/**
 * Process MHM blog posts that have NEVER been scraped before, one at a time.
 *
 * Differs from `scrape:mhm` in three ways:
 *   1. Targets `hasUrlBeenScrapedEver(url) === false` — i.e. URLs not present
 *      in data/mhm-scraped-urls.csv at all. The standard scraper's freshness
 *      check skips URLs scraped within the last 3 months but would re-process
 *      anything older; we never want to touch already-processed posts here.
 *   2. Defaults to `--one` (process exactly one post then exit) so you can
 *      spot-check the V2 author extraction before continuing.
 *   3. Writes a clear post-summary table showing every mod found, its author,
 *      strategy, and isFree status — easy to eyeball.
 *
 * The actual extraction uses the live mhmScraper (which now calls V2
 * extractAuthor with fetchDestination + Patreon API + paywall detection).
 *
 * Usage:
 *   # See what's pending:
 *   npx tsx scripts/scrape-next-mhm-post.ts --list
 *
 *   # Process the next unprocessed post (default behavior):
 *   npx tsx scripts/scrape-next-mhm-post.ts
 *
 *   # Process N posts in a row without prompting:
 *   npx tsx scripts/scrape-next-mhm-post.ts --batch 5
 *
 *   # Process all unprocessed posts in one shot (no spot-check):
 *   npx tsx scripts/scrape-next-mhm-post.ts --all
 *
 *   # Override start position (skip first N pending posts):
 *   npx tsx scripts/scrape-next-mhm-post.ts --skip 3
 */

import './lib/setup-env';
import { mhmScraper } from '../lib/services/mhmScraper';
import { prisma } from '../lib/prisma';

interface Flags {
  list: boolean;
  batch: number;     // process this many posts then exit (default 1)
  all: boolean;      // process every pending post
  skip: number;      // skip first N pending posts
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { list: false, batch: 1, all: false, skip: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--list') flags.list = true;
    else if (a === '--all') flags.all = true;
    else if (a === '--batch' && argv[i + 1]) flags.batch = parseInt(argv[++i], 10);
    else if (a === '--skip' && argv[i + 1]) flags.skip = parseInt(argv[++i], 10);
    else if (a === '--help' || a === '-h') {
      console.log(
        '\nUsage: scrape-next-mhm-post.ts [--list] [--batch N] [--all] [--skip N]\n\n' +
          '  --list       Show pending posts and exit\n' +
          '  --batch N    Process N posts then exit (default 1)\n' +
          '  --all        Process all pending posts\n' +
          '  --skip N     Skip first N pending posts\n',
      );
      process.exit(0);
    }
  }
  return flags;
}

function divider(char = '─', width = 70): string {
  return char.repeat(width);
}

async function main(): Promise<void> {
  const flags = parseFlags(process.argv.slice(2));

  console.log('🔍 Loading MHM sitemap…');
  const allPostUrls = await mhmScraper.getAllBlogPostUrls();
  console.log(`   Total posts in sitemap: ${allPostUrls.length}`);

  // Filter to URLs we have NEVER processed.
  const pending = allPostUrls.filter(u => !mhmScraper.hasUrlBeenScrapedEver(u));
  console.log(`   Already scraped:        ${allPostUrls.length - pending.length}`);
  console.log(`   Pending (never seen):   ${pending.length}\n`);

  if (flags.list) {
    if (pending.length === 0) {
      console.log('✅ Nothing pending — every post in the sitemap has been scraped.');
    } else {
      console.log('Pending posts:');
      pending.slice(0, 50).forEach((u, i) => console.log(`  ${i + 1}. ${u}`));
      if (pending.length > 50) console.log(`  … +${pending.length - 50} more`);
    }
    await prisma.$disconnect();
    return;
  }

  if (pending.length === 0) {
    console.log('✅ Nothing pending — every post in the sitemap has been scraped.');
    await prisma.$disconnect();
    return;
  }

  // Determine how many to process this run.
  const todo = pending.slice(flags.skip);
  const limit = flags.all ? todo.length : flags.batch;
  const target = todo.slice(0, limit);

  console.log(`▶️  Processing ${target.length} post(s) (${flags.skip} skipped)\n`);

  let totalMods = 0;
  let totalSaved = 0;

  for (let i = 0; i < target.length; i++) {
    const postUrl = target[i];
    console.log(divider('═'));
    console.log(`📄 [${i + 1}/${target.length}] ${postUrl}`);
    console.log(divider('═'));

    const startedAt = Date.now();
    let mods;
    try {
      mods = await mhmScraper.scrapeModsFromPost(postUrl);
    } catch (err) {
      console.error(`❌ scrapeModsFromPost threw: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`\n   Found ${mods.length} mods in this post (${elapsedSec}s)`);

    let saved = 0;
    if (mods.length > 0) {
      saved = await mhmScraper.saveModsToDatabase(mods);
      totalMods += mods.length;
      totalSaved += saved;
    }

    // Mark URL as scraped — do this even if 0 mods so we don't re-process.
    mhmScraper.recordScrapedUrl(postUrl, mods.length);

    // Spot-check summary table.
    console.log('\n   ┌─ Mods extracted ' + '─'.repeat(50));
    if (mods.length === 0) {
      console.log('   │  (none)');
    } else {
      mods.forEach((m, idx) => {
        const author = m.author ?? '∅ null';
        const paid = m.isFree ? '   ' : '💰 ';
        console.log(`   │ ${String(idx + 1).padStart(2, ' ')}. ${paid}${author.padEnd(22)} ${m.title.slice(0, 40)}`);
        console.log(`   │    ↳ ${(m.downloadUrl ?? '').slice(0, 60)}`);
      });
    }
    console.log('   └' + '─'.repeat(67));
    console.log(`   📥 Saved: ${saved} (others were duplicates or filtered)\n`);
  }

  console.log(divider('═'));
  console.log(`✅ Done. Posts processed: ${target.length}`);
  console.log(`   Mods discovered: ${totalMods}`);
  console.log(`   New mods saved:  ${totalSaved}`);
  console.log(`   Pending after this run: ${pending.length - target.length - flags.skip}`);

  await prisma.$disconnect();
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
