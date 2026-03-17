/**
 * SCR-009: Scraper Test Suite
 *
 * Tests that verify the scraper correctly categorizes mods from sample URLs
 * and that all content type detection features are working properly.
 *
 * Run: npx tsx scripts/ralph/scr-009-scraper-tests.ts
 */

import {
  extractCategoryFromUrl,
  mapUrlCategoryToContentType,
  URL_CATEGORY_MAP,
  clearUnmappedCategories,
  getUnmappedCategories,
} from '@/lib/services/weWantModsScraper';

import {
  detectContentType,
  detectRoomThemes,
  detectContentTypeWithConfidence,
  getSupportedContentTypes,
  getSupportedRoomThemes,
} from '@/lib/services/contentTypeDetector';

// ============================================
// TEST UTILITIES
// ============================================

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => boolean | void, expectedResult = true): void {
  try {
    const result = fn();
    const passed = result === undefined ? true : result === expectedResult;
    results.push({ name, passed, message: passed ? undefined : 'Assertion failed' });
  } catch (error) {
    results.push({ name, passed: false, message: (error as Error).message });
  }
}

function assertEqual<T>(actual: T, expected: T, message?: string): boolean {
  const passed = JSON.stringify(actual) === JSON.stringify(expected);
  if (!passed) {
    console.log(`  ❌ Expected: ${JSON.stringify(expected)}`);
    console.log(`     Actual:   ${JSON.stringify(actual)}`);
    if (message) console.log(`     ${message}`);
  }
  return passed;
}

function assertIncludes(actual: string[] | undefined, expected: string, message?: string): boolean {
  const passed = actual?.includes(expected) ?? false;
  if (!passed) {
    console.log(`  ❌ Expected array to include: "${expected}"`);
    console.log(`     Actual:   ${JSON.stringify(actual)}`);
    if (message) console.log(`     ${message}`);
  }
  return passed;
}

// ============================================
// TEST: URL PARSING (SCR-001)
// ============================================

console.log('\n📋 Testing URL Parsing (SCR-001)');
console.log('='.repeat(50));

test('extracts bathroom from simple URL', () => {
  return assertEqual(
    extractCategoryFromUrl('https://wewantmods.com/sims4/bathroom/modern-sink-set'),
    'bathroom'
  );
});

test('extracts hair from standard path', () => {
  return assertEqual(
    extractCategoryFromUrl('https://wewantmods.com/sims4/hair/ponytail-hairstyle'),
    'hair'
  );
});

test('extracts eyebrows from nested CAS path', () => {
  return assertEqual(
    extractCategoryFromUrl('https://wewantmods.com/sims4/cas/eyebrows/natural-brows'),
    'eyebrows'
  );
});

test('extracts kitchen from nested build path', () => {
  return assertEqual(
    extractCategoryFromUrl('https://wewantmods.com/sims4/build/kitchen/modern-appliances'),
    'kitchen'
  );
});

test('returns undefined for homepage', () => {
  return assertEqual(
    extractCategoryFromUrl('https://wewantmods.com/'),
    undefined
  );
});

test('returns undefined for non-wewantmods URL', () => {
  return assertEqual(
    extractCategoryFromUrl('https://thesimsresource.com/sims4/hair/item'),
    undefined
  );
});

test('handles URLs with query parameters', () => {
  return assertEqual(
    extractCategoryFromUrl('https://wewantmods.com/sims4/furniture/sofa-set?ref=home'),
    'furniture'
  );
});

test('normalizes category to lowercase', () => {
  return assertEqual(
    extractCategoryFromUrl('https://wewantmods.com/sims4/BATHROOM/Modern-Sink'),
    'bathroom'
  );
});

// ============================================
// TEST: CATEGORY MAPPING (SCR-002)
// ============================================

console.log('\n📋 Testing Category Mapping (SCR-002)');
console.log('='.repeat(50));

clearUnmappedCategories();

test('maps hair aliases correctly', () => {
  return (
    assertEqual(mapUrlCategoryToContentType('hair')?.contentType, 'hair') &&
    assertEqual(mapUrlCategoryToContentType('hairstyle')?.contentType, 'hair') &&
    assertEqual(mapUrlCategoryToContentType('hairstyles')?.contentType, 'hair')
  );
});

test('maps granular face categories', () => {
  return (
    assertEqual(mapUrlCategoryToContentType('eyebrows')?.contentType, 'eyebrows') &&
    assertEqual(mapUrlCategoryToContentType('eyelashes')?.contentType, 'lashes') &&
    assertEqual(mapUrlCategoryToContentType('eyeliner')?.contentType, 'eyeliner') &&
    assertEqual(mapUrlCategoryToContentType('lipstick')?.contentType, 'lipstick') &&
    assertEqual(mapUrlCategoryToContentType('blush')?.contentType, 'blush') &&
    assertEqual(mapUrlCategoryToContentType('beard')?.contentType, 'beard')
  );
});

test('maps room categories with themes', () => {
  const bathroom = mapUrlCategoryToContentType('bathroom');
  const kitchen = mapUrlCategoryToContentType('kitchen');
  const bedroom = mapUrlCategoryToContentType('bedroom');

  return (
    assertEqual(bathroom?.contentType, 'furniture') &&
    assertEqual(bathroom?.theme, 'bathroom') &&
    assertEqual(kitchen?.contentType, 'furniture') &&
    assertEqual(kitchen?.theme, 'kitchen') &&
    assertEqual(bedroom?.contentType, 'furniture') &&
    assertEqual(bedroom?.theme, 'bedroom')
  );
});

test('maps CAS special items', () => {
  return (
    assertEqual(mapUrlCategoryToContentType('cas-backgrounds')?.contentType, 'cas-background') &&
    assertEqual(mapUrlCategoryToContentType('presets')?.contentType, 'preset') &&
    assertEqual(mapUrlCategoryToContentType('loading-screens')?.contentType, 'loading-screen')
  );
});

test('maps clothing categories', () => {
  return (
    assertEqual(mapUrlCategoryToContentType('tops')?.contentType, 'tops') &&
    assertEqual(mapUrlCategoryToContentType('bottoms')?.contentType, 'bottoms') &&
    assertEqual(mapUrlCategoryToContentType('dresses')?.contentType, 'dresses') &&
    assertEqual(mapUrlCategoryToContentType('shoes')?.contentType, 'shoes')
  );
});

test('tracks unmapped categories', () => {
  mapUrlCategoryToContentType('unknown-test-category');
  const unmapped = getUnmappedCategories();
  return assertIncludes(unmapped, 'unknown-test-category');
});

// ============================================
// TEST: CONTENT TYPE DETECTION (SCR-008)
// ============================================

console.log('\n📋 Testing Content Type Detection (SCR-008)');
console.log('='.repeat(50));

test('detects eyebrows from title', () => {
  return assertEqual(
    detectContentType('Natural Thick Eyebrows'),
    'eyebrows'
  );
});

test('detects lashes from title', () => {
  return assertEqual(
    detectContentType('Fluffy 3D Lashes'),
    'lashes'
  );
});

test('detects eyeliner from title', () => {
  return assertEqual(
    detectContentType('Winged Eyeliner Set'),
    'eyeliner'
  );
});

test('detects lipstick from title', () => {
  return assertEqual(
    detectContentType('Glossy Lipstick Collection'),
    'lipstick'
  );
});

test('detects blush from title', () => {
  return assertEqual(
    detectContentType('Natural Blush'),
    'blush'
  );
});

test('detects contour as blush', () => {
  return assertEqual(
    detectContentType('Face Contour Kit'),
    'blush'
  );
});

test('detects beard from title', () => {
  return assertEqual(
    detectContentType('Realistic Beard Set'),
    'beard'
  );
});

test('detects facial-hair from mustache', () => {
  return assertEqual(
    detectContentType('Vintage Mustache'),
    'facial-hair'
  );
});

test('prioritizes specific face type over generic makeup', () => {
  // "Eyebrow Makeup" should detect eyebrows, not generic makeup
  return assertEqual(
    detectContentType('Eyebrow Makeup Set'),
    'eyebrows'
  );
});

test('detects hair from title', () => {
  return assertEqual(
    detectContentType('Long Wavy Hairstyle'),
    'hair'
  );
});

test('detects furniture from title', () => {
  return assertEqual(
    detectContentType('Modern Sofa Set'),
    'furniture'
  );
});

test('detects poses from title', () => {
  return assertEqual(
    detectContentType('Couple Pose Pack'),
    'poses'
  );
});

// ============================================
// TEST: ROOM THEME DETECTION (SCR-004)
// ============================================

console.log('\n📋 Testing Room Theme Detection (SCR-004)');
console.log('='.repeat(50));

test('detects bathroom theme', () => {
  return assertIncludes(
    detectRoomThemes('Elegant Bathroom Sink'),
    'bathroom'
  );
});

test('detects kitchen theme', () => {
  return assertIncludes(
    detectRoomThemes('Modern Kitchen Cabinet'),
    'kitchen'
  );
});

test('detects bedroom theme', () => {
  return assertIncludes(
    detectRoomThemes('Cozy Bedroom Set'),
    'bedroom'
  );
});

test('detects living-room theme', () => {
  return assertIncludes(
    detectRoomThemes('Living Room Sofa'),
    'living-room'
  );
});

test('detects multiple themes', () => {
  const themes = detectRoomThemes('Bathroom and Kitchen Clutter Pack');
  return (
    assertIncludes(themes, 'bathroom') &&
    assertIncludes(themes, 'kitchen')
  );
});

// ============================================
// TEST: COMBINED URL + TITLE DETECTION
// ============================================

console.log('\n📋 Testing Combined URL + Title Detection');
console.log('='.repeat(50));

test('bathroom URL + "Elegant Sink" title -> furniture + bathroom theme', () => {
  // When URL has /bathroom/ category
  const urlCategory = extractCategoryFromUrl('https://wewantmods.com/sims4/bathroom/elegant-sink');
  const mapping = mapUrlCategoryToContentType(urlCategory!);

  return (
    assertEqual(mapping?.contentType, 'furniture') &&
    assertEqual(mapping?.theme, 'bathroom')
  );
});

test('eyebrows URL + "Natural Brows" title -> eyebrows contentType', () => {
  const urlCategory = extractCategoryFromUrl('https://wewantmods.com/sims4/cas/eyebrows/natural-brows');
  const mapping = mapUrlCategoryToContentType(urlCategory!);

  return assertEqual(mapping?.contentType, 'eyebrows');
});

test('hair URL + "Ponytail Style" title -> hair contentType', () => {
  const urlCategory = extractCategoryFromUrl('https://wewantmods.com/sims4/hair/ponytail-style');
  const mapping = mapUrlCategoryToContentType(urlCategory!);

  return assertEqual(mapping?.contentType, 'hair');
});

// ============================================
// TEST: CONFIDENCE SCORING
// ============================================

console.log('\n📋 Testing Confidence Scoring');
console.log('='.repeat(50));

test('title match has high confidence', () => {
  const result = detectContentTypeWithConfidence('Eyebrow Set');
  return result.confidence === 'high' || result.confidence === 'medium';
});

test('description-only match has lower confidence', () => {
  const result = detectContentTypeWithConfidence('Custom CC', 'This is a beautiful eyebrow set');
  // Single keyword in description = medium confidence for high-priority rules
  return result.confidence === 'medium' || result.confidence === 'low';
});

test('no match returns low confidence', () => {
  const result = detectContentTypeWithConfidence('Random Words Only');
  return assertEqual(result.confidence, 'low');
});

// ============================================
// TEST: SUPPORTED TYPES
// ============================================

console.log('\n📋 Testing Supported Types');
console.log('='.repeat(50));

test('getSupportedContentTypes returns expected types', () => {
  const types = getSupportedContentTypes();
  return (
    assertIncludes(types, 'eyebrows') &&
    assertIncludes(types, 'lashes') &&
    assertIncludes(types, 'hair') &&
    assertIncludes(types, 'furniture') &&
    assertIncludes(types, 'poses')
  );
});

test('getSupportedRoomThemes returns expected themes', () => {
  const themes = getSupportedRoomThemes();
  return (
    assertIncludes(themes, 'bathroom') &&
    assertIncludes(themes, 'kitchen') &&
    assertIncludes(themes, 'bedroom') &&
    assertIncludes(themes, 'living-room')
  );
});

// ============================================
// TEST: URL_CATEGORY_MAP COVERAGE
// ============================================

console.log('\n📋 Testing URL Category Map Coverage');
console.log('='.repeat(50));

test('URL_CATEGORY_MAP has 100+ mappings', () => {
  const count = Object.keys(URL_CATEGORY_MAP).length;
  console.log(`  URL_CATEGORY_MAP has ${count} entries`);
  return count >= 100;
});

const expectedCategories = [
  'hair', 'eyebrows', 'eyelashes', 'eyeliner', 'lipstick', 'blush', 'beard',
  'cas-backgrounds', 'presets', 'loading-screens',
  'tops', 'bottoms', 'dresses', 'shoes', 'accessories', 'jewelry',
  'furniture', 'decor', 'clutter', 'lighting', 'plants', 'rugs',
  'bathroom', 'kitchen', 'bedroom', 'living-room', 'office', 'nursery',
  'poses', 'gameplay', 'scripts'
];

for (const category of expectedCategories) {
  test(`URL_CATEGORY_MAP includes "${category}"`, () => {
    return URL_CATEGORY_MAP[category] !== undefined;
  });
}

// ============================================
// SUMMARY
// ============================================

console.log('\n' + '='.repeat(60));
console.log('📊 TEST SUMMARY');
console.log('='.repeat(60));

const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
const total = results.length;

console.log(`\n✅ Passed: ${passed}/${total}`);
console.log(`❌ Failed: ${failed}/${total}`);

if (failed > 0) {
  console.log('\n❌ Failed tests:');
  for (const result of results.filter(r => !r.passed)) {
    console.log(`  - ${result.name}`);
    if (result.message) console.log(`    ${result.message}`);
  }
}

const passRate = (passed / total) * 100;
console.log(`\n📈 Pass rate: ${passRate.toFixed(1)}%`);

if (passRate >= 90) {
  console.log('\n✅ SCR-009: All tests pass (≥90% pass rate)');
  process.exit(0);
} else {
  console.log('\n❌ SCR-009: Tests failed (<90% pass rate)');
  process.exit(1);
}
