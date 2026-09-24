import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for run-funnel-daily.sh's EXIT-trap cleanup() (incident 2026-09-22-0655, E101).
 *
 * On 09-22 cleanup() ran `git worktree remove --force` on every agent worktree while an orphaned
 * deploy-verify was still running inside one; the orphan rolled production back, wrote its incident
 * file into the deleted directory and its ledger rows into three deleted trees.
 *
 * This test does not grep for a fix. It extracts the REAL cleanup() function (plus the
 * `# >>> worktree-reap` block it may depend on) from the runner, points it at a throwaway git repo
 * with two real worktrees, puts real processes inside them, and runs it under /bin/bash (3.2 — the
 * shell the scheduled task uses: `bash /tmp/mhm-run-funnel-daily.sh`). Invariant: a worktree is
 * never deleted while a process still has its cwd inside it, and "could not enumerate" is never
 * treated as "idle".
 */
const RUNNER = 'scripts/agents/run-funnel-daily.sh';
const BASH = '/bin/bash';
const raw = readFileSync(join(process.cwd(), RUNNER), 'utf8');

const cleanupFn = raw.match(/^cleanup\(\) \{\n[\s\S]*?\n\}\n/m)?.[0] ?? '';
const reapBlock = raw.match(/^# >>> worktree-reap[\s\S]*?^# <<< worktree-reap\n/m)?.[0] ?? '';

const hasLsof = spawnSync('sh', ['-c', 'command -v lsof'], { encoding: 'utf8' }).status === 0;

let base: string;
let project: string;
let wt: string;
let wtAgent: string;
const spawned: number[] = [];

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** Start a detached process whose cwd is `cwd` — an orphan from cleanup()'s point of view. */
function startIn(cwd: string, script: string): number {
  const child = spawn('/bin/sh', ['-c', script], { cwd, detached: true, stdio: 'ignore' });
  child.unref();
  spawned.push(child.pid!);
  return child.pid!;
}

function runCleanup(env: Record<string, string>): { out: string; ms: number } {
  const script = `log() { echo "LOG $*"; }\n${reapBlock}\n${cleanupFn}\ncleanup\n`;
  const t0 = Date.now();
  const r = spawnSync(BASH, ['-uo', 'pipefail', '-c', script], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: {
      PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
      HOME: base,
      PROJECT_DIR: project,
      WT: wt,
      REAP_POLL_S: '1',
      ...env,
    } as unknown as NodeJS.ProcessEnv,
    timeout: 60_000,
  });
  return { out: `${r.stdout}${r.stderr}`, ms: Date.now() - t0 };
}

async function waitFor(cond: () => boolean, ms: number): Promise<boolean> {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (cond()) return true;
    await new Promise((r) => setTimeout(r, 100));
  }
  return cond();
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'reap-')); // NOT realpath'd: macOS /var -> /private/var exercises canonicalization
  project = join(base, 'repo');
  wt = join(base, 'funnel-2099-01-01-1');
  wtAgent = `${wt}-pip`;
  const git = (...a: string[]) => execFileSync('git', a, { cwd: project, stdio: 'ignore' });
  execFileSync('git', ['init', '-q', project], { stdio: 'ignore' });
  writeFileSync(join(project, 'f'), 'x');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'add', 'f');
  git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'init');
  git('worktree', 'add', '-q', '--detach', wt);
  git('worktree', 'add', '-q', '--detach', wtAgent);
});

afterEach(() => {
  for (const pid of spawned.splice(0)) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch {
      /* gone */
    }
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* gone */
    }
  }
  rmSync(base, { recursive: true, force: true });
});

describe.skipIf(!hasLsof)('run-funnel-daily.sh cleanup() never deletes a worktree under a live process', () => {
  it('extracts a cleanup() function from the runner (vacuity guard)', () => {
    expect(cleanupFn).toContain('cleanup() {');
  });

  it('idle trees are removed promptly (non-regression)', () => {
    const { ms } = runCleanup({});
    expect(existsSync(wt)).toBe(false);
    expect(existsSync(wtAgent)).toBe(false);
    expect(ms).toBeLessThan(15_000);
  });

  it('waits for a still-running child (the 09-22 orphan) to finish before removing its tree', async () => {
    const result = join(base, 'orphan-result');
    // Mirrors the orphan: works for a few seconds, then writes into its own (worktree) cwd.
    startIn(wtAgent, `sleep 3; if echo x > ./incident.md 2>/dev/null; then echo wrote > '${result}'; else echo cwd-deleted > '${result}'; fi`);
    await waitFor(() => false, 300); // let the child reach its cwd
    runCleanup({ FUNNEL_CLEANUP_WAIT_S: '30', FUNNEL_CLEANUP_TERM_GRACE_S: '5' });
    await waitFor(() => existsSync(result), 8_000);
    expect(readFileSync(result, 'utf8').trim()).toBe('wrote');
    expect(existsSync(wtAgent)).toBe(false);
    expect(existsSync(wt)).toBe(false);
  });

  it('past the ceiling it SIGTERMs the stragglers, then removes the trees', async () => {
    const pid = startIn(wtAgent, 'exec sleep 600');
    await waitFor(() => false, 300);
    const { out, ms } = runCleanup({ FUNNEL_CLEANUP_WAIT_S: '2', FUNNEL_CLEANUP_TERM_GRACE_S: '5' });
    expect(await waitFor(() => !alive(pid), 3_000)).toBe(true);
    expect(existsSync(wtAgent)).toBe(false);
    expect(out).toMatch(/cleanup: reaped 2 worktree\(s\), left 0 in place/);
    expect(ms).toBeLessThan(30_000);
  });

  it('a process that survives SIGTERM keeps its tree (left in place); idle trees still go', async () => {
    const pid = startIn(wtAgent, `trap '' TERM; while :; do sleep 1; done`);
    await waitFor(() => false, 300);
    const { out } = runCleanup({ FUNNEL_CLEANUP_WAIT_S: '1', FUNNEL_CLEANUP_TERM_GRACE_S: '2' });
    expect(alive(pid)).toBe(true);
    expect(existsSync(wtAgent)).toBe(true);
    expect(existsSync(wt)).toBe(false);
    expect(out).toMatch(/left in place .*-pip/);
  });

  it('could-not-enumerate (lsof unavailable) is unknown, never idle: nothing is removed', () => {
    const { out } = runCleanup({ REAP_LSOF: '/usr/bin/false' });
    expect(existsSync(wt)).toBe(true);
    expect(existsSync(wtAgent)).toBe(true);
    expect(out).toMatch(/could not enumerate/);
  });
});
