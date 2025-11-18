import { mhmScraper } from '../lib/services/mhmScraper';

async function testScraper() {
  console.log('🧪 Testing MHM Scraper on sample post...\n');

  const testUrl = 'https://musthavemods.com/sims-4-cc-finds-for-november/';

  console.log(`📄 Scraping: ${testUrl}\n`);

  const mods = await mhmScraper.scrapeModsFromPost(testUrl);

  console.log(`\n✅ Found ${mods.length} mods\n`);

  // Show first 5 mods with details
  const displayCount = Math.min(5, mods.length);
  console.log(`📋 First ${displayCount} mods:\n`);

  for (let i = 0; i < displayCount; i++) {
    const mod = mods[i];
    console.log(`${i + 1}. ${mod.title}`);
    console.log(`   Author: ${mod.author || 'Not found'}`);
    console.log(`   Category: ${mod.category}`);
    console.log(`   Thumbnail: ${mod.thumbnail ? '✅ Yes' : '❌ No'}`);
    console.log(`   Download: ${mod.downloadUrl ? '✅ Yes' : '❌ MISSING'}`);
    console.log(`   Description: ${mod.description ? mod.description.substring(0, 80) + '...' : 'None'}`);
    console.log('');
  }

  // Validation checks
  console.log('\n📊 Validation Summary:');
  const modsWithoutDownload = mods.filter(m => !m.downloadUrl);
  const modsWithoutThumbnail = mods.filter(m => !m.thumbnail);
  const modsWithAuthor = mods.filter(m => m.author);

  console.log(`   Total mods: ${mods.length}`);
  console.log(`   ❌ Missing download link: ${modsWithoutDownload.length} (should be 0!)`);
  console.log(`   ⚠️  Missing thumbnail: ${modsWithoutThumbnail.length}`);
  console.log(`   ✅ With author: ${modsWithAuthor.length}`);

  if (modsWithoutDownload.length > 0) {
    console.log('\n⚠️  WARNING: Found mods without download links:');
    modsWithoutDownload.forEach(m => console.log(`   - ${m.title}`));
  }
}

testScraper().catch(console.error);
