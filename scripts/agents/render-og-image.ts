/**
 * render-og-image.ts — renders public/og-image.jpg, the site-wide share card
 * (E336, Pip, 2026-11-05).
 *
 *   npx tsx scripts/agents/render-og-image.ts          # writes public/og-image.jpg
 *   npx tsx scripts/agents/render-og-image.ts --out /tmp/og.jpg
 *
 * Why this exists: app/layout.tsx has pointed og:image and twitter:image at
 * `/og-image.jpg` since launch, and the file was never committed —
 * https://musthavemods.com/og-image.jpg returned 404 on 2026-11-05. Every
 * page that inherits the root image (the homepage, /about/, /submit-mod/,
 * /top-creators/, /go/*) and every twitter:image fallback (/play/, /games/*)
 * unfurled with a broken or missing picture in Discord, iMessage, X,
 * Facebook and Bluesky. `__tests__/unit/og-image-assets.test.ts` now fails
 * if any site-relative image a page or JSON-LD names is absent from public/.
 *
 * Look rule (operator): flat brand colours, no gradients, glows or gloss,
 * nothing that looks AI-made. Text only — no creator artwork, so the card
 * needs no credit line and never goes stale when a mod is removed.
 * Re-run only when the copy changes; the output is committed.
 */

import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { chromium } from 'playwright';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

/** Brand colours from tailwind.config (mhm-dark, sims-pink, mhm-card). */
const DARK = '#0B0F19';
const CARD = '#161D30';
const PINK = '#EC4899';

export function ogImageHtml(): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: ${OG_WIDTH}px; height: ${OG_HEIGHT}px; background: ${DARK}; color: #fff;
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; overflow: hidden; }
  .wrap { position: absolute; inset: 0; padding: 72px 80px; display: flex; flex-direction: column; }
  .brand { font-size: 34px; font-weight: 800; letter-spacing: 0.5px; }
  .brand span { color: ${PINK}; }
  h1 { margin-top: 64px; font-size: 92px; line-height: 1.14; font-weight: 900; letter-spacing: -2px; }
  h1 .hl { background: ${PINK}; padding: 0 14px; }
  p { margin-top: 36px; font-size: 34px; line-height: 1.3; color: #CBD5E1; max-width: 900px; }
  .bar { position: absolute; left: 0; right: 0; bottom: 0; height: 76px; background: ${CARD};
    display: flex; align-items: center; padding: 0 80px; font-size: 28px; font-weight: 700; color: #fff; }
  .bar b { color: ${PINK}; margin-left: 10px; }
  </style></head><body><div class="wrap">
    <div class="brand">MustHave<span>Mods</span></div>
    <h1>17,000+ Sims 4<br><span class="hl">mods &amp; CC</span></h1>
    <p>Hair, clothes, furniture, poses and gameplay mods. Every download link checked by hand.</p>
  </div><div class="bar">musthavemods.com <b>· free, no account needed</b></div></body></html>`;
}

async function main(): Promise<number> {
  const i = process.argv.indexOf('--out');
  const out = resolve(i > 0 && process.argv[i + 1] ? process.argv[i + 1] : join(process.cwd(), 'public', 'og-image.jpg'));
  mkdirSync(dirname(out), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: OG_WIDTH, height: OG_HEIGHT } });
    await page.setContent(ogImageHtml(), { waitUntil: 'load' });
    await page.screenshot({ path: out, type: 'jpeg', quality: 88 });
  } finally {
    await browser.close();
  }
  console.log(`[render-og-image] wrote ${out} (${OG_WIDTH}x${OG_HEIGHT})`);
  return 0;
}

if (process.argv[1] && /render-og-image\.ts$/.test(process.argv[1])) {
  main().then((code) => process.exit(code), (err) => {
    console.error(`[render-og-image] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  });
}
