import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as lib from '../../scripts/agents/smoke-render-lib';

/**
 * E439 (2026-11-19): no single page can take the whole smoke down with it.
 *
 * 2026-11-17: 3 of 8 after-merge verifies read "smoke-render timed out after 600s wall clock (killed) — pages NOT
 * judged". The kill discarded every page that HAD rendered. Inside one render, `ctx.newPage`, `page.evaluate` and
 * `page.close` have no Playwright timeout. A renderer whose main thread never yields holds `evaluate` forever:
 * reproduced locally on a pre-fix tree against a page that spins after load, it stuck on /go/ for 400 s and wrote no
 * JSON. Each render now has a wall-clock budget, and the render loop has a run budget under deploy-verify's 600 s cap,
 * so the JSON always lands and the pages that were reached are judged.
 *
 * Pre-fix tree: smoke-render-lib exports none of these, so every case below is red.
 */
const L = lib as unknown as Record<string, unknown>;
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const smoke = strip(readFileSync(join(process.cwd(), 'scripts/agents/smoke-render.ts'), 'utf8'));

describe('smoke-render-lib: budgets (E439)', () => {
  it('exports the budget API', () => {
    for (const k of ['withDeadline', 'nextRenderBudget', 'runBudgetFromEnv', 'PAGE_BUDGET_MS', 'SMOKE_RUN_BUDGET_MS', 'PROBE_TAIL_MS', 'MIN_RENDER_MS']) {
      expect(L[k], k).toBeDefined();
    }
  });

  it('withDeadline answers for a promise that never settles (the hung page.evaluate) within its budget', async () => {
    const t0 = Date.now();
    const v = await lib.withDeadline(new Promise<string>(() => undefined), 50, () => 'timed-out');
    expect(v).toBe('timed-out');
    expect(Date.now() - t0).toBeLessThan(1_000);
  });

  it('withDeadline passes a value that arrives in time through untouched', async () => {
    expect(await lib.withDeadline(Promise.resolve('rendered'), 1_000, () => 'timed-out')).toBe('rendered');
  });

  it('the page budget covers the designed render time (goto + networkidle + settle) with headroom', () => {
    expect(lib.PAGE_BUDGET_MS.first).toBeGreaterThan(45_000 + 20_000 + 6_000);
    expect(lib.PAGE_BUDGET_MS.retry).toBeGreaterThan(60_000 + 40_000 + 18_000);
  });

  it('worst case fits under deploy-verify\'s default 600 s cap: loop + probe tail + one probe in flight + 2 controls + close', () => {
    const dv = readFileSync(join(process.cwd(), 'scripts/agents/deploy-verify.sh'), 'utf8');
    const cap = Number(dv.match(/SMOKE_MAX_S="\$\{DEPLOY_VERIFY_SMOKE_MAX_S:-(\d+)\}"/)?.[1]);
    expect(cap).toBe(600);
    const worst = lib.SMOKE_RUN_BUDGET_MS + lib.PROBE_TAIL_MS + lib.PROBE_TIMEOUT_MS + 2 * lib.CONTROL_TIMEOUT_MS + 15_000;
    expect(worst).toBeLessThan((cap - 30) * 1_000); // 30 s for npx/tsx startup and the sitemap read
  });

  it('nextRenderBudget: min(page budget, what is left); 0 = do not start once under MIN_RENDER_MS remains', () => {
    const run = 420_000;
    expect(lib.nextRenderBudget(0, 90_000, run)).toBe(90_000);
    expect(lib.nextRenderBudget(run - 40_000, 90_000, run)).toBe(40_000);
    expect(lib.nextRenderBudget(run - lib.MIN_RENDER_MS + 1, 90_000, run)).toBe(0);
    expect(lib.nextRenderBudget(run + 900_000, 90_000, run)).toBe(0);
  });

  it('runBudgetFromEnv: a positive number may lower the budget, never raise it; junk falls back to the default', () => {
    expect(lib.runBudgetFromEnv(undefined)).toBe(lib.SMOKE_RUN_BUDGET_MS);
    expect(lib.runBudgetFromEnv('240000')).toBe(240_000);
    expect(lib.runBudgetFromEnv('99999999')).toBe(lib.SMOKE_RUN_BUDGET_MS);
    expect(lib.runBudgetFromEnv('10m')).toBe(lib.SMOKE_RUN_BUDGET_MS);
    expect(lib.runBudgetFromEnv('0')).toBe(lib.SMOKE_RUN_BUDGET_MS);
  });
});

describe('a page abandoned at its budget is could-not-run, never a rollback verdict (E439)', () => {
  // The exact result smoke-render builds when the budget fires on /go/ (goto had answered 200, evaluate never returned).
  const abandoned = {
    kind: 'interstitial' as const, status: null, ms: 90_004, textLength: 0, appError: false,
    pageErrors: [`${lib.PAGE_BUDGET_ERROR} 130000ms exceeded — render did not finish (goto had answered 200)`],
    failures: ['HTTP no response (navigation: page budget 130000ms exceeded)', 'Mediavine loader (scripts.mediavine.com) missing', 'aside#secondary (Mediavine sidebar anchor) missing', '.mv-ads in-content anchors missing', 'page text only 0 chars (blank render?)'],
  };

  it('is a navigation error, so it is retried once and graded by the navigation rules', () => {
    expect(lib.isNavError(abandoned.pageErrors[0])).toBe(true);
    expect(lib.navigationFailed(abandoned)).toBe(true);
    expect(lib.shouldRetryRender('interstitial', abandoned.failures, abandoned.pageErrors)).toBe(true);
  });

  it('a direct fetch that answers 200 → INCONCLUSIVE; no probe → INCONCLUSIVE', () => {
    expect(lib.classifyRender(abandoned, { networkOk: true, probe: { status: 200, ms: 400 } }).verdict).toBe('inconclusive');
    expect(lib.classifyRender(abandoned, { networkOk: true, probe: null }).verdict).toBe('inconclusive');
    expect(lib.classifyRender(abandoned, { networkOk: false }).verdict).toBe('inconclusive');
  });

  it('control: the site really not answering (direct fetch 503, network ok) is still positive evidence', () => {
    expect(lib.classifyRender(abandoned, { networkOk: true, probe: { status: 503, ms: 300 } }).verdict).toBe('fail');
  });
});

describe('smoke-render.ts wiring (E439, source scan, comments stripped)', () => {
  it('every render runs inside withDeadline with a page budget', () => {
    expect(smoke).toMatch(/withDeadline\(renderOnce\(t, o, seen\), budgetMs,/);
    expect(smoke).toMatch(/render\(t, FIRST_RENDER, budget\)/);
    expect(smoke).toMatch(/render\(t, RETRY_RENDER, retryBudget\)/);
  });

  it('the loop stops starting renders when the run budget is spent, and those targets are inconclusive, never probed', () => {
    expect(smoke).toMatch(/nextRenderBudget\(Date\.now\(\) - loopT0, PAGE_BUDGET_MS\.first, RUN_BUDGET_MS\)/);
    expect(smoke).toMatch(/notRendered: true/);
    expect(smoke).toMatch(/if \(r\.notRendered\) \{ r\.verdict = 'inconclusive'/);
  });

  it('ad pages are rendered before sitemaps/feeds, so a spent budget has already judged the revenue surfaces', () => {
    expect(smoke).toMatch(/targets\.sort\(\(a, b\) => Number\(SECONDARY_KINDS\.has\(a\.kind\)\) - Number\(SECONDARY_KINDS\.has\(b\.kind\)\)\)/);
  });

  it('the unbounded calls outside one render are bounded too (sitemap read, browser.close)', () => {
    expect(smoke).toMatch(/sitemap-mods\.xml`, \{ signal: AbortSignal\.timeout\(/);
    expect(smoke).toMatch(/withDeadline\(browser\.close\(\)/);
  });
});
