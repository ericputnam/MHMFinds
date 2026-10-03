/**
 * E169 — the revenue guardrail must grade whether its Vercel list covers the judged window.
 *
 * Incident shape (2026-10-03): judged day 2026-10-01, window starts 2026-09-28 00:00 local. One
 * `vercel ls` page (20 rows) reached back only to 2026-10-02 06:55, so 114 in-window production
 * deploys were invisible and RED-RPM became `investigate` "because no deploy was in the window".
 *
 * The fixture `__tests__/fixtures/revenue-guardrail/vercel-pages-2026-10-03.json` is a trimmed,
 * shape-faithful replay of that morning's CLI pages (real createdAt/sha/url of the boundary rows).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  listDeploymentsPaged, gradeCoverage, classifyWindow, decideAction, coverageLine,
  type VercelPage, type VercelDeployment,
} from '../../scripts/agents/revenue-guardrail-lib';

const ROOT = join(__dirname, '..', '..');
const fx = JSON.parse(readFileSync(join(ROOT, '__tests__/fixtures/revenue-guardrail/vercel-pages-2026-10-03.json'), 'utf8')) as {
  windowStartMs: number; windowEndMs: number; expectedRollbackTo: string; pages: VercelPage[];
};

/** A fake CLI: page i is served for the cursor that page i-1 returned. */
function fakeCli(pages: VercelPage[], failAt?: number) {
  const calls: Array<number | null> = [];
  const fetchPage = (next: number | null): VercelPage => {
    calls.push(next);
    const i = next === null ? 0 : pages.findIndex((_, k) => k > 0 && pages[k - 1].next === next);
    if (failAt !== undefined && i === failAt) throw new Error('simulated: vercel ls timed out');
    if (i < 0) throw new Error(`no page for cursor ${next}`);
    return pages[i];
  };
  return { fetchPage, calls };
}

describe('E169 — truncated first page (the 2026-10-03 morning)', () => {
  const firstPageOnly = fx.pages[0].deployments;

  it('fixture is the incident shape: page 1 oldest row is newer than the window start', () => {
    const oldest = Math.min(...firstPageOnly.map((d) => d.createdAt));
    expect(firstPageOnly.length).toBe(20);
    expect(oldest).toBeGreaterThan(fx.windowStartMs);
  });

  it('page 1 alone grades TRUNCATED, and in-window is UNKNOWN, never "no"', () => {
    const cov = gradeCoverage(firstPageOnly, fx.windowStartMs, false);
    expect(cov.state).toBe('TRUNCATED');
    const cw = classifyWindow(firstPageOnly, fx.windowStartMs, fx.windowEndMs, cov);
    expect(cw.inWindowDeps).toHaveLength(0);
    expect(cw.inWindow).toBe('unknown');
    expect(cw.rollbackTo).toBeNull();
  });

  it('red-rpm on a truncated list → investigate with "vercel coverage unknown", never rollback', () => {
    expect(decideAction('red-rpm', 'unknown', null)).toEqual({ action: 'investigate', detail: 'vercel coverage unknown' });
    // even if somehow handed a target, unknown must not roll back
    expect(decideAction('red-rpm', 'unknown', 'https://x.vercel.app').action).toBe('investigate');
  });

  it('coverage line names TRUNCATED and the comparison', () => {
    const line = coverageLine(gradeCoverage(firstPageOnly, fx.windowStartMs, false));
    expect(line).toMatch(/^vercel coverage: TRUNCATED \(20 rows over 1 page, oldest 2026-10-02T\d\d:\d\dZ > window start 2026-09-2\dT\d\d:\d\dZ/);
  });

  it('paging stopped by the page cap stays TRUNCATED/unknown', () => {
    const { fetchPage } = fakeCli(fx.pages);
    const { coverage, deployments } = listDeploymentsPaged(fetchPage, fx.windowStartMs, 1);
    expect(coverage.state).toBe('TRUNCATED');
    expect(coverage.stoppedBy).toBe('page cap 1');
    expect(classifyWindow(deployments, fx.windowStartMs, fx.windowEndMs, coverage).inWindow).toBe('unknown');
  });

  it('a CLI failure on page 2 stays TRUNCATED and is recorded, not swallowed as "no deploys"', () => {
    const { fetchPage } = fakeCli(fx.pages, 1);
    const { coverage } = listDeploymentsPaged(fetchPage, fx.windowStartMs);
    expect(coverage.state).toBe('TRUNCATED');
    expect(coverage.stoppedBy).toMatch(/vercel ls failed: simulated/);
  });

  it('a CLI failure on page 1 (zero rows) is TRUNCATED/unknown', () => {
    const { fetchPage } = fakeCli(fx.pages, 0);
    const { coverage, deployments } = listDeploymentsPaged(fetchPage, fx.windowStartMs);
    expect(deployments).toHaveLength(0);
    expect(coverage.state).toBe('TRUNCATED');
    expect(classifyWindow(deployments, fx.windowStartMs, fx.windowEndMs, coverage).inWindow).toBe('unknown');
    expect(coverageLine(coverage)).toContain('oldest none');
  });
});

describe('E169 — paging completes', () => {
  it('pages until a READY production deploy older than the window start, then stops', () => {
    const { fetchPage, calls } = fakeCli(fx.pages);
    const { coverage, deployments } = listDeploymentsPaged(fetchPage, fx.windowStartMs);
    expect(coverage.state).toBe('COMPLETE');
    expect(coverage.oldestMs!).toBeLessThanOrEqual(fx.windowStartMs);
    expect(calls.length).toBe(fx.pages.length); // every page fetched, none past the one that crosses
    expect(calls[0]).toBeNull();
    expect(calls[1]).toBe(fx.pages[0].next);
    expect(new Set(deployments.map((d) => d.url)).size).toBe(deployments.length);
    expect(coverageLine(coverage)).toMatch(/^vercel coverage: COMPLETE \(\d+ rows over \d+ pages, oldest \S+ ≤ window start /);
  });

  it('dedupes a row repeated across a page boundary', () => {
    const p0 = fx.pages[0];
    const dup = { deployments: [p0.deployments[p0.deployments.length - 1], ...fx.pages[1].deployments], next: fx.pages[1].next };
    const pages = [p0, dup, ...fx.pages.slice(2)];
    const { deployments } = listDeploymentsPaged(fakeCli(pages).fetchPage, fx.windowStartMs);
    expect(new Set(deployments.map((d) => d.url)).size).toBe(deployments.length);
  });

  it('an exhausted API (next=null) is COMPLETE even if the project is younger than the window', () => {
    const young: VercelDeployment[] = [{ uid: 'a', url: 'a.vercel.app', createdAt: fx.windowEndMs + 1000, state: 'READY', target: 'production' }];
    const { coverage, deployments } = listDeploymentsPaged(() => ({ deployments: young, next: null }), fx.windowStartMs);
    expect(coverage.state).toBe('COMPLETE');
    expect(coverage.exhausted).toBe(true);
    const cw = classifyWindow(deployments, fx.windowStartMs, fx.windowEndMs, coverage);
    expect(cw.inWindow).toBe('no');
    expect(decideAction('red-rpm', cw.inWindow, cw.rollbackTo)).toEqual({ action: 'investigate', detail: 'no Vercel deploy in window (coverage complete)' });
  });

  it('a cursor that does not advance stops paging instead of looping', () => {
    let n = 0;
    const page: VercelPage = { deployments: [{ uid: 'z', url: 'z', createdAt: fx.windowEndMs, state: 'READY', target: 'production' }], next: fx.windowEndMs };
    const { coverage } = listDeploymentsPaged(() => { n++; return page; }, fx.windowStartMs);
    expect(n).toBeLessThanOrEqual(2);
    expect(coverage.state).toBe('TRUNCATED');
  });
});

describe('E169 — window has deploys → rollbackTo is set (policy unchanged)', () => {
  const { fetchPage } = fakeCli(fx.pages);
  const { coverage, deployments } = listDeploymentsPaged(fetchPage, fx.windowStartMs);
  const cw = classifyWindow(deployments, fx.windowStartMs, fx.windowEndMs, coverage);

  it('sees the in-window production deploys page 1 hid', () => {
    expect(cw.inWindow).toBe('yes');
    expect(cw.inWindowDeps.length).toBeGreaterThan(0);
    expect(cw.inWindowDeps.every((d) => d.target === 'production')).toBe(true);
  });

  it('rollbackTo is the newest READY production deploy before the window start', () => {
    expect(cw.rollbackTo).toBe(fx.expectedRollbackTo);
  });

  it('red-rpm + known in-window deploy + target → rollback; other statuses unchanged', () => {
    expect(decideAction('red-rpm', cw.inWindow, cw.rollbackTo)).toEqual({ action: 'rollback', detail: null });
    expect(decideAction('red-traffic', 'yes', cw.rollbackTo).action).toBe('investigate');
    expect(decideAction('red-health', 'unknown', null).action).toBe('investigate');
    expect(decideAction('yellow', 'yes', cw.rollbackTo).action).toBe('watch');
    expect(decideAction('green', 'yes', cw.rollbackTo).action).toBe('none');
  });

  it('non-production and non-READY rows are never the rollback target', () => {
    const before = fx.windowStartMs - 60_000;
    const deps: VercelDeployment[] = [
      { uid: '1', url: 'preview.vercel.app', createdAt: before, state: 'READY', target: null },
      { uid: '2', url: 'err.vercel.app', createdAt: before - 1, state: 'ERROR', target: 'production' },
      { uid: '3', url: 'good.vercel.app', createdAt: before - 2, state: 'READY', target: 'production' },
      { uid: '4', url: 'in.vercel.app', createdAt: fx.windowStartMs + 1, state: 'READY', target: 'production' },
    ];
    const cov = gradeCoverage(deps, fx.windowStartMs, false);
    expect(classifyWindow(deps, fx.windowStartMs, fx.windowEndMs, cov).rollbackTo).toBe('https://good.vercel.app');
  });
});

describe('E169 — the script is wired to the lib (no single-page listing left)', () => {
  const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const src = stripComments(readFileSync(join(ROOT, 'scripts/agents/revenue-guardrail.ts'), 'utf8'));

  it('uses listDeploymentsPaged / classifyWindow / decideAction', () => {
    expect(src).toMatch(/listDeploymentsPaged\(/);
    expect(src).toMatch(/classifyWindow\(/);
    expect(src).toMatch(/decideAction\(/);
  });

  it('passes the page cursor to the CLI and prints the coverage line', () => {
    expect(src).toMatch(/--next/);
    expect(src).toMatch(/coverageLine\(/);
  });

  it('no longer infers "deploy in window" from change text', () => {
    expect(src).not.toMatch(/includes\('\[after judged day'\)/);
  });
});
