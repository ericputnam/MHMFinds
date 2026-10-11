import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  assessRunLiveness,
  classifyPreflight,
  formatRunLiveness,
  gradeDay,
  priorDays,
  runnerStartDates,
  type RunLivenessInputs,
} from '../../scripts/agents/run-liveness-lib';

/**
 * E187 (2026-10-11): the scoreboard's run-liveness monitor. The loop produced no digest on 10-05, 10-06,
 * 10-08, 10-09 and 10-10; each was found by hand days later. On 10-08 and 10-10 the runner started and its
 * preflight file EXISTED at 0 bytes — the existing run-success proxy and a naive "preflight file exists"
 * check both read those days as runs. The fixture below replays the real 10-04 → 10-10 evidence as it stood
 * on the 10-11 morning (operator logs/ + digests on origin/main).
 */
const OK_PREFLIGHT = '{"type":"result","subtype":"success","is_error":false,"duration_ms":4457,"result":"ok"}';
const ERR_PREFLIGHT = '{"type":"result","subtype":"error","is_error":true,"result":"API Error: 401"}';
const LOG = [
  '[2026-10-04 06:31:02] cleanup: reaped 0 worktree(s), left 0 in place',
  '[2026-10-07 06:52:54] cleanup: git worktree remove failed for /x',
  '[2026-10-08 16:15:24] day-lock: pid 26608 owns 2026-10-08 (/logs/funnel-run-2026-10-08.lock)',
  '[2026-10-08 20:30:23] Circuit breaker: status=unknown action=none (exit 3)',
  '[2026-10-10 08:04:04] day-lock: pid 33714 owns 2026-10-10 (/logs/funnel-run-2026-10-10.lock)',
  '[2026-10-10 08:15:12] Circuit breaker: status=green action=none (exit 0)',
  '[2026-10-11 10:55:46] 🔴 Quinn cannot run: preflight=OTHER cli=2.1.280 (Claude Code) token-expiry=2026-10-07 16:57',
  '  inner line [2026-10-09 00:00:00] quoted, not at line start — must not count',
].join('\n');

function realFixture(): RunLivenessInputs {
  return {
    todayIso: '2026-10-11',
    logDirReadable: true,
    logText: LOG,
    preflightByDate: new Map<string, string | null>([
      ['2026-10-04', OK_PREFLIGHT],
      ['2026-10-07', OK_PREFLIGHT],
      ['2026-10-08', ''],
      ['2026-10-10', ''],
      ['2026-10-11', OK_PREFLIGHT],
    ]),
    digestsOnMain: new Map([
      ['2026-10-04', '# Funnel digest — 2026-10-04\n'],
      ['2026-10-07', '# Funnel digest — 2026-10-07\n'],
    ]),
  };
}

describe('run-liveness-lib (E187)', () => {
  it('priorDays: the 7 days before today, newest first, today excluded', () => {
    expect(priorDays('2026-10-11', 7)).toEqual([
      '2026-10-10', '2026-10-09', '2026-10-08', '2026-10-07', '2026-10-06', '2026-10-05', '2026-10-04',
    ]);
    expect(priorDays('2026-03-01', 1)).toEqual(['2026-02-28']);
  });

  it('classifyPreflight: 0 bytes is EMPTY (not a run), absent/failed/ok distinct, unreadable dir is unknown', () => {
    expect(classifyPreflight('')).toBe('empty');
    expect(classifyPreflight(' \n')).toBe('empty');
    expect(classifyPreflight(null)).toBe('absent');
    expect(classifyPreflight(OK_PREFLIGHT)).toBe('ok');
    expect(classifyPreflight(ERR_PREFLIGHT)).toBe('failed');
    expect(classifyPreflight('', false)).toBe('unknown');
  });

  it('runnerStartDates: owns-line date counts even when later lines are stamped another day; mid-line stamps do not', () => {
    const s = runnerStartDates(LOG);
    expect(s.has('2026-10-08')).toBe(true);
    expect(s.has('2026-10-10')).toBe(true);
    expect(s.has('2026-10-04')).toBe(true);
    expect(s.has('2026-10-09')).toBe(false);
    expect(s.has('2026-10-05')).toBe(false);
  });

  it('replays 10-04 → 10-10: 2 ran, 5 MISSED, with the reason per day', () => {
    const r = assessRunLiveness(realFixture());
    // Vacuity guard: the fixture must exercise both verdicts, or this test proves nothing.
    expect(r.missed).toBeGreaterThanOrEqual(1);
    expect(r.ran).toBeGreaterThanOrEqual(1);
    expect(r.window).toEqual({ from: '2026-10-04', to: '2026-10-10', days: 7 });
    const by = Object.fromEntries(r.days.map((d) => [d.date, d]));
    expect(r.days.filter((d) => d.verdict === 'RAN').map((d) => d.date)).toEqual(['2026-10-07', '2026-10-04']);
    expect(r.days.filter((d) => d.verdict === 'MISSED').map((d) => d.date)).toEqual([
      '2026-10-10', '2026-10-09', '2026-10-08', '2026-10-06', '2026-10-05',
    ]);
    expect(r.unknown).toBe(0);
    // The two days the runner started: the 0-byte preflight is named, the runner start is not held against them.
    expect(by['2026-10-10'].reasons).toEqual(['preflight 0 bytes (CLI never answered)', 'no digest on main']);
    expect(by['2026-10-08'].reasons).toEqual(['preflight 0 bytes (CLI never answered)', 'no digest on main']);
    expect(by['2026-10-09'].reasons).toEqual(['no runner start in funnel-daily.log', 'no preflight file', 'no digest on main']);
  });

  it('a 0-byte preflight is MISSED even when the runner started and a digest is on main', () => {
    const d = gradeDay('2026-10-10', { preflight: 'empty', runnerStarted: true, digestOnMain: true, digestDegraded: false });
    expect(d.verdict).toBe('MISSED');
    expect(d.reasons).toEqual(['preflight 0 bytes (CLI never answered)']);
  });

  it('a DEGRADED digest on main is MISSED, not a run', () => {
    const inp = realFixture();
    inp.digestsOnMain.set('2026-10-10', '# Funnel digest — 2026-10-10 (DEGRADED: Quinn did not run)\n');
    const d = assessRunLiveness(inp).days.find((x) => x.date === '2026-10-10')!;
    expect(d.verdict).toBe('MISSED');
    expect(d.reasons).toContain('digest on main is DEGRADED (Quinn did not run)');
  });

  it('logs/ unreadable: a day with a digest on main is UNKNOWN (never RAN or MISSED on no evidence); no digest stays MISSED', () => {
    const inp = { ...realFixture(), logDirReadable: false, logText: null, preflightByDate: new Map() };
    const r = assessRunLiveness(inp);
    const by = Object.fromEntries(r.days.map((d) => [d.date, d]));
    expect(by['2026-10-07'].verdict).toBe('UNKNOWN');
    expect(by['2026-10-04'].verdict).toBe('UNKNOWN');
    expect(by['2026-10-09'].verdict).toBe('MISSED');
    expect(by['2026-10-09'].reasons).toEqual(['no digest on main']);
    expect(r.ran).toBe(0);
  });

  it('formatRunLiveness: one summary line and one line per non-RAN day', () => {
    const lines = formatRunLiveness(assessRunLiveness(realFixture()));
    expect(lines[0]).toBe('- Run liveness 7d (2026-10-04 → 2026-10-10): **2/7 ran** · 5 MISSED · 0 unknown');
    expect(lines).toHaveLength(6);
    expect(lines[1]).toBe('  - MISSED 2026-10-10: preflight 0 bytes (CLI never answered) · no digest on main');
  });

  it('is wired into the scoreboard: Team health prints it and a MISSED day raises a flag (comments stripped)', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/from '\.\/run-liveness-lib'/);
    expect(src).toMatch(/runLiveness: readRunLiveness\(iso\(new Date\(\)\)\)/);
    expect(src).toMatch(/formatRunLiveness\(t\.runLiveness\)/);
    expect(src).toMatch(/team\.data\.runLiveness\.missed > 0[\s\S]{0,200}flags\.push\(`🔴 Loop MISSED/);
  });
});
