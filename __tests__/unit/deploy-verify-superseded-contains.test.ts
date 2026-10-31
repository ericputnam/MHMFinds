import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard (E308, 2026-10-31).
 *
 * (a) 10-30 07:40: `--after-merge --sha fb4b264` (#394) wrote TIMEOUT "no READY production deploy … within 25m" while
 *     sibling verifies at 07:19 and 07:29 had already seen newer READY builds that CONTAIN fb4b264 — Vercel coalesced the
 *     PR's own build away, and the wait loop only ever looked for a deploy *of* the sha. A READY production build whose
 *     commit contains the sha (git ancestry, never timing) is now graded instead: "SUPERSEDED via <sha7> · <verdict>".
 * (b) 10-30: smoke-render hung ~3 h after READY on #392 and ~40 min on #394. One smoke run is now capped on wall clock
 *     (DEPLOY_VERIFY_SMOKE_MAX_S, default 600) and a killed run is INCONCLUSIVE — exit 0, nothing rolled back.
 *
 * Same harness as deploy-verify-platform-error.test.ts: the REAL script runs from a throwaway git repo (real commits and
 * ancestry), stubs only at the boundaries (vercel, npx, sleep, check-blog-sidebar.sh, push-blog-functions-prod.sh).
 */
const SRC = join(process.cwd(), 'scripts/agents/deploy-verify.sh');

let root: string;
let bin: string;
let P: string; // production before the merge
let A: string; // the PR's merge commit (its own build: absent / BUILDING / ERROR per case)
let E: string; // child of A that changes app code — contains A, NOT the same code

const git = (...a: string[]) =>
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { cwd: root, encoding: 'utf8' }).trim();
function commit(files: Record<string, string>, msg: string): string {
  for (const [f, body] of Object.entries(files)) {
    mkdirSync(join(root, f, '..'), { recursive: true });
    writeFileSync(join(root, f), body);
    git('add', f);
  }
  git('commit', '-q', '-m', msg);
  return git('rev-parse', 'HEAD');
}
function exe(p: string, body: string) {
  mkdirSync(join(p, '..'), { recursive: true });
  writeFileSync(p, `#!/bin/sh\n${body}\n`);
  chmodSync(p, 0o755);
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'dv-super-'));
  bin = join(root, '.bin');
  execFileSync('git', ['init', '-q', root], { stdio: 'ignore' });
  P = commit({ 'app/page.tsx': 'p' }, 'P');
  A = commit({ 'app/page.tsx': 'a' }, 'A: the PR');
  E = commit({ 'lib/x.ts': 'e' }, 'E: a sibling PR merged after A');
  const script = readFileSync(SRC, 'utf8');
  const op = 'OPERATOR_DIR="/Users/eputnam/java_projects/MHMFinds"';
  expect(script.split(op).length).toBe(2); // harness guard: exactly one line rewritten
  exe(join(root, 'scripts/agents/deploy-verify.sh'), '');
  writeFileSync(join(root, 'scripts/agents/deploy-verify.sh'), script.replace(op, `OPERATOR_DIR="${join(root, 'nope')}"`));
  mkdirSync(join(root, 'node_modules/playwright'), { recursive: true });
  writeFileSync(join(root, 'scripts/agents/smoke-render.ts'), '');
  exe(join(root, 'scripts/agents/check-blog-sidebar.sh'), 'exit 0');
  exe(join(root, 'scripts/staging/push-blog-functions-prod.sh'), `echo push >>"${root}/php.calls"`);
  mkdirSync(bin);
  exe(join(bin, 'sleep'), 'exit 0');
  exe(join(bin, 'npx'), `for a in "$@"; do :; done; cp "${root}/smoke.json" "$a"`);
  writeFileSync(join(root, 'smoke.json'), JSON.stringify({ failed: [], network: { degraded: false } }));
  exe(
    join(bin, 'vercel'),
    [
      `echo "$*" >>"${root}/vercel.calls"`,
      'case "$1" in',
      `  ls) cat "${root}/ls.json" ;;`,
      `  inspect) echo "url $(cat "${root}/served")" ;;`,
      `  promote) echo "$2" >"${root}/served" ;;`,
      'esac',
      'exit 0',
    ].join('\n'),
  );
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

type Dep = { url: string; sha: string; state: string; createdAt: number };
function run(deps: Dep[], served: string, extra: string[] = [], env: Record<string, string> = {}) {
  writeFileSync(join(root, 'ls.json'), JSON.stringify({
    deployments: deps.map((d) => ({ url: d.url, state: d.state, createdAt: d.createdAt, target: 'production', meta: { githubCommitSha: d.sha } })),
  }));
  writeFileSync(join(root, 'served'), `https://${served}`);
  const t0 = Date.now();
  // --wait-min 0: the pre-fix script times out on its first poll instead of busy-waiting a real minute
  const r = spawnSync('/bin/bash', [join(root, 'scripts/agents/deploy-verify.sh'), '--after-merge', '--sha', A, '--label', 'Rowan: E281 test', '--wait-min', '0', '--platform-wait-min', '0', ...extra], {
    cwd: root,
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: root, ...env },
    timeout: 90_000,
  });
  const read = (f: string) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : '');
  const rows = read('reports/funnel/changelog.md').split('\n').filter((l) => l.startsWith('| 20'));
  return {
    code: r.status,
    ms: Date.now() - t0,
    out: `${r.stdout}${r.stderr}`,
    afterMerge: rows.filter((l) => l.split('|')[2]?.trim() === 'after-merge'),
    vercel: read('vercel.calls'),
    php: read('php.calls'),
  };
}

const prodP = (): Dep => ({ url: 'prod-p', sha: P, state: 'READY', createdAt: 500 });
const readyE = (): Dep => ({ url: 'ready-e', sha: E, state: 'READY', createdAt: 3000 });

describe('deploy-verify.sh --after-merge: a READY build that CONTAINS the sha is graded, not waited out (E308a)', () => {
  it('10-30 #394 case: own build never listed, newer READY build contains it → SUPERSEDED via E · PASS, exit 0 (fails pre-fix: TIMEOUT)', () => {
    const r = run([prodP(), readyE()], 'ready-e');
    expect(r.code).toBe(0);
    expect(r.afterMerge).toHaveLength(1);
    const row = r.afterMerge[0];
    expect(row).not.toContain('TIMEOUT');
    expect(row).toContain(`| ${A.slice(0, 7)} |`); // commit column stays the PR's own sha
    expect(row).toContain('| https://ready-e |');
    expect(row).toContain(`| SUPERSEDED via ${E.slice(0, 7)} · PASS |`);
    expect(row).toContain(`own build of ${A.slice(0, 7)} not listed; READY build https://ready-e of ${E.slice(0, 7)} contains it`);
    expect(r.vercel).not.toMatch(/^(rollback|promote)/m);
  });

  it('own build still BUILDING while a containing build is READY → SUPERSEDED (fails pre-fix)', () => {
    const r = run([prodP(), { url: 'bld-a', sha: A, state: 'BUILDING', createdAt: 1000 }, readyE()], 'ready-e');
    expect(r.code).toBe(0);
    expect(r.afterMerge[0]).toContain(`| SUPERSEDED via ${E.slice(0, 7)} · PASS |`);
    expect(r.afterMerge[0]).toContain('BUILDING (https://bld-a)');
  });

  it('alias still on the older build → promotes FORWARD to the containing build, then grades it (fails pre-fix)', () => {
    const r = run([prodP(), readyE()], 'prod-p');
    expect(r.code).toBe(0);
    expect(r.vercel).toMatch(/^promote https:\/\/ready-e/m);
    expect(r.afterMerge[0]).toContain(`| SUPERSEDED via ${E.slice(0, 7)} · PASS |`);
  });

  it('positive smoke failure on the containing build is still acted on (SUPERSEDED is not a free pass)', () => {
    writeFileSync(join(root, 'smoke.json'), JSON.stringify({ failed: [{ path: '/', failures: ['no .mv-ads'] }], network: { degraded: false } }));
    const r = run([prodP(), readyE()], 'ready-e');
    expect(r.code).not.toBe(0);
    expect(r.vercel).toMatch(/^rollback https:\/\/prod-p/m);
  });

  it('own build ERROR keeps the stricter E201 same-code rule — an app-changing descendant is NOT proof', () => {
    const r = run([prodP(), { url: 'err-a', sha: A, state: 'ERROR', createdAt: 1000 }, readyE()], 'ready-e');
    expect(r.code).toBe(2);
    expect(r.afterMerge[0]).toContain('| BUILD ERROR |');
  });

  it('only an OLDER READY build exists → TIMEOUT exactly as before', () => {
    const r = run([prodP()], 'prod-p');
    expect(r.code).toBe(2);
    expect(r.afterMerge[0]).toContain('| TIMEOUT |');
  });

  it('a READY build of a commit this clone cannot see is not proof (unknown ≠ contains) → TIMEOUT', () => {
    const r = run([prodP(), { url: 'ready-z', sha: 'f'.repeat(40), state: 'READY', createdAt: 4000 }], 'ready-z');
    expect(r.code).toBe(2);
    expect(r.afterMerge[0]).toContain('| TIMEOUT |');
  });

  it('control: the own READY build is graded directly, no SUPERSEDED prefix', () => {
    const r = run([prodP(), { url: 'ready-a', sha: A, state: 'READY', createdAt: 1000 }, readyE()], 'ready-a');
    expect(r.code).toBe(0);
    expect(r.afterMerge[0]).toMatch(/\| PASS \|/);
    expect(r.afterMerge[0]).not.toContain('SUPERSEDED via');
  });
});

describe('deploy-verify.sh: smoke-render is capped on wall clock and a killed run is INCONCLUSIVE (E308b)', () => {
  it('a hung smoke-render is killed at the cap → INCONCLUSIVE, exit 0, no rollback (fails pre-fix: waits 30 s, grades PASS)', () => {
    exe(join(bin, 'npx'), `for a in "$@"; do :; done; echo $$ >"${root}/smoke.pid"; /bin/sleep 30; cp "${root}/smoke.json" "$a"`);
    const r = run([prodP(), { url: 'ready-a', sha: A, state: 'READY', createdAt: 1000 }], 'ready-a', [], { DEPLOY_VERIFY_SMOKE_MAX_S: '2' });
    expect(r.code).toBe(0);
    expect(r.ms).toBeLessThan(20_000);
    expect(r.afterMerge[0]).toContain('| INCONCLUSIVE |');
    expect(r.afterMerge[0]).toContain('smoke-render timed out after 2s wall clock (killed)');
    expect(r.vercel).not.toMatch(/^rollback/m);
    expect(r.php).toBe('');
    const pid = Number(readFileSync(join(root, 'smoke.pid'), 'utf8').trim());
    expect(spawnSync('/bin/kill', ['-0', String(pid)]).status).not.toBe(0); // the hung process is gone
  }, 90_000);

  it('a smoke that finishes inside the cap is graded normally', () => {
    const r = run([prodP(), { url: 'ready-a', sha: A, state: 'READY', createdAt: 1000 }], 'ready-a', [], { DEPLOY_VERIFY_SMOKE_MAX_S: '20' });
    expect(r.code).toBe(0);
    expect(r.afterMerge[0]).toMatch(/\| PASS \|/);
  });

  it('a bad cap value is refused before anything runs', () => {
    const r = run([prodP()], 'prod-p', [], { DEPLOY_VERIFY_SMOKE_MAX_S: '10m' });
    expect(r.code).toBe(64);
    expect(r.afterMerge).toHaveLength(0);
  });
});
