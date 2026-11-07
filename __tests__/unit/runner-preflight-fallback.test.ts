import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for run-funnel-daily.sh's `# >>> preflight-fallback` block (E374, 2026-11-07).
 *
 * On 2026-11-03 the preflight on claude-fable-5-1 answered HTTP 429 "You're out of usage credits. Switch to another
 * model …" and the whole morning was MISSED, although claude-opus-5-5 answered every preflight from 11-04 on. QUOTA
 * is the one preflight failure another model can clear, so the runner now retries the preflight on
 * FUNNEL_FALLBACK_MODELS and runs Quinn on the first that answers — and ONLY on QUOTA (an AUTH/HANG/OTHER failure is
 * not model-specific; retrying it would just double the time to the MISSED row).
 *
 * The test extracts the REAL preflight-watch and preflight-fallback blocks and runs them under /bin/bash (3.2, the
 * scheduled task's shell) with a fake `claude` that answers 429 for every model listed in QUOTA_MODELS.
 * RUNNER_UNDER_TEST lets the same cases run against a pre-fix copy (they fail there: no preflight_with_fallback).
 */
const RUNNER = process.env.RUNNER_UNDER_TEST ?? 'scripts/agents/run-funnel-daily.sh';
const DAY = '2026-11-07';
const raw = readFileSync(RUNNER.startsWith('/') ? RUNNER : join(process.cwd(), RUNNER), 'utf8');
const watch = raw.match(/^# >>> preflight-watch\n[\s\S]*?^# <<< preflight-watch\n/m)?.[0] ?? '';
const block = raw.match(/^# >>> preflight-fallback\n[\s\S]*?^# <<< preflight-fallback\n/m)?.[0] ?? '';

const RESULT_1103 =
  "You're out of usage credits. Switch to another model, or manage usage credits at claude.ai/settings/usage?from=cc_cli_limit_message, to continue.";

let base: string;
let bin: string;
let logFile: string;

/** Fake CLI: logs the --model it was given; 429 for models in $QUOTA_MODELS, a 401 for $AUTH_MODELS, else ok. */
function installFakeClaude(): void {
  const p = join(bin, 'claude');
  writeFileSync(
    p,
    [
      '#!/bin/bash',
      'm=""; while [ $# -gt 0 ]; do [ "$1" = --model ] && m="$2"; shift; done',
      `echo "$m" >>"${join(base, 'models.txt')}"`,
      `case " \${QUOTA_MODELS:-} " in *" $m "*) echo '{"type":"result","is_error":true,"api_error_status":429,"result":"${RESULT_1103.replace(/'/g, "'\\''")}"}'; exit 1;; esac`,
      'case " ${AUTH_MODELS:-} " in *" $m "*) echo \'{"type":"result","is_error":true,"result":"Failed to authenticate. API Error: 401 OAuth session expired"}\'; exit 1;; esac',
      'echo \'{"type":"result","is_error":false,"result":"ok"}\'',
    ].join('\n'),
  );
  chmodSync(p, 0o755);
}

function run(model: string, extra: Record<string, string | undefined> = {}) {
  const script = [
    `LOG_FILE="${logFile}"`,
    'log() { echo "[$(date \'+%Y-%m-%d %H:%M:%S\')] $*" >>"$LOG_FILE"; }',
    `PROJECT_DIR="${base}"`,
    `TODAY="${DAY}"`,
    `MODEL="${model}"`,
    'CLAUDE_CLEAN=(env)',
    watch,
    block,
    'preflight_with_fallback; echo "RC $?"',
    'echo "MODEL $MODEL"',
    'echo "TRIED $PREFLIGHT_FALLBACK_TRIED"',
    'echo "LINE $MODEL_FALLBACK_LINE"',
    'echo "DIAG $(preflight_diagnosis)"',
  ].join('\n');
  const env: Record<string, string> = { PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`, HOME: base, FUNNEL_PREFLIGHT_POLL_S: '1' };
  for (const [k, v] of Object.entries(extra)) if (v !== undefined) env[k] = v;
  const r = spawnSync('/bin/bash', ['-uo', 'pipefail', '-c', script], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: env as unknown as NodeJS.ProcessEnv,
    timeout: 30_000,
    killSignal: 'SIGKILL',
  });
  const out = `${r.stdout}${r.stderr}`;
  const field = (k: string) => out.match(new RegExp(`^${k} (.*)$`, 'm'))?.[1] ?? '';
  const models = existsSync(join(base, 'models.txt')) ? readFileSync(join(base, 'models.txt'), 'utf8').trim().split('\n') : [];
  return { out, rc: field('RC'), model: field('MODEL'), tried: field('TRIED'), line: field('LINE'), diag: field('DIAG'), models };
}

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'preflight-fallback-'));
  bin = join(base, 'bin');
  mkdirSync(bin);
  mkdirSync(join(base, 'logs'));
  logFile = join(base, 'run.log');
  installFakeClaude();
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

describe('run-funnel-daily.sh preflight-fallback block (E374)', () => {
  it('exists, is wired at the preflight call site, and its line reaches Quinn\'s prompt', () => {
    expect(watch.length).toBeGreaterThan(500);
    expect(block.length).toBeGreaterThan(500);
    expect(raw).toMatch(/^if ! preflight_with_fallback; then$/m);
    expect(raw).toMatch(/\$AGENT_WT_LINE\$\{MODEL_FALLBACK_LINE:\+\n\n\$MODEL_FALLBACK_LINE\}"/);
    // the block must come after both functions it calls are defined, and before the call site
    const at = (s: string) => raw.indexOf(s);
    expect(at('# >>> preflight-fallback')).toBeGreaterThan(at('preflight_diagnosis() {'));
    expect(at('# >>> preflight-fallback')).toBeLessThan(at('if ! preflight_with_fallback; then'));
  });

  it('healthy primary: one preflight, no fallback, no prompt line', () => {
    const r = run('claude-opus-5-5');
    expect(r.rc).toBe('0');
    expect(r.model).toBe('claude-opus-5-5');
    expect(r.models).toEqual(['claude-opus-5-5']);
    expect(r.line).toBe('');
  });

  it('the 11-03 shape: primary Fable 429 → Quinn runs on Opus, the prompt line re-routes fable specialists', () => {
    const r = run('claude-fable-5-1', { QUOTA_MODELS: 'claude-fable-5-1' });
    expect(r.rc).toBe('0');
    expect(r.model).toBe('claude-opus-5-5');
    expect(r.models).toEqual(['claude-fable-5-1', 'claude-opus-5-5']);
    expect(r.line).toMatch(/^MODEL FALLBACK TODAY \(E374\)/);
    expect(r.line).toContain("give 'fable' to 'opus'");
    expect(existsSync(join(base, 'logs', `funnel-preflight-${DAY}-primary.json`))).toBe(true);
    expect(readFileSync(join(base, 'logs', `funnel-preflight-${DAY}-primary.json`), 'utf8')).toContain('"api_error_status":429');
    expect(readFileSync(logFile, 'utf8')).toMatch(/preflight-fallback: claude-opus-5-5 answered/);
  });

  it('today\'s config (primary Opus) 429 → falls back to Fable, never re-tries the primary', () => {
    const r = run('claude-opus-5-5', { QUOTA_MODELS: 'claude-opus-5-5' });
    expect(r.rc).toBe('0');
    expect(r.model).toBe('claude-fable-5-1');
    expect(r.models).toEqual(['claude-opus-5-5', 'claude-fable-5-1']);
    expect(r.line).toContain("give 'opus' to 'fable'");
  });

  it('every model out of credits → rc 1, MODEL restored to the primary, QUOTA diagnosis, tried list names each', () => {
    const r = run('claude-fable-5-1', { QUOTA_MODELS: 'claude-fable-5-1 claude-opus-5-5' });
    expect(r.rc).toBe('1');
    expect(r.model).toBe('claude-fable-5-1');
    expect(r.tried).toBe('claude-opus-5-5=QUOTA');
    expect(r.diag.split('|')[0]).toBe('QUOTA');
    expect(r.line).toBe('');
  });

  it('a non-QUOTA failure (AUTH) is NOT retried on another model — that would only delay the MISSED row', () => {
    const r = run('claude-fable-5-1', { AUTH_MODELS: 'claude-fable-5-1' });
    expect(r.rc).toBe('1');
    expect(r.models).toEqual(['claude-fable-5-1']);
    expect(r.diag.split('|')[0]).toBe('AUTH');
    expect(r.tried).toBe('');
  });

  it('FUNNEL_FALLBACK_MODELS="" disables the fallback', () => {
    const r = run('claude-fable-5-1', { QUOTA_MODELS: 'claude-fable-5-1', FUNNEL_FALLBACK_MODELS: '' });
    expect(r.rc).toBe('1');
    expect(r.models).toEqual(['claude-fable-5-1']);
    expect(readFileSync(logFile, 'utf8')).toMatch(/FUNNEL_FALLBACK_MODELS is empty/);
  });

  it('a custom list is tried in order and the first that answers wins', () => {
    const r = run('claude-fable-5-1', {
      QUOTA_MODELS: 'claude-fable-5-1 claude-sonnet-5-0',
      FUNNEL_FALLBACK_MODELS: 'claude-sonnet-5-0 claude-opus-5-5',
    });
    expect(r.rc).toBe('0');
    expect(r.model).toBe('claude-opus-5-5');
    expect(r.models).toEqual(['claude-fable-5-1', 'claude-sonnet-5-0', 'claude-opus-5-5']);
  });
});
