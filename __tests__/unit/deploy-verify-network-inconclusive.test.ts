import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for deploy-verify.sh (E111, incident 2026-09-26-064626.md): a smoke that could not run —
 * network control degraded, or only timeouts / unsettled renders that reproduced — must never reach the
 * rollback branch. At 06:58 on 09-26 the log line itself said "smoke INCONCLUSIVE" and the script rolled back
 * anyway (the INCONCLUSIVE came from the blog check; the smoke's timeouts were graded FAIL).
 *
 * This extracts the REAL smoke(), addfail(), smoke_dir(), verdict(), vnotes() and fail_and_fix() from the
 * script, stubs only the boundaries (npx → a fixture JSON, vercel, check-blog-sidebar.sh, ledger/incident/
 * do_rollback → recorders) and runs them under /bin/bash 3.2.
 */
const SCRIPT = 'scripts/agents/deploy-verify.sh';
const raw = readFileSync(join(process.cwd(), SCRIPT), 'utf8');
const fn = (name: string) =>
  raw.match(new RegExp(`^${name}\\(\\) \\{[^\\n]*\\}\\n`, 'm'))?.[0]  // one-liner
  ?? raw.match(new RegExp(`^${name}\\(\\) \\{.*\\n[\\s\\S]*?\\n\\}\\n`, 'm'))?.[0] ?? '';
const real = ['addfail', 'smoke_dir', 'smoke', 'verdict', 'vnotes', 'fail_and_fix'].map(fn).join('\n');

let base: string; let root: string;
beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'dv-net-'));
  root = join(base, 'root');
  mkdirSync(join(root, 'node_modules', 'playwright'), { recursive: true });
  mkdirSync(join(root, 'scripts', 'agents'), { recursive: true });
  mkdirSync(join(root, 'logs'), { recursive: true });
  writeFileSync(join(root, 'scripts', 'agents', 'smoke-render.ts'), '');
  const blog = join(root, 'scripts', 'agents', 'check-blog-sidebar.sh');
  writeFileSync(blog, '#!/bin/sh\nexit 0\n'); chmodSync(blog, 0o755);
});
afterEach(() => { if (base && existsSync(base)) rmSync(base, { recursive: true, force: true }); });

type Fixture = Record<string, unknown>;
/** Runs `smoke`, prints its rc and verdict, then (when asked) runs fail_and_fix like --check does on a failed smoke. */
function run(fixture: Fixture, opts: { thenFailAndFix?: boolean; blogFail?: string } = {}) {
  const fx = join(base, 'fixture.json'); writeFileSync(fx, JSON.stringify(fixture));
  const calls = join(base, 'calls'); writeFileSync(calls, '');
  if (opts.blogFail) { const b = join(root, 'scripts', 'agents', 'check-blog-sidebar.sh'); writeFileSync(b, `#!/bin/sh\necho "  [FAIL] ${opts.blogFail}"\nexit 1\n`); chmodSync(b, 0o755); }
  const script = [
    `ROOT="${root}"; OPERATOR_DIR="${join(base, 'nope')}"; LOG="${join(base, 'dv.log')}"; STAMP=t; MODE=check; LABEL=test; SHA=""; DEPLOY_URL=x; TS=now`,
    'FAILS=""; FIVEXX=0; INCONCLUSIVE=""; NET_DEGRADED=""; SMOKE_JSON="$ROOT/logs/smoke-t.json"; LAST_INCIDENT_FILE=""',
    'log() { echo "LOG $*"; }',
    `npx() { local a; for a in "$@"; do :; done; cp "${fx}" "$a"; return 0; }`,  // last arg is the --json path
    'vercel() { return 1; }',
    `do_rollback() { echo "ROLLBACK $1" >>"${calls}"; return 0; }`,
    `restore_functions_php() { echo "RESTORE_PHP" >>"${calls}"; }`,
    `incident() { echo "INCIDENT $1" >>"${calls}"; }`,
    `ledger() { echo "LEDGER $1 | $2" >>"${calls}"; }`,
    real,
    'smoke; rc=$?; echo "SMOKE_RC=$rc VERDICT=$(verdict) FAILS=$FAILS NET=$NET_DEGRADED"',
    // fail_and_fix exits the shell; run it in a subshell so its exit code is observable.
    opts.thenFailAndFix ? '[ "$rc" -ne 0 ] && { ( fail_and_fix "https://prev" ); echo "FAF_RC=$?"; }' : ':',
  ].join('\n');
  const r = spawnSync('/bin/bash', ['-uo', 'pipefail', '-c', script], { cwd: tmpdir(), encoding: 'utf8', env: { PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: base } as unknown as NodeJS.ProcessEnv, timeout: 30_000 });
  const out = `${r.stdout}${r.stderr}`;
  return { out, calls: readFileSync(calls, 'utf8'), rc: Number(out.match(/SMOKE_RC=(\d+)/)?.[1] ?? -1), verdict: out.match(/VERDICT=(.*?) FAILS=/)?.[1] ?? '', faf: Number(out.match(/FAF_RC=(\d+)/)?.[1] ?? -1) };
}

const degraded = { degraded: true, before: { ok: false, why: 'google=none/8000ms vercel=none/8000ms cloudflare=200/300ms' }, after: { ok: false, why: 'same' } };
const healthy = { degraded: false, before: { ok: true, why: 'ok' }, after: { ok: true, why: 'ok' } };

describe('deploy-verify.sh smoke(): an INCONCLUSIVE smoke never reaches the rollback branch (E111)', () => {
  it('extracted the real functions (vacuity guard)', () => {
    expect(real).toMatch(/npx tsx scripts\/agents\/smoke-render\.ts --json/);
    expect(real).toMatch(/^fail_and_fix\(\) \{/m);
    expect(real).toMatch(/^verdict\(\) \{/m);
  });

  it('09-26 case: control degraded + timeouts → no FAILS, verdict INCONCLUSIVE (network), suspect pages named, no rollback', () => {
    const r = run({ verdict: 'INCONCLUSIVE', network: degraded, failed: [], suspect: [{ path: '/', failures: ['HTTP 500'] }], inconclusive: [{ path: '/go/x', why: 'navigation timeout while the network control was degraded' }], results: [] }, { thenFailAndFix: true });
    expect(r.rc).toBe(0);
    expect(r.verdict).toBe('INCONCLUSIVE (network)');
    expect(r.out).toMatch(/FAILS= NET=1/);
    expect(r.out).toContain('suspect: / -> HTTP 500');
    expect(r.calls).not.toContain('ROLLBACK');
  });

  it('control degraded but the blog check printed a FAIL line → fail_and_fix still refuses: INCONCLUSIVE (network) row, exit 2, nothing rolled back or re-pushed', () => {
    const r = run({ verdict: 'INCONCLUSIVE', network: degraded, failed: [], suspect: [], inconclusive: [], results: [] }, { thenFailAndFix: true, blogFail: 'Missing: mhm_inject_mediavine_sidebar' });
    expect(r.rc).toBe(1);
    expect(r.faf).toBe(2);
    expect(r.calls).toMatch(/LEDGER INCONCLUSIVE \(network\)/);
    expect(r.calls).not.toContain('ROLLBACK');
    expect(r.calls).not.toContain('RESTORE_PHP');
    expect(r.calls).not.toContain('INCIDENT');
  });

  it('control healthy, a page inconclusive (reproduced timeout, direct fetch 200) → verdict INCONCLUSIVE, smoke rc 0, no rollback', () => {
    const r = run({ verdict: 'INCONCLUSIVE', network: healthy, failed: [], suspect: [], inconclusive: [{ path: '/sims-4-cc-finds-2/', why: 'timeout twice, direct fetch HTTP 200 in 23700 ms' }], results: [] }, { thenFailAndFix: true });
    expect(r.rc).toBe(0);
    expect(r.verdict).toBe('INCONCLUSIVE');
    expect(r.calls).not.toContain('ROLLBACK');
  });

  it('control healthy + positive evidence → FAIL still rolls back (the fix did not neuter Rule 1)', () => {
    const r = run({ verdict: 'FAIL', network: healthy, failed: [{ path: '/', failures: ['HTTP 500'] }], suspect: [], inconclusive: [], results: [] }, { thenFailAndFix: true });
    expect(r.rc).toBe(1);
    expect(r.out).toContain('FAILS=smoke-render: / -> HTTP 500');
    expect(r.calls).toContain('ROLLBACK https://prev');
  });

  it('a JSON from an older smoke-render.ts (no network / inconclusive keys) still reads as PASS', () => {
    const r = run({ ok: true, failed: [], results: [] });
    expect(r.rc).toBe(0);
    expect(r.verdict).toBe('PASS');
  });
});

describe('deploy-verify.sh --check: INCONCLUSIVE (network) is a WARN row with exit 2, never an incident', () => {
  const strip = (s: string) => s.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
  const check = strip(raw).slice(strip(raw).indexOf('  check)'), strip(raw).indexOf('  rollback)'));
  it('exits 2 after the ledger row when NET_DEGRADED is set, and 0 otherwise', () => {
    expect(check).toMatch(/ledger "\$\(verdict\)"[\s\S]*\[ -n "\$NET_DEGRADED" \] && exit 2[\s\S]*exit 0/);
    expect(check.indexOf('ledger "$(verdict)"')).toBeLessThan(check.indexOf('&& exit 2'));
  });
  it('fail_and_fix checks NET_DEGRADED before FUNNEL_NO_ROLLBACK and before any do_rollback', () => {
    const faf = strip(fn('fail_and_fix'));
    expect(faf.indexOf('NET_DEGRADED')).toBeGreaterThan(-1);
    expect(faf.indexOf('NET_DEGRADED')).toBeLessThan(faf.indexOf('FUNNEL_NO_ROLLBACK'));
    expect(faf.indexOf('NET_DEGRADED')).toBeLessThan(faf.indexOf('do_rollback'));
  });
});
