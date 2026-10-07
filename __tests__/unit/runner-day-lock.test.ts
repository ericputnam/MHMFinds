import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
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
const RUNNER = 'scripts/agents/run-funnel-daily.sh';
const BASH = '/bin/bash';
const DAY = '2026-10-07';
const raw = readFileSync(join(process.cwd(), RUNNER), 'utf8');
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
async function startHolder(): Promise<number> {
  const child = spawn(BASH, ['-uo', 'pipefail', '-c', script('sleep 30')], {
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
    expect(raw).toMatch(/^trap 'cleanup; day_lock_release' EXIT/m);
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

  it('a different day is not blocked by today’s holder', async () => {
    await startHolder();
    const r = spawnSync(BASH, ['-uo', 'pipefail', '-c', script().replace(`TODAY="${DAY}"`, 'TODAY="2026-10-08"')], {
      cwd: tmpdir(),
      encoding: 'utf8',
      env: env(),
      timeout: 30_000,
    });
    expect(`${r.stdout}`).toContain('GOT-THROUGH');
    expect(existsSync(join(base, 'funnel-run-2026-10-08.lock'))).toBe(false);
  });

  it('FUNNEL_ALLOW_SECOND_RUN=1 skips the lock with a log line, and a non-holder release is a no-op', async () => {
    const holder = await startHolder();
    const r = run({ FUNNEL_ALLOW_SECOND_RUN: '1' }, 'day_lock_release');
    expect(r.out).toContain('FUNNEL_ALLOW_SECOND_RUN=1');
    expect(r.out).toContain('GOT-THROUGH');
    expect(readFileSync(join(lockDir, 'pid'), 'utf8').trim()).toBe(String(holder));
  });
});
