import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * E250 (2026-10-20): a merge that touches no build-relevant path is graded against production AS SERVED, at once.
 * 10-19: Quinn's #340 (.claude/agents/mhm-funnel/** only) sat through the full 25-minute after-merge wait and was
 * graded TIMEOUT because Vercel produced no READY production deploy for 7a40ab5 — a docs commit cannot have changed
 * what visitors are served, so waiting for its build measures Vercel, not the merge.
 *
 * Same harness as deploy-verify-platform-error.test.ts: the REAL script runs from a throwaway git repo with stubs only
 * at the boundaries (vercel, npx smoke fixture, sleep, check-blog-sidebar, push-blog-functions recorder).
 */
const SRC = join(process.cwd(), 'scripts/agents/deploy-verify.sh');
const raw = readFileSync(SRC, 'utf8');

let root: string;
let bin: string;
let P: string; // production before the merge
let PAPER: string; // the PR's merge commit: registry + report markdown only
let BUILD: string; // a merge commit that also touches scripts/ (type-checked by Vercel)

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
  root = mkdtempSync(join(tmpdir(), 'dv-paper-'));
  bin = join(root, '.bin');
  execFileSync('git', ['init', '-q', root], { stdio: 'ignore' });
  P = commit({ 'app/page.tsx': 'p' }, 'P');
  PAPER = commit({ '.claude/agents/mhm-funnel/experiments.md': 'e', 'reports/funnel/x.md': 'x' }, 'paper PR');
  BUILD = commit({ 'reports/funnel/y.md': 'y', 'scripts/agents/foo.ts': 'export {}' }, 'mixed PR');
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
  // Production serves P's build; NO deployment exists for PAPER or BUILD (the 10-19 #340 shape).
  writeFileSync(join(root, 'ls.json'), JSON.stringify({
    deployments: [{ url: 'prod-p', state: 'READY', createdAt: 500, target: 'production', meta: { githubCommitSha: P } }],
  }));
  writeFileSync(join(root, 'served'), 'https://prod-p');
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

function run(sha: string, extra: string[] = []) {
  // --wait-min 0: a build-relevant merge with no deploy times out at once instead of spinning on the stubbed sleep
  const r = spawnSync('/bin/bash', [SRC_IN(root), '--after-merge', '--sha', sha, '--label', 'Quinn: E250 test', '--wait-min', '0', ...extra], {
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
    afterMerge: rows.filter((l) => l.split('|')[2]?.trim() === 'after-merge'),
    incidents: existsSync(incDir) ? readdirSync(incDir) : [],
    vercel: read('vercel.calls'),
    php: read('php.calls'),
  };
}
const SRC_IN = (r: string) => join(r, 'scripts/agents/deploy-verify.sh');

describe('deploy-verify.sh --after-merge on a paper-only merge (E250)', () => {
  it('10-19 #340 shape: no deploy for a paper sha → PAPER PASS against production as served, exit 0, not TIMEOUT (fails pre-fix)', () => {
    const r = run(PAPER);
    expect(r.code).toBe(0);
    expect(r.afterMerge).toHaveLength(1);
    const row = r.afterMerge[0];
    expect(row).toContain(`| ${PAPER.slice(0, 7)} |`);
    expect(row).toContain('| https://prod-p |');
    expect(row).toContain('| PAPER PASS |');
    expect(row).toContain('paper-only merge (no build-relevant paths); production https://prod-p checked');
    expect(row).not.toContain('TIMEOUT');
    expect(r.incidents).toHaveLength(0);
  });

  it('a failing production on a paper merge → PAPER FAIL, exit 1, NEVER a rollback / functions.php push / incident (fails pre-fix)', () => {
    writeFileSync(join(root, 'smoke.json'), JSON.stringify({ failed: [{ path: '/', failures: ['no .mv-ads'] }], network: { degraded: false } }));
    exe(join(root, 'scripts/agents/check-blog-sidebar.sh'), 'echo "  [FAIL] mhm_inject_mediavine_sidebar missing"; exit 1');
    const r = run(PAPER);
    expect(r.code).toBe(1);
    expect(r.afterMerge[0]).toContain('| PAPER FAIL |');
    expect(r.afterMerge[0]).toContain('not rolled back');
    expect(r.vercel).not.toMatch(/^(rollback|promote)/m);
    expect(r.php).toBe('');
    expect(r.incidents).toHaveLength(0);
  });

  it('a degraded network control on a paper merge → PAPER INCONCLUSIVE (network), exit 0, nothing touched', () => {
    writeFileSync(join(root, 'smoke.json'), JSON.stringify({ failed: [], network: { degraded: true, before: { why: 'slow' } } }));
    const r = run(PAPER);
    expect(r.code).toBe(0);
    expect(r.afterMerge[0]).toContain('| PAPER INCONCLUSIVE (network) |');
    expect(r.vercel).not.toMatch(/^(rollback|promote)/m);
  });

  it('control: a build-relevant merge keeps the existing behaviour (waits, TIMEOUT when no deploy appears)', () => {
    const r = run(BUILD);
    expect(r.code).toBe(2);
    expect(r.afterMerge[0]).toContain('| TIMEOUT |');
    expect(r.afterMerge[0]).not.toContain('PAPER');
  });

  it('--no-paper forces the build wait even for a paper merge', () => {
    const r = run(PAPER, ['--no-paper']);
    expect(r.code).toBe(2);
    expect(r.afterMerge[0]).toContain('| TIMEOUT |');
  });
});

describe('is_paper_path() / paper_merge(): allowlist classifier, unknown = build (fail closed)', () => {
  const fn = (name: string) => raw.match(new RegExp(`^${name}\\(\\) \\{.*\\n[\\s\\S]*?\\n\\}\\n`, 'm'))?.[0] ?? '';
  const classify = (path: string) =>
    spawnSync('/bin/bash', ['-c', `${fn('is_paper_path')}\nis_paper_path "$1"; rc=$?; case $rc in 0) echo paper ;; 1) echo build ;; *) echo "rc=$rc" ;; esac`, '_', path], { encoding: 'utf8' }).stdout.trim();
  const pm = (sha: string) =>
    spawnSync('/bin/bash', ['-c', `ROOT="${root}"\n${fn('is_paper_path')}\n${fn('paper_merge')}\npaper_merge "$1"; echo "RC=$?"`, '_', sha], { encoding: 'utf8' }).stdout.trim();

  it('extracted the real functions (vacuity guard)', () => {
    expect(fn('is_paper_path')).toContain('case');
    expect(fn('paper_merge')).toContain('git diff');
  });

  it.each([
    ['reports/funnel/x.md', 'paper'],
    ['reports/funnel/2026-10-20.json', 'paper'],
    ['.claude/agents/mhm-funnel/experiments.md', 'paper'],
    ['.claude/agents/mhm-funnel/targets.json', 'paper'],
    ['docs/COMPOUND_LEARNINGS.md', 'paper'],
    ['logs/funnel-daily.log', 'paper'],
    ['CLAUDE.md', 'paper'],
    ['scripts/agents/foo.ts', 'build'], // type-checked by Vercel (tsconfig **/*.ts)
    ['scripts/agents/run-funnel-daily.sh', 'build'],
    ['scripts/agents/README.md', 'build'], // scripts/ is build as a whole — fail closed
    ['app/page.tsx', 'build'],
    ['app/notes.md', 'build'],
    ['components/Hero.tsx', 'build'],
    ['lib/prisma.ts', 'build'],
    ['middleware.ts', 'build'],
    ['next.config.js', 'build'],
    ['package.json', 'build'],
    ['package-lock.json', 'build'],
    ['prisma/schema.prisma', 'build'],
    ['public/llms.txt', 'build'],
    ['public/readme.md', 'build'], // served as a static file
    ['tsconfig.json', 'build'],
    ['vercel.json', 'build'],
    ['tailwind.config.js', 'build'],
    ['.claude/hooks/x.ts', 'build'], // any .ts anywhere is type-checked
    ['docs/sdk/sample.js', 'build'], // code-shaped = build
    ['.gitignore', 'build'], // unknown root file = build
    ['tasks/todo.txt', 'build'], // unknown dir = build
    ['', 'build'],
  ])('%s → %s', (path, want) => expect(classify(path)).toBe(want));

  it('every file next.config.js traces into the output (outputFileTracingIncludes) is build-relevant', () => {
    const cfg = readFileSync(join(process.cwd(), 'next.config.js'), 'utf8');
    const block = cfg.match(/outputFileTracingIncludes\s*:\s*\{([\s\S]*?)\}/)?.[1] ?? '';
    const traced = Array.from(block.matchAll(/'\.\/([^'*]+)'/g)).map((m) => m[1]);
    expect(traced.length).toBeGreaterThan(0); // vacuity guard
    for (const t of traced) expect(classify(t), t).toBe('build');
  });

  it('every repo path an app/lib/components module names as a string literal under reports/, docs/ or .claude/ is build-relevant', () => {
    const files = execFileSync('git', ['ls-files', 'app', 'lib', 'components', 'middleware.ts'], { cwd: process.cwd(), encoding: 'utf8' })
      .split('\n').filter((f) => /\.(ts|tsx)$/.test(f));
    expect(files.length).toBeGreaterThan(50); // vacuity guard
    const named = new Set<string>();
    for (const f of files) {
      const src = readFileSync(join(process.cwd(), f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
        .replace(/>[^<{]*</g, '><'); // JSX text (e.g. <code>reports/…</code> prose) is not a file read
      // logs/ is gitignored (.gitignore `logs`), so it can never appear in a merge diff — only tracked paper dirs here
      for (const m of Array.from(src.matchAll(/['"`](?:\.\/)?((?:reports|docs|\.claude)\/[^'"`$\s]+\.[a-z]+)['"`]/g))) named.add(m[1]);
    }
    for (const p of Array.from(named)) expect(classify(p), p).toBe('build');
    expect(named.has('reports/funnel/newsletter-sends.jsonl')).toBe(true); // the scan reaches the one we know of
  });

  it('paper commit → 0; mixed commit → 1; unknown commit → 1; empty sha → 1', () => {
    expect(pm(PAPER)).toBe('RC=0');
    expect(pm(BUILD)).toBe('RC=1');
    expect(pm('f'.repeat(40))).toBe('RC=1');
    expect(pm('')).toBe('RC=1');
  });

  it('a commit with no changed files (empty set) → build (fail closed)', () => {
    git('commit', '-q', '--allow-empty', '-m', 'empty');
    expect(pm(git('rev-parse', 'HEAD'))).toBe('RC=1');
  });
});
