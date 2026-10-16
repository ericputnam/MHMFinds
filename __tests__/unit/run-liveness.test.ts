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

/**
 * E222 (2026-10-16): the 10-15 shape. Runner started, preflight ok, 7 PRs merged with after-merge rows on main,
 * "Quinn finished." + "digest: Quinn's file digest accepted" in the log — and the daily PR never reached main.
 * Pre-E222 the grader printed "MISSED 2026-10-15: no digest on main", the same verdict as a slept-through host.
 * Red on the pre-fix tree: the RAN-UNLANDED cases (gradeDay, replay, format, ledger-only, helpers, wiring).
 * Green on the pre-fix tree (controls — the hard negatives must still win): 0-byte preflight, degraded digest,
 * no positive evidence, check/apply rows only.
 */
const LOG_1015 = [
  '[2026-10-15 06:34:06] day-lock: pid 67545 owns 2026-10-15 (/logs/funnel-run-2026-10-15.lock)',
  '[2026-10-15 06:38:08] preflight: rc=0 wall=4s asleep/suspended=0s hang=0 stdout=1750B stderr=0B',
  '[2026-10-15 07:19:35] Quinn finished.',
  "[2026-10-15 07:19:35] digest: Quinn's file digest accepted (<!-- LEDGER --> filled with 8 ledger rows)",
  "[2026-10-15 07:29:44] daily-pr-ledger: DID NOT FIRE — 'funnel: daily run 2026-10-15' not merged to origin/main yet after 600s / 10 poll(s)",
  '[2026-10-14 06:31:00] day-lock: pid 1 owns 2026-10-14 (/logs/x.lock)',
  '[2026-10-14 07:26:28] Quinn finished.',
  '  quoted [2026-10-13 07:00:00] Quinn finished. mid-line — must not count',
].join('\n');
const CHANGELOG_1015 = [
  '| when | mode | who / what | commit | deployment | result | notes |',
  '|---|---|---|---|---|---|---|',
  '| 2026-10-15 06:35 | check | morning-check |  | https://x | PASS | |',
  '| 2026-10-15 06:47 | apply (Tier 0, SD-10 amendment) | Pip: E209 top-up | | | ok | |',
  ...['05957aa', 'b4bfa1c', '112ddaa', 'df29f28', '15d4193', '9751073', '14d2450'].map(
    (c, i) => `| 2026-10-15 07:${String(i * 4).padStart(2, '0')} | after-merge | Agent: PR #${305 + i} x (Tier 0) | ${c} | https://x | PASS | |`,
  ),
  '| 2026-10-14 07:20 | after-merge | Quinn: PR #304 funnel: daily run 2026-10-14 | abc1234 | https://x | PASS | |',
].join('\n');

function fixture1016(): RunLivenessInputs {
  return {
    todayIso: '2026-10-16',
    logDirReadable: true,
    logText: LOG_1015,
    changelogText: CHANGELOG_1015,
    preflightByDate: new Map<string, string | null>([
      ['2026-10-14', OK_PREFLIGHT],
      ['2026-10-15', OK_PREFLIGHT],
    ]),
    digestsOnMain: new Map([['2026-10-14', '# MHM funnel — 2026-10-14\n']]),
  };
}

describe('run-liveness-lib RAN-UNLANDED (E222)', () => {
  it('helpers: Quinn-finished dates are line-start only; after-merge rows counted per day, check/apply excluded', async () => {
    const lib = (await import('../../scripts/agents/run-liveness-lib')) as Record<string, unknown>;
    expect(typeof lib.quinnFinishedDates).toBe('function');
    expect(typeof lib.afterMergeRowsByDate).toBe('function');
    const fin = (lib.quinnFinishedDates as (s: string) => Set<string>)(LOG_1015);
    expect(Array.from(fin).sort()).toEqual(['2026-10-14', '2026-10-15']);
    const rows = (lib.afterMergeRowsByDate as (s: string) => Map<string, number>)(CHANGELOG_1015);
    expect(rows.get('2026-10-15')).toBe(7);
    expect(rows.get('2026-10-14')).toBe(1);
  });

  it('gradeDay: the 10-15 evidence is RAN-UNLANDED with the recovery hint, not MISSED', () => {
    const d = gradeDay('2026-10-15', {
      preflight: 'ok', runnerStarted: true, digestOnMain: false, digestDegraded: false, afterMergeRows: 7, quinnFinished: true,
    } as Parameters<typeof gradeDay>[1]);
    expect(d.verdict).toBe('RAN-UNLANDED');
    expect(d.reasons).toEqual(['ran (Quinn finished, 7 after-merge rows on main) · no digest on main — the digest lands with the next daily PR']);
  });

  it('replays the 10-16 morning: 10-15 RAN-UNLANDED (not counted as MISSED), 10-14 RAN', () => {
    const r = assessRunLiveness(fixture1016()) as ReturnType<typeof assessRunLiveness> & { unlanded: number };
    const by = Object.fromEntries(r.days.map((d) => [d.date, d]));
    expect(by['2026-10-15'].verdict).toBe('RAN-UNLANDED');
    expect(by['2026-10-14'].verdict).toBe('RAN');
    expect(r.unlanded).toBe(1);
    expect(r.ran).toBe(1);
    expect(r.missed).toBe(5); // 10-09 → 10-13 have no evidence in this fixture
    expect(r.days.filter((d) => d.verdict === 'MISSED').map((d) => d.date)).not.toContain('2026-10-15');
  });

  it('formatRunLiveness prints RAN-UNLANDED as 🟡 with the hint, and the summary counts it separately', () => {
    const lines = formatRunLiveness(assessRunLiveness(fixture1016()));
    expect(lines[0]).toBe('- Run liveness 7d (2026-10-09 → 2026-10-15): **1/7 ran** · 1 🟡 RAN-UNLANDED · 5 MISSED · 0 unknown');
    expect(lines[1]).toBe('  - 🟡 RAN-UNLANDED 2026-10-15: ran (Quinn finished, 7 after-merge rows on main) · no digest on main — the digest lands with the next daily PR');
  });

  it('ledger rows on main alone suffice when the operator log is unreadable (the durable signal)', () => {
    const inp = { ...fixture1016(), logDirReadable: false, logText: null, preflightByDate: new Map<string, string | null>() };
    const d = assessRunLiveness(inp).days.find((x) => x.date === '2026-10-15')!;
    expect(d.verdict).toBe('RAN-UNLANDED');
    expect(d.reasons[0]).toContain('7 after-merge rows on main');
  });

  it('controls: hard negatives still win — 0-byte preflight, missing runner start, DEGRADED digest stay MISSED', () => {
    const base = { digestDegraded: false, afterMergeRows: 7, quinnFinished: true } as const;
    expect(gradeDay('d', { ...base, preflight: 'empty', runnerStarted: true, digestOnMain: false }).verdict).toBe('MISSED');
    expect(gradeDay('d', { ...base, preflight: 'ok', runnerStarted: false, digestOnMain: false }).verdict).toBe('MISSED');
    expect(gradeDay('d', { ...base, preflight: 'ok', runnerStarted: true, digestOnMain: true, digestDegraded: true }).verdict).toBe('MISSED');
  });

  it('controls: no positive evidence (no after-merge rows, no Quinn-finished line) stays MISSED; check/apply rows do not count', () => {
    const inp = fixture1016();
    inp.logText = LOG_1015.split('\n').filter((l) => !/Quinn finished|digest accepted/.test(l)).join('\n');
    inp.changelogText = CHANGELOG_1015.split('\n').filter((l) => !/after-merge/.test(l)).join('\n');
    const d = assessRunLiveness(inp).days.find((x) => x.date === '2026-10-15')!;
    expect(d.verdict).toBe('MISSED');
    expect(d.reasons).toEqual(['no digest on main']);
  });

  it('is wired into the scoreboard: changelog passed in, 🟡 flag for RAN-UNLANDED (comments stripped)', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/assessRunLiveness\(\{[^}]*changelogText[^}]*\}\)/);
    expect(src).toMatch(/runLiveness\.unlanded > 0[\s\S]{0,300}flags\.push\(`🟡 Loop RAN but its daily PR did not land/);
  });
});
