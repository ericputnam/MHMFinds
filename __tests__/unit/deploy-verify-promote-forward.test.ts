import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for deploy-verify.sh ensure_promoted() (E110, 2026-09-24 10:05).
 *
 * Sage's late after-merge verify of #167 (6b525b5) found the alias serving #170's newer, already
 * verified build and "re-promoted" its own OLDER build over it: /games/sims-4/bedroom-cc/ 404'd on
 * production while the ledger said PASS. Explicit promotion is a write — it may only move production
 * forward.
 *
 * This test does not grep for a fix. It extracts the REAL ensure_promoted() (and, when present, the
 * helpers it calls) from the script, stubs only the Vercel CLI boundary (current_prod / vls / vercel),
 * builds a throwaway git repo with real commits, and runs it under /bin/bash 3.2. Invariant: `vercel
 * promote` is called only when the candidate is provably newer than what production serves.
 */
const SCRIPT = 'scripts/agents/deploy-verify.sh';
const BASH = '/bin/bash';
const raw = readFileSync(join(process.cwd(), SCRIPT), 'utf8');

const fn = (name: string) =>
  raw.match(new RegExp(`^${name}\\(\\) \\{.*\\n[\\s\\S]*?\\n\\}\\n`, 'm'))?.[0] ?? '';
const ensurePromoted = fn('ensure_promoted');
const helpers = `${fn('deploy_meta')}\n${fn('promote_decision')}`;

let base: string;
let repo: string;
let A: string; // older commit (#167 in the incident)
let B: string; // newer commit, child of A (#170)
let X: string; // commit on an unrelated root

const git = (...a: string[]) =>
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: repo, encoding: 'utf8' }).trim();

function commit(msg: string): string {
  writeFileSync(join(repo, 'f'), msg);
  git('add', 'f');
  git('commit', '-q', '-m', msg);
  return git('rev-parse', 'HEAD');
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'promote-'));
  repo = join(base, 'repo');
  execFileSync('git', ['init', '-q', repo], { stdio: 'ignore' });
  A = commit('A');
  B = commit('B');
  const main = git('rev-parse', '--abbrev-ref', 'HEAD');
  git('checkout', '-q', '--orphan', 'other');
  X = commit('X');
  git('checkout', '-q', main);
});

afterEach(() => {
  if (base && existsSync(base)) rmSync(base, { recursive: true, force: true });
});

type Dep = { url: string; sha: string; createdAt: number };

/** served = what the alias serves (null = vercel inspect failed); cand = the READY build to promote. */
function run(served: Dep | null, cand: Dep, listed: Dep[] = [served, cand].filter(Boolean) as Dep[]) {
  const state = join(base, 'alias');
  const calls = join(base, 'calls');
  writeFileSync(state, served ? `https://${served.url}` : '');
  writeFileSync(calls, '');
  const ls = JSON.stringify({
    deployments: listed.map((d) => ({ url: d.url, createdAt: d.createdAt, state: 'READY', target: 'production', meta: { githubCommitSha: d.sha } })),
  });
  writeFileSync(join(base, 'ls.json'), ls);
  const script = [
    'log() { echo "LOG $*"; }',
    'sleep() { :; }',
    `current_prod() { local u; u="$(cat "${state}")"; [ -n "$u" ] && echo "$u"; }`,
    `vls() { cat "${join(base, 'ls.json')}"; }`,
    `vercel() { echo "$*" >>"${calls}"; [ "$1" = promote ] && printf '%s' "$2" >"${state}"; return 0; }`,
    'SERVED_URL=""; SERVED_SHA=""',
    helpers,
    ensurePromoted,
    `ensure_promoted "https://${cand.url}"; rc=$?`,
    'echo "RC=$rc SERVED_SHA=$SERVED_SHA"',
  ].join('\n');
  const r = spawnSync(BASH, ['-uo', 'pipefail', '-c', script], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: { PATH: process.env.PATH ?? '/usr/bin:/bin', ROOT: repo, HOME: base, LOG: join(base, 'dv.log') } as unknown as NodeJS.ProcessEnv,
    timeout: 30_000,
  });
  const out = `${r.stdout}${r.stderr}`;
  const rc = Number(out.match(/RC=(\d+)/)?.[1] ?? -1);
  const promoted = readFileSync(calls, 'utf8').includes('promote');
  return { out, rc, promoted };
}

describe('deploy-verify.sh ensure_promoted(): promotion only moves production forward (E110)', () => {
  it('extracted the real function (vacuity guard)', () => {
    expect(ensurePromoted).toMatch(/vercel promote "\$1" --yes/);
  });

  it('09-24 case: alias serves a newer build that contains the candidate → no promote, SUPERSEDED (rc 3)', () => {
    const r = run({ url: 'served-b', sha: B, createdAt: 2000 }, { url: 'cand-a', sha: A, createdAt: 1000 });
    expect(r.promoted).toBe(false);
    expect(r.rc).toBe(3);
    expect(r.out).toContain(`SERVED_SHA=${B}`);
  });

  it('superseded is decided by ancestry, not timing: newer commit built earlier still wins', () => {
    const r = run({ url: 'served-b', sha: B, createdAt: 1000 }, { url: 'cand-a', sha: A, createdAt: 2000 });
    expect(r.promoted).toBe(false);
    expect(r.rc).toBe(3);
  });

  it('rollback pause: alias serves an OLDER ancestor build → promotes the candidate (rc 0)', () => {
    const r = run({ url: 'served-a', sha: A, createdAt: 1000 }, { url: 'cand-b', sha: B, createdAt: 2000 });
    expect(r.promoted).toBe(true);
    expect(r.rc).toBe(0);
  });

  it('served commit unrelated to the candidate → falls back to createdAt: newer served is left alone', () => {
    const r = run({ url: 'served-x', sha: X, createdAt: 3000 }, { url: 'cand-b', sha: B, createdAt: 2000 });
    expect(r.promoted).toBe(false);
    expect(r.rc).toBe(3);
  });

  it('served commit unknown to this clone and older → promotes', () => {
    const r = run({ url: 'served-z', sha: 'f'.repeat(40), createdAt: 1000 }, { url: 'cand-b', sha: B, createdAt: 2000 });
    expect(r.promoted).toBe(true);
    expect(r.rc).toBe(0);
  });

  it('served build is outside the vercel ls window (older than every listed build) → promotes', () => {
    const cand = { url: 'cand-b', sha: B, createdAt: 2000 };
    const r = run({ url: 'ancient', sha: A, createdAt: 1 }, cand, [cand]);
    expect(r.promoted).toBe(true);
    expect(r.rc).toBe(0);
  });

  it('alias serves another build of the SAME commit → no promote, rc 0', () => {
    const r = run({ url: 'redeploy-b', sha: B, createdAt: 3000 }, { url: 'cand-b', sha: B, createdAt: 2000 });
    expect(r.promoted).toBe(false);
    expect(r.rc).toBe(0);
  });

  it('cannot tell what production serves (vercel inspect failed) → unknown: no promote, rc 1', () => {
    const r = run(null, { url: 'cand-b', sha: B, createdAt: 2000 });
    expect(r.promoted).toBe(false);
    expect(r.rc).toBe(1);
  });

  it('alias already serves the candidate → rc 0, no promote', () => {
    const cand = { url: 'cand-b', sha: B, createdAt: 2000 };
    const r = run(cand, cand);
    expect(r.promoted).toBe(false);
    expect(r.rc).toBe(0);
  });
});

describe('deploy-verify.sh after-merge: SUPERSEDED verifies production as served and ledgers it (E110)', () => {
  const strip = (s: string) => s.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const src = strip(raw);
  const afterMerge = src.slice(src.indexOf('  after-merge)'), src.indexOf('  check)'));

  it('branches on ensure_promoted rc 3 before the not-promoted path', () => {
    expect(afterMerge).toMatch(/ensure_promoted "\$DEPLOY_URL"; PROMO=\$\?/);
    expect(afterMerge).toMatch(/if \[ "\$PROMO" -eq 3 \]; then/);
    expect(afterMerge.indexOf('-eq 3')).toBeLessThan(afterMerge.indexOf('ledger "NOT PROMOTED"'));
  });

  it('grades the SERVED deployment, ledgers SUPERSEDED only after a smoke, and exits 0', () => {
    const block = afterMerge.slice(afterMerge.indexOf('-eq 3'), afterMerge.indexOf('elif'));
    expect(block).toMatch(/DEPLOY_URL="\$SERVED_URL"/);
    expect(block).toMatch(/PREV="\$\(previous_ready "\$DEPLOY_URL"\)"/);
    expect(block.indexOf('if smoke; then')).toBeGreaterThan(-1);
    expect(block.indexOf('if smoke; then')).toBeLessThan(block.indexOf('ledger "SUPERSEDED (production already on'));
    expect(block).toMatch(/ledger "SUPERSEDED \(production already on \$\{SERVED_SHA:0:7\}, newer\)"[\s\S]*exit 0/);
    expect(block).toMatch(/fail_and_fix "\$PREV"/);
  });
});
