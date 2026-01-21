import { mhmScraper } from '../lib/services/mhmScraper';

/**
 * Test the AI-powered HTML parsing in the scraper
 */
async function testAIScraper() {
  console.log('🧪 Testing AI-powered scraper...\n');

  // Test with a single post
  const testUrl = 'https://musthavemods.com/sims-4-witch-cc-2/';

  console.log(`📝 Scraping: ${testUrl}\n`);

  const mods = await mhmScraper.scrapeModsFromPost(testUrl);

  console.log(`\n✅ Found ${mods.length} mods\n`);

  // Display first 3 mods with details
  for (let i = 0; i < Math.min(3, mods.length); i++) {
    const mod = mods[i];
    console.log(`\n📦 Mod ${i + 1}:`);
    console.log(`   Title: ${mod.title}`);
    console.log(`   Author: ${mod.author || 'N/A'}`);
    console.log(`   Category: ${mod.category || 'N/A'}`);
    console.log(`   Image: ${mod.thumbnail?.substring(0, 60)}${mod.thumbnail && mod.thumbnail.length > 60 ? '...' : ''}`);
    console.log(`   Description: ${mod.description?.substring(0, 100)}${mod.description && mod.description.length > 100 ? '...' : ''}`);
    console.log(`   Download: ${mod.downloadUrl?.substring(0, 60)}${mod.downloadUrl && mod.downloadUrl.length > 60 ? '...' : ''}`);
  }

  console.log('\n✅ Test complete!');
}

testAIScraper()
  .catch(console.error)
  .finally(() => process.exit(0));
