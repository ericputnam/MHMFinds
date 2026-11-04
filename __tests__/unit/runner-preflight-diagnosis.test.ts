import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Behavioural guard for `preflight_diagnosis` in run-funnel-daily.sh's `# >>> preflight-watch` block (E331, 2026-11-04).
 *
 * On 2026-11-03 the preflight got HTTP 429 "You're out of usage credits". `claude -p --output-format json` put the
 * cause on stdout as "is_error":true, "api_error_status":429, "result":"…" with 0 B of stderr, and the classifier only
 * read the "error"/"message" keys — so the MISSED row said `preflight=OTHER` · "no excerpt" and the degraded digest
 * told the operator the cause was "neither auth nor version (excerpt: none)" while the file named it.
 *
 * The fixture below is the REAL 11-03 stdout shape (every key, in order), with the session id and uuid replaced by
 * fake values. The test extracts the real block, writes the preflight's stdout/stderr files and calls the function
 * under /bin/bash (3.2, the scheduled task's shell). RUNNER_UNDER_TEST lets the same cases run against a pre-fix copy.
 */
const RUNNER = process.env.RUNNER_UNDER_TEST ?? 'scripts/agents/run-funnel-daily.sh';
const DAY = '2026-11-03';
const raw = readFileSync(RUNNER.startsWith('/') ? RUNNER : join(process.cwd(), RUNNER), 'utf8');
const block = raw.match(/^# >>> preflight-watch\n[\s\S]*?^# <<< preflight-watch\n/m)?.[0] ?? '';

const RESULT_1103 =
  "You're out of usage credits. Switch to another model, or manage usage credits at claude.ai/settings/usage?from=cc_cli_limit_message, to continue.";

function fixture1103(sessionId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'): string {
  return JSON.stringify({
    duration_api_ms: 0,
    stop_reason: 'stop_sequence',
    session_id: sessionId,
    total_cost_usd: 0,
    usage: {
      output_tokens_details: { thinking_tokens: 0 },
      input_tokens: 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
      output_tokens: 0,
      server_tool_use: { web_search_requests: 0, web_fetch_requests: 0 },
      service_tier: 'standard',
      cache_creation: { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 0 },
      inference_geo: '',
      iterations: [],
      speed: 'standard',
    },
    modelUsage: {},
    permission_denials: [],
    terminal_reason: 'api_error',
    fast_mode_state: 'off',
    fast_mode_disabled_reason: 'sdk_opt_in_required',
    subagent_stats: { spawned: 0, completed: 0, failed: 0 },
    is_error: true,
    num_turns: 1,
    subtype: 'success',
    api_error_status: 429,
    result: RESULT_1103,
    type: 'result',
    duration_ms: 665,
    uuid: '11111111-2222-3333-4444-555555555555',
    queued_turn_count: 0,
    result_index: 0,
  });
}

let base: string;

function diag(stdout: string, stderr = '', vars = ''): string {
  writeFileSync(join(base, 'logs', `funnel-preflight-${DAY}.json`), stdout);
  writeFileSync(join(base, 'logs', `funnel-preflight-${DAY}.stderr`), stderr);
  const script = [
    'log() { :; }',
    `PROJECT_DIR="${base}"`,
    `TODAY="${DAY}"`,
    'MODEL="test-model"',
    'CLAUDE_CLEAN=(env)',
    block,
    vars,
    'preflight_diagnosis',
  ].join('\n');
  const r = spawnSync('/bin/bash', ['-uo', 'pipefail', '-c', script], {
    cwd: tmpdir(),
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: base } as unknown as NodeJS.ProcessEnv,
    timeout: 15_000,
  });
  return `${r.stdout}`.trim();
}

const kind = (d: string) => d.split('|')[0];
const excerpt = (d: string) => d.slice(d.indexOf('|') + 1);

beforeEach(() => {
  base = mkdtempSync(join(tmpdir(), 'preflight-diag-'));
  mkdirSync(join(base, 'logs'));
});
afterEach(() => rmSync(base, { recursive: true, force: true }));

describe('preflight_diagnosis (E331)', () => {
  it('the block exists and the runner has a QUOTA cause for the degraded digest', () => {
    expect(block.length).toBeGreaterThan(500);
    expect(block).toMatch(/^preflight_diagnosis\(\) \{/m);
    expect(raw).toMatch(/^\s*QUOTA\)\s+CAUSE="[^"]*429[^"]*claude\.ai\/settings\/usage/m);
    // the OTHER cause must never tell the operator "excerpt: none"
    expect(raw).not.toMatch(/DIAG_EXCERPT:-none/);
  });

  it('the real 11-03 shape (429, is_error, cause only in .result, 0 B stderr) → QUOTA with the .result text', () => {
    const d = diag(fixture1103());
    expect(kind(d)).toBe('QUOTA');
    expect(excerpt(d)).toMatch(/^api_error_status=429: You're out of usage credits\./);
    expect(excerpt(d)).not.toMatch(/\|/); // the excerpt lands in a markdown ledger cell
  });

  it('QUOTA wins over a stray "401" inside a session id (checked before AUTH)', () => {
    const d = diag(fixture1103('3f2a401c-0000-4000-8000-000000000401'));
    expect(kind(d)).toBe('QUOTA');
  });

  it('the usage-credit text alone (no status field) is QUOTA', () => {
    const d = diag(JSON.stringify({ type: 'result', is_error: true, result: RESULT_1103 }));
    expect(kind(d)).toBe('QUOTA');
    expect(excerpt(d)).toContain('out of usage credits');
  });

  it('an unknown API error still quotes status + .result instead of "no excerpt"', () => {
    const d = diag(JSON.stringify({ type: 'result', is_error: true, api_error_status: 529, result: 'Overloaded' }));
    expect(kind(d)).toBe('OTHER');
    expect(excerpt(d)).toBe('api_error_status=529: Overloaded');
  });

  it('OTHER with no named key prints the raw redacted tail of stdout, never an empty excerpt', () => {
    const d = diag('<html>502 Bad Gateway sk-ant-oat01-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123</html>');
    expect(kind(d)).toBe('OTHER');
    expect(excerpt(d)).toMatch(/^raw stdout tail: .*502 Bad Gateway/);
    expect(excerpt(d)).toContain('<redacted>');
    expect(excerpt(d)).not.toContain('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123');
  });

  it('both streams empty → the excerpt says so with byte counts', () => {
    const d = diag('');
    expect(kind(d)).toBe('OTHER');
    expect(excerpt(d)).toBe('no output (stdout 0B, stderr 0B)');
  });

  it('unchanged: version-too-old, a real auth failure, and a named "error" key keep their kinds', () => {
    expect(kind(diag('{"is_error":true,"result":"x","error":"claude_code_version_too_old"}'))).toBe('CLI_TOO_OLD');
    const auth = diag(
      JSON.stringify({ is_error: true, api_error_status: 401, result: 'Failed to authenticate: OAuth session expired' }),
    );
    expect(kind(auth)).toBe('AUTH');
    expect(excerpt(auth)).toContain('api_error_status=401');
    expect(excerpt(diag('{"is_error":true,"error":"boom"}'))).toBe('"error":"boom');
  });

  it('a slept-through hang keeps its HANG kind and gets a non-empty excerpt', () => {
    const d = diag('', '', 'PREFLIGHT_HANG=1; PREFLIGHT_WALL=310; PREFLIGHT_SLEPT=0');
    expect(kind(d)).toBe('HANG');
    expect(excerpt(d)).toBe('killed after 310s wall; no output (stdout 0B, stderr 0B)');
  });
});
