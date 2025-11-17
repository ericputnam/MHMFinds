import { mhmScraper } from '../lib/services/mhmScraper';

async function main() {
  try {
    await mhmScraper.runFullScrape();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
