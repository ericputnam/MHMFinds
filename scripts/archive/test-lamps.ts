import { mhmScraper } from '../lib/services/mhmScraper';

async function testLampsPage() {
  console.log('🧪 Testing Lamps CC Page\n');

  const url = 'https://musthavemods.com/sims-4-lamps-cc/';

  console.log(`📄 Scraping: ${url}\n`);

  const mods = await mhmScraper.scrapeModsFromPost(url);

  console.log(`✅ Found ${mods.length} mods\n`);

  // Look for Two Tripod Lamps
  const twoTripodLamps = mods.find(m =>
    m.title.toLowerCase().includes('two tripod') ||
    m.title.toLowerCase().includes('tripod lamp')
  );

  if (twoTripodLamps) {
    console.log('✅ Found "Two Tripod Lamps"!');
    console.log(`   Title: ${twoTripodLamps.title}`);
    console.log(`   Download: ${twoTripodLamps.downloadUrl}`);
    console.log(`   Thumbnail: ${twoTripodLamps.thumbnail || 'MISSING'}`);
    console.log(`   Category: ${twoTripodLamps.category}`);
    console.log('');
  } else {
    console.log('❌ "Two Tripod Lamps" NOT found!');
    console.log('\nSearching for lamp-related mods:');
    const lampMods = mods.filter(m => m.title.toLowerCase().includes('lamp'));
    lampMods.forEach(m => console.log(`  - ${m.title}`));
    console.log('');
  }

  // Show all mods with their images
  console.log('📋 All mods found:\n');
  mods.forEach((mod, i) => {
    console.log(`${i + 1}. ${mod.title}`);
    console.log(`   Thumbnail: ${mod.thumbnail ? mod.thumbnail.substring(0, 80) + '...' : 'MISSING'}`);
    console.log(`   Download: ${mod.downloadUrl ? 'Yes' : 'No'}`);
    console.log('');
  });
}

testLampsPage().catch(console.error);
