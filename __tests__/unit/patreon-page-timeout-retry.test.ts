/**
 * E257 (Ops, 2026-10-21): a Patreon Members page that hits its own
 * AbortSignal.timeout is re-attempted once inside the walk budget.
 *
 * 10-16 the scoreboard's Members section was COULD-NOT-RUN ("aborted due to
 * timeout") on one 30 s page with ~150 s of the 180 s walk budget left;
 * `patreonGet` retries only on 401. The fix lives in `_patreon-auth.ts`
 * (`withPageTimeoutRetry`) so every paginated walk inherits it, and the
 * scanner below fails any walk that bounds a page with `nextPageTimeoutMs`
 * directly instead of going through the retry.
 *
 * The helper is imported dynamically so on the pre-fix tree each case fails on
 * its own instead of the file erroring at import.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(__dirname, '..', '..');

type Helper = <T>(
  deadline: number,
  pages: number,
  get: (ms: number) => Promise<T>,
  retries?: number,
  log?: (m: string) => void
) => Promise<T>;

async function load() {
  const mod: Record<string, unknown> = await import('../../scripts/_patreon-auth');
  const withPageTimeoutRetry = mod.withPageTimeoutRetry as Helper;
  const isTimeoutAbort = mod.isTimeoutAbort as (e: unknown) => boolean;
  expect(typeof withPageTimeoutRetry, 'withPageTimeoutRetry not exported').toBe('function');
  expect(typeof isTimeoutAbort, 'isTimeoutAbort not exported').toBe('function');
  return { withPageTimeoutRetry, isTimeoutAbort, mod };
}

/** The exact rejection a fetch bounded by AbortSignal.timeout produces. */
async function realTimeoutReason(): Promise<unknown> {
  const s = AbortSignal.timeout(1);
  await new Promise((r) => setTimeout(r, 20));
  return s.reason;
}

const quiet = () => {};

describe('withPageTimeoutRetry (E257)', () => {
  it('recognises the real AbortSignal.timeout rejection, not a manual abort or an HTTP error', async () => {
    const { isTimeoutAbort } = await load();
    expect(isTimeoutAbort(await realTimeoutReason())).toBe(true);
    const wrapped = Object.assign(new Error('wrapped'), { cause: await realTimeoutReason() });
    expect(isTimeoutAbort(wrapped)).toBe(true);
    const ac = new AbortController();
    ac.abort();
    expect(isTimeoutAbort(ac.signal.reason)).toBe(false);
    expect(isTimeoutAbort(new Error('Patreon API 500: oops'))).toBe(false);
    expect(isTimeoutAbort(null)).toBe(false);
  });

  it('one timed-out page then success → returns the page (the 10-16 case)', async () => {
    const { withPageTimeoutRetry } = await load();
    const reason = await realTimeoutReason();
    let calls = 0;
    const logs: string[] = [];
    const out = await withPageTimeoutRetry(Date.now() + 180_000, 3, async () => {
      calls++;
      if (calls === 1) throw reason;
      return { data: [1, 2, 3] };
    }, undefined, (m) => logs.push(m));
    expect(out).toEqual({ data: [1, 2, 3] });
    expect(calls).toBe(2);
    expect(logs.join('\n')).toMatch(/page 4 timed out .*re-attempting once/);
  });

  it('bounded: two timeouts → throws after exactly 2 attempts (one retry, never a loop)', async () => {
    const { withPageTimeoutRetry, mod } = await load();
    expect(mod.PATREON_PAGE_TIMEOUT_RETRIES).toBe(1);
    const reason = await realTimeoutReason();
    let calls = 0;
    await expect(
      withPageTimeoutRetry(Date.now() + 180_000, 0, async () => { calls++; throw reason; }, undefined, quiet)
    ).rejects.toThrow(/page 1 timed out on 2 attempt/);
    expect(calls).toBe(2);
  });

  it('a non-timeout failure is never re-attempted', async () => {
    const { withPageTimeoutRetry } = await load();
    let calls = 0;
    await expect(
      withPageTimeoutRetry(Date.now() + 180_000, 0, async () => { calls++; throw new Error('Patreon API 500: boom'); }, undefined, quiet)
    ).rejects.toThrow(/Patreon API 500/);
    expect(calls).toBe(1);
  });

  it('the retry never outlives the walk budget: spent budget → budget error, no second call', async () => {
    const { withPageTimeoutRetry } = await load();
    const reason = await realTimeoutReason();
    let calls = 0;
    const deadline = Date.now() + 30;
    await expect(
      withPageTimeoutRetry(deadline, 5, async () => {
        calls++;
        await new Promise((r) => setTimeout(r, 60));
        throw reason;
      }, undefined, quiet)
    ).rejects.toThrow(/budget after 5 pages/);
    expect(calls).toBe(1);
  });

  it('each attempt is bounded by min(page timeout, budget left)', async () => {
    const { withPageTimeoutRetry, mod } = await load();
    const reason = await realTimeoutReason();
    const seen: number[] = [];
    const deadline = Date.now() + 10_000;
    await withPageTimeoutRetry(deadline, 0, async (ms) => {
      seen.push(ms);
      if (seen.length === 1) throw reason;
      return 'ok';
    }, undefined, quiet);
    expect(seen).toHaveLength(2);
    for (const ms of seen) {
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThanOrEqual(10_000);
      expect(ms).toBeLessThanOrEqual(mod.PATREON_PAGE_TIMEOUT_MS as number);
    }
  });
});

/** Comments in this repo quote the patterns they warn about — strip before scanning. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith('.ts') && !p.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

describe('every paginated Patreon walk goes through the retry (scanner, vacuity-guarded)', () => {
  const files = walk(join(ROOT, 'scripts')).filter((f) => !f.endsWith('_patreon-auth.ts'));
  const srcs = files.map((f) => ({ rel: relative(ROOT, f), src: stripComments(readFileSync(f, 'utf8')) }));

  it('no walk bounds a page with nextPageTimeoutMs directly (that path has no retry)', () => {
    const direct = srcs.filter((s) => /AbortSignal\.timeout\(\s*nextPageTimeoutMs\(/.test(s.src)).map((s) => s.rel);
    expect(direct).toEqual([]);
  });

  it('no script re-declares the page timeout / walk budget literals (guard the constant, not a copy)', () => {
    const copies = srcs
      .filter((s) => /\bconst\s+PATREON_(PAGE_TIMEOUT_MS|WALK_BUDGET_MS)\s*=/.test(s.src))
      .map((s) => s.rel);
    expect(copies).toEqual([]);
  });

  it('scoreboard + q4-gate + churn + relaunch all call withPageTimeoutRetry( (≥4 files)', () => {
    const users = srcs.filter((s) => /\bwithPageTimeoutRetry\(/.test(s.src)).map((s) => s.rel);
    for (const f of [
      'scripts/agents/funnel-scoreboard.ts',
      'scripts/agents/patreon-q4-gate-preread.ts',
      'scripts/agents/patreon-churn-read.ts',
      'scripts/agents/patreon-relaunch-read.ts',
    ]) expect(users, `${f} walks Members without the retry`).toContain(f);
    expect(users.length).toBeGreaterThanOrEqual(4);
  });
});
