/**
 * Screenshot utility for Ralph visual verification
 *
 * Usage:
 *   npx tsx scripts/ralph/screenshot.ts [page] [filename]
 *
 * Examples:
 *   npx tsx scripts/ralph/screenshot.ts /                    # Screenshots homepage
 *   npx tsx scripts/ralph/screenshot.ts /mods/123 mod-detail # Screenshots mod detail page
 *   npx tsx scripts/ralph/screenshot.ts / homepage --mobile  # Mobile viewport
 */

import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const SCREENSHOTS_DIR = path.join(__dirname, 'screenshots');
const DEFAULT_PORT = process.env.PORT || '3000';
const BASE_URL = `http://localhost:${DEFAULT_PORT}`;

interface ScreenshotOptions {
  page: string;
  filename?: string;
  mobile?: boolean;
  fullPage?: boolean;
  waitForSelector?: string;
}

async function ensureScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

async function takeScreenshot(options: ScreenshotOptions): Promise<string> {
  const { page: pagePath, filename, mobile = false, fullPage = false, waitForSelector } = options;

  await ensureScreenshotsDir();

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: mobile
      ? { width: 375, height: 812 }  // iPhone X
      : { width: 1280, height: 900 },
  });

  const page = await context.newPage();

  const url = pagePath.startsWith('http') ? pagePath : `${BASE_URL}${pagePath}`;
  console.log(`Navigating to: ${url}`);

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for specific selector if provided
    if (waitForSelector) {
      console.log(`Waiting for selector: ${waitForSelector}`);
      await page.waitForSelector(waitForSelector, { timeout: 10000 });
    }

    // Small delay for any animations to complete
    await page.waitForTimeout(500);

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const safePath = pagePath.replace(/\//g, '_').replace(/^_/, '') || 'home';
    const suffix = mobile ? '_mobile' : '';
    const outputFilename = filename
      ? `${filename}${suffix}.png`
      : `${safePath}${suffix}_${timestamp}.png`;

    const outputPath = path.join(SCREENSHOTS_DIR, outputFilename);

    await page.screenshot({
      path: outputPath,
      fullPage
    });

    console.log(`Screenshot saved: ${outputPath}`);
    return outputPath;

  } finally {
    await browser.close();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log(`
Screenshot utility for Ralph visual verification

Usage:
  npx tsx scripts/ralph/screenshot.ts <page> [filename] [options]

Options:
  --mobile      Use mobile viewport (375x812)
  --full        Capture full page scroll
  --wait=SEL    Wait for selector before screenshot

Examples:
  npx tsx scripts/ralph/screenshot.ts /
  npx tsx scripts/ralph/screenshot.ts /mods/123 mod-detail
  npx tsx scripts/ralph/screenshot.ts / homepage --mobile
  npx tsx scripts/ralph/screenshot.ts / --wait=".mod-grid"
`);
    process.exit(0);
  }

  const pagePath = args[0];
  const filenameArg = args.find(a => !a.startsWith('--'));
  const filename = filenameArg !== pagePath ? filenameArg : undefined;

  const options: ScreenshotOptions = {
    page: pagePath,
    filename,
    mobile: args.includes('--mobile'),
    fullPage: args.includes('--full'),
    waitForSelector: args.find(a => a.startsWith('--wait='))?.replace('--wait=', ''),
  };

  try {
    await takeScreenshot(options);
  } catch (error) {
    console.error('Screenshot failed:', error);
    process.exit(1);
  }
}

main();

export { takeScreenshot };
export type { ScreenshotOptions };
