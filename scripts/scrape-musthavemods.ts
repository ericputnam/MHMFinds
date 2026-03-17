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

    // Check for flags
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--start-url' && args[i + 1]) {
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

Options:
  --start-index <number>    Resume scraping from a specific post number (1-based)
  --start-url <url>         Resume scraping from a specific URL
  --force, -f               Ignore freshness tracking and rescrape all URLs
  --limit <number>          Maximum number of posts to scrape
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

    await mhmScraper.runFullScrape({ startUrl, startIndex, forceRescrape, limit });
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
