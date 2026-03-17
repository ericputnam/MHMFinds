/**
 * WM (wewantmods.com) Scraper
 *
 * This script scrapes the WM sitemap to discover Sims 4 mods,
 * then follows external links to get detailed mod information.
 *
 * IMPORTANT: This scraper NEVER stores WM URLs in the database.
 * It only uses WM as a discovery source, storing the actual
 * external source URLs (TSR, Patreon, Tumblr, ModCollective, etc.)
 *
 * URL Tracking: Scraped URLs are tracked in data/scraped-urls.csv
 * Pages scraped within the last 3 months are automatically skipped.
 *
 * Usage:
 *   npx tsx scripts/run-wewantmods-scraper.ts [options]
 *
 * Options:
 *   --limit=N       Limit to first N collection pages (default: all)
 *   --dry-run       Preview what would be scraped without importing
 *   --force         Force rescrape all pages (ignore 3-month freshness check)
 *
 * Privacy Levels (set via PRIVACY_LEVEL env var):
 *   default:     3-8s delays, basic stealth
 *   stealth:     5-15s delays, proxy rotation enabled
 *   conservative: 10-30s delays, maximum safety
 *
 * Examples:
 *   npx tsx scripts/run-wewantmods-scraper.ts
 *   npx tsx scripts/run-wewantmods-scraper.ts --limit=5
 *   npx tsx scripts/run-wewantmods-scraper.ts --force    # Rescrape everything
 *   PRIVACY_LEVEL=stealth npx tsx scripts/run-wewantmods-scraper.ts
 */

// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
import './lib/setup-env';

// Now import modules that depend on environment variables
import { weWantModsScraper } from '../lib/services/weWantModsScraper';

async function main() {
  console.log('='.repeat(60));
  console.log('🎮 WM (wewantmods.com) SCRAPER');
  console.log('='.repeat(60));
  console.log('');
  console.log('This scraper discovers mods from WM and imports');
  console.log('them by following external source links.');
  console.log('');
  console.log('⚠️  IMPORTANT: Only external URLs are stored, never WM URLs');
  console.log('🖼️  Images are downloaded and uploaded to Vercel Blob storage');
  console.log('');

  // Check for required environment variables
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('❌ ERROR: BLOB_READ_WRITE_TOKEN environment variable is not set.');
    console.error('');
    console.error('To fix this:');
    console.error('1. Go to your Vercel project dashboard');
    console.error('2. Go to Storage → Create → Blob');
    console.error('3. Connect the blob store to your project');
    console.error('4. Copy the BLOB_READ_WRITE_TOKEN to your .env.local file');
    console.error('');
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  let limit: number | undefined;
  let dryRun = false;
  let forceRescrape = false;

  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      limit = parseInt(arg.split('=')[1], 10);
      if (isNaN(limit) || limit < 1) {
        console.error('❌ Invalid limit value. Must be a positive integer.');
        process.exit(1);
      }
    }
    if (arg === '--dry-run') {
      dryRun = true;
    }
    if (arg === '--force') {
      forceRescrape = true;
    }
  }

  console.log(`📋 Configuration:`);
  console.log(`   Privacy Level: ${process.env.PRIVACY_LEVEL || 'default'}`);
  console.log(`   Page Limit: ${limit || 'all pages'}`);
  console.log(`   Dry Run: ${dryRun}`);
  console.log(`   Force Rescrape: ${forceRescrape}`);
  console.log(`   URL Tracking: data/scraped-urls.csv (skip pages scraped within 3 months)`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No data will be written to database');
    console.log('');

    // In dry run, just fetch sitemap and show what would be scraped
    const entries = await weWantModsScraper.fetchSitemap();
    const pagesToShow = limit ? entries.slice(0, limit) : entries.slice(0, 10);

    console.log(`\nFound ${entries.length} collection pages. Showing first ${pagesToShow.length}:`);
    for (const entry of pagesToShow) {
      console.log(`  - ${entry.url}`);
      if (entry.lastmod) {
        console.log(`    Last modified: ${entry.lastmod}`);
      }
    }

    if (entries.length > pagesToShow.length) {
      console.log(`  ... and ${entries.length - pagesToShow.length} more`);
    }

    console.log('\n✅ Dry run complete. Run without --dry-run to import mods.');
    return;
  }

  // Run the full scraper
  await weWantModsScraper.run({ limit, forceRescrape });
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
