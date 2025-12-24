// Load environment variables FIRST, before any imports that need them
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.production', override: false }); // Fallback to production if local doesn't exist

// Now import modules that depend on environment variables
import { mhmScraper } from '../lib/services/mhmScraper';

async function main() {
  try {
    // Parse command-line arguments
    const args = process.argv.slice(2);
    let startUrl: string | undefined;
    let startIndex: number | undefined;

    // Check for --start-url or --start-index flags
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--start-url' && args[i + 1]) {
        startUrl = args[i + 1];
        console.log(`📍 Resuming from URL: ${startUrl}`);
      } else if (args[i] === '--start-index' && args[i + 1]) {
        startIndex = parseInt(args[i + 1]);
        console.log(`📍 Resuming from index: ${startIndex}`);
      } else if (args[i] === '--help' || args[i] === '-h') {
        console.log(`
🔍 MustHaveMods Scraper

Usage:
  npm run scrape:mhm                              # Scrape all posts from beginning
  npm run scrape:mhm -- --start-index 131         # Resume from post #131
  npm run scrape:mhm -- --start-url "https://..." # Resume from specific URL

Options:
  --start-index <number>    Resume scraping from a specific post number (1-based)
  --start-url <url>         Resume scraping from a specific URL
  --help, -h                Show this help message

Examples:
  npm run scrape:mhm -- --start-index 131
  npm run scrape:mhm -- --start-url "https://musthavemods.com/sims-4-cc-finds-for-august/"
        `);
        process.exit(0);
      }
    }

    await mhmScraper.runFullScrape({ startUrl, startIndex });
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
