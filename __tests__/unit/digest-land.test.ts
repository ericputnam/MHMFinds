import { describe, expect, it } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * E222 (2026-10-16): on 10-15 an accepted digest never reached main (daily PR not pushed). The runner now lands
 * it via scripts/agents/digest-land.sh. Runs the real script against a throwaway bare remote + clone.
 * Red on the pre-fix tree: every case (the script and the runner wiring did not exist).
 */
const SCRIPT = join(process.cwd(), 'scripts/agents/digest-land.sh');
const git = (cwd: string, ...a: string[]) => execFileSync('git', a, { cwd, encoding: 'utf8' }).trim();

function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'digest-land-'));
  const remote = join(dir, 'remote.git');
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote]);
  const clone = join(dir, 'clone');
  execFileSync('git', ['clone', '-q', remote, clone]);
  git(clone, 'config', 'user.email', 't@t'); git(clone, 'config', 'user.name', 't');
  mkdirSync(join(clone, 'scripts/agents'), { recursive: true });
  copyFileSync(SCRIPT, join(clone, 'scripts/agents/digest-land.sh'));
  writeFileSync(join(clone, 'README'), 'x\n');
  git(clone, 'add', '.'); git(clone, 'commit', '-q', '-m', 'init'); git(clone, 'push', '-q', 'origin', 'HEAD:main');
  const digest = join(dir, 'digest-2026-10-15.md');
  writeFileSync(digest, '# MHM funnel — 2026-10-15\n## 1. Status\nok\n');
  const run = (...extra: string[]) => spawnSync('bash', [join(clone, 'scripts/agents/digest-land.sh'), '--date', '2026-10-15', '--file', digest, ...extra], { cwd: clone, encoding: 'utf8' });
  const onMain = () => spawnSync('git', ['--git-dir', remote, 'show', 'main:reports/funnel/digest-2026-10-15.md'], { encoding: 'utf8' });
  return { dir, remote, clone, digest, run, onMain };
}

describe('digest-land.sh (E222)', () => {
  it('lands the accepted digest on main with a funnel(ledger) subject, then is idempotent', () => {
    const t = setup();
    const r1 = t.run();
    expect(r1.status).toBe(0);
    expect(r1.stdout).toMatch(/pushed [0-9a-f]{7}/);
    expect(t.onMain().stdout).toBe(readFileSync(t.digest, 'utf8'));
    const subj = execFileSync('git', ['--git-dir', t.remote, 'log', '-1', '--format=%s', 'main'], { encoding: 'utf8' }).trim();
    expect(subj).toBe('funnel(ledger): digest 2026-10-15 landed by runner (daily PR did not merge)');
    expect(subj).not.toMatch(/daily run 2026-10-15 \(#\d+\)$/); // must never satisfy daily_pr_ledger's matcher
    const before = execFileSync('git', ['--git-dir', t.remote, 'rev-parse', 'main'], { encoding: 'utf8' });
    const r2 = t.run();
    expect(r2.status).toBe(0);
    expect(r2.stdout).toMatch(/already on main — nothing to do/);
    expect(execFileSync('git', ['--git-dir', t.remote, 'rev-parse', 'main'], { encoding: 'utf8' })).toBe(before);
  });

  it('HELD (exit 2, nothing pushed) when a funnel/quinn/daily-DATE branch exists on the remote', () => {
    const t = setup();
    git(t.clone, 'push', '-q', 'origin', 'HEAD:refs/heads/funnel/quinn/daily-2026-10-15');
    const r = t.run();
    expect(r.status).toBe(2);
    expect(r.stdout).toMatch(/HELD/);
    expect(t.onMain().status).not.toBe(0);
  });

  it('refuses a DEGRADED digest (exit 2) and a bad date (exit 64)', () => {
    const t = setup();
    writeFileSync(t.digest, '# Funnel digest — 2026-10-15 (DEGRADED: Quinn did not run)\n');
    expect(t.run().status).toBe(2);
    expect(t.onMain().status).not.toBe(0);
    const bad = spawnSync('bash', [join(t.clone, 'scripts/agents/digest-land.sh'), '--date', '10-15', '--file', t.digest], { cwd: t.clone, encoding: 'utf8' });
    expect(bad.status).toBe(64);
  });

  it('runner wiring: on daily-pr-ledger exit 2 it calls digest-land with the operator digest; Quinn stdout is copied to logs/', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/agents/run-funnel-daily.sh'), 'utf8').replace(/^\s*#.*$/gm, '');
    expect(src).toMatch(/daily_pr_ledger "\$TODAY" "\$WT"; DPL_RC=\$\?/);
    expect(src).toMatch(/if \[ "\$DPL_RC" = 2 \][^\n]*\n\s*"\$WT\/scripts\/agents\/digest-land\.sh" --date "\$TODAY" --file "\$PROJECT_DIR\/reports\/funnel\/digest-\$TODAY\.md"/);
    expect(src).toMatch(/cp "\$WT\/reports\/funnel\/quinn-\$TODAY\.out" "\$PROJECT_DIR\/logs\/funnel-quinn-\$TODAY\.out"/);
  });
});
