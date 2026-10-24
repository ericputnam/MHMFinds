import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * E271 (2026-10-24): the day's scoreboard / guardrail / operator-did files reached main only through Quinn's
 * step 8 `git add`; a run that died before step 8 stranded them (landed by hand on 10-23). The runner now lands
 * them itself via scripts/agents/artifacts-land.sh, BEFORE the Quinn invocation.
 *
 * Red on pre-fix origin/main (2c7290e / 69420f1): "runner calls artifacts-land.sh after the scoreboard/guardrail/
 * operator-did steps and before the preflight + Quinn" fails (no call exists — the vacuity guard on the Quinn
 * anchors still passes, so the failure is the missing call, not a parse miss), and every artifacts-land.sh case
 * fails (the script did not exist).
 */
const ROOT = process.cwd();
const RUNNER = join(ROOT, 'scripts/agents/run-funnel-daily.sh');
const SCRIPT = join(ROOT, 'scripts/agents/artifacts-land.sh');
const DV = join(ROOT, 'scripts/agents/deploy-verify.sh');
const MG = join(ROOT, 'scripts/agents/merge-gate.sh');

/** Runner source with full-line comments removed — comments quote the anchors they describe. */
function runnerCode(): string[] {
  return readFileSync(RUNNER, 'utf8').split('\n').map((l) => (/^\s*#/.test(l) ? '' : l));
}
function firstLine(lines: string[], re: RegExp): number {
  return lines.findIndex((l) => re.test(l));
}

describe('run-funnel-daily.sh wiring (E271)', () => {
  it('runner calls artifacts-land.sh after the scoreboard/guardrail/operator-did steps and before the preflight + Quinn', () => {
    const L = runnerCode();
    const quinn = firstLine(L, /claude -p "\$\(cat "\$PROMPT_FILE"\)/);
    const preflight = firstLine(L, /^if ! claude_preflight; then/);
    const scoreboard = firstLine(L, /npx tsx scripts\/agents\/funnel-scoreboard\.ts/);
    const guardrail = firstLine(L, /npx tsx scripts\/agents\/revenue-guardrail\.ts/);
    const operatorDid = firstLine(L, /npx tsx scripts\/agents\/operator-did-probe\.ts/);
    const dryRunExit = firstLine(L, /FUNNEL_DRY_RUN:-0.*exit 0/);
    // Vacuity guard: every anchor exists, so a renamed anchor fails loudly instead of passing by finding nothing.
    for (const [name, i] of Object.entries({ quinn, preflight, scoreboard, guardrail, operatorDid, dryRunExit })) {
      expect(i, `anchor ${name} not found in run-funnel-daily.sh`).toBeGreaterThan(0);
    }
    const assign = firstLine(L, /^AL="\$WT\/scripts\/agents\/artifacts-land\.sh"/);
    const call = firstLine(L, /"\$AL" --date "\$TODAY" --src-dir "\$WT\/reports\/funnel"/);
    expect(assign, 'artifacts-land.sh is not assigned in the runner').toBeGreaterThan(0);
    expect(call, 'artifacts-land.sh is never invoked by the runner').toBeGreaterThan(assign);
    expect(call).toBeGreaterThan(scoreboard);
    expect(call).toBeGreaterThan(guardrail);
    expect(call).toBeGreaterThan(operatorDid);
    expect(call).toBeGreaterThan(dryRunExit); // a dry run never pushes to main
    expect(call).toBeLessThan(preflight);
    expect(call).toBeLessThan(quinn);
  });

  it('every artifact name is PAPER under deploy-verify is_paper_path(); history.json stays build and is not in the allowlist', () => {
    const dv = readFileSync(DV, 'utf8');
    const fn = dv.match(/^is_paper_path\(\) \{[\s\S]*?^\}/m)?.[0];
    expect(fn, 'is_paper_path() not found in deploy-verify.sh').toBeTruthy();
    const d = '2026-10-25';
    const names = [`${d}.md`, `${d}.json`, `guardrail-${d}.md`, `guardrail-${d}.json`, `operator-did-${d}.md`, `operator-did-${d}.json`];
    const grade = (p: string) => spawnSync('bash', ['-c', `${fn}\nis_paper_path "$1"`, '_', p]).status;
    for (const n of names) expect(grade(`reports/funnel/${n}`), n).toBe(0);
    expect(grade('reports/funnel/history.json')).toBe(1);
    const src = readFileSync(SCRIPT, 'utf8');
    const allow = src.match(/^NAMES="([^"]+)"/m)?.[1] ?? '';
    expect(allow.split(' ').length).toBe(6);
    expect(allow).not.toMatch(/history|\.env|\//);
  });
});

const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();
const D = '2026-10-25';
const ARTS = [`${D}.md`, `${D}.json`, `guardrail-${D}.md`, `guardrail-${D}.json`, `operator-did-${D}.md`, `operator-did-${D}.json`];

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'artifacts-land-'));
  const remote = join(dir, 'remote.git');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote]);
  const clone = join(dir, 'clone');
  execFileSync('git', ['clone', '-q', remote, clone]);
  git(clone, 'config', 'user.email', 't@t'); git(clone, 'config', 'user.name', 't');
  mkdirSync(join(clone, 'scripts/agents'), { recursive: true });
  copyFileSync(SCRIPT, join(clone, 'scripts/agents/artifacts-land.sh'));
  copyFileSync(MG, join(clone, 'scripts/agents/merge-gate.sh'));
  writeFileSync(join(clone, 'README'), 'x\n');
  git(clone, 'add', '.'); git(clone, 'commit', '-q', '-m', 'init'); git(clone, 'push', '-q', 'origin', 'HEAD:main');
  const src = join(dir, 'src');
  mkdirSync(src);
  for (const a of ARTS) writeFileSync(join(src, a), `${a}\n`);
  writeFileSync(join(src, 'history.json'), '{"days":[]}\n'); // present in the source dir, must never be committed
  writeFileSync(join(src, '.env.local'), 'NOT_A_REAL_VALUE=1\n');
  const run = (...a: string[]) =>
    spawnSync('bash', [join(clone, 'scripts/agents/artifacts-land.sh'), '--date', D, '--src-dir', src, ...a], { cwd: clone, encoding: 'utf8' });
  const head = () => execFileSync('git', ['--git-dir', remote, 'rev-parse', 'main'], { encoding: 'utf8' }).trim();
  const files = (rev = 'main') =>
    execFileSync('git', ['--git-dir', remote, 'diff-tree', '--no-commit-id', '--name-only', '-r', rev], { encoding: 'utf8' }).trim().split('\n');
  return { dir, remote, clone, src, run, head, files };
}

describe('artifacts-land.sh (E271)', () => {
  it('lands exactly the six allowlisted files as a ledger-only commit, then is idempotent (no empty commit)', () => {
    const t = setup();
    const r1 = t.run();
    expect(r1.status, r1.stdout).toBe(0);
    expect(r1.stdout).toMatch(/pushed [0-9a-f]{7} to main/);
    expect(t.files().sort()).toEqual(ARTS.map((a) => `reports/funnel/${a}`).sort());
    const subj = execFileSync('git', ['--git-dir', t.remote, 'log', '-1', '--format=%s', 'main'], { encoding: 'utf8' }).trim();
    expect(subj).toBe(`funnel(ledger): artifacts ${D} scoreboard/guardrail/operator-did (Tier 0, paper)`);
    expect(subj).not.toMatch(/daily run/); // must never satisfy daily_pr_ledger's matcher
    // merge-gate's own is_ledger_only_commit() exempts it (no 240 s hold on the team's first merge).
    const mg = readFileSync(MG, 'utf8').match(/^is_ledger_only_commit\(\) \{[\s\S]*?^\}/m)?.[0];
    expect(mg).toBeTruthy();
    git(t.clone, 'fetch', '-q', 'origin', 'main');
    const exempt = spawnSync('bash', ['-c', `ROOT="$1"\n${mg}\nis_ledger_only_commit FETCH_HEAD`, '_', t.clone]);
    expect(exempt.status).toBe(0);

    const before = t.head();
    const r2 = t.run();
    expect(r2.status).toBe(0);
    expect(r2.stdout).toMatch(/already identical on main — nothing to do/);
    expect(t.head()).toBe(before);

    writeFileSync(join(t.src, `${D}.md`), 'regenerated\n');
    const r3 = t.run();
    expect(r3.status).toBe(0);
    expect(t.head()).not.toBe(before);
    expect(t.files()).toEqual([`reports/funnel/${D}.md`]);
  });

  it('skips missing files, refuses a symlink, and exits 0 with nothing to land when no artifact exists', () => {
    const t = setup();
    execFileSync('rm', [join(t.src, `operator-did-${D}.md`), join(t.src, `guardrail-${D}.json`)]);
    execFileSync('rm', [join(t.src, `${D}.json`)]);
    symlinkSync(join(t.src, 'history.json'), join(t.src, `${D}.json`));
    const r = t.run();
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(new RegExp(`${D}\\.json is a symlink — refused`));
    expect(r.stdout).toMatch(new RegExp(`operator-did-${D}\\.md missing or empty — skipped`));
    expect(t.files().sort()).toEqual([`reports/funnel/${D}.md`, `reports/funnel/guardrail-${D}.md`, `reports/funnel/operator-did-${D}.json`]);

    const empty = mkdtempSync(join(tmpdir(), 'artifacts-empty-'));
    const r2 = spawnSync('bash', [join(t.clone, 'scripts/agents/artifacts-land.sh'), '--date', D, '--src-dir', empty], { cwd: t.clone, encoding: 'utf8' });
    expect(r2.status).toBe(0);
    expect(r2.stdout).toMatch(/nothing to land/);
  });

  it('HELD (exit 2, nothing pushed) under an open daily branch; bad date is exit 64', () => {
    const t = setup();
    const before = t.head();
    git(t.clone, 'push', '-q', 'origin', `HEAD:refs/heads/funnel/quinn/daily-${D}`);
    const r = t.run();
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/HELD/);
    expect(t.head()).toBe(before);
    const bad = spawnSync('bash', [join(t.clone, 'scripts/agents/artifacts-land.sh'), '--date', '../x', '--src-dir', t.src], { cwd: t.clone, encoding: 'utf8' });
    expect(bad.status).toBe(64);
  });
});
