/**
 * Every `patreonGet(` call under scripts/ carries a bounded signal (E139, Rio, 2026-09-29).
 *
 * #201 gave `patreonGet` an `init.signal` and bounded the scoreboard walk; the
 * other callers (patreon-churn-read, patreon-relaunch-read, patreon-q4-gate-preread,
 * operator-did-probe) still called it bare, so a hung api.patreon.com would stall
 * each of them for as long as the runner allowed. The rule from CLAUDE.md: "every
 * outbound fetch( in a runner step carries a signal, and a timeout is unknown."
 *
 * Red on the pre-fix tree (origin/main 4ba11cc): 6 unbounded calls in 4 files,
 * `nextPageTimeoutMs` not exported, no `PATREON_ENV_FILE` line in env.example.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
// Only the pre-existing export is imported statically, so on the pre-fix tree the
// three tests fail one by one instead of the file erroring at import.
import { PATREON_ENV_FILE_VAR } from '../../scripts/_patreon-auth';

const ROOT = join(__dirname, '..', '..');

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

describe('patreonGet callers are bounded', () => {
  it('every patreonGet( call under scripts/ carries signal: AbortSignal.timeout( (scanner, vacuity-guarded)', () => {
    const files = walk(join(ROOT, 'scripts')).filter((f) => !f.endsWith('_patreon-auth.ts'));
    const unbounded: string[] = [];
    let seen = 0;
    const filesWithCalls = new Set<string>();
    for (const file of files) {
      const src = stripComments(readFileSync(file, 'utf8'));
      const re = /\bpatreonGet\(/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        seen++;
        filesWithCalls.add(file);
        const call = src.slice(m.index, m.index + 400);
        if (!/signal:\s*AbortSignal\.timeout\(/.test(call)) {
          unbounded.push(`${relative(ROOT, file)} @${m.index}`);
        }
      }
    }
    expect(unbounded, 'unbounded patreonGet( calls').toEqual([]);
    // scoreboard 1 + q4-gate 1 + churn 2 + relaunch 1 + probe 2 = 7 calls in 5 files. Fewer = scanner blind.
    expect(seen).toBeGreaterThanOrEqual(7);
    expect(filesWithCalls.size).toBeGreaterThanOrEqual(5);
  });

  it('nextPageTimeoutMs: min(page timeout, budget left), throws once the walk budget is spent', async () => {
    const mod: Record<string, unknown> = await import('../../scripts/_patreon-auth');
    const nextPageTimeoutMs = mod.nextPageTimeoutMs as (deadline: number, pages: number) => number;
    const PATREON_PAGE_TIMEOUT_MS = mod.PATREON_PAGE_TIMEOUT_MS as number;
    const PATREON_WALK_BUDGET_MS = mod.PATREON_WALK_BUDGET_MS as number;
    expect(typeof nextPageTimeoutMs, 'nextPageTimeoutMs not exported').toBe('function');
    expect(PATREON_PAGE_TIMEOUT_MS).toBe(30_000);
    expect(PATREON_WALK_BUDGET_MS).toBe(180_000);
    const now = Date.now();
    expect(nextPageTimeoutMs(now + 1_000_000, 0)).toBe(PATREON_PAGE_TIMEOUT_MS);
    const short = nextPageTimeoutMs(now + 5_000, 3);
    expect(short).toBeGreaterThan(0);
    expect(short).toBeLessThanOrEqual(5_000);
    expect(() => nextPageTimeoutMs(now - 1, 4)).toThrow(/budget after 4 pages/);
  });

  it('env.example documents PATREON_ENV_FILE as a commented line', () => {
    const env = readFileSync(join(ROOT, 'env.example'), 'utf8');
    const line = env.split('\n').find((l) => l.includes(`${PATREON_ENV_FILE_VAR}=`));
    expect(line, `${PATREON_ENV_FILE_VAR} line missing from env.example`).toBeDefined();
    expect(line!.trimStart().startsWith('#'), 'must be commented out — the default resolution is the right one for the main checkout').toBe(true);
  });
});
