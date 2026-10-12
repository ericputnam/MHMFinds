import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for run-funnel-daily.sh's `# >>> preflight-watch` block (E194, 2026-10-12).
 *
 * On 2026-10-08 and 2026-10-10 the Quinn preflight (`perl -e 'alarm 240; exec …' claude -p …`) hung at 0 bytes for
 * ~2.5 days while the host slept and returned only when the operator woke it (both at 10-11 10:55:46). The alarm did
 * not fire across sleep, and the CLI's stderr went untagged into funnel-daily.log, so both days were diagnosed OTHER
 * with no excerpt — a hang with no cause cannot be prevented next time.
 *
 * The test extracts the REAL block and runs it under /bin/bash (3.2, the scheduled task's shell) with a fake
 * `claude` on PATH. Cases: healthy answer; stderr captured to its own file and quoted in the diagnosis; a SIGSTOPped
 * CLI (the alarm is pending and cannot kill it — the 10-08/10-10 shape) killed by the wall-clock watcher and
 * diagnosed HANG; the whole runner suspended mid-preflight (a host sleep) counted as asleep/suspended seconds; a
 * token in stderr redacted. RUNNER_UNDER_TEST lets the same cases run against a pre-fix copy.
 */
const RUNNER = process.env.RUNNER_UNDER_TEST ?? 'scripts/agents/run-funnel-daily.sh';
const BASH = '/bin/bash';
const DAY = '2026-10-12';
const raw = readFileSync(RUNNER.startsWith('/') ? RUNNER : join(process.cwd(), RUNNER), 'utf8');
const block = raw.match(/^# >>> preflight-watch\n[\s\S]*?^# <<< preflight-watch\n/m)?.[0] ?? '';

let base: string;
let bin: string;
let logFile: string;

function fakeClaude(body: string): void {
  const p = join(bin, 'claude');
  writeFileSync(p, `#!/bin/bash\n${body}\n`);
  chmodSync(p, 0o755);
}

/** The block, then a driver: run the preflight, print its rc and the diagnosis. */
function script(): string {
  return [
    `LOG_FILE="${logFile}"`,
    'log() { echo "[$(date \'+%Y-%m-%d %H:%M:%S\')] $*" >>"$LOG_FILE"; }',
    `PROJECT_DIR="${base}"`,
    `TODAY="${DAY}"`,
    'MODEL="test-model"',
    'CLAUDE_CLEAN=(env)',
    block,
    'claude_preflight; echo "PREFLIGHT-RC $?"',
    'echo "DIAG $(preflight_diagnosis)"',
  ].join('\n');
}

function env(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,
    HOME: base,
    FUNNEL_PREFLIGHT_POLL_S: '1',
    ...extra,
  } as unknown as NodeJS.ProcessEnv;
}

function run(extra: Record<string, string> = {}, timeout = 25_000): { out: string; rc: number | null; ms: number } {
  const t0 = Date.now();
  const r = spawnSync(BASH, ['-uo', 'pipefail', '-c', script()], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: env(extra),
    timeout,
    killSignal: 'SIGKILL',
  });
  return { out: `${r.stdout}${r.stderr}`, rc: r.status, ms: Date.now() - t0 };
}

const log = () => (existsSync(logFile) ? readFileSync(logFile, 'utf8') : '');
const errFile = () => join(base, 'logs', `funnel-preflight-${DAY}.stderr`);

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'preflight-watch-'));
  bin = join(base, 'bin');
  mkdirSync(bin);
  mkdirSync(join(base, 'logs'));
  logFile = join(base, 'logs', 'funnel-daily.log');
});

afterEach(() => {
  spawnSync('pkill', ['-KILL', '-f', `${bin}/claude`]);
  rmSync(base, { recursive: true, force: true });
});

describe('run-funnel-daily.sh preflight-watch block (E194)', () => {
  it('exists in the runner and is wired: the runner calls it and has a HANG cause', () => {
    expect(block.length).toBeGreaterThan(500);
    expect(raw).toMatch(/if ! claude_preflight; then/);
    expect(raw).toMatch(/^\s*HANG\)\s+CAUSE=/m);
    expect(block).toMatch(/2>"\$PREFLIGHT_ERR"/);
  });

  it('healthy CLI: passes, logs wall/asleep/hang, writes an (empty) stderr file', () => {
    fakeClaude(`echo '{"type":"result","is_error":false,"result":"ok"}'`);
    const r = run();
    expect(r.out).toContain('PREFLIGHT-RC 0');
    expect(log()).toMatch(/preflight: rc=0 wall=\d+s asleep\/suspended=0s hang=0 stdout=\d+B stderr=0B/);
    expect(existsSync(errFile())).toBe(true);
  });

  it('stderr goes to its own file, not the run log, and is the excerpt when stdout is empty', () => {
    fakeClaude(`echo 'fetch failed: read ECONNRESET at api.anthropic.com' >&2; exit 1`);
    const r = run();
    expect(r.out).toContain('PREFLIGHT-RC 1');
    expect(readFileSync(errFile(), 'utf8')).toContain('ECONNRESET');
    expect(r.out).toMatch(/DIAG OTHER\|stderr: .*ECONNRESET/);
  });

  it('a stopped CLI (alarm pending, cannot fire — the 10-08/10-10 shape) is killed by the wall-clock watcher → HANG', () => {
    fakeClaude(`echo 'about to stop' >&2; kill -STOP $$; echo '{"is_error":false}'`);
    const r = run({ FUNNEL_PREFLIGHT_WALL_S: '3' });
    expect(r.rc).toBe(0); // the driver finished: nothing hung
    expect(r.ms).toBeLessThan(15_000);
    expect(r.out).toMatch(/PREFLIGHT-RC [1-9]/);
    expect(r.out).toMatch(/DIAG HANG\|killed after \d+s wall; stderr: about to stop/);
    expect(log()).toMatch(/preflight: rc=\d+ wall=\d+s asleep\/suspended=0s hang=1/);
    expect(spawnSync('pgrep', ['-f', `${bin}/claude`]).status).toBe(1); // no process left behind
  });

  it('the runner itself suspended mid-preflight (host sleep) is counted as asleep/suspended seconds', async () => {
    fakeClaude(`sleep 3; echo '{"is_error":false}'`);
    const child = spawn(BASH, ['-uo', 'pipefail', '-c', script()], {
      cwd: tmpdir(),
      env: env({ FUNNEL_PREFLIGHT_GAP_S: '2', FUNNEL_PREFLIGHT_WALL_S: '120' }),
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout?.on('data', (d) => (out += d));
    await new Promise((r) => setTimeout(r, 1200));
    process.kill(-child.pid!, 'SIGSTOP'); // the whole process group, like a sleeping host
    await new Promise((r) => setTimeout(r, 5000));
    process.kill(-child.pid!, 'SIGCONT');
    const code = await new Promise<number | null>((res) => child.on('exit', (c) => res(c)));
    expect(code).toBe(0);
    expect(out).toContain('PREFLIGHT-RC 0');
    const m = log().match(/asleep\/suspended=(\d+)s hang=0/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeGreaterThanOrEqual(3);
  }, 30_000);

  it('redacts a token-shaped string in stderr before it reaches the diagnosis', () => {
    const tok = 'sk-ant-oat01-' + 'A'.repeat(40);
    fakeClaude(`echo "bad header ${tok}" >&2; exit 1`);
    const r = run();
    expect(r.out).not.toContain(tok);
    expect(r.out).toContain('<redacted>');
  });

  it('a strict auth error on stderr is AUTH, a mere mention of OAuth on stderr is not', () => {
    fakeClaude(`echo 'API Error: 401 authentication_error' >&2; exit 1`);
    expect(run().out).toMatch(/DIAG AUTH\|/);
    fakeClaude(`echo 'refreshing OAuth session' >&2; exit 1`);
    expect(run().out).toMatch(/DIAG OTHER\|/);
  });
});
