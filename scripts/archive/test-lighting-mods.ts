import { mhmScraper } from '../lib/services/mhmScraper';

async function testLightingMods() {
  console.log('🧪 Testing Lighting Mods Post\n');

  const url = 'https://musthavemods.com/sims-4-lighting-mods/';

  console.log(`📄 Scraping: ${url}\n`);

  const mods = await mhmScraper.scrapeModsFromPost(url);

  console.log(`✅ Found ${mods.length} mods\n`);

  // Show all mods
  console.log('📋 All mods found:\n');
  mods.forEach((mod, i) => {
    console.log(`${i + 1}. ${mod.title}`);
    console.log(`   Download: ${mod.downloadUrl}`);
    console.log(`   Thumbnail: ${mod.thumbnail ? 'Yes' : 'No'}`);
    console.log('');
  });

  // Check for the problematic mods
  const lightingOverlay10 = mods.find(m => m.title.includes('Lighting Overlay 1.0'));
  const lightingOverlay20 = mods.find(m => m.title.includes('Lighting Overlay 2.0'));

  if (lightingOverlay10) {
    console.log('❌ PROBLEM: Found "Lighting Overlay 1.0" - this should NOT exist!');
    console.log(`   Title: ${lightingOverlay10.title}`);
    console.log(`   Download: ${lightingOverlay10.downloadUrl}`);
  }

  if (lightingOverlay20) {
    console.log('✅ Found "Lighting Overlay 2.0" - this is correct');
  }
}

testLightingMods().catch(console.error);
