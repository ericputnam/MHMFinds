/**
 * scripts/agents/smoke-render.ts — render production pages in headless Chromium
 * and verify the things a curl cannot see: the Mediavine ad anchors that only
 * exist after hydration (`aside#secondary`, `.mv-ads`), the Mediavine loader,
 * client-side crashes, and that the page has real content.
 *
 * This is the structural half of Rule 2 ("a deploy must never hurt RPM"):
 * run right after every production deploy (deploy-verify.sh) and every morning (runner step 0e).
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

import { INDEXNOW_KEY } from './indexnow-lib';

const args = process.argv.slice(2);
const arg = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const BASE = (arg('--base') ?? 'https://musthavemods.com').replace(/\/$/, '');
const JSON_OUT = arg('--json');
const SETTLE_MS = Number(arg('--settle') ?? 6000);

type Kind = 'catalog' | 'detail' | 'interstitial' | 'blog' | 'game' | 'xml' | 'text';
/**
 * `expectText`: for a short file whose *content* is the point, not its length —
 * the IndexNow ownership key is 32 bytes, well under the 50-char "empty response"
 * floor, so the default check would fail it on every run and roll production back.
 */
interface Target { path: string; kind: Kind; expectText?: string; }
interface Result {
  path: string; kind: Kind; status: number | null; ms: number;
  secondary: number; mvAds: number; mediavineScript: boolean; textLength: number;
  pageErrors: string[]; consoleErrors: number; appError: boolean;
  hydrationErrors: number; thirdPartyErrors: number; failures: string[]; transientErrors?: string[];
  expectText?: string; bodyText?: string;
}

const OUR_HOST = new URL(BASE).host;
const isHydration = (e: string) => /error #4(18|23|25)\b|Hydration failed|hydrat/i.test(e);
/**
 * An uncaught error whose top frame lives on another origin (Mediavine's prebid bundle is the
 * repeat offender: "Converting circular structure to JSON @ at track (https://scripts.mediavine.com/…)")
 * is not something a deploy of ours can have caused, and rolling production back does not fix it —
 * 2026-09-07 09:14: a two-markdown-file merge was rolled back because it reproduced on both loads.
 * It is recorded and shown as a warning; the structural checks below still decide pass/fail.
 * An error with no frame, or one on our own host (/_next bundles), stays a hard failure.
 */
const isThirdParty = (e: string) => {
  const m = e.match(/@ .*?\(?(https?:\/\/[^/\s)]+)/);
  return !!m && new URL(m[1]).host !== OUR_HOST;
};

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
  const hard = r.pageErrors.filter((e) => !isHydration(e) && !isThirdParty(e));
  if (hard.length) f.push(`${hard.length} uncaught page error(s): ${hard[0].slice(0, 120)}`);
  if (r.appError) f.push('Next.js "Application error" boundary rendered');
  // `game` (/play/) carries the same ad furniture as a catalog page — loader, empty
  // aside#secondary, a multi-child .mv-ads — so it gets the same assertions. It is a
  // separate kind only so a failure line names what broke.
  const adPage = r.kind === 'catalog' || r.kind === 'detail' || r.kind === 'interstitial' || r.kind === 'blog' || r.kind === 'game';
  if (adPage) {
    if (!r.mediavineScript) f.push('Mediavine loader (scripts.mediavine.com) missing');
    if (r.secondary < 1) f.push('aside#secondary (Mediavine sidebar anchor) missing');
    if (r.kind !== 'blog' && r.mvAds < 1) f.push('.mv-ads in-content anchors missing');
    if (r.textLength < 400) f.push(`page text only ${r.textLength} chars (blank render?)`);
  } else if (r.expectText) {
    // Exact-content check. Only the length is reported on failure — never the body, which for a
    // general-purpose target could be anything. (The IndexNow key itself is public by design.)
    if (!(r.bodyText ?? '').includes(r.expectText)) f.push(`body does not contain the expected text (${r.bodyText?.length ?? 0} chars served)`);
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
    // /play/ (E38) is a first-party retention surface with its own ad anchors and its own
    // data path (/api/game/daily). It was outside every runtime check until E58: no smoke
    // target, so a WordPress-proxy regression, a blank render or a lost ad anchor there was
    // invisible to deploy-verify. Trailing slash is load-bearing — trailingSlash: true 308s
    // the bare form. Verified against production 2026-09-16: 200, secondary=1, mv-ads=1,
    // loader present, 2,846 chars of text, 0 page errors.
    { path: '/play/', kind: 'game' },
    { path: '/sitemap.xml', kind: 'xml' },
    { path: '/llms.txt', kind: 'text' },
    { path: '/llms-full.txt', kind: 'text' },
    { path: '/feeds/mods.json', kind: 'text' },
    { path: '/feeds/mods.xml', kind: 'xml' },
    // One per-collection feed stands in for all ~20: they share buildWhereClause(), so a regression that
    // breaks one breaks the class, and the sitewide feeds above would not catch it.
    { path: '/feeds/sims-4/hair-cc/', kind: 'xml' },
    // The IndexNow ownership proof (E47/E52). Without it every submission is a 403 and the only symptom is
    // `reason=key-file-not-live` in a log nobody reads; a `public/` cleanup that drops it is otherwise silent.
    { path: `/${INDEXNOW_KEY}.txt`, kind: 'text', expectText: INDEXNOW_KEY },
  ];
  if (!modId) console.error('[smoke] WARN could not read a mod id from /sitemap-mods.xml — detail + interstitial skipped');

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1366, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 mhm-smoke/1.0',
  });
  const results: Result[] = [];
  const render = async (t: Target): Promise<Result> => {
    const page = await ctx.newPage();
    const pageErrors: string[] = []; let consoleErrors = 0;
    page.on('pageerror', (e) => {
      const frame = String(e?.stack ?? '').split('\n').find((l) => /https?:\/\//.test(l))?.trim();
      pageErrors.push(String(e?.message ?? e).split('\n')[0].slice(0, 200) + (frame ? ` @ ${frame.slice(0, 160)}` : ''));
    });
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
    let secondary = 0, mvAds = 0, mediavineScript = false, textLength = 0, appError = false, bodyText = '';
    try {
      const d = await page.evaluate(() => ({
        secondary: document.querySelectorAll('aside#secondary').length,
        mvAds: document.querySelectorAll('.mv-ads').length,
        mediavineScript: !!document.querySelector('script[src*="scripts.mediavine.com"]') || document.documentElement.innerHTML.includes('scripts.mediavine.com'),
        textLength: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().length,
        // Bounded: enough to verify a short exact-content file, never enough to dump a page into the JSON.
        bodyText: (document.body?.innerText ?? '').trim().slice(0, 200),
        appError: /Application error: a client-side exception/i.test(document.body?.innerText ?? ''),
      }));
      ({ secondary, mvAds, mediavineScript, textLength, appError, bodyText } = d);
    } catch (e) { pageErrors.push(`evaluate: ${String((e as Error).message).slice(0, 160)}`); }
    const hydrationErrors = pageErrors.filter(isHydration).length;
    const thirdPartyErrors = pageErrors.filter((e) => !isHydration(e) && isThirdParty(e)).length;
    const r: Result = { path: t.path, kind: t.kind, status, ms: Date.now() - t0, secondary, mvAds, mediavineScript, textLength, pageErrors, consoleErrors, appError, hydrationErrors, thirdPartyErrors, failures: [], ...(t.expectText ? { expectText: t.expectText, bodyText } : {}) };
    r.failures = expectations(r);
    await page.close();
    return r;
  };
  for (const t of targets) {
    let r = await render(t);
    // A single uncaught page error on one load (third-party script, race) must not roll production back by
    // itself (2026-09-05: 1 of 7 homepage loads threw a circular-JSON error nobody could reproduce). Render the
    // page once more; the failure counts only if it reproduces. Structural failures (HTTP, ad anchors, blank
    // render, Application error) are deterministic and are not retried.
    if (r.failures.length && r.failures.every((f) => /uncaught page error/.test(f))) {
      const again = await render(t);
      if (!again.failures.length) { again.transientErrors = r.pageErrors; console.log(`  ↻ ${t.path}: page error did not reproduce on a second load — recorded as transient, not a failure`); }
      r = again;
    }
    results.push(r);
    console.log(`${r.failures.length ? '✗' : '✓'} ${t.path.padEnd(34)} ${String(r.status).padEnd(4)} ${String(r.ms).padStart(5)}ms  secondary=${r.secondary} mv-ads=${r.mvAds} mv-script=${r.mediavineScript ? 'y' : 'n'} text=${r.textLength} errors=${r.pageErrors.length}${r.hydrationErrors ? ` (hydration ${r.hydrationErrors} ⚠)` : ''}${r.thirdPartyErrors ? ` (3rd-party ${r.thirdPartyErrors} ⚠ ${r.pageErrors.find(isThirdParty)?.slice(0, 90)})` : ''}${r.transientErrors ? ` (transient ${r.transientErrors.length} ↻)` : ''}${r.failures.length ? '\n    → ' + r.failures.join('; ') : ''}`);
  }
  await browser.close();
  const failed = results.filter((r) => r.failures.length);
  const out = { base: BASE, at: new Date().toISOString(), ok: failed.length === 0, failed: failed.map((r) => ({ path: r.path, failures: r.failures })), results };
  if (JSON_OUT) { mkdirSync(dirname(JSON_OUT), { recursive: true }); writeFileSync(JSON_OUT, JSON.stringify(out, null, 2)); }
  console.log(failed.length ? `\n[smoke] FAIL — ${failed.length}/${results.length} pages failed` : `\n[smoke] OK — ${results.length} pages pass`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error('[smoke] could not run:', e?.message ?? e); process.exit(3); });
