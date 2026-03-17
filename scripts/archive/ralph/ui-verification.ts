#!/usr/bin/env npx tsx
/**
 * UI Verification Script for Facet Testing
 *
 * Verifies that facet filters in the UI work correctly by:
 * 1. Querying database for expected counts
 * 2. Taking screenshots of filtered pages
 * 3. Logging results for manual visual inspection
 *
 * Usage: npx tsx scripts/ralph/ui-verification.ts [task-id]
 * Examples:
 *   npx tsx scripts/ralph/ui-verification.ts UI-001
 *   npx tsx scripts/ralph/ui-verification.ts all
 */

import 'dotenv/config';
import { config } from 'dotenv';
config({ path: '.env.local' });

import { PrismaClient } from '@prisma/client';
import { chromium } from 'playwright';

const prisma = new PrismaClient();
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const BASE_URL = 'http://localhost:3000';

interface VerificationResult {
  taskId: string;
  title: string;
  dbCount: number;
  url: string;
  screenshotPath: string;
  notes: string[];
  passed: boolean;
}

const results: VerificationResult[] = [];

async function ensureScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

async function takeScreenshot(url: string, filename: string): Promise<string> {
  await ensureScreenshotsDir();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  const page = await context.newPage();
  const fullUrl = url.startsWith('http') ? url : `${BASE_URL}${url}`;

  console.log(`  Taking screenshot: ${fullUrl}`);

  try {
    // Use domcontentloaded to avoid waiting for all network requests
    await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for page to stabilize - look for mod cards or skeleton loaders
    try {
      await page.waitForSelector('[data-testid="mod-card"], .mod-card, [class*="ModCard"], [class*="skeleton"]', { timeout: 15000 });
    } catch {
      console.log('  Warning: Could not find mod card selector, continuing anyway');
    }

    // Wait a bit longer for images and any async data loading
    await page.waitForTimeout(3000);

    const outputPath = path.join(SCREENSHOTS_DIR, `${filename}.png`);
    await page.screenshot({ path: outputPath, fullPage: false });

    console.log(`  Screenshot saved: ${outputPath}`);
    return outputPath;
  } finally {
    await browser.close();
  }
}

// UI-001: Verify contentType=hair
async function verifyUI001(): Promise<VerificationResult> {
  console.log('\n=== UI-001: Verify contentType facet UI - Hair ===');

  const count = await prisma.mod.count({
    where: { contentType: 'hair', isVerified: true }
  });
  console.log(`  Database count (contentType=hair, isVerified=true): ${count}`);

  const url = '/?contentType=hair';
  const screenshot = await takeScreenshot(url, 'contentType-hair');

  return {
    taskId: 'UI-001',
    title: 'Verify contentType facet UI - Hair',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be hair-related (wigs, hairstyles, updos, etc.)`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be hair items`
    ],
    passed: count > 0 // Basic check - actual pass requires visual inspection
  };
}

// UI-002: Verify contentType=tops
async function verifyUI002(): Promise<VerificationResult> {
  console.log('\n=== UI-002: Verify contentType facet UI - Tops ===');

  const count = await prisma.mod.count({
    where: { contentType: 'tops', isVerified: true }
  });
  console.log(`  Database count (contentType=tops, isVerified=true): ${count}`);

  const url = '/?contentType=tops';
  const screenshot = await takeScreenshot(url, 'contentType-tops');

  return {
    taskId: 'UI-002',
    title: 'Verify contentType facet UI - Tops',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be tops (shirts, blouses, sweaters, etc.)`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be top/shirt items`
    ],
    passed: count > 0
  };
}

// UI-003: Verify contentType=furniture
async function verifyUI003(): Promise<VerificationResult> {
  console.log('\n=== UI-003: Verify contentType facet UI - Furniture ===');

  const count = await prisma.mod.count({
    where: { contentType: 'furniture', isVerified: true }
  });
  console.log(`  Database count (contentType=furniture, isVerified=true): ${count}`);

  const url = '/?contentType=furniture';
  const screenshot = await takeScreenshot(url, 'contentType-furniture');

  return {
    taskId: 'UI-003',
    title: 'Verify contentType facet UI - Furniture',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be furniture items (sofas, chairs, tables, beds, etc.)`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be furniture items`
    ],
    passed: count > 0
  };
}

// UI-004: Verify contentType=makeup
async function verifyUI004(): Promise<VerificationResult> {
  console.log('\n=== UI-004: Verify contentType facet UI - Makeup ===');

  const count = await prisma.mod.count({
    where: { contentType: 'makeup', isVerified: true }
  });
  console.log(`  Database count (contentType=makeup, isVerified=true): ${count}`);

  const url = '/?contentType=makeup';
  const screenshot = await takeScreenshot(url, 'contentType-makeup');

  return {
    taskId: 'UI-004',
    title: 'Verify contentType facet UI - Makeup',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be makeup items (lipstick, eyeshadow, blush, eyeliner, etc.)`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be makeup items`
    ],
    passed: count > 0
  };
}

// UI-005: Verify genderOptions=feminine (feminine only, not unisex)
async function verifyUI005(): Promise<VerificationResult> {
  console.log('\n=== UI-005: Verify genderOptions facet UI - Feminine ===');

  // Feminine = has 'feminine' but NOT 'masculine'
  const count = await prisma.mod.count({
    where: {
      genderOptions: { has: 'feminine' },
      NOT: { genderOptions: { has: 'masculine' } },
      isVerified: true
    }
  });
  console.log(`  Database count (feminine only, not masculine, isVerified=true): ${count}`);

  const url = '/?genderOptions=feminine';
  const screenshot = await takeScreenshot(url, 'gender-feminine');

  return {
    taskId: 'UI-005',
    title: 'Verify genderOptions facet UI - Feminine',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be feminine clothing/accessories`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be feminine items (dresses, skirts, feminine tops)`
    ],
    passed: count > 0
  };
}

// UI-006: Verify genderOptions=masculine (masculine only, not unisex)
async function verifyUI006(): Promise<VerificationResult> {
  console.log('\n=== UI-006: Verify genderOptions facet UI - Masculine ===');

  // Masculine = has 'masculine' but NOT 'feminine'
  const count = await prisma.mod.count({
    where: {
      genderOptions: { has: 'masculine' },
      NOT: { genderOptions: { has: 'feminine' } },
      isVerified: true
    }
  });
  console.log(`  Database count (masculine only, not feminine, isVerified=true): ${count}`);

  const url = '/?genderOptions=masculine';
  const screenshot = await takeScreenshot(url, 'gender-masculine');

  return {
    taskId: 'UI-006',
    title: 'Verify genderOptions facet UI - Masculine',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be masculine clothing/accessories`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be masculine items (men's shirts, pants, etc.)`
    ],
    passed: count > 0
  };
}

// UI-007: Verify genderOptions=unisex (both masculine AND feminine)
async function verifyUI007(): Promise<VerificationResult> {
  console.log('\n=== UI-007: Verify genderOptions facet UI - Unisex ===');

  // Unisex = has BOTH 'masculine' AND 'feminine'
  const count = await prisma.mod.count({
    where: {
      genderOptions: { hasEvery: ['masculine', 'feminine'] },
      isVerified: true
    }
  });
  console.log(`  Database count (unisex - both masculine and feminine, isVerified=true): ${count}`);

  const url = '/?genderOptions=unisex';
  const screenshot = await takeScreenshot(url, 'gender-unisex');

  return {
    taskId: 'UI-007',
    title: 'Verify genderOptions facet UI - Unisex',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should work for both genders`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be unisex items (t-shirts, jeans, etc.)`
    ],
    passed: count > 0
  };
}

// UI-008: Verify ageGroups=toddler
async function verifyUI008(): Promise<VerificationResult> {
  console.log('\n=== UI-008: Verify ageGroups facet UI - Toddler ===');

  const count = await prisma.mod.count({
    where: {
      ageGroups: { has: 'toddler' },
      isVerified: true
    }
  });
  console.log(`  Database count (ageGroups includes toddler, isVerified=true): ${count}`);

  const url = '/?ageGroups=toddler';
  const screenshot = await takeScreenshot(url, 'age-toddler');

  return {
    taskId: 'UI-008',
    title: 'Verify ageGroups facet UI - Toddler',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be for toddler life stage`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be toddler items`
    ],
    passed: count > 0
  };
}

// UI-009: Verify ageGroups=child
async function verifyUI009(): Promise<VerificationResult> {
  console.log('\n=== UI-009: Verify ageGroups facet UI - Child ===');

  const count = await prisma.mod.count({
    where: {
      ageGroups: { has: 'child' },
      isVerified: true
    }
  });
  console.log(`  Database count (ageGroups includes child, isVerified=true): ${count}`);

  const url = '/?ageGroups=child';
  const screenshot = await takeScreenshot(url, 'age-child');

  return {
    taskId: 'UI-009',
    title: 'Verify ageGroups facet UI - Child',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be for child life stage`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be child items`
    ],
    passed: count > 0
  };
}

// UI-010: Verify themes=goth
async function verifyUI010(): Promise<VerificationResult> {
  console.log('\n=== UI-010: Verify themes facet UI - Goth ===');

  const count = await prisma.mod.count({
    where: {
      themes: { has: 'goth' },
      isVerified: true
    }
  });
  console.log(`  Database count (themes includes goth, isVerified=true): ${count}`);

  const url = '/?themes=goth';
  const screenshot = await takeScreenshot(url, 'theme-goth');

  return {
    taskId: 'UI-010',
    title: 'Verify themes facet UI - Goth',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should have goth aesthetic (gothic, vampire, punk, dark romantic)`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to have goth aesthetic`,
      `Note: This validates FC-006 cleanup worked correctly`
    ],
    passed: count > 0
  };
}

// UI-011: Verify themes=cottagecore
async function verifyUI011(): Promise<VerificationResult> {
  console.log('\n=== UI-011: Verify themes facet UI - Cottagecore ===');

  const count = await prisma.mod.count({
    where: {
      themes: { has: 'cottagecore' },
      isVerified: true
    }
  });
  console.log(`  Database count (themes includes cottagecore, isVerified=true): ${count}`);

  const url = '/?themes=cottagecore';
  const screenshot = await takeScreenshot(url, 'theme-cottagecore');

  return {
    taskId: 'UI-011',
    title: 'Verify themes facet UI - Cottagecore',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should have cottagecore aesthetic (rustic, floral, pastoral)`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to have cottagecore aesthetic`
    ],
    passed: count > 0
  };
}

// UI-012: Verify visualStyle=alpha
async function verifyUI012(): Promise<VerificationResult> {
  console.log('\n=== UI-012: Verify visualStyle facet UI - Alpha ===');

  const count = await prisma.mod.count({
    where: {
      visualStyle: 'alpha',
      isVerified: true
    }
  });
  console.log(`  Database count (visualStyle=alpha, isVerified=true): ${count}`);

  const url = '/?visualStyle=alpha';
  const screenshot = await takeScreenshot(url, 'style-alpha');

  return {
    taskId: 'UI-012',
    title: 'Verify visualStyle facet UI - Alpha',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be Alpha CC (realistic textures, high detail)`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to be realistic/high-quality style`
    ],
    passed: count > 0
  };
}

// UI-013: Verify visualStyle=maxis-match
async function verifyUI013(): Promise<VerificationResult> {
  console.log('\n=== UI-013: Verify visualStyle facet UI - Maxis Match ===');

  const count = await prisma.mod.count({
    where: {
      visualStyle: 'maxis-match',
      isVerified: true
    }
  });
  console.log(`  Database count (visualStyle=maxis-match, isVerified=true): ${count}`);

  const url = '/?visualStyle=maxis-match';
  const screenshot = await takeScreenshot(url, 'style-maxis-match');

  return {
    taskId: 'UI-013',
    title: 'Verify visualStyle facet UI - Maxis Match',
    dbCount: count,
    url,
    screenshotPath: screenshot,
    notes: [
      `Expected: All mods should be Maxis-Match CC (matches EA base game art style)`,
      `Verify: Sidebar shows count matching ${count}`,
      `Verify: First 10 mods visually appear to match EA art style`
    ],
    passed: count > 0
  };
}

async function generateReport(): Promise<string> {
  console.log('\n=== UI-014: Generating UI Verification Summary Report ===');

  let report = `UI VERIFICATION SUMMARY REPORT
Generated: ${new Date().toISOString()}
============================================

`;

  // Summary statistics
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  report += `SUMMARY
-------
Total Tests: ${totalCount}
Passed (basic): ${passedCount}
Failed: ${totalCount - passedCount}

Note: "Passed" means the database query returned results.
Visual inspection is still required to verify correctness.

`;

  report += `DETAILED RESULTS
----------------

`;

  for (const result of results) {
    report += `${result.taskId}: ${result.title}
  Status: ${result.passed ? 'PASSED (basic)' : 'FAILED'}
  Database Count: ${result.dbCount}
  URL: ${result.url}
  Screenshot: ${result.screenshotPath}

  Verification Notes:
${result.notes.map(n => `    - ${n}`).join('\n')}

`;
  }

  report += `
SCREENSHOTS LOCATION
--------------------
All screenshots saved to: ${SCREENSHOTS_DIR}

FILES:
`;

  for (const result of results) {
    report += `  - ${path.basename(result.screenshotPath)}\n`;
  }

  report += `

NEXT STEPS
----------
1. Review each screenshot manually
2. Compare sidebar filter counts with database counts above
3. Visually inspect first 10 mods in each screenshot
4. Log any misclassified mods found
5. Update PRD with pass/fail status for each UI-* task

`;

  return report;
}

async function runAllVerifications() {
  console.log('Starting UI Verification for all facet filters...');
  console.log('Dev server expected at:', BASE_URL);

  try {
    results.push(await verifyUI001());
    results.push(await verifyUI002());
    results.push(await verifyUI003());
    results.push(await verifyUI004());
    results.push(await verifyUI005());
    results.push(await verifyUI006());
    results.push(await verifyUI007());
    results.push(await verifyUI008());
    results.push(await verifyUI009());
    results.push(await verifyUI010());
    results.push(await verifyUI011());
    results.push(await verifyUI012());
    results.push(await verifyUI013());

    // Generate and save report
    const report = await generateReport();
    const reportPath = path.join(__dirname, 'ui-verification-report.txt');
    fs.writeFileSync(reportPath, report);
    console.log(`\nReport saved to: ${reportPath}`);

    console.log('\n' + report);

  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function runSingleVerification(taskId: string) {
  const verifiers: Record<string, () => Promise<VerificationResult>> = {
    'UI-001': verifyUI001,
    'UI-002': verifyUI002,
    'UI-003': verifyUI003,
    'UI-004': verifyUI004,
    'UI-005': verifyUI005,
    'UI-006': verifyUI006,
    'UI-007': verifyUI007,
    'UI-008': verifyUI008,
    'UI-009': verifyUI009,
    'UI-010': verifyUI010,
    'UI-011': verifyUI011,
    'UI-012': verifyUI012,
    'UI-013': verifyUI013,
  };

  const verifier = verifiers[taskId.toUpperCase()];
  if (!verifier) {
    console.error(`Unknown task ID: ${taskId}`);
    console.log('Valid task IDs: UI-001 through UI-013, or "all"');
    process.exit(1);
  }

  try {
    const result = await verifier();
    console.log('\nResult:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI
async function main() {
  const taskId = process.argv[2];

  if (!taskId || taskId === '--help') {
    console.log(`
UI Verification Script for Facet Testing

Usage:
  npx tsx scripts/ralph/ui-verification.ts <task-id>
  npx tsx scripts/ralph/ui-verification.ts all

Task IDs:
  UI-001  - contentType=hair
  UI-002  - contentType=tops
  UI-003  - contentType=furniture
  UI-004  - contentType=makeup
  UI-005  - genderOptions=feminine
  UI-006  - genderOptions=masculine
  UI-007  - genderOptions=unisex
  UI-008  - ageGroups=toddler
  UI-009  - ageGroups=child
  UI-010  - themes=goth
  UI-011  - themes=cottagecore
  UI-012  - visualStyle=alpha
  UI-013  - visualStyle=maxis-match
  all     - Run all verifications

Requirements:
  - Dev server must be running: npm run dev
  - Playwright must be installed
`);
    process.exit(0);
  }

  if (taskId.toLowerCase() === 'all') {
    await runAllVerifications();
  } else {
    await runSingleVerification(taskId);
  }
}

main().catch(console.error);
