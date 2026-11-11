import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGENT_DAY_ANCHOR, AGENT_DAY_EVERY, isAgentDay, isOffDay } from '../../scripts/agents/funnel-cadence-lib';
import { assessRunLiveness, formatRunLiveness, gradeDay, guardRanTimes, type RunLivenessInputs } from '../../scripts/agents/run-liveness-lib';
import { computeRunSuccessShare } from '../../lib/funnel/changelogStats';

/**
 * E394 (2026-11-11): the operator moved Quinn + specialists to every other day on 2026-11-07 (guard every
 * day). Off-day runs stop after the circuit breaker ("Dry run — stopping after scoreboard + circuit breaker.")
 * and land no preflight file and no digest on main by design. The 11-11 scoreboard still printed
 * "🔴 Loop MISSED 2 of the last 7 mornings: 2026-11-10, 2026-11-08 — no preflight file · no digest on main"
 * and run success 14d 78.6% (11/14). The fixture replays the real 11-04 → 11-10 evidence (operator
 * logs/funnel-daily.log lines verbatim, digests on origin/main 622ebfc4).
 */
const OK = '{"type":"result","subtype":"success","is_error":false,"duration_ms":4457,"result":"ok"}';
const LOG = [
  '[2026-11-07 06:38:40] Circuit breaker: status=green action=none (exit 0)',
  '[2026-11-07 07:40:25] cleanup: waiting up to 1800s for live pid(s) in the worktrees: 84141',
  '[2026-11-08 17:42:37] day-lock: pid 38333 owns 2026-11-08 (/Users/eputnam/java_projects/MHMFinds/logs/funnel-run-2026-11-08.lock)',
  '[2026-11-08 17:46:35] Circuit breaker: status=green action=none (exit 0)',
  '[2026-11-08 17:46:35] Dry run — stopping after scoreboard + circuit breaker.',
  '[2026-11-09 06:34:40] day-lock: pid 95032 owns 2026-11-09 (/x)',
  '[2026-11-09 07:25:34] Quinn finished.',
  '[2026-11-10 06:34:42] day-lock: pid 45960 owns 2026-11-10 (/Users/eputnam/java_projects/MHMFinds/logs/funnel-run-2026-11-10.lock)',
  '[2026-11-10 06:38:41] Circuit breaker: status=green action=none (exit 0)',
  '[2026-11-10 06:38:41] Dry run — stopping after scoreboard + circuit breaker.',
  '  quoted [2026-11-06 06:00:00] Circuit breaker: status=green — not at line start, must not count',
].join('\n');

function fixture(): RunLivenessInputs {
  const ran = ['2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-09'];
  return {
    todayIso: '2026-11-11',
    logDirReadable: true,
    logText: ['[2026-11-04 06:34:00] x', '[2026-11-05 06:34:00] x', '[2026-11-06 06:34:00] x', LOG].join('\n'),
    preflightByDate: new Map<string, string | null>(ran.map((d) => [d, OK])),
    digestsOnMain: new Map(ran.map((d) => [d, `# Funnel digest — ${d}\n`])),
  };
}

describe('funnel-cadence-lib (E394)', () => {
  it('matches the scheduled task: (date - 2026-11-07).days % 2 == 0 is an agent day; pre-anchor days were all agent days', () => {
    expect(AGENT_DAY_ANCHOR).toBe('2026-11-07');
    expect(AGENT_DAY_EVERY).toBe(2);
    for (const d of ['2026-11-07', '2026-11-09', '2026-11-11', '2026-12-01', '2026-12-31']) expect(isAgentDay(d)).toBe(true);
    for (const d of ['2026-11-08', '2026-11-10', '2026-11-30', '2027-01-01']) expect(isOffDay(d)).toBe(true);
    for (const d of ['2026-11-06', '2026-11-05', '2026-10-10']) expect(isAgentDay(d)).toBe(true);
    expect(() => isAgentDay('2026-13-40')).toThrow();
  });
});

describe('run-liveness off days (E394)', () => {
  it('guardRanTimes: first line-start circuit-breaker time per day; mid-line quotes ignored', () => {
    const g = guardRanTimes(LOG);
    expect(g.get('2026-11-08')).toBe('17:46');
    expect(g.get('2026-11-10')).toBe('06:38');
    expect(g.has('2026-11-06')).toBe(false);
  });

  it('replays the 11-11 morning: 11-08 and 11-10 are OFF-DAY (guard ran), 0 MISSED, 5/5 agent days ran', () => {
    const r = assessRunLiveness(fixture());
    expect(r.missed).toBe(0);
    expect(r.ran).toBe(5);
    expect(r.offDays).toBe(2);
    expect(r.days.filter((d) => d.verdict === 'OFF-DAY').map((d) => d.date)).toEqual(['2026-11-10', '2026-11-08']);
    const lines = formatRunLiveness(r);
    expect(lines[0]).toBe('- Run liveness 7d (2026-11-04 → 2026-11-10): **5/5 agent days ran** · 2 off-day (guard ran) · 0 MISSED · 0 unknown');
    expect(lines[1]).toBe('  - OFF-DAY 2026-11-10: off day (guard only) — guard ran, circuit breaker 06:38; specialists not scheduled');
  });

  it('control: an off day whose guard did not run is still MISSED (runner started but no circuit breaker; or no start at all)', () => {
    const inp = fixture();
    inp.logText = inp.logText!.split('\n').filter((l) => !l.startsWith('[2026-11-10 06:38:41]')).join('\n');
    inp.logText = inp.logText.split('\n').filter((l) => !l.startsWith('[2026-11-08')).join('\n');
    const r = assessRunLiveness(inp);
    expect(r.missed).toBe(2);
    expect(r.days.find((d) => d.date === '2026-11-10')!.reasons).toEqual(['off day: guard did not run (no circuit-breaker line)']);
    expect(r.days.find((d) => d.date === '2026-11-08')!.reasons).toEqual([
      'off day: guard did not run (no circuit-breaker line)',
      'no runner start in funnel-daily.log',
    ]);
  });

  it('control: an agent day with the same evidence as an off day (guard only, no digest) is MISSED', () => {
    const inp = fixture();
    inp.digestsOnMain.delete('2026-11-09');
    inp.preflightByDate.delete('2026-11-09');
    inp.logText = inp.logText!.split('\n').filter((l) => !l.includes('Quinn finished')).join('\n') + '\n[2026-11-09 06:38:00] Circuit breaker: status=green action=none (exit 0)';
    const r = assessRunLiveness(inp);
    expect(r.days.find((d) => d.date === '2026-11-09')!.verdict).toBe('MISSED');
  });

  it('control: logs/ unreadable on an off day is UNKNOWN, never OFF-DAY or MISSED; a full by-hand run on an off day stays RAN', () => {
    expect(gradeDay('2026-11-10', { preflight: 'unknown', runnerStarted: null, digestOnMain: false, digestDegraded: false, offDay: true, guardRanAt: null }).verdict).toBe('UNKNOWN');
    expect(gradeDay('2026-11-10', { preflight: 'ok', runnerStarted: true, digestOnMain: true, digestDegraded: false, offDay: true, guardRanAt: '06:38' }).verdict).toBe('RAN');
  });

  it('pre-anchor dates are graded exactly as before (no off days before 2026-11-07)', () => {
    const r = assessRunLiveness({ todayIso: '2026-11-07', logDirReadable: true, logText: '', preflightByDate: new Map(), digestsOnMain: new Map() });
    expect(r.offDays).toBe(0);
    expect(r.missed).toBe(7);
  });
});

describe('run success 14d over scheduled agent days (E394)', () => {
  // Scoreboard JSONs on origin/main 622ebfc4 for 10-28 → 11-10: all but 11-02, 11-08, 11-10.
  const onMain = new Set(['2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-03', '2026-11-04',
    '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-09']);
  it('11-11: 11/14 = 78.6% counting every day → 11/12 = 91.7% over scheduled days; 11-02 stays a real miss', () => {
    expect(computeRunSuccessShare(onMain, '2026-11-11', 14)).toBeCloseTo(11 / 14, 10);
    expect(computeRunSuccessShare(onMain, '2026-11-11', 14, isAgentDay)).toBeCloseTo(11 / 12, 10);
  });

  it('is wired into the scoreboard (comments stripped)', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(src).toMatch(/import \{ isAgentDay \} from '\.\/funnel-cadence-lib'/);
    expect(src).toMatch(/computeRunSuccessShare\(datesWithRun, iso\(new Date\(\)\), 14, isAgentDay\)/);
  });
});
