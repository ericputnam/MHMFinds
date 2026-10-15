/**
 * E215 — a report writer must never default its output into a *different* checkout.
 *
 * On 2026-10-14 two of seven funnel agents ran `funnel-scoreboard.ts` from their own worktree
 * without MHM_PROJECT_DIR and wrote `reports/funnel/2026-10-14.*` into the operator's main
 * checkout (`?? '/Users/eputnam/java_projects/MHMFinds'`). `rank-pin-destinations.ts` did the same
 * on 2026-10-01. This file pins the class, not the instance:
 *   1. scanner: no script under scripts/ may default MHM_PROJECT_DIR to an absolute path literal
 *      (red against pre-fix origin/main: funnel-scoreboard.ts and rank-pin-destinations.ts);
 *   2. the resolver: explicit env honored, same-checkout default ok, other checkout refused;
 *   3. end to end: both writers exit 2 (could-not-run), name the env var, and write nothing.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  findRepoRoot,
  OPERATOR_TREE_DEFAULT,
  PROJECT_DIR_REFUSED_EXIT,
  resolveProjectDir,
} from '../../scripts/agents/project-dir-guard';

const REPO = resolve(__dirname, '..', '..');
const SCRIPTS = join(REPO, 'scripts');
const GUARDED_WRITERS = ['scripts/agents/funnel-scoreboard.ts', 'scripts/agents/rank-pin-destinations.ts'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|mts|js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/** Comments in this repo quote the bad pattern on purpose — strip them before asserting. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const ABSOLUTE_DEFAULT = /MHM_PROJECT_DIR\s*\?\?\s*['"`]\//;

describe('scanner: no script defaults MHM_PROJECT_DIR to a hardcoded checkout', () => {
  const files = walk(SCRIPTS);
  const users = files.filter((f) => readFileSync(f, 'utf8').includes('MHM_PROJECT_DIR'));

  it('finds the population it guards (vacuity guard)', () => {
    expect(files.length).toBeGreaterThan(50);
    expect(users.length).toBeGreaterThanOrEqual(5);
  });

  it('no `MHM_PROJECT_DIR ?? "/abs/path"` default anywhere under scripts/', () => {
    const offenders = users
      .filter((f) => ABSOLUTE_DEFAULT.test(stripComments(readFileSync(f, 'utf8'))))
      .map((f) => f.slice(REPO.length + 1));
    expect(offenders).toEqual([]);
  });

  it.each(GUARDED_WRITERS)('%s resolves its dir through requireProjectDir', (rel) => {
    expect(stripComments(readFileSync(join(REPO, rel), 'utf8'))).toMatch(/const PROJECT_DIR = requireProjectDir\(/);
  });
});

describe('resolveProjectDir', () => {
  let root: string;
  let checkoutA: string;
  let worktreeB: string;
  let bare: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'e215-'));
    checkoutA = join(root, 'operator');
    worktreeB = join(root, 'agent-wt');
    bare = join(root, 'not-a-checkout');
    mkdirSync(join(checkoutA, '.git'), { recursive: true }); // main checkout: .git is a dir
    mkdirSync(join(worktreeB, 'scripts', 'agents'), { recursive: true });
    writeFileSync(join(worktreeB, '.git'), 'gitdir: /elsewhere\n'); // worktree: .git is a file
    mkdirSync(bare, { recursive: true });
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('findRepoRoot walks up to the nearest .git (file or dir)', () => {
    expect(findRepoRoot(join(worktreeB, 'scripts', 'agents'))).toBe(worktreeB);
    expect(findRepoRoot(checkoutA)).toBe(checkoutA);
  });

  it('honors an explicit MHM_PROJECT_DIR wherever cwd is', () => {
    const r = resolveProjectDir({ env: { MHM_PROJECT_DIR: worktreeB }, cwd: bare, script: 't' });
    expect(r).toEqual({ ok: true, dir: worktreeB, source: 'env' });
  });

  it('allows the default when cwd is inside the default checkout', () => {
    const r = resolveProjectDir({ env: { MHM_OPERATOR_TREE: checkoutA }, cwd: checkoutA, script: 't' });
    expect(r).toEqual({ ok: true, dir: checkoutA, source: 'default' });
  });

  it('refuses (could-not-run) when unset and cwd is another checkout — the 10-14 case', () => {
    for (const env of [{ MHM_OPERATOR_TREE: checkoutA }, { MHM_OPERATOR_TREE: checkoutA, MHM_PROJECT_DIR: '  ' }]) {
      const r = resolveProjectDir({ env, cwd: join(worktreeB, 'scripts'), script: 'funnel-scoreboard.ts' });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error).toContain('MHM_PROJECT_DIR');
        expect(r.error).toContain(worktreeB);
        expect(r.error).toContain('Nothing was written');
      }
    }
  });

  it('refuses when cwd is not in any checkout', () => {
    expect(resolveProjectDir({ env: { MHM_OPERATOR_TREE: checkoutA }, cwd: bare, script: 't' }).ok).toBe(false);
  });

  it('the real default is still the operator tree (the guard narrows, it does not move output)', () => {
    expect(OPERATOR_TREE_DEFAULT).toBe('/Users/eputnam/java_projects/MHMFinds');
    expect(PROJECT_DIR_REFUSED_EXIT).toBe(2);
  });
});

describe('end to end: writers refuse with exit 2 and write nothing', () => {
  let root: string;
  let fakeOperator: string;
  let agentWt: string;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'e215-e2e-'));
    fakeOperator = join(root, 'operator');
    agentWt = join(root, 'agent-wt');
    mkdirSync(join(fakeOperator, '.git'), { recursive: true });
    mkdirSync(agentWt, { recursive: true });
    writeFileSync(join(agentWt, '.git'), 'gitdir: /elsewhere\n');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it.each(GUARDED_WRITERS)('%s', (rel) => {
    // Never spawn an unguarded writer: it would write into the real operator tree and hit the network.
    expect(readFileSync(join(REPO, rel), 'utf8')).toMatch(/requireProjectDir\(/);
    const env: Record<string, string | undefined> = { ...process.env, MHM_OPERATOR_TREE: fakeOperator };
    delete env.MHM_PROJECT_DIR;
    const res = spawnSync(join(REPO, 'node_modules', '.bin', 'tsx'), [join(REPO, rel)], {
      cwd: agentWt,
      env: env as NodeJS.ProcessEnv,
      encoding: 'utf8',
      timeout: 60_000,
    });
    expect(res.status).toBe(2);
    expect(res.stderr).toContain('MHM_PROJECT_DIR');
    expect(existsSync(join(fakeOperator, 'reports'))).toBe(false);
    expect(existsSync(join(agentWt, 'reports'))).toBe(false);
  }, 90_000);
});
