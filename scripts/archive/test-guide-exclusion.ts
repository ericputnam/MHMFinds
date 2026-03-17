import { mhmScraper } from '../lib/services/mhmScraper';

async function testGuideExclusion() {
  console.log('🧪 Testing Guide Exclusion & Strict Mod Block Validation\n');

  const tests = [
    {
      name: 'Guide (should be excluded)',
      url: 'https://musthavemods.com/how-to-download-sims-4-cc/',
      expectMods: 0,
    },
    {
      name: 'Listicle (should be included)',
      url: 'https://musthavemods.com/sims-4-cc-finds-for-november/',
      expectMods: '>0',
    },
  ];

  for (const test of tests) {
    console.log(`\n📄 Testing: ${test.name}`);
    console.log(`   URL: ${test.url}`);

    const mods = await mhmScraper.scrapeModsFromPost(test.url);

    const passed = test.expectMods === 0
      ? mods.length === 0
      : mods.length > 0;

    console.log(`   ${passed ? '✅' : '❌'} Found ${mods.length} mods (expected ${test.expectMods})`);

    if (!passed) {
      console.log(`   ⚠️  TEST FAILED!`);
      if (mods.length > 0) {
        console.log(`   First few mods found:`);
        mods.slice(0, 3).forEach((m, i) => {
          console.log(`      ${i + 1}. ${m.title}`);
        });
      }
    }

    // Validate all mods have download links
    if (mods.length > 0) {
      const missingDownload = mods.filter(m => !m.downloadUrl);
      if (missingDownload.length > 0) {
        console.log(`   ❌ ${missingDownload.length} mods missing download links!`);
      } else {
        console.log(`   ✅ All mods have download links`);
      }
    }
  }

  console.log('\n✅ Test complete\n');
}

testGuideExclusion().catch(console.error);
