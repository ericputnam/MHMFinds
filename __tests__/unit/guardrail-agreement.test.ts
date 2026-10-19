/**
 * E241 (2026-10-19, Rio) — the guardrail sessions-line agreement tracker is mechanical.
 *
 * Against pre-E241 `origin/main` every describe here fails on module load (no
 * `scripts/agents/guardrail-agreement-lib`); the behavioural reds are the boundary case (a 3.0-pt
 * gap must agree), the absent-is-never-agreement case, and the 7-of-7 rule.
 *
 * Fixture numbers are the real guardrail JSONs: 10-18 (judged 10-16) and 10-19 (judged 10-17),
 * plus 10-17 (judged 10-15), which pre-dates #326 and carries no `sessionsExSegment`.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AGREEMENT_MORNINGS,
  AGREEMENT_TOLERANCE_PTS,
  morningFromFileName,
  readMorning,
  summarizeAgreement,
  renderAgreementMd,
  decisionRule,
  type MorningReading,
} from '../../scripts/agents/guardrail-agreement-lib';

const ROOT = join(__dirname, '..', '..');

// reports/funnel/guardrail-2026-10-18.json (judged 2026-10-16)
const JSON_10_18 = {
  status: 'green', day: '2026-10-16',
  expectedDay: { date: 'expected', revenue: 196.55, sessions: 11954.5, rpm: 16.43 },
  actualDay: { date: '2026-10-16', revenue: 207.61, sessions: 12287, rpm: 16.89 },
  sessionsExSegment: {
    rule: { experiment: 'E216', country: 'Singapore', source: '(direct)' }, day: '2026-10-16',
    priorDays: ['2026-10-09', '2026-10-02', '2026-09-25', '2026-09-18'],
    raw: { actual: 12332, expected: 12101 },
    segment: { actual: 520, expected: 295.25, shareActual: 0.04216671, shareExpected: 0.0244 },
    exSegment: { actual: 11812, expected: 11805.75 },
  },
};
// reports/funnel/guardrail-2026-10-19.json (judged 2026-10-17)
const JSON_10_19 = {
  status: 'green', day: '2026-10-17',
  expectedDay: { date: 'expected', revenue: 262.5075, sessions: 14616.25, rpm: 17.9575 },
  actualDay: { date: '2026-10-17', revenue: 286.91, sessions: 16598, rpm: 17.28 },
  sessionsExSegment: {
    rule: { experiment: 'E216', country: 'Singapore', source: '(direct)' }, day: '2026-10-17',
    priorDays: ['2026-10-10', '2026-10-03', '2026-09-26', '2026-09-19'],
    raw: { actual: 16860, expected: 14584.5 },
    segment: { actual: 1888, expected: 332, shareActual: 0.11198102016607354, shareExpected: 0.022763893174260346 },
    exSegment: { actual: 14972, expected: 14252.5 },
  },
};
// reports/funnel/guardrail-2026-10-17.json (judged 2026-10-15) — pre-#326, one line only
const JSON_10_17 = {
  status: 'green', day: '2026-10-15',
  expectedDay: { date: 'expected', revenue: 176.14, sessions: 11325, rpm: 15.53 },
  actualDay: { date: '2026-10-15', revenue: 195.06, sessions: 12912, rpm: 15.1 },
};

/** Build a synthetic morning with a chosen MV delta and GA4 raw delta (both in %). */
function synth(morning: string, mvDeltaPct: number, ga4DeltaPct: number | null): MorningReading {
  const json: Record<string, unknown> = {
    status: 'green', day: morning,
    expectedDay: { sessions: 10000 }, actualDay: { sessions: 10000 * (1 + mvDeltaPct / 100) },
  };
  if (ga4DeltaPct != null) {
    json.sessionsExSegment = { raw: { actual: 10000 * (1 + ga4DeltaPct / 100), expected: 10000 }, segment: { actual: 0, expected: 0, shareActual: 0 }, exSegment: { actual: 10000 * (1 + ga4DeltaPct / 100), expected: 10000 } };
  }
  return readMorning(morning, json);
}

describe('E241 — one reading per guardrail morning', () => {
  it('10-18: both lines present, gap 0.9 pt → agree', () => {
    const r = readMorning('2026-10-18', JSON_10_18);
    expect(r.day).toBe('2026-10-16');
    expect(r.mvDeltaPct).toBeCloseTo(2.78, 1);
    expect(r.ga4RawDeltaPct).toBeCloseTo(1.91, 1);
    expect(r.gapPts).toBeCloseTo(0.87, 1);
    expect(r.exSegmentDeltaPct).toBeCloseTo(0.05, 1);
    expect(r.segmentSharePct).toBeCloseTo(4.22, 1);
    expect(r.state).toBe('agree');
    expect(r.absentWhy).toBeNull();
  });

  it('10-19: both lines present, gap 2.0 pt (MV +13.6 vs GA4 +15.6) → agree', () => {
    const r = readMorning('2026-10-19', JSON_10_19);
    expect(r.mvDeltaPct).toBeCloseTo(13.56, 1);
    expect(r.ga4RawDeltaPct).toBeCloseTo(15.60, 1);
    expect(r.gapPts).toBeCloseTo(2.04, 1);
    expect(r.exSegmentDeltaPct).toBeCloseTo(5.05, 1);
    expect(r.segmentSharePct).toBeCloseTo(11.20, 1);
    expect(r.state).toBe('agree');
  });

  it('10-17: no sessionsExSegment block → absent with a reason, and gap is null (never a number)', () => {
    const r = readMorning('2026-10-17', JSON_10_17);
    expect(r.mvDeltaPct).toBeCloseTo(14.01, 1);
    expect(r.ga4RawDeltaPct).toBeNull();
    expect(r.gapPts).toBeNull();
    expect(r.state).toBe('absent');
    expect(r.absentWhy).toMatch(/no sessionsExSegment/);
  });

  it('garbage input is absent, not a throw', () => {
    for (const bad of [null, undefined, 42, 'x', {}, { actualDay: { sessions: 'n' } }, { actualDay: { sessions: 1 }, expectedDay: { sessions: 0 } }]) {
      const r = readMorning('2026-01-01', bad);
      expect(r.state).toBe('absent');
      expect(r.gapPts).toBeNull();
    }
  });

  it('a gap of exactly the tolerance agrees; a hair over disagrees (compare at the boundary, round only for print)', () => {
    expect(synth('2026-01-01', 5, 2).state).toBe('agree'); // 3.0 pt in floats = 3.0000000000000004
    expect(synth('2026-01-02', 2, 5).state).toBe('agree');
    expect(synth('2026-01-03', 5.05, 2).state).toBe('disagree');
    expect(synth('2026-01-04', -3, 0.05).state).toBe('disagree');
    expect(AGREEMENT_TOLERANCE_PTS).toBe(3);
  });

  it('morningFromFileName accepts only guardrail-YYYY-MM-DD.json', () => {
    expect(morningFromFileName('guardrail-2026-10-19.json')).toBe('2026-10-19');
    expect(morningFromFileName('guardrail-2026-10-19.md')).toBeNull();
    expect(morningFromFileName('guardrail-2026-10-19.json.bak')).toBeNull();
    expect(morningFromFileName('2026-10-19.json')).toBeNull();
  });
});

describe('E241 — the 7-morning decision is pre-committed and absent never counts', () => {
  const agreeDays = (n: number, from = 1) => Array.from({ length: n }, (_, i) => synth(`2026-11-${String(from + i).padStart(2, '0')}`, 1 + i * 0.1, 1 - i * 0.1));

  it('requires 7 mornings', () => {
    expect(AGREEMENT_MORNINGS).toBe(7);
  });

  it('7 of 7 agreeing → WIRE', () => {
    const s = summarizeAgreement(agreeDays(7));
    expect(s.decision).toBe('WIRE');
    expect(s.agreeing).toBe(7);
    expect(s.withBothLines).toBe(7);
  });

  it('the real 2 mornings alone → INSUFFICIENT, 5 more needed (today\'s BEFORE)', () => {
    const s = summarizeAgreement([readMorning('2026-10-19', JSON_10_19), readMorning('2026-10-18', JSON_10_18)]);
    expect(s.decision).toBe('INSUFFICIENT');
    expect(s.agreeing).toBe(2);
    expect(s.why).toMatch(/5 more agreeing mornings/);
  });

  it('6 agreeing + 1 absent in the window → INSUFFICIENT, never WIRE (absent is not agreement)', () => {
    const s = summarizeAgreement([...agreeDays(6), readMorning('2026-10-17', JSON_10_17)]);
    expect(s.window).toHaveLength(7);
    expect(s.withBothLines).toBe(6);
    expect(s.decision).toBe('INSUFFICIENT');
    expect(s.absent).toEqual(['2026-10-17']);
  });

  it('6 agreeing + 1 disagreeing → HOLD, naming the morning', () => {
    const s = summarizeAgreement([...agreeDays(6), synth('2026-11-07', 8, 2)]);
    expect(s.decision).toBe('HOLD');
    expect(s.disagreeing).toEqual(['2026-11-07']);
  });

  it('only the last 7 mornings count — an old disagreement outside the window is ignored, and the window is oldest-first', () => {
    const old = synth('2026-10-01', 9, 0);
    const s = summarizeAgreement([...agreeDays(7), old]);
    expect(s.decision).toBe('WIRE');
    expect(s.window.map((r) => r.morning)[0]).toBe('2026-11-01');
    expect(s.window.map((r) => r.morning)[6]).toBe('2026-11-07');
  });

  it('a disagreement outranks an insufficient count (HOLD even with 3 files)', () => {
    const s = summarizeAgreement([...agreeDays(2), synth('2026-11-03', 8, 2)]);
    expect(s.decision).toBe('HOLD');
  });

  it('the rendered markdown prints the rule before the table and the verdict after it', () => {
    const s = summarizeAgreement([readMorning('2026-10-19', JSON_10_19), readMorning('2026-10-18', JSON_10_18), readMorning('2026-10-17', JSON_10_17)]);
    const md = renderAgreementMd(s, '2026-10-19');
    const ruleAt = md.indexOf('decision rule (pre-committed');
    const tableAt = md.indexOf('| Morning |');
    const verdictAt = md.indexOf('**INSUFFICIENT**');
    expect(ruleAt).toBeGreaterThan(0);
    expect(tableAt).toBeGreaterThan(ruleAt);
    expect(verdictAt).toBeGreaterThan(tableAt);
    expect(md).toContain('| 2026-10-17 | 2026-10-15 | green | +14.0% | — | — | — | — | absent — no sessionsExSegment');
    expect(md).toContain('| 2026-10-19 | 2026-10-17 | green | +13.6% | +15.6% | 2.0 pt | +5.0% | 11.20% | agree |');
    expect(decisionRule()).toContain('≤ 3 pts');
  });
});

describe('E241 — the tracker reads the real guardrail JSONs the repo tracks', () => {
  it('finds at least one morning with both lines (10-18 is committed) and grades 10-17 absent — vacuity guard', () => {
    const dir = join(ROOT, 'reports', 'funnel');
    const names = readdirSync(dir).filter((n) => morningFromFileName(n));
    expect(names.length).toBeGreaterThanOrEqual(5);
    const readings = names.map((n) => readMorning(morningFromFileName(n)!, JSON.parse(readFileSync(join(dir, n), 'utf8'))));
    const both = readings.filter((r) => r.state !== 'absent');
    expect(both.length).toBeGreaterThanOrEqual(1);
    const r1018 = readings.find((r) => r.morning === '2026-10-18');
    expect(r1018?.state).toBe('agree');
    const r1017 = readings.find((r) => r.morning === '2026-10-17');
    expect(r1017?.state).toBe('absent');
    // No reading ever carries a gap without both lines.
    for (const r of readings) expect(r.gapPts == null).toBe(r.state === 'absent');
  });
});
