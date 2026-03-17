/**
 * SCR-010: Integration Test with Live Scraping
 *
 * Tests the improved scraper on sample mods to verify categorization accuracy.
 * This test uses sample data that simulates what we'd get from scraping,
 * then verifies the detection results are accurate.
 *
 * Run: npx tsx scripts/ralph/scr-010-integration-test.ts
 */

import {
  extractCategoryFromUrl,
  mapUrlCategoryToContentType,
} from '@/lib/services/weWantModsScraper';

import {
  detectContentType,
  detectRoomThemes,
} from '@/lib/services/contentTypeDetector';

// ============================================
// SAMPLE MOD DATA
// These simulate real mods we'd encounter when scraping
// ============================================

interface SampleMod {
  title: string;
  collectionPageUrl: string;
  expectedContentType: string;
  expectedThemes?: string[];
  notes?: string;
}

const SAMPLE_MODS: SampleMod[] = [
  // ===== HAIR =====
  {
    title: 'Long Wavy Hairstyle',
    collectionPageUrl: 'https://wewantmods.com/sims4/hair/long-wavy-hairstyle',
    expectedContentType: 'hair',
    notes: 'Standard hair mod',
  },
  {
    title: 'Messy Bun Ponytail',
    collectionPageUrl: 'https://wewantmods.com/sims4/hair/messy-bun-ponytail',
    expectedContentType: 'hair',
    notes: 'Hair with specific style in title',
  },

  // ===== GRANULAR FACE - EYEBROWS =====
  {
    title: 'Natural Thick Eyebrows',
    collectionPageUrl: 'https://wewantmods.com/sims4/cas/eyebrows/natural-thick-eyebrows',
    expectedContentType: 'eyebrows',
    notes: 'Nested CAS path with eyebrows',
  },
  {
    title: 'Soft Arch Brows',
    collectionPageUrl: 'https://wewantmods.com/sims4/eyebrows/soft-arch-brows',
    expectedContentType: 'eyebrows',
    notes: 'Direct eyebrows category',
  },

  // ===== GRANULAR FACE - LASHES =====
  {
    title: '3D Fluffy Lashes',
    collectionPageUrl: 'https://wewantmods.com/sims4/cas/eyelashes/fluffy-lashes',
    expectedContentType: 'lashes',
    notes: 'Nested eyelashes path',
  },
  {
    title: 'Natural Eyelashes Set',
    collectionPageUrl: 'https://wewantmods.com/sims4/lashes/natural-set',
    expectedContentType: 'lashes',
    notes: 'Direct lashes category',
  },

  // ===== GRANULAR FACE - EYELINER =====
  {
    title: 'Winged Eyeliner',
    collectionPageUrl: 'https://wewantmods.com/sims4/makeup/eyeliner/winged-liner',
    expectedContentType: 'eyeliner',
    notes: 'Nested makeup/eyeliner path',
  },

  // ===== GRANULAR FACE - LIPSTICK =====
  {
    title: 'Glossy Lipstick Collection',
    collectionPageUrl: 'https://wewantmods.com/sims4/lipstick/glossy-collection',
    expectedContentType: 'lipstick',
    notes: 'Direct lipstick category',
  },
  {
    title: 'Matte Lip Gloss',
    collectionPageUrl: 'https://wewantmods.com/sims4/makeup/lips/matte-gloss',
    expectedContentType: 'lipstick',
    notes: 'Nested lips path',
  },

  // ===== GRANULAR FACE - BLUSH =====
  {
    title: 'Natural Blush Set',
    collectionPageUrl: 'https://wewantmods.com/sims4/blush/natural-set',
    expectedContentType: 'blush',
    notes: 'Direct blush category',
  },
  {
    title: 'Face Contour Kit',
    collectionPageUrl: 'https://wewantmods.com/sims4/contour/face-kit',
    expectedContentType: 'blush',
    notes: 'Contour mapped to blush',
  },

  // ===== GRANULAR FACE - BEARD =====
  {
    title: 'Realistic Beard Set',
    collectionPageUrl: 'https://wewantmods.com/sims4/beard/realistic-set',
    expectedContentType: 'beard',
    notes: 'Direct beard category',
  },
  {
    title: 'Light Stubble',
    collectionPageUrl: 'https://wewantmods.com/sims4/stubble/light-stubble',
    expectedContentType: 'beard',
    notes: 'Stubble mapped to beard',
  },

  // ===== FURNITURE WITH ROOM THEMES =====
  {
    title: 'Elegant Bathroom Sink',
    collectionPageUrl: 'https://wewantmods.com/sims4/bathroom/elegant-sink',
    expectedContentType: 'furniture',
    expectedThemes: ['bathroom'],
    notes: 'Bathroom room theme',
  },
  {
    title: 'Modern Kitchen Cabinet',
    collectionPageUrl: 'https://wewantmods.com/sims4/kitchen/modern-cabinet',
    expectedContentType: 'furniture',
    expectedThemes: ['kitchen'],
    notes: 'Kitchen room theme',
  },
  {
    title: 'Cozy Bedroom Set',
    collectionPageUrl: 'https://wewantmods.com/sims4/bedroom/cozy-set',
    expectedContentType: 'furniture',
    expectedThemes: ['bedroom'],
    notes: 'Bedroom room theme',
  },

  // ===== DECOR / CLUTTER =====
  {
    title: 'Modern Plants Collection',
    collectionPageUrl: 'https://wewantmods.com/sims4/plants/modern-collection',
    expectedContentType: 'plants',
    notes: 'Plants category',
  },
  {
    title: 'Decorative Clutter Pack',
    collectionPageUrl: 'https://wewantmods.com/sims4/clutter/decorative-pack',
    expectedContentType: 'clutter',
    notes: 'Clutter category',
  },

  // ===== POSES =====
  {
    title: 'Couple Poses Pack',
    collectionPageUrl: 'https://wewantmods.com/sims4/poses/couple-poses',
    expectedContentType: 'poses',
    notes: 'Poses category',
  },

  // ===== CLOTHING =====
  {
    title: 'Summer Dress Collection',
    collectionPageUrl: 'https://wewantmods.com/sims4/dresses/summer-collection',
    expectedContentType: 'dresses',
    notes: 'Dresses category',
  },
  {
    title: 'Casual Top Set',
    collectionPageUrl: 'https://wewantmods.com/sims4/tops/casual-set',
    expectedContentType: 'tops',
    notes: 'Tops category',
  },
];

// ============================================
// TEST EXECUTION
// ============================================

interface TestResult {
  mod: SampleMod;
  actualContentType: string | undefined;
  actualThemes: string[];
  contentTypeCorrect: boolean;
  themesCorrect: boolean;
  urlCategory: string | undefined;
  urlMapping: { contentType: string; theme?: string } | undefined;
}

function runIntegrationTests(): TestResult[] {
  const results: TestResult[] = [];

  for (const mod of SAMPLE_MODS) {
    // Extract URL category
    const urlCategory = extractCategoryFromUrl(mod.collectionPageUrl);
    const urlMapping = urlCategory ? mapUrlCategoryToContentType(urlCategory) : undefined;

    // Determine content type (URL takes priority)
    let actualContentType: string | undefined;
    if (urlMapping?.contentType) {
      actualContentType = urlMapping.contentType;
    } else {
      actualContentType = detectContentType(mod.title);
    }

    // Get themes from URL mapping and title
    const actualThemes: string[] = [];
    if (urlMapping?.theme) {
      actualThemes.push(urlMapping.theme);
    }
    const titleThemes = detectRoomThemes(mod.title);
    for (const theme of titleThemes) {
      if (!actualThemes.includes(theme)) {
        actualThemes.push(theme);
      }
    }

    // Check correctness
    const contentTypeCorrect = actualContentType === mod.expectedContentType;
    const themesCorrect = !mod.expectedThemes ||
      mod.expectedThemes.every(t => actualThemes.includes(t));

    results.push({
      mod,
      actualContentType,
      actualThemes,
      contentTypeCorrect,
      themesCorrect,
      urlCategory,
      urlMapping,
    });
  }

  return results;
}

// ============================================
// MAIN
// ============================================

console.log('='.repeat(70));
console.log('SCR-010: Integration Test - Scraper Categorization Accuracy');
console.log('='.repeat(70));

const results = runIntegrationTests();

let correctCount = 0;
let totalCount = results.length;

console.log('\n📋 Test Results:\n');

for (const result of results) {
  const passed = result.contentTypeCorrect && result.themesCorrect;
  if (passed) correctCount++;

  const statusIcon = passed ? '✅' : '❌';

  console.log(`${statusIcon} "${result.mod.title}"`);
  console.log(`   URL: ${result.mod.collectionPageUrl}`);
  console.log(`   URL Category: ${result.urlCategory || '(none)'}`);

  if (result.contentTypeCorrect) {
    console.log(`   Content Type: ${result.actualContentType} ✓`);
  } else {
    console.log(`   Content Type: ${result.actualContentType} ✗ (expected: ${result.mod.expectedContentType})`);
  }

  if (result.mod.expectedThemes) {
    if (result.themesCorrect) {
      console.log(`   Themes: [${result.actualThemes.join(', ')}] ✓`);
    } else {
      console.log(`   Themes: [${result.actualThemes.join(', ')}] ✗ (expected: [${result.mod.expectedThemes.join(', ')}])`);
    }
  } else if (result.actualThemes.length > 0) {
    console.log(`   Themes: [${result.actualThemes.join(', ')}]`);
  }

  if (result.mod.notes) {
    console.log(`   Notes: ${result.mod.notes}`);
  }

  console.log('');
}

// ============================================
// SUMMARY
// ============================================

const accuracy = (correctCount / totalCount) * 100;

console.log('='.repeat(70));
console.log('📊 SUMMARY');
console.log('='.repeat(70));
console.log(`\nTotal Mods Tested: ${totalCount}`);
console.log(`Correctly Categorized: ${correctCount}`);
console.log(`Incorrectly Categorized: ${totalCount - correctCount}`);
console.log(`\n📈 Accuracy: ${accuracy.toFixed(1)}%`);

if (accuracy >= 90) {
  console.log('\n✅ SCR-010: PASSED - Accuracy ≥ 90%');
  console.log('   The scraper is correctly categorizing mods based on URL and title.');
} else {
  console.log('\n❌ SCR-010: FAILED - Accuracy < 90%');
  console.log('   Review the failed cases above and improve detection rules.');
}

// Document any edge cases
const failures = results.filter(r => !r.contentTypeCorrect || !r.themesCorrect);
if (failures.length > 0) {
  console.log('\n⚠️ Edge Cases / Failures:');
  for (const failure of failures) {
    console.log(`\n  - "${failure.mod.title}"`);
    console.log(`    Expected: ${failure.mod.expectedContentType}`);
    console.log(`    Got: ${failure.actualContentType}`);
    console.log(`    URL Category: ${failure.urlCategory}`);
    console.log(`    Notes: ${failure.mod.notes || '(none)'}`);
  }
}

// Exit with appropriate code
if (accuracy >= 90) {
  process.exit(0);
} else {
  process.exit(1);
}
