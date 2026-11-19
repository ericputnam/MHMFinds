import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * E439 (2026-11-19). deploy-verify's smoke cap counts seconds the host was AWAKE, not wall-clock seconds.
 *
 * 2026-11-17: pmset shows the host asleep for most of 06:47→07:58 (Maintenance / Dark Wake sleep, awake 45–90 s at a
 * time). The #559 verify (row 07:14) and the #560 verify (07:42) both hit "smoke-render timed out after 600s wall
 * clock (killed)". Node timers inside smoke-render stop while the host sleeps, so a wall-clock cap mostly measured the
 * sleep. The kill then discarded every page that had already rendered.
 *
 * The REAL killtree() + capped_wait() are extracted from the script and run under /bin/bash with `date` replaced by
 * a shell function: the real clock plus an offset file. Writing 900 to that file is a simulated 900 s host sleep.
 * The pre-fix capped_wait (wall clock) kills the case-1 job at the jump (red). The fixed one lets it finish.
 */
const raw = readFileSync(join(process.cwd(), 'scripts/agents/deploy-verify.sh'), 'utf8');
const fn = (name: string) => raw.match(new RegExp(`^${name}\\(\\) \\{.*\\n[\\s\\S]*?\\n\\}\\n`, 'm'))?.[0] ?? '';
const real = ['killtree', 'capped_wait'].map(fn).join('\n');

let base: string;
beforeEach(() => { base = mkdtempSync(join(tmpdir(), 'dv-awake-')); writeFileSync(join(base, 'offset'), '0'); });
afterEach(() => { if (base && existsSync(base)) rmSync(base, { recursive: true, force: true }); });

function run(job: string, cap: number) {
  const off = join(base, 'offset');
  const script = [
    `date() { if [ "$1" = "+%s" ]; then echo $(( $(/bin/date +%s) + $(cat "${off}") )); else /bin/date "$@"; fi; }`,
    'log() { echo "LOG $*"; }',
    real,
    `( ${job} ) &`,
    `capped_wait $! ${cap}; echo "RC=$? SLEPT=$SMOKE_SLEPT_S"`,
  ].join('\n');
  const t0 = Date.now();
  const r = spawnSync('/bin/bash', ['-c', script], { encoding: 'utf8', timeout: 60_000 });
  return { out: `${r.stdout}${r.stderr}`, ms: Date.now() - t0 };
}

describe('deploy-verify.sh capped_wait: the smoke cap counts awake seconds (E439)', () => {
  it('extracted the real functions', () => {
    expect(real).toContain('capped_wait() {');
    expect(real).toContain('killtree() {');
  });

  it('11-17 shape: a 900 s host sleep in the middle of a 3 s smoke does not kill it (fails pre-fix: RC=1 at the jump)', () => {
    const r = run(`/bin/sleep 1.5; echo 900 >"${join(base, 'offset')}"; /bin/sleep 1.5`, 5);
    expect(r.out).toMatch(/RC=0 SLEPT=(89\d|90\d)\b/);
    expect(r.out).toMatch(/host was asleep \d+s while smoke-render ran/);
    expect(r.out).not.toMatch(/killing it/);
  }, 60_000);

  it('a smoke that really hangs is still killed at the cap in awake seconds, sleep reported, not counted', () => {
    const r = run(`/bin/sleep 1; echo 900 >"${join(base, 'offset')}"; /bin/sleep 40`, 3);
    expect(r.out).toMatch(/RC=1 SLEPT=(89\d|90\d)\b/);
    expect(r.out).toMatch(/still running after 3s awake \(host asleep \d+s, not counted\) — killing it/);
    expect(r.ms).toBeLessThan(15_000);
  }, 60_000);

  it('control: no sleep, a fast smoke → RC=0 and SLEPT=0', () => {
    const r = run('/bin/sleep 1', 5);
    expect(r.out).toContain('RC=0 SLEPT=0');
  }, 60_000);

  it('the timeout note names awake seconds and the slept figure', () => {
    expect(raw).toContain('smoke-render timed out after ${SMOKE_MAX_S:-600}s awake (killed; host asleep ${SMOKE_SLEPT_S:-0}s more) — pages NOT judged');
  });
});

describe('deploy-verify.sh: every vercel CLI call reads </dev/null (E439: `vercel inspect` hung ~17 min with stdin open on 11-17)', () => {
  // Code lines only; the text of log/ledger/incident messages is removed (it names commands, it does not run them).
  const code = raw.split('\n').filter((l) => !/^\s*#/.test(l)).map((l) => l.replace(/\s#\s.*$/, '').replace(/\b(log|ledger|incident)( "[^"]*")+/g, ''));
  // Every invocation on a line, up to the end of its subshell — a line with two calls is checked twice.
  const calls = code.flatMap((l) => l.match(/\bvercel (ls|inspect|logs|rollback|promote)\b(?! failed)[^)]*/g) ?? []);

  it('finds the call sites (vacuity guard)', () => {
    expect(calls.length).toBeGreaterThanOrEqual(6);
  });

  it('each one redirects stdin from /dev/null', () => {
    const bad = calls.filter((c) => !c.includes('</dev/null'));
    expect(bad).toEqual([]);
  });
});
