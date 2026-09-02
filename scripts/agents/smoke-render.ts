/**
 * scripts/agents/smoke-render.ts — render production pages in headless Chromium
 * and verify the things a curl cannot see: the Mediavine ad anchors that only
 * exist after hydration (`aside#secondary`, `.mv-ads`), the Mediavine loader,
 * client-side crashes, and that the page has real content.
 *
 * This is the structural half of Rule 2 ("a deploy must never hurt RPM"):
 * run right after every production deploy (deploy-verify.sh) and every evening.
 *
 * Usage:
 *   npx tsx scripts/agents/smoke-render.ts                 # against https://musthavemods.com
 *   npx tsx scripts/agents/smoke-render.ts --base https://preview-url.vercel.app
 *   npx tsx scripts/agents/smoke-render.ts --json reports/funnel/smoke.json
 * Exit 0 = all pass, 1 = at least one failure, 3 = could not run.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const args = process.argv.slice(2);
const arg = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const BASE = (arg('--base') ?? 'https://musthavemods.com').replace(/\/$/, '');
const JSON_OUT = arg('--json');
const SETTLE_MS = Number(arg('--settle') ?? 6000);

type Kind = 'catalog' | 'detail' | 'interstitial' | 'blog' | 'xml' | 'text';
interface Target { path: string; kind: Kind; }
interface Result {
  path: string; kind: Kind; status: number | null; ms: number;
  secondary: number; mvAds: number; mediavineScript: boolean; textLength: number;
  pageErrors: string[]; consoleErrors: number; appError: boolean;
  hydrationErrors: number; failures: string[];
}

async function modIdFromSitemap(): Promise<string | null> {
  try {
    const xml = await (await fetch(`${BASE}/sitemap-mods.xml`)).text();
    const m = xml.match(/\/mods\/([a-z0-9]+)\/?</i);
    return m ? m[1] : null;
  } catch { return null; }
}

function expectations(r: Result): string[] {
  const f: string[] = [];
  if (r.status !== 200) f.push(`HTTP ${r.status ?? 'no response'}`);
  // React hydration mismatches (#418/#423/#425) recover by client-rendering; they are a warning
  // (tracked for Sage/Nova), not a revenue-affecting failure. Anything else uncaught fails the page.
  const hard = r.pageErrors.filter((e) => !/error #4(18|23|25)\b|Hydration failed|hydrat/i.test(e));
  if (hard.length) f.push(`${hard.length} uncaught page error(s): ${hard[0].slice(0, 120)}`);
  if (r.appError) f.push('Next.js "Application error" boundary rendered');
  const adPage = r.kind === 'catalog' || r.kind === 'detail' || r.kind === 'interstitial' || r.kind === 'blog';
  if (adPage) {
    if (!r.mediavineScript) f.push('Mediavine loader (scripts.mediavine.com) missing');
    if (r.secondary < 1) f.push('aside#secondary (Mediavine sidebar anchor) missing');
    if (r.kind !== 'blog' && r.mvAds < 1) f.push('.mv-ads in-content anchors missing');
    if (r.textLength < 400) f.push(`page text only ${r.textLength} chars (blank render?)`);
  } else if (r.textLength < 50) f.push('empty response');
  return f;
}

async function main() {
  const modId = await modIdFromSitemap();
  const targets: Target[] = [
    { path: '/', kind: 'catalog' },
    { path: '/mods', kind: 'catalog' },
    ...(modId ? [{ path: `/mods/${modId}`, kind: 'detail' as Kind }, { path: `/go/${modId}`, kind: 'interstitial' as Kind }] : []),
    { path: '/sims-4-cc-finds-2/', kind: 'blog' },
    { path: '/sitemap.xml', kind: 'xml' },
    { path: '/llms.txt', kind: 'text' },
  ];
  if (!modId) console.error('[smoke] WARN could not read a mod id from /sitemap-mods.xml — detail + interstitial skipped');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 mhm-smoke/1.0',
  });
  const results: Result[] = [];
  for (const t of targets) {
    const page = await ctx.newPage();
    const pageErrors: string[] = []; let consoleErrors = 0;
    page.on('pageerror', (e) => pageErrors.push(String(e?.message ?? e)));
    page.on('console', (m) => { if (m.type() === 'error') consoleErrors++; });
    const t0 = Date.now();
    let status: number | null = null;
    try {
      const resp = await page.goto(`${BASE}${t.path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      status = resp?.status() ?? null;
      if (t.kind !== 'xml' && t.kind !== 'text') {
        await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => undefined);
        await page.waitForTimeout(SETTLE_MS);
      }
    } catch (e) { pageErrors.push(`navigation: ${String((e as Error).message).slice(0, 160)}`); }
    let secondary = 0, mvAds = 0, mediavineScript = false, textLength = 0, appError = false;
    try {
      const d = await page.evaluate(() => ({
        secondary: document.querySelectorAll('aside#secondary').length,
        mvAds: document.querySelectorAll('.mv-ads').length,
        mediavineScript: !!document.querySelector('script[src*="scripts.mediavine.com"]') || document.documentElement.innerHTML.includes('scripts.mediavine.com'),
        textLength: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().length,
        appError: /Application error: a client-side exception/i.test(document.body?.innerText ?? ''),
      }));
      ({ secondary, mvAds, mediavineScript, textLength, appError } = d);
    } catch (e) { pageErrors.push(`evaluate: ${String((e as Error).message).slice(0, 160)}`); }
    const hydrationErrors = pageErrors.filter((e) => /error #4(18|23|25)\b|Hydration failed|hydrat/i.test(e)).length;
    const r: Result = { path: t.path, kind: t.kind, status, ms: Date.now() - t0, secondary, mvAds, mediavineScript, textLength, pageErrors, consoleErrors, appError, hydrationErrors, failures: [] };
    r.failures = expectations(r);
    results.push(r);
    console.log(`${r.failures.length ? '✗' : '✓'} ${t.path.padEnd(34)} ${String(status).padEnd(4)} ${String(r.ms).padStart(5)}ms  secondary=${secondary} mv-ads=${mvAds} mv-script=${mediavineScript ? 'y' : 'n'} text=${textLength} errors=${pageErrors.length}${hydrationErrors ? ` (hydration ${hydrationErrors} ⚠)` : ''}${r.failures.length ? '\n    → ' + r.failures.join('; ') : ''}`);
    await page.close();
  }
  await browser.close();
  const failed = results.filter((r) => r.failures.length);
  const out = { base: BASE, at: new Date().toISOString(), ok: failed.length === 0, failed: failed.map((r) => ({ path: r.path, failures: r.failures })), results };
  if (JSON_OUT) { mkdirSync(dirname(JSON_OUT), { recursive: true }); writeFileSync(JSON_OUT, JSON.stringify(out, null, 2)); }
  console.log(failed.length ? `\n[smoke] FAIL — ${failed.length}/${results.length} pages failed` : `\n[smoke] OK — ${results.length} pages pass`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('[smoke] could not run:', e?.message ?? e); process.exit(3); });
