import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard (E201, 2026-10-13): a Vercel ERROR/CANCELED on the merged sha's OWN build is not a code failure
 * until no READY build of the same code exists. On 10-12, 4fd20fd (#281) and 817064a (#288, docs-only) both built
 * ERROR with no build log while the next commit of the same code built READY; each run wrote "BUILD ERROR" plus an
 * incident saying "No Tier 1 merges until it is closed", and Quinn closed both by hand.
 *
 * The REAL script runs end to end from a throwaway git repo (real commits, real ancestry, real diffs) with stubs only
 * at the boundaries: `vercel` (ls / inspect / promote / rollback recorder), `npx` (writes a smoke fixture), `sleep`,
 * check-blog-sidebar.sh and push-blog-functions-prod.sh (recorder). The copy's OPERATOR_DIR is pointed at a missing
 * directory so the smoke can never reach the operator checkout's real Playwright. No network, no other tree touched.
 */
const SRC = join(process.cwd(), 'scripts/agents/deploy-verify.sh');
const raw = readFileSync(SRC, 'utf8');

let root: string;
let bin: string;
let P: string; // production before the merge (parent of A)
let A: string; // the PR's merge commit — its own build ERRORs
let D: string; // child of A: ledger/docs only (reports/ + *.md) — same app code
let E: string; // child of D: changes an app file — NOT the same code

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
  root = mkdtempSync(join(tmpdir(), 'dv-plat-'));
  bin = join(root, '.bin');
  execFileSync('git', ['init', '-q', root], { stdio: 'ignore' });
  P = commit({ 'app/page.tsx': 'p' }, 'P');
  A = commit({ 'app/page.tsx': 'a' }, 'A: the PR');
  D = commit({ 'reports/funnel/changelog.md': '# ledger\n', 'NOTES.md': 'n' }, 'funnel(ledger): row');
  E = commit({ 'lib/x.ts': 'e' }, 'E: another PR');
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
  // smoke-render stub: copy the fixture to the --json path (the last argument)
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
function run(deps: Dep[], served: string, extra: string[] = []) {
  writeFileSync(join(root, 'ls.json'), JSON.stringify({
    deployments: deps.map((d) => ({ url: d.url, state: d.state, createdAt: d.createdAt, target: 'production', meta: { githubCommitSha: d.sha } })),
  }));
  writeFileSync(join(root, 'served'), `https://${served}`);
  const r = spawnSync('/bin/bash', [join(root, 'scripts/agents/deploy-verify.sh'), '--after-merge', '--sha', A, '--label', 'Sage: E189 test', '--platform-wait-min', '1', ...extra], {
    cwd: root,
    encoding: 'utf8',
    env: { NODE_ENV: 'test', PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: root },
    timeout: 60_000,
  });
  const read = (f: string) => (existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : '');
  const rows = read('reports/funnel/changelog.md').split('\n').filter((l) => l.startsWith('| 20'));
  const incDir = join(root, 'reports/funnel/incidents');
  return {
    code: r.status,
    out: `${r.stdout}${r.stderr}`,
    rows,
    afterMerge: rows.filter((l) => l.split('|')[2]?.trim() === 'after-merge'),
    watch: rows.filter((l) => l.split('|')[2]?.trim() === 'build-watch'),
    incidents: existsSync(incDir) ? readdirSync(incDir) : [],
    vercel: read('vercel.calls'),
    php: read('php.calls'),
  };
}

const prodBefore: Dep = { url: 'prod-p', sha: '', state: 'READY', createdAt: 500 };
const errA = (state = 'ERROR'): Dep => ({ url: 'err-a', sha: A, state, createdAt: 1000 });

describe('deploy-verify.sh --after-merge: a platform build ERROR is graded on the same code, not on the spot (E201)', () => {
  beforeEach(() => { prodBefore.sha = P; });

  it('10-12 case: own build ERROR, ledger-only child READY → graded via the child, no incident, exit 0 (fails pre-fix)', () => {
    const r = run([prodBefore, errA(), { url: 'ready-d', sha: D, state: 'READY', createdAt: 2000 }], 'ready-d');
    expect(r.code).toBe(0);
    expect(r.incidents).toHaveLength(0);
    expect(r.afterMerge).toHaveLength(1);
    const row = r.afterMerge[0];
    expect(row).toContain(`| ${A.slice(0, 7)} |`); // the commit column stays the PR's own sha
    expect(row).toContain('| https://ready-d |');
    expect(row).toContain(`| BUILD ERROR (platform) → READY via ${D.slice(0, 7)} · PASS |`);
    expect(row).toContain('own build https://err-a ERROR');
    expect(row).toContain('verified live');
    expect(r.vercel).not.toMatch(/^rollback/m);
  });

  it('writes a durable build-watch row BEFORE waiting (its ledger commit is what builds for the last merge of the day)', () => {
    const r = run([prodBefore, errA(), { url: 'ready-d', sha: D, state: 'READY', createdAt: 2000 }], 'ready-d');
    expect(r.watch).toHaveLength(1);
    expect(r.watch[0]).toContain('| BUILD ERROR (unconfirmed) |');
    expect(r.rows.indexOf(r.watch[0])).toBeLessThan(r.rows.indexOf(r.afterMerge[0]));
  });

  it('CANCELED is handled the same way (fails pre-fix)', () => {
    const r = run([prodBefore, errA('CANCELED'), { url: 'ready-d', sha: D, state: 'READY', createdAt: 2000 }], 'ready-d');
    expect(r.code).toBe(0);
    expect(r.afterMerge[0]).toContain(`BUILD CANCELED (platform) → READY via ${D.slice(0, 7)}`);
  });

  it('the only READY descendant changed app code → BUILD ERROR + incident exactly as before', () => {
    const r = run([prodBefore, errA(), { url: 'ready-e', sha: E, state: 'READY', createdAt: 3000 }], 'ready-e');
    expect(r.code).toBe(2);
    expect(r.afterMerge).toHaveLength(1);
    expect(r.afterMerge[0]).toContain('| BUILD ERROR |');
    expect(r.incidents).toHaveLength(1);
    expect(r.out).toMatch(/no READY build containing .* after 1m \/ 2 poll\(s\)/);
  });

  it('a READY build of an OLDER commit (does not contain the sha) is not proof', () => {
    const r = run([prodBefore, errA()], 'prod-p');
    expect(r.code).toBe(2);
    expect(r.afterMerge[0]).toContain('| BUILD ERROR |');
    expect(r.incidents).toHaveLength(1);
  });

  it('a READY build of a commit this clone cannot see is not proof (unknown ≠ platform)', () => {
    const r = run([prodBefore, errA(), { url: 'ready-z', sha: 'f'.repeat(40), state: 'READY', createdAt: 4000 }], 'ready-z');
    expect(r.code).toBe(2);
    expect(r.afterMerge[0]).toContain('| BUILD ERROR |');
  });

  it('--platform-wait-min 0 restores the old behaviour exactly (no build-watch row)', () => {
    const r = run([prodBefore, errA(), { url: 'ready-d', sha: D, state: 'READY', createdAt: 2000 }], 'ready-d', ['--platform-wait-min', '0']);
    expect(r.code).toBe(2);
    expect(r.watch).toHaveLength(0);
    expect(r.afterMerge[0]).toContain('| BUILD ERROR |');
  });

  it('the platform path NEVER rolls back or re-pushes functions.php, even on positive smoke + blog failures (fails pre-fix)', () => {
    writeFileSync(join(root, 'smoke.json'), JSON.stringify({ failed: [{ path: '/', failures: ['no .mv-ads'] }], network: { degraded: false } }));
    exe(join(root, 'scripts/agents/check-blog-sidebar.sh'), 'echo "  [FAIL] mhm_inject_mediavine_sidebar missing"; exit 1');
    const r = run([prodBefore, errA(), { url: 'ready-d', sha: D, state: 'READY', createdAt: 2000 }], 'ready-d');
    expect(r.code).toBe(2);
    expect(r.vercel).not.toMatch(/^rollback/m);
    expect(r.php).toBe('');
    expect(r.afterMerge[0]).toContain(`BUILD ERROR (platform) → READY via ${D.slice(0, 7)} · FAIL (not rolled back)`);
    expect(r.incidents).toHaveLength(1);
    expect(readFileSync(join(root, 'reports/funnel/incidents', r.incidents[0]), 'utf8')).toContain('never acts');
  });

  it('control: a normal READY build of the sha is untouched by E201 (PASS, no build-watch row)', () => {
    const r = run([prodBefore, { url: 'ready-a', sha: A, state: 'READY', createdAt: 1000 }], 'ready-a');
    expect(r.code).toBe(0);
    expect(r.watch).toHaveLength(0);
    expect(r.afterMerge[0]).toMatch(/\| PASS \|/);
  });
});

describe('same_code(): only paths no build reads are exempt, and an unreadable diff is never "same"', () => {
  const fn = (name: string) => raw.match(new RegExp(`^${name}\\(\\) \\{.*\\n[\\s\\S]*?\\n\\}\\n`, 'm'))?.[0] ?? '';
  const sc = (a: string, b: string) =>
    spawnSync('/bin/bash', ['-c', `ROOT="${root}"\n${fn('same_code')}\nsame_code ${a} ${b}; echo "RC=$?"`], { encoding: 'utf8' }).stdout.trim();

  it('extracted the real function (vacuity guard)', () => {
    expect(fn('same_code')).toContain('git diff --name-only');
    expect(fn('find_containing_ready')).toContain('merge-base --is-ancestor');
  });
  it('reports/ + *.md only → same', () => expect(sc(A, D)).toBe('RC=0'));
  it('an app file changed → not same', () => expect(sc(A, E)).toBe('RC=1'));
  it('unknown commit → not same', () => expect(sc(A, 'f'.repeat(40))).toBe('RC=1'));
});
