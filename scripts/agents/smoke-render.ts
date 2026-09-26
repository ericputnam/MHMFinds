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
 * Exit 0 = all pass, 1 = at least one POSITIVE failure, 2 = INCONCLUSIVE (network control degraded, or a
 * failure that did not amount to evidence about the site — see smoke-render-lib.ts), 3 = could not run.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { INDEXNOW_KEY } from './indexnow-lib';
import {
  CONTROL_TIMEOUT_MS, NETWORK_CONTROL_URLS, PROBE_TIMEOUT_MS, classifyRender, gradeNetwork, isNavError,
  navigationFailed, shouldRetryRender, type ControlSample, type NetworkGrade, type ProbeSample, type SmokeKind, type Verdict,
} from './smoke-render-lib';

const args = process.argv.slice(2);
const arg = (k: string): string | undefined => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const BASE = (arg('--base') ?? 'https://musthavemods.com').replace(/\/$/, '');
const JSON_OUT = arg('--json');
const SETTLE_MS = Number(arg('--settle') ?? 6000);

type Kind = SmokeKind;
/**
 * `expectText`: for a short file whose *content* is the point, not its length —
 * the IndexNow ownership key is 32 bytes, well under the 50-char "empty response"
 * floor, so the default check would fail it on every run and roll production back.
 */
interface Target { path: string; kind: Kind; expectText?: string; settledText?: number; }
interface Result {
  path: string; kind: Kind; status: number | null; ms: number;
  secondary: number; mvAds: number; mediavineScript: boolean; textLength: number;
  pageErrors: string[]; consoleErrors: number; appError: boolean;
  hydrationErrors: number; thirdPartyErrors: number; failures: string[]; transientErrors?: string[];
  expectText?: string; bodyText?: string; settledText?: number;
  retried?: boolean; verdict?: Verdict; why?: string; probe?: ProbeSample | null;
}
interface RenderOpts { gotoMs: number; idleMs: number; settleMs: number; }
const FIRST_RENDER: RenderOpts = { gotoMs: 45000, idleMs: 20000, settleMs: SETTLE_MS };
/** The fresh-page retry gets a longer window so a slow-but-alive page can settle (E111). */
const RETRY_RENDER: RenderOpts = { gotoMs: 60000, idleMs: 40000, settleMs: SETTLE_MS * 3 };
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36 mhm-smoke/1.0';

/** Independent network control (E111): known-fast hosts unrelated to our deploy, fetched with a short timeout. */
async function networkControl(): Promise<NetworkGrade> {
  const samples: ControlSample[] = await Promise.all(NETWORK_CONTROL_URLS.map(async (url) => {
    const t0 = Date.now();
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(CONTROL_TIMEOUT_MS), redirect: 'follow', headers: { 'user-agent': UA } });
      return { url, status: r.status, ms: Date.now() - t0 };
    } catch { return { url, status: null, ms: Date.now() - t0 }; }
  }));
  return gradeNetwork(samples);
}
/** Direct fetch of a page that timed out twice in Chromium — a second, independent client. */
async function directProbe(url: string): Promise<ProbeSample> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(PROBE_TIMEOUT_MS), redirect: 'follow', headers: { 'user-agent': UA } });
    await r.arrayBuffer().catch(() => undefined);
    return { status: r.status, ms: Date.now() - t0 };
  } catch { return { status: null, ms: Date.now() - t0 }; }
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
  if (r.status !== 200) f.push(r.status === null ? `HTTP no response (${(r.pageErrors.find((e) => e.startsWith('navigation:')) ?? 'navigation failed').slice(0, 90)})` : `HTTP ${r.status}`);
  // React hydration mismatches (#418/#423/#425) recover by client-rendering; they are a warning
  // (tracked for Sage/Nova), not a revenue-affecting failure. A navigation/evaluate failure is reported
  // through the HTTP line above and judged by classifyRender, not as an "uncaught page error".
  // Anything else uncaught fails the page.
  const hard = r.pageErrors.filter((e) => !isHydration(e) && !isThirdParty(e) && !isNavError(e));
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
    // settledText: the grid on these three is client-fetched (/api/mods); a 200 with fewer chars than this after
    // SLOW_LOAD_MS is an unsettled render, not a blank one (≈9,600 / 10,300 / 10,700 chars when settled, E111).
    { path: '/', kind: 'catalog', settledText: 6000 },
    { path: '/mods', kind: 'catalog', settledText: 6000 },
    ...(modId ? [{ path: `/mods/${modId}`, kind: 'detail' as Kind, settledText: 1500 }, { path: `/go/${modId}`, kind: 'interstitial' as Kind }] : []),
    { path: '/sims-4-cc-finds-2/', kind: 'blog' },
    // /play/ (E38) is a first-party retention surface with its own ad anchors and its own
    // data path (/api/game/daily). It was outside every runtime check until E58: no smoke
    // target, so a WordPress-proxy regression, a blank render or a lost ad anchor there was
    // invisible to deploy-verify. Trailing slash is load-bearing — trailingSlash: true 308s
    // the bare form. Verified against production 2026-09-16: 200, secondary=1, mv-ads=1,
    // loader present, 2,846 chars of text, 0 page errors.
    { path: '/play/', kind: 'game', settledText: 1500 },
    // /creator/ — the creator A–Z hub (E97): same ad furniture as a catalog page.
    { path: '/creator/', kind: 'catalog', settledText: 6000 },
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

  const netBefore = await networkControl();
  console.log(`[smoke] network control before: ${netBefore.ok ? 'ok' : 'DEGRADED'} (${netBefore.passed}/${netBefore.total}: ${netBefore.why})`);

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, userAgent: UA });
  const results: Result[] = [];
  const render = async (t: Target, o: RenderOpts = FIRST_RENDER): Promise<Result> => {
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
      const resp = await page.goto(`${BASE}${t.path}`, { waitUntil: 'domcontentloaded', timeout: o.gotoMs });
      status = resp?.status() ?? null;
      if (t.kind !== 'xml' && t.kind !== 'text') {
        await page.waitForLoadState('networkidle', { timeout: o.idleMs }).catch(() => undefined);
        await page.waitForTimeout(o.settleMs);
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
    const r: Result = { path: t.path, kind: t.kind, status, ms: Date.now() - t0, secondary, mvAds, mediavineScript, textLength, pageErrors, consoleErrors, appError, hydrationErrors, thirdPartyErrors, failures: [], ...(t.expectText ? { expectText: t.expectText, bodyText } : {}), ...(t.settledText ? { settledText: t.settledText } : {}) };
    r.failures = expectations(r);
    await page.close();
    return r;
  };
  const facts = (r: Result) => ({ kind: r.kind, status: r.status, ms: r.ms, textLength: r.textLength, appError: r.appError, pageErrors: r.pageErrors, failures: r.failures, settledText: r.settledText });
  for (const t of targets) {
    let r = await render(t);
    // A single uncaught page error on one load (third-party script, race) must not roll production back by
    // itself (2026-09-05: 1 of 7 homepage loads threw a circular-JSON error nobody could reproduce). A navigation
    // timeout on ANY target, or a slow unsettled 200 on an ad page, gets one fresh page with a longer settle too
    // (E91 2026-09-22: /sitemap.xml; E111 2026-09-26: four ad pages + the homepage grid during a host-wide network
    // stall). The failure counts only if it reproduces — and classifyRender then decides whether what reproduced
    // is evidence about the site. When the control already says the network is degraded, the retry cannot make
    // the run conclusive, so it is skipped to bound the run time. Decisions in smoke-render-lib.ts (unit-tested).
    if (netBefore.ok && shouldRetryRender(t.kind, r.failures, r.pageErrors, facts(r))) {
      const again = await render(t, RETRY_RENDER);
      if (!again.failures.length) { again.transientErrors = r.failures; console.log(`  ↻ ${t.path}: ${r.failures[0]} did not reproduce on a fresh page — recorded as transient, not a failure`); }
      else console.log(`  ↻ ${t.path}: ${r.failures[0]} — reproduced on a fresh page (${again.ms} ms, ${again.textLength} chars)`);
      again.retried = true;
      r = again;
    }
    results.push(r);
    console.log(`${r.failures.length ? '✗' : '✓'} ${t.path.padEnd(34)} ${String(r.status).padEnd(4)} ${String(r.ms).padStart(5)}ms  secondary=${r.secondary} mv-ads=${r.mvAds} mv-script=${r.mediavineScript ? 'y' : 'n'} text=${r.textLength} errors=${r.pageErrors.length}${r.hydrationErrors ? ` (hydration ${r.hydrationErrors} ⚠)` : ''}${r.thirdPartyErrors ? ` (3rd-party ${r.thirdPartyErrors} ⚠ ${r.pageErrors.find(isThirdParty)?.slice(0, 90)})` : ''}${r.transientErrors ? ` (transient ${r.transientErrors.length} ↻)` : ''}${r.failures.length ? '\n    → ' + r.failures.join('; ') : ''}`);
  }
  await browser.close();
  const netAfter = await networkControl();
  console.log(`[smoke] network control after: ${netAfter.ok ? 'ok' : 'DEGRADED'} (${netAfter.passed}/${netAfter.total}: ${netAfter.why})`);
  const networkOk = netBefore.ok && netAfter.ok;

  // Grade on positive evidence (CLAUDE.md: "could not run ≠ is broken"). A page that never answered Chromium gets
  // one direct fetch as a second, independent client — only when the control says the network itself is fine.
  for (const r of results) {
    if (!r.failures.length) { r.verdict = 'pass'; continue; }
    if (networkOk && navigationFailed(r)) r.probe = await directProbe(`${BASE}${r.path}`);
    const c = classifyRender(facts(r), { networkOk, probe: r.probe });
    r.verdict = c.verdict; r.why = c.why;
    if (c.verdict !== 'fail') console.log(`  ? ${r.path}: INCONCLUSIVE — ${c.why}`);
  }
  const failed = results.filter((r) => r.verdict === 'fail');
  const inconclusive = results.filter((r) => r.verdict === 'inconclusive');
  // A degraded control makes the WHOLE run inconclusive: positive-looking failures are recorded as `suspect` for the
  // operator, never as `failed`, so deploy-verify cannot roll back on a reading taken through a broken network.
  const verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE' = !networkOk ? 'INCONCLUSIVE' : failed.length ? 'FAIL' : inconclusive.length ? 'INCONCLUSIVE' : 'PASS';
  const out = {
    base: BASE, at: new Date().toISOString(), ok: verdict === 'PASS', verdict,
    network: { degraded: !networkOk, before: { ok: netBefore.ok, why: netBefore.why }, after: { ok: netAfter.ok, why: netAfter.why } },
    failed: networkOk ? failed.map((r) => ({ path: r.path, failures: r.failures, why: r.why })) : [],
    suspect: networkOk ? [] : failed.map((r) => ({ path: r.path, failures: r.failures, why: r.why })),
    inconclusive: inconclusive.map((r) => ({ path: r.path, why: r.why })),
    results,
  };
  if (JSON_OUT) { mkdirSync(dirname(JSON_OUT), { recursive: true }); writeFileSync(JSON_OUT, JSON.stringify(out, null, 2)); }
  console.log(verdict === 'FAIL' ? `\n[smoke] FAIL — ${failed.length}/${results.length} pages failed with positive evidence`
    : verdict === 'INCONCLUSIVE' ? `\n[smoke] INCONCLUSIVE — ${!networkOk ? 'network control degraded; ' : ''}${inconclusive.length} inconclusive, ${failed.length} suspect of ${results.length} — not a site verdict`
    : `\n[smoke] OK — ${results.length} pages pass`);
  process.exit(verdict === 'FAIL' ? 1 : verdict === 'INCONCLUSIVE' ? 2 : 0);
}

main().catch((e) => { console.error('[smoke] could not run:', e?.message ?? e); process.exit(3); });
