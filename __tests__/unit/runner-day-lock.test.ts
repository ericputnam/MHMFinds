import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for run-funnel-daily.sh's `# >>> day-lock` block (E176, 2026-10-07).
 *
 * On 2026-10-07 the runner started twice for one day (pids 78149 at 06:52:52 and 80394 at 06:55:00): the Claude app
 * resumed the 10-05 scheduled session after a two-day sleep and then also spawned the 10-07 catch-up. Both wrote a
 * scoreboard and a guardrail; the second launched a duplicate Quinn that had to be SIGTERMed. The runner had no
 * per-day lock.
 *
 * This test extracts the REAL block from the runner and runs it under /bin/bash (3.2, the scheduled task's shell)
 * against a throwaway lock directory. The block is followed by a stand-in for "the rest of the run" that touches a
 * worktree and writes a digest, so a duplicate that does not stop is visible. Invariants: a second start on the same
 * day exits 0 with a DUPLICATE RUN line and touches nothing; a lock whose holder is dead (or that never got a pid) is
 * broken with a log line; the holder's EXIT releases it; nobody releases a lock they do not hold.
 */
const RUNNER = process.env.RUNNER_UNDER_TEST ?? 'scripts/agents/run-funnel-daily.sh';
const BASH = '/bin/bash';
const DAY = '2026-10-07';
const raw = readFileSync(RUNNER.startsWith('/') ? RUNNER : join(process.cwd(), RUNNER), 'utf8');
const block = raw.match(/^# >>> day-lock\n[\s\S]*?^# <<< day-lock\n/m)?.[0] ?? '';

let base: string;
let lockDir: string;
const spawned: number[] = [];

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** The block, then a stand-in for the rest of the runner: touch a worktree, write a digest, mark it got through. */
function script(tail = ''): string {
  return [
    'log() { echo "LOG $*"; }',
    `PROJECT_DIR="${base}"`,
    `TODAY="${DAY}"`,
    block,
    `mkdir -p "${base}/wt-$$" && echo "digest from $$" > "${base}/digest-$$.md"`,
    'echo "GOT-THROUGH $$"',
    tail,
  ].join('\n');
}

function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    PATH: process.env.PATH ?? '/usr/bin:/bin:/usr/sbin:/sbin',
    HOME: base,
    FUNNEL_DAY_LOCK_DIR: base,
    FUNNEL_RUN_LOCK_WAIT_S: '2',
    FUNNEL_RUN_LOCK_POLL_S: '1',
    ...extra,
  } as unknown as NodeJS.ProcessEnv;
}

function run(extra: Record<string, string> = {}, tail = ''): { out: string; rc: number | null } {
  const r = spawnSync(BASH, ['-uo', 'pipefail', '-c', script(tail)], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: env(extra),
    timeout: 30_000,
  });
  return { out: `${r.stdout}${r.stderr}`, rc: r.status };
}

/** Start a long-lived holder (the first runner of the day) and wait until it has written its pid. */
async function startHolder(tail = 'sleep 30'): Promise<number> {
  const child = spawn(BASH, ['-uo', 'pipefail', '-c', script(tail)], {
    cwd: tmpdir(),
    env: env(),
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  spawned.push(child.pid!);
  const pidFile = join(lockDir, 'pid');
  for (let i = 0; i < 100; i++) {
    if (existsSync(pidFile) && readFileSync(pidFile, 'utf8').trim() === String(child.pid)) return child.pid!;
    await new Promise((r) => setTimeout(r, 50));
  }
  throw new Error('holder never wrote its pid');
}

function runLock(): string {
  return join(base, 'funnel-run.lock');
}

/** The same block for another calendar day (the day-lock cannot see a runner for a different day). */
function runDay(day: string, extra: Record<string, string> = {}): { out: string; rc: number | null } {
  const r = spawnSync(BASH, ['-uo', 'pipefail', '-c', script().replace(`TODAY="${DAY}"`, `TODAY="${day}"`)], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: env(extra),
    timeout: 30_000,
  });
  return { out: `${r.stdout}${r.stderr}`, rc: r.status };
}

function deadPid(): number {
  const r = spawnSync('/bin/sh', ['-c', 'echo $$'], { encoding: 'utf8' });
  const pid = Number(r.stdout.trim());
  expect(alive(pid)).toBe(false);
  return pid;
}

function worktreesAndDigests(): string[] {
  return spawnSync('/bin/ls', [base], { encoding: 'utf8' })
    .stdout.split('\n')
    .filter((f) => f.startsWith('wt-') || f.startsWith('digest-'));
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'day-lock-'));
  lockDir = join(base, `funnel-run-${DAY}.lock`);
});

afterEach(() => {
  for (const pid of spawned.splice(0)) {
    try {
      process.kill(pid, 'SIGKILL');
    } catch {
      /* already gone */
    }
  }
  rmSync(base, { recursive: true, force: true });
});

describe('run-funnel-daily.sh day-lock (E176)', () => {
  it('the block exists and is wired before anything touches a worktree', () => {
    expect(block.length).toBeGreaterThan(200);
    const at = raw.indexOf('# >>> day-lock');
    for (const later of ['reap_worktrees 0 -1', 'git worktree add', 'npm ci', 'Running Quinn']) {
      const i = raw.indexOf(later);
      if (i >= 0) expect(at, `day-lock must precede "${later}"`).toBeLessThan(i);
    }
    // The cleanup trap set once worktrees exist must still release the lock, after reaping.
    expect(raw).toMatch(/^trap 'cleanup; day_lock_release; run_lock_release' EXIT/m);
    expect(raw).not.toMatch(/^trap cleanup EXIT\s*$/m);
  });

  it('first start of the day takes the lock and its EXIT releases it', () => {
    const r = run();
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(new RegExp(`day-lock: pid \\d+ owns ${DAY}`));
    expect(r.out).toContain('GOT-THROUGH');
    expect(r.out).toMatch(new RegExp(`day-lock: pid \\d+ released ${DAY}`));
    expect(existsSync(lockDir)).toBe(false);
    // ...so a deliberate later re-run the same day is not a duplicate.
    const again = run();
    expect(again.out).toContain('GOT-THROUGH');
    expect(again.out).not.toContain('DUPLICATE RUN');
  });

  it('a second start on the same day exits 0 with DUPLICATE RUN and touches nothing', async () => {
    const holder = await startHolder();
    const before = worktreesAndDigests();
    const r = run();
    expect(r.rc).toBe(0);
    expect(r.out).toContain(`DUPLICATE RUN — pid ${holder} owns ${DAY}, exiting 0`);
    expect(r.out).not.toContain('GOT-THROUGH');
    expect(worktreesAndDigests()).toEqual(before); // no worktree, no digest from the duplicate
    // The duplicate's exit must not release the holder's lock.
    expect(readFileSync(join(lockDir, 'pid'), 'utf8').trim()).toBe(String(holder));
    expect(alive(holder)).toBe(true);
  });

  it('a lock whose holder pid is dead is broken with a log line, then taken', () => {
    const dead = deadPid();
    mkdirSync(lockDir);
    writeFileSync(join(lockDir, 'pid'), `${dead}\n`);
    const r = run();
    expect(r.rc).toBe(0);
    expect(r.out).toContain(`day-lock: stale lock for ${DAY} — holder pid ${dead} is dead, breaking it`);
    expect(r.out).toMatch(new RegExp(`day-lock: pid \\d+ owns ${DAY}`));
    expect(r.out).toContain('GOT-THROUGH');
    expect(existsSync(lockDir)).toBe(false);
  });

  it('a fresh lock with no pid yet is a duplicate (holder between mkdir and write), an old one is broken', () => {
    mkdirSync(lockDir);
    const fresh = run();
    expect(fresh.rc).toBe(0);
    expect(fresh.out).toContain('DUPLICATE RUN — pid ? owns');
    expect(fresh.out).not.toContain('GOT-THROUGH');
    expect(existsSync(lockDir)).toBe(true);

    const old = (Date.now() - 3600_000) / 1000;
    utimesSync(lockDir, old, old);
    const stale = run();
    expect(stale.out).toMatch(/day-lock: stale lock for 2026-10-07 — no holder pid after \d+s, breaking it/);
    expect(stale.out).toContain('GOT-THROUGH');
  });

  it('a different day has its own day-lock (the global run-lock is what blocks it — see E297 below)', () => {
    mkdirSync(join(base, `funnel-run-${DAY}.lock`));
    writeFileSync(join(base, `funnel-run-${DAY}.lock`, 'pid'), `${process.pid}\n`); // a live day-lock for DAY only
    const r = runDay('2026-10-08');
    expect(r.out).toContain('GOT-THROUGH');
    expect(existsSync(join(base, 'funnel-run-2026-10-08.lock'))).toBe(false);
  });

  it('FUNNEL_ALLOW_SECOND_RUN=1 skips the day-lock with a log line, and a non-holder release is a no-op', async () => {
    const holder = await startHolder();
    // E297: skipping the day-lock does not skip the global run-lock — only FUNNEL_ALLOW_CONCURRENT_RUN does.
    const r = run({ FUNNEL_ALLOW_SECOND_RUN: '1', FUNNEL_ALLOW_CONCURRENT_RUN: '1' }, 'day_lock_release; run_lock_release');
    expect(r.out).toContain('FUNNEL_ALLOW_SECOND_RUN=1');
    expect(r.out).toContain('FUNNEL_ALLOW_CONCURRENT_RUN=1');
    expect(r.out).toContain('GOT-THROUGH');
    expect(readFileSync(join(lockDir, 'pid'), 'utf8').trim()).toBe(String(holder));
    expect(readFileSync(join(runLock(), 'pid'), 'utf8').trim()).toBe(String(holder));
  });
});

/**
 * E297 (2026-10-30): the day-lock is keyed on TODAY, so it never saw the 10-29 catch-up runner (pid 10739, started by
 * hand 10-29 21:40 local) still merging when the scheduled 10-30 runner (pid 28212) started at 07:08 local — two
 * Quinns dispatched specialists at once. A global run-lock now makes a second runner for ANY day wait (bounded),
 * then land a MISSED/DEFERRED row and exit 75 without touching a worktree.
 * Pre-fix (RUNNER_UNDER_TEST=<origin/main copy>): "a runner for another day ... exits 75" is red (it got through).
 */
describe('run-funnel-daily.sh global run-lock (E297)', () => {
  function fakeLedgerCommit(): string {
    const dir = join(base, 'scripts', 'agents');
    mkdirSync(dir, { recursive: true });
    const f = join(dir, 'ledger-commit.sh');
    writeFileSync(f, `#!/bin/sh\nprintf '%s\\n' "$@" >>"${base}/ledger-args"\necho "ledger: landed"\n`);
    chmodSync(f, 0o755);
    return f;
  }

  it('a runner for another day, started while a runner is alive, waits, lands a DEFERRED row and exits 75 untouched', async () => {
    fakeLedgerCommit();
    const holder = await startHolder();
    const before = worktreesAndDigests();
    const r = runDay('2026-10-08');
    expect(r.rc).toBe(75);
    expect(r.out).toContain(`run-lock: another funnel runner is alive (pid ${holder}, day ${DAY}) — waiting up to 2s`);
    expect(r.out).toMatch(new RegExp(`DEFERRED RUN — funnel runner pid ${holder} \\(day ${DAY}\\) still alive after \\d+s`));
    expect(r.out).not.toContain('GOT-THROUGH');
    expect(worktreesAndDigests()).toEqual(before);
    const args = readFileSync(join(base, 'ledger-args'), 'utf8');
    expect(args).toMatch(/^\| 2026-10-08 \d\d:\d\d \| check \| mhm-funnel-daily: MISSED 2026-10-08 — DEFERRED, Quinn did not run: funnel runner pid \d+ \(day 2026-10-07\)/m);
    expect(args).toContain('| MISSED |');
    // its own day-lock is released (a later manual re-run of 10-08 works) and the holder keeps the run-lock
    expect(existsSync(join(base, 'funnel-run-2026-10-08.lock'))).toBe(false);
    expect(readFileSync(join(runLock(), 'pid'), 'utf8').trim()).toBe(String(holder));
    expect(alive(holder)).toBe(true);
  });

  it('waits for a runner that finishes inside the ceiling, then runs', async () => {
    await startHolder('sleep 2');
    const r = runDay('2026-10-08', { FUNNEL_RUN_LOCK_WAIT_S: '20' });
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(/run-lock: waited \d+s for the other runner/);
    expect(r.out).toContain('GOT-THROUGH');
    expect(existsSync(runLock())).toBe(false); // released by its own EXIT
  });

  it('a run-lock whose pid is dead, or recycled by a non-funnel process, is broken', () => {
    mkdirSync(runLock());
    writeFileSync(join(runLock(), 'pid'), `${deadPid()}\n`);
    const a = run();
    expect(a.out).toMatch(/run-lock: stale lock — holder pid \d+ \(day \?\) is dead or recycled, breaking it/);
    expect(a.out).toContain('GOT-THROUGH');

    const other = spawn('/bin/sleep', ['30'], { detached: true, stdio: 'ignore' });
    spawned.push(other.pid!);
    mkdirSync(runLock());
    writeFileSync(join(runLock(), 'pid'), `${other.pid}\n`);
    writeFileSync(join(runLock(), 'day'), '2026-09-01\n');
    const b = run();
    expect(b.out).toContain(`run-lock: stale lock — holder pid ${other.pid} (day 2026-09-01) is dead or recycled, breaking it`);
    expect(b.out).toContain('GOT-THROUGH');
    expect(existsSync(runLock())).toBe(false);
  });

  it('FUNNEL_ALLOW_CONCURRENT_RUN=1 skips the run-lock with a log line', async () => {
    await startHolder();
    const r = runDay('2026-10-08', { FUNNEL_ALLOW_CONCURRENT_RUN: '1' });
    expect(r.out).toContain('FUNNEL_ALLOW_CONCURRENT_RUN=1');
    expect(r.out).toContain('GOT-THROUGH');
  });
});
