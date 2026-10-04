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
import * as lib from '../../scripts/agents/revenue-guardrail-lib';

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

describe('E169 — window has deploys → rollbackTo is set', () => {
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

  it('red-rpm with the real 10-03 window (114 deploys) is investigate, not rollback (E169-b); other statuses unchanged', () => {
    expect(decideAction('red-rpm', cw.inWindow, cw.rollbackTo, cw.facts).action).toBe('investigate');
    expect(decideAction('red-traffic', 'yes', cw.rollbackTo, cw.facts).action).toBe('investigate');
    expect(decideAction('red-health', 'unknown', null).action).toBe('investigate');
    expect(decideAction('yellow', 'yes', cw.rollbackTo, cw.facts).action).toBe('watch');
    expect(decideAction('green', 'yes', cw.rollbackTo, cw.facts).action).toBe('none');
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

/**
 * E169-b (2026-10-04) — the automatic rollback is bounded. With paging fixed, a red-rpm over a 4-day window
 * that holds ~114 production deploys (the team merges 6–17 PRs/day; each merge is 2 deploys) would revert
 * ~5 days of work to cure a drop two reads (E163, 10-02) attributed to Mediavine-side fill. `rollback` now
 * needs BOTH: in-window production deploys ≤ ROLLBACK_BOUNDS.maxInWindowDeploys (one day's worth) AND a
 * READY target no more than ROLLBACK_BOUNDS.maxTargetAgeMs before the window start. Otherwise `investigate`
 * with a detail naming the bound. The new symbols are reached through the namespace import so this file
 * still loads against the pre-E169-b lib and the red below is behavioural, not a module-load failure.
 */
describe('E169-b — the automatic rollback is bounded (one day of deploys, target ≤ 48 h before the window)', () => {
  const B = lib.ROLLBACK_BOUNDS;
  const H = 3_600_000;
  const { fetchPage } = fakeCli(fx.pages);
  const { coverage, deployments } = listDeploymentsPaged(fetchPage, fx.windowStartMs);
  const cw = classifyWindow(deployments, fx.windowStartMs, fx.windowEndMs, coverage);
  const facts = (inWindowCount: number, targetAgeMs: number | null = 1.5 * H): lib.RollbackFacts => ({
    inWindowCount, rollbackTargetMs: targetAgeMs === null ? null : fx.windowStartMs - targetAgeMs, windowStartMs: fx.windowStartMs,
  });
  const target = 'https://good.vercel.app';

  it('the bound is below the real 10-03 window, so that morning\'s shape never auto-rolls back', () => {
    expect(cw.inWindowDeps.length).toBe(114);
    expect(B.maxInWindowDeploys).toBeLessThan(cw.inWindowDeps.length);
    expect(B.maxTargetAgeMs).toBeGreaterThan(0);
  });

  it('classifyWindow reports the rollback facts: in-window count, target createdAt, window start', () => {
    expect(cw.facts).toEqual({
      inWindowCount: 114,
      rollbackTargetMs: deployments.find((d) => `https://${d.url}` === fx.expectedRollbackTo)!.createdAt,
      windowStartMs: fx.windowStartMs,
    });
    expect(cw.facts.rollbackTargetMs!).toBeLessThan(fx.windowStartMs);
  });

  it('the real 10-03 window (114 in-window deploys) → investigate naming the count and the bound, never rollback', () => {
    expect(decideAction('red-rpm', cw.inWindow, cw.rollbackTo, cw.facts)).toEqual({
      action: 'investigate', detail: `in-window deploys 114 exceed rollback bound ${B.maxInWindowDeploys}`,
    });
  });

  it('a quiet window (≤ bound, READY target 1.5 h before the window start) → rollback', () => {
    expect(decideAction('red-rpm', 'yes', target, facts(3))).toEqual({ action: 'rollback', detail: null });
  });

  it('exactly the bound rolls back; bound + 1 does not (exact comparison at the boundary)', () => {
    expect(decideAction('red-rpm', 'yes', target, facts(B.maxInWindowDeploys)).action).toBe('rollback');
    expect(decideAction('red-rpm', 'yes', target, facts(B.maxInWindowDeploys + 1))).toEqual({
      action: 'investigate', detail: `in-window deploys ${B.maxInWindowDeploys + 1} exceed rollback bound ${B.maxInWindowDeploys}`,
    });
  });

  it('a target more than 48 h older than the window start → investigate "rollback target too old"', () => {
    const r = decideAction('red-rpm', 'yes', target, facts(3, B.maxTargetAgeMs + H));
    expect(r.action).toBe('investigate');
    expect(r.detail).toMatch(/^rollback target too old \(49\.0 h before window start, bound 48 h\)$/);
    expect(decideAction('red-rpm', 'yes', target, facts(3, B.maxTargetAgeMs)).action).toBe('rollback');
  });

  it('facts missing or target time unknown → investigate, never rollback (fail closed)', () => {
    expect(decideAction('red-rpm', 'yes', target).action).toBe('investigate');
    expect(decideAction('red-rpm', 'yes', target).detail).toMatch(/rollback bound facts missing/);
    expect(decideAction('red-rpm', 'yes', target, facts(3, null)).action).toBe('investigate');
  });

  it('the bound never upgrades a non-rollback: unknown / no / no-target keep their details', () => {
    expect(decideAction('red-rpm', 'unknown', target, facts(1)).detail).toBe('vercel coverage unknown');
    expect(decideAction('red-rpm', 'no', null, facts(0)).detail).toBe('no Vercel deploy in window (coverage complete)');
    expect(decideAction('red-rpm', 'yes', null, facts(1)).detail).toMatch(/no READY production deploy before the window/);
  });

  it('boundLine names the count, the bound, the target age and the verdict', () => {
    expect(lib.boundLine(cw.facts, cw.rollbackTo)).toMatch(
      new RegExp(`^rollback bound: in-window production deploys 114 \\(≤${B.maxInWindowDeploys} to auto-rollback\\) · target \\d+\\.\\d h before window start \\(≤48 h\\) → withheld: in-window deploys 114 exceed rollback bound ${B.maxInWindowDeploys}$`),
    );
    expect(lib.boundLine(facts(3), target)).toMatch(/→ eligible$/);
    expect(lib.boundLine(undefined, target)).toMatch(/facts unknown/);
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

  it('E169-b: hands decideAction the rollback facts and prints the bound line', () => {
    expect(src).toMatch(/decideAction\([^)]*\bfacts\b/);
    expect(src).toMatch(/boundLine\(/);
  });
});
