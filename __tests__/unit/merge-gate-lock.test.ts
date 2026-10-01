import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { type ChildProcess, execFileSync, spawn, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for merge-gate.sh's merge lock (E155, 2026-10-01).
 *
 * On 2026-09-30 #229/#228/#227 all passed ONE poll of the age-only gate and merged 06:55:31/33/37, so
 * deploy-verify graded a single head for three PRs. The gate was check-then-act with no lock.
 *
 * This test runs the REAL script under /bin/bash (3.2) inside a throwaway clone of a throwaway bare
 * origin — no network, no real repo. The lock lands in the clone's git common dir, exactly where it
 * lands for sibling agent worktrees in production.
 */
const GATE = join(process.cwd(), 'scripts/agents/merge-gate.sh');
const BASH = '/bin/bash';

let base: string;
let work: string;
let lock: string;

function git(cwd: string, args: string[], env: Record<string, string> = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: 'pipe',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@example.invalid',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@example.invalid',
      ...env,
    },
  });
}

/** Push a commit to origin/main whose committer time is `ageS` seconds ago. */
function commitAged(ageS: number, msg = 'feat: x') {
  const when = `${Math.floor(Date.now() / 1000) - ageS} +0000`;
  writeFileSync(join(work, `f-${Math.random()}.txt`), msg);
  git(work, ['add', '-A']);
  git(work, ['commit', '-q', '-m', msg], { GIT_COMMITTER_DATE: when, GIT_AUTHOR_DATE: when });
  git(work, ['push', '-q', 'origin', 'HEAD:main']);
}

const gateEnv = (who: string): NodeJS.ProcessEnv => ({
  NODE_ENV: 'test',
  PATH: process.env.PATH ?? '/usr/bin:/bin',
  HOME: process.env.HOME ?? tmpdir(),
  MERGE_GATE_WHO: who,
});

function gate(args: string[] = [], who = 'tester') {
  const r = spawnSync(BASH, [join(work, 'scripts/agents/merge-gate.sh'), ...args], {
    cwd: work,
    encoding: 'utf8',
    env: gateEnv(who),
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

function gateAsync(who: string): Promise<{ code: number | null; out: string }> {
  return new Promise((resolve) => {
    const c: ChildProcess = spawn(BASH, [join(work, 'scripts/agents/merge-gate.sh')], { cwd: work, env: gateEnv(who) });
    let out = '';
    c.stdout?.on('data', (d: Buffer) => (out += d.toString()));
    c.stderr?.on('data', (d: Buffer) => (out += d.toString()));
    c.on('close', (code: number | null) => resolve({ code, out }));
  });
}

/** Plant a lock as another agent would have left it. */
function plantLock(o: { pid: number; epoch: number; who?: string }) {
  mkdirSync(lock);
  writeFileSync(
    join(lock, 'owner'),
    [
      'token=planted',
      `who=${o.who ?? 'other-agent'}`,
      `pid=${o.pid}`,
      `host=${execFileSync('hostname', { encoding: 'utf8' }).trim()}`,
      'root=/elsewhere/funnel-x-pip',
      `epoch=${o.epoch}`,
      'since=then',
      '',
    ].join('\n'),
  );
}
const owner = () => readFileSync(join(lock, 'owner'), 'utf8');
const now = () => Math.floor(Date.now() / 1000);

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'merge-gate-'));
  git(base, ['init', '-q', '--bare', '-b', 'main', 'origin.git']);
  work = join(base, 'work');
  git(base, ['clone', '-q', join(base, 'origin.git'), 'work']);
  mkdirSync(join(work, 'scripts/agents'), { recursive: true });
  copyFileSync(GATE, join(work, 'scripts/agents/merge-gate.sh'));
  git(work, ['checkout', '-q', '-b', 'main']);
  commitAged(3600, 'feat: old enough');
  lock = join(work, '.git', 'mhm-merge-gate.lock');
});

afterEach(() => {
  rmSync(base, { recursive: true, force: true });
});

describe('merge-gate.sh lock (E155)', () => {
  it('three gates fired at once: exactly one opens, the others are told who holds the lock', async () => {
    // 09-30 replay — fails on the pre-fix gate (all three exit 0).
    const rs = await Promise.all([gateAsync('pip'), gateAsync('sage'), gateAsync('cass')]);
    const open = rs.filter((r) => r.code === 0);
    const held = rs.filter((r) => r.code === 1);
    expect(open).toHaveLength(1);
    expect(held).toHaveLength(2);
    for (const r of held) expect(r.out).toMatch(/held by (pip|sage|cass) \(pid \d+/);
  });

  it('opens and records the holder (who, shell pid, time) in the shared git common dir', () => {
    // fails pre-fix: no lock dir is ever created
    const r = gate([], 'ops');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/OPEN .*merge lock held by ops/);
    expect(existsSync(lock)).toBe(true);
    expect(owner()).toMatch(/^who=ops$/m);
    expect(owner()).toMatch(new RegExp(`^pid=${process.pid}$`, 'm')); // the caller's shell = this process
  });

  it('a live holder keeps the gate shut even when the age check would open (fails pre-fix)', () => {
    plantLock({ pid: process.pid, epoch: now() - 30, who: 'rio' });
    const r = gate();
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/held by rio \(pid \d+, funnel-x-pip\) since .*frees .* in ≤\d+s/);
    expect(owner()).toMatch(/^who=rio$/m); // not stolen
  });

  it('breaks a lock older than the TTL (≤600 s) and takes it', () => {
    plantLock({ pid: process.pid, epoch: now() - 601 });
    const r = gate([], 'nova');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/broke stale lock .*older than TTL/);
    expect(owner()).toMatch(/^who=nova$/m);
  });

  it('a TTL above 600 s is clamped, so no holder can strand the team for longer', () => {
    plantLock({ pid: process.pid, epoch: now() - 700 });
    expect(gate(['--ttl', '7200'], 'nova').code).toBe(0);
  });

  it('breaks a lock whose holder shell has exited (chain ended, merged or not)', () => {
    const dead = spawnSync('/bin/sh', ['-c', 'echo $$'], { encoding: 'utf8' });
    plantLock({ pid: Number(dead.stdout.trim()), epoch: now() - 5 });
    const r = gate([], 'cass');
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/holder shell pid \d+ has exited/);
  });

  it("frees the lock once the holder's merge lands, and the age gate takes over", () => {
    plantLock({ pid: process.pid, epoch: now() - 20, who: 'pip' });
    commitAged(2, 'feat: pip merged'); // landed after the lock was taken
    const r = gate([], 'sage');
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/merge landed on origin\/main after it was taken/);
    expect(r.out).toMatch(/CLOSED — newest commit .* is \ds old/);
    expect(existsSync(lock)).toBe(false); // a closed gate never keeps the lock
  });

  it('a closed gate releases the lock it took', () => {
    commitAged(10);
    const r = gate();
    expect(r.code).toBe(1);
    expect(existsSync(lock)).toBe(false);
  });

  it('ledger-only commits stay exempt from the age gate', () => {
    mkdirSync(join(work, 'reports/funnel'), { recursive: true });
    writeFileSync(join(work, 'reports/funnel/changelog.md'), 'row\n');
    git(work, ['add', '-A']);
    git(work, ['commit', '-q', '-m', 'funnel(ledger): row']);
    git(work, ['push', '-q', 'origin', 'HEAD:main']);
    expect(gate().code).toBe(0);
  });

  it('--release frees only a lock from the same tree unless --force', () => {
    plantLock({ pid: process.pid, epoch: now() - 5 });
    expect(gate(['--release']).code).toBe(1);
    expect(existsSync(lock)).toBe(true);
    expect(gate(['--release', '--force']).code).toBe(0);
    expect(existsSync(lock)).toBe(false);
  });

  it('cannot read origin/main → exit 2 (could not run) and the lock is not kept', () => {
    git(work, ['remote', 'set-url', 'origin', join(base, 'missing.git')]);
    const r = gate();
    expect(r.code).toBe(2);
    expect(existsSync(lock)).toBe(false);
  });
});
