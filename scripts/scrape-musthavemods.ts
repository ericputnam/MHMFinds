// CRITICAL: Import setup-env FIRST to configure DATABASE_URL for scripts
// This swaps prisma+postgres:// (Accelerate) for DIRECT_DATABASE_URL
import './lib/setup-env';

// Now import modules that depend on environment variables
import { mhmScraper } from '../lib/services/mhmScraper';

async function main() {
  try {
    // Parse command-line arguments
    const args = process.argv.slice(2);
    let startUrl: string | undefined;
    let startIndex: number | undefined;
    let forceRescrape = false;
    let limit: number | undefined;
    let newOnly = false;
    let since: Date | undefined;
    let dryRun = false;

    // Check for flags
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--new-only') {
        newOnly = true;
        console.log(`🗄️  New-only mode: skipping posts that already have mods in the database`);
      } else if (args[i] === '--dry-run') {
        dryRun = true;
        console.log(`🧪 Dry run: nothing will be written`);
      } else if (args[i].startsWith('--since')) {
        const raw = args[i].includes('=') ? args[i].split('=')[1] : args[++i];
        const parsed = raw ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00Z` : raw) : new Date(NaN);
        if (Number.isNaN(parsed.getTime())) {
          console.error(`❌ --since needs a date like 2026-08-10 (got "${raw ?? ''}")`);
          process.exit(1);
        }
        since = parsed;
        console.log(`📆 Only posts with sitemap lastmod >= ${since.toISOString().slice(0, 10)}`);
      } else if (args[i] === '--start-url' && args[i + 1]) {
        startUrl = args[i + 1];
        console.log(`📍 Resuming from URL: ${startUrl}`);
      } else if (args[i] === '--start-index' && args[i + 1]) {
        startIndex = parseInt(args[i + 1]);
        console.log(`📍 Resuming from index: ${startIndex}`);
      } else if (args[i] === '--force' || args[i] === '-f') {
        forceRescrape = true;
        console.log(`⚠️  Force rescrape enabled`);
      } else if (args[i] === '--limit' && args[i + 1]) {
        limit = parseInt(args[i + 1]);
        console.log(`📏 Limiting to ${limit} posts`);
      } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
🔍 MustHaveMods Scraper

Usage:
  npm run scrape:mhm                              # Scrape all posts (skips recently scraped)
  npm run scrape:mhm -- --force                   # Force rescrape all posts
  npm run scrape:mhm -- --start-index 131         # Resume from post #131
  npm run scrape:mhm -- --start-url "https://..." # Resume from specific URL
  npm run scrape:mhm -- --limit 10                # Only scrape 10 posts
  npm run scrape:mhm -- --new-only --since 2026-08-10 --dry-run   # Preview an incremental run
  npm run scrape:mhm -- --new-only --since 2026-08-10             # Ingest only new posts (daily job)

Options:
  --start-index <number>    Resume scraping from a specific post number (1-based)
  --start-url <url>         Resume scraping from a specific URL
  --force, -f               Ignore freshness tracking and rescrape all URLs
  --limit <number>          Maximum number of posts to scrape
  --new-only                Skip posts that already have >=1 mod row in the DB (freshness from the
                            database, not data/mhm-scraped-urls.csv — safe from any checkout)
  --since <YYYY-MM-DD>      Only consider posts whose sitemap <lastmod> is on/after this date
  --dry-run                 Fetch + parse and report would-create/would-update; write nothing
  --help, -h                Show this help message

Features:
  ✅ Content type detection - Automatically detects mod type (hair, furniture, etc.)
  ✅ Room theme detection - Detects room themes (bathroom, kitchen, etc.)
  ✅ URL freshness tracking - Skips URLs scraped within last 3 months

Examples:
  npm run scrape:mhm -- --start-index 131
  npm run scrape:mhm -- --force --limit 50
  npm run scrape:mhm -- --start-url "https://musthavemods.com/sims-4-cc-finds-for-august/"
        `);
        process.exit(0);
      }
    }

    await mhmScraper.runFullScrape({ startUrl, startIndex, forceRescrape, limit, newOnly, since, dryRun });
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
