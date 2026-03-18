/**
 * Test script: Validates MHM scraper game detection, author extraction,
 * and content type detection against real blog post URLs.
 *
 * Run with: npx tsx scripts/test-scraper-games.ts
 * Does NOT write to database — read-only test.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import {
  detectGame,
  detectGameFromUrl,
  detectGameFromHtml,
  detectContentTypeFromUrl,
  ensureAuthor,
  extractBlogPostAuthor,
} from '../lib/services/mhmScraperUtils';
import { detectContentType } from '../lib/services/contentTypeDetector';

// Real blog post URLs from sitemap
const TEST_URLS = [
  // Stardew Valley
  'https://musthavemods.com/best-stardew-valley-mods/',
  'https://musthavemods.com/best-visual-stardew-valley-mods/',
  'https://musthavemods.com/stardew-valley-mods-not-working/',
  'https://musthavemods.com/install-stardew-valley-mods/',
  'https://musthavemods.com/how-to-use-smapi-in-stardew-valley/',
  // Minecraft
  'https://musthavemods.com/best-minecraft-mods-2026/',
  'https://musthavemods.com/how-to-install-minecraft-mods/',
  // Sims 4 (sampling of known URLs)
  'https://musthavemods.com/sims-4-hair-cc/',
  'https://musthavemods.com/sims-4-cc-clothes-packs-2025/',
  'https://musthavemods.com/sims-4-body-presets-2/',
  'https://musthavemods.com/sims-4-eyelashes-cc-2/',
  'https://musthavemods.com/best-woohoo-mods-sims-4-ultimate-guide/',
];

function colorize(text: string, color: 'green' | 'red' | 'yellow' | 'cyan' | 'bold'): string {
  const codes: Record<string, string> = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    bold: '\x1b[1m',
  };
  return `${codes[color]}${text}\x1b[0m`;
}

async function testUrlGameDetection() {
  console.log(colorize('\n=== TEST 1: URL-based Game Detection ===\n', 'bold'));

  const expectations: Record<string, string> = {
    'best-stardew-valley-mods': 'Stardew Valley',
    'best-visual-stardew-valley-mods': 'Stardew Valley',
    'stardew-valley-mods-not-working': 'Stardew Valley',
    'install-stardew-valley-mods': 'Stardew Valley',
    'how-to-use-smapi-in-stardew-valley': 'Stardew Valley',
    'best-minecraft-mods-2026': 'Minecraft',
    'how-to-install-minecraft-mods': 'Minecraft',
    'sims-4-hair-cc': 'Sims 4',
    'sims-4-cc-clothes-packs-2025': 'Sims 4',
    'sims-4-body-presets-2': 'Sims 4',
    'sims-4-eyelashes-cc-2': 'Sims 4',
    'best-woohoo-mods-sims-4-ultimate-guide': 'Sims 4',
  };

  let passed = 0;
  let failed = 0;

  for (const url of TEST_URLS) {
    const slug = new URL(url).pathname.replace(/\//g, '');
    const detected = detectGameFromUrl(url);
    const expected = expectations[slug];

    if (detected === expected) {
      console.log(`  ${colorize('PASS', 'green')} ${slug} -> ${detected}`);
      passed++;
    } else {
      console.log(`  ${colorize('FAIL', 'red')} ${slug} -> ${detected} (expected: ${expected})`);
      failed++;
    }
  }

  console.log(`\n  Results: ${colorize(`${passed} passed`, 'green')}, ${failed > 0 ? colorize(`${failed} failed`, 'red') : '0 failed'}`);
  return failed;
}

async function testUrlContentTypeDetection() {
  console.log(colorize('\n=== TEST 2: URL-based Content Type Detection ===\n', 'bold'));

  const expectations: Record<string, string | undefined> = {
    'sims-4-hair-cc': 'hair',
    'sims-4-cc-clothes-packs-2025': 'tops',
    'sims-4-body-presets-2': 'preset',
    'sims-4-eyelashes-cc-2': 'lashes',
    'best-woohoo-mods-sims-4-ultimate-guide': 'gameplay-mod',
    'best-stardew-valley-mods': undefined,
    'best-minecraft-mods-2026': undefined,
  };

  let passed = 0;
  let failed = 0;

  for (const [slug, expected] of Object.entries(expectations)) {
    const url = `https://musthavemods.com/${slug}/`;
    const detected = detectContentTypeFromUrl(url);

    if (detected === expected) {
      console.log(`  ${colorize('PASS', 'green')} ${slug} -> ${detected ?? 'undefined'}`);
      passed++;
    } else {
      console.log(`  ${colorize('FAIL', 'red')} ${slug} -> ${detected ?? 'undefined'} (expected: ${expected ?? 'undefined'})`);
      failed++;
    }
  }

  console.log(`\n  Results: ${colorize(`${passed} passed`, 'green')}, ${failed > 0 ? colorize(`${failed} failed`, 'red') : '0 failed'}`);
  return failed;
}

async function testLivePageDetection() {
  console.log(colorize('\n=== TEST 3: Live Page Scrape - Game + Author + Content Type ===\n', 'bold'));

  // Test one URL from each game - only listicle posts (not guides)
  const liveTests = [
    { url: 'https://musthavemods.com/best-stardew-valley-mods/', expectedGame: 'Stardew Valley' },
    { url: 'https://musthavemods.com/best-minecraft-mods-2026/', expectedGame: 'Minecraft' },
    { url: 'https://musthavemods.com/sims-4-hair-cc/', expectedGame: 'Sims 4' },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of liveTests) {
    console.log(`\n  ${colorize(`Fetching: ${test.url}`, 'cyan')}`);

    try {
      const response = await axios.get(test.url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);
      const postTitle = $('h1.entry-title').first().text().trim();
      const postCategories = $('span.category-links a').map((_, el) => $(el).text().trim()).get();
      const blogAuthor = extractBlogPostAuthor($);

      // Game detection
      const urlGame = detectGameFromUrl(test.url);
      const htmlGame = detectGameFromHtml(postCategories, postTitle);
      const finalGame = detectGame(test.url, postCategories, postTitle);

      console.log(`    Title: "${postTitle}"`);
      console.log(`    Categories: [${postCategories.join(', ')}]`);
      console.log(`    Blog Author: ${blogAuthor || '(none)'}`);
      console.log(`    URL Game: ${urlGame} | HTML Game: ${htmlGame} | Final: ${finalGame}`);

      if (finalGame === test.expectedGame) {
        console.log(`    ${colorize('PASS', 'green')} Game detection correct: ${finalGame}`);
        passed++;
      } else {
        console.log(`    ${colorize('FAIL', 'red')} Game detection: ${finalGame} (expected: ${test.expectedGame})`);
        failed++;
      }

      // Sample mod titles from H2/H3 headers to test content type detection
      const headers = $('h2, h3').map((_, el) => $(el).text().trim()).get().slice(0, 5);
      console.log(`    Sample mod headers:`);
      for (const header of headers) {
        const contentType = detectContentType(header);
        console.log(`      "${header}" -> contentType: ${contentType ?? 'undefined'}`);
      }

      // Test author extraction with sample data
      const sampleAuthor = ensureAuthor({
        blogPostAuthor: blogAuthor,
        downloadUrl: undefined,
      });
      console.log(`    Default author fallback: "${sampleAuthor}"`);

    } catch (error: any) {
      console.log(`    ${colorize('ERROR', 'red')} ${error.message}`);
      failed++;
    }
  }

  console.log(`\n  Results: ${colorize(`${passed} passed`, 'green')}, ${failed > 0 ? colorize(`${failed} failed`, 'red') : '0 failed'}`);
  return failed;
}

async function testEdgeCases() {
  console.log(colorize('\n=== TEST 4: Edge Cases & Cross-Game Detection ===\n', 'bold'));

  let passed = 0;
  let failed = 0;

  // Test: Generic URL defaults to Sims 4
  const generic = detectGameFromUrl('https://musthavemods.com/best-mods-2026/');
  if (generic === 'Sims 4') {
    console.log(`  ${colorize('PASS', 'green')} Generic URL defaults to Sims 4`);
    passed++;
  } else {
    console.log(`  ${colorize('FAIL', 'red')} Generic URL -> ${generic} (expected: Sims 4)`);
    failed++;
  }

  // Test: HTML categories can override default
  const htmlOverride = detectGame(
    'https://musthavemods.com/best-mods-for-farming/',
    ['Stardew Valley', 'Mods'],
    'Best Mods for Farming in Stardew Valley'
  );
  if (htmlOverride === 'Stardew Valley') {
    console.log(`  ${colorize('PASS', 'green')} HTML categories override generic URL -> Stardew Valley`);
    passed++;
  } else {
    console.log(`  ${colorize('FAIL', 'red')} HTML override -> ${htmlOverride} (expected: Stardew Valley)`);
    failed++;
  }

  // Test: URL-specific game beats HTML categories
  const urlBeatsHtml = detectGame(
    'https://musthavemods.com/best-minecraft-mods/',
    ['Sims 4'],  // Wrong category
    'Best Mods'
  );
  if (urlBeatsHtml === 'Minecraft') {
    console.log(`  ${colorize('PASS', 'green')} URL-specific game beats wrong HTML categories`);
    passed++;
  } else {
    console.log(`  ${colorize('FAIL', 'red')} URL vs HTML -> ${urlBeatsHtml} (expected: Minecraft)`);
    failed++;
  }

  // Test: Minecraft content types from URL
  const shaderType = detectContentTypeFromUrl('https://musthavemods.com/best-minecraft-shader-packs/');
  if (shaderType === 'shaders') {
    console.log(`  ${colorize('PASS', 'green')} Minecraft shader URL -> content type: shaders`);
    passed++;
  } else {
    console.log(`  ${colorize('FAIL', 'red')} Minecraft shader -> ${shaderType} (expected: shaders)`);
    failed++;
  }

  // Test: Stardew content types from URL
  const portraitType = detectContentTypeFromUrl('https://musthavemods.com/stardew-portrait-mods/');
  if (portraitType === 'portraits') {
    console.log(`  ${colorize('PASS', 'green')} Stardew portrait URL -> content type: portraits`);
    passed++;
  } else {
    console.log(`  ${colorize('FAIL', 'red')} Stardew portrait -> ${portraitType} (expected: portraits)`);
    failed++;
  }

  // Test: NexusMods author fallback (common for Stardew)
  const nexusAuthor = ensureAuthor({
    downloadUrl: 'https://www.nexusmods.com/stardewvalley/mods/12345',
  });
  if (nexusAuthor === 'Nexus Mods Creator') {
    console.log(`  ${colorize('PASS', 'green')} NexusMods URL -> author: "${nexusAuthor}"`);
    passed++;
  } else {
    console.log(`  ${colorize('FAIL', 'red')} NexusMods author -> "${nexusAuthor}" (expected: "Nexus Mods Creator")`);
    failed++;
  }

  // Test: CurseForge author fallback (common for Minecraft)
  const curseforgeAuthor = ensureAuthor({
    downloadUrl: 'https://www.curseforge.com/minecraft/mc-mods/jei',
  });
  if (curseforgeAuthor === 'CurseForge Creator') {
    console.log(`  ${colorize('PASS', 'green')} CurseForge URL -> author: "${curseforgeAuthor}"`);
    passed++;
  } else {
    console.log(`  ${colorize('FAIL', 'red')} CurseForge author -> "${curseforgeAuthor}" (expected: "CurseForge Creator")`);
    failed++;
  }

  console.log(`\n  Results: ${colorize(`${passed} passed`, 'green')}, ${failed > 0 ? colorize(`${failed} failed`, 'red') : '0 failed'}`);
  return failed;
}

async function main() {
  console.log(colorize('MHM Scraper Multi-Game Test Suite', 'bold'));
  console.log('Testing game detection, content types, and author extraction\n');

  let totalFailed = 0;

  totalFailed += await testUrlGameDetection();
  totalFailed += await testUrlContentTypeDetection();
  totalFailed += await testLivePageDetection();
  totalFailed += await testEdgeCases();

  console.log(colorize('\n============================', 'bold'));
  if (totalFailed === 0) {
    console.log(colorize('ALL TESTS PASSED', 'green'));
  } else {
    console.log(colorize(`${totalFailed} TESTS FAILED`, 'red'));
  }
  console.log(colorize('============================\n', 'bold'));

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(console.error);
