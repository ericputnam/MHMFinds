import { mhmScraper } from '../lib/services/mhmScraper';

async function testWitchCC() {
  console.log('🧪 Testing Witch CC Post\n');

  const url = 'https://musthavemods.com/sims-4-witch-cc-2/';

  console.log(`📄 Scraping: ${url}\n`);

  const mods = await mhmScraper.scrapeModsFromPost(url);

  console.log(`✅ Found ${mods.length} mods\n`);

  // Check for "Witch's Hollow"
  const witchsHollow = mods.find(m => m.title.toLowerCase().includes("hollow"));

  if (witchsHollow) {
    console.log('✅ Found "Witch\'s Hollow"!');
    console.log(`   Title: ${witchsHollow.title}`);
    console.log(`   Download: ${witchsHollow.downloadUrl}`);
    console.log(`   Thumbnail: ${witchsHollow.thumbnail ? 'Yes' : 'No'}`);
    console.log(`   Category: ${witchsHollow.category}`);
  } else {
    console.log('❌ "Witch\'s Hollow" NOT found!');

    // Search for build-related mods
    const buildMods = mods.filter(m => {
      const lower = m.title.toLowerCase();
      return lower.includes('home') || lower.includes('build') || lower.includes('house');
    });

    if (buildMods.length > 0) {
      console.log(`\nFound ${buildMods.length} build-related mods:`);
      buildMods.forEach(m => console.log(`  - ${m.title}`));
    }
  }

  // Show first 5 mods
  console.log('\n📋 First 5 mods:\n');
  mods.slice(0, 5).forEach((mod, i) => {
    console.log(`${i + 1}. ${mod.title}`);
    console.log(`   Download: ${mod.downloadUrl ? 'Yes' : 'No'}`);
    console.log(`   Thumbnail: ${mod.thumbnail ? 'Yes' : 'No'}`);
    console.log('');
  });
}

testWitchCC().catch(console.error);
