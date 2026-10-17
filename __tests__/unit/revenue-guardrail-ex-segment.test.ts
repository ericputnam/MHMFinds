/**
 * E227 (2026-10-17, Rio) — the revenue guardrail's sessions line is also read EX the Singapore Direct
 * segment, using E216's `SG_DIRECT_RULE` (imported), never a restated copy.
 *
 * Shape of the problem: 10-15's guardrail read sessions +14.0% (Mediavine 12,912 vs 11,325). GA4 the
 * same day: site 13,022, segment (country=Singapore, sessionSource=(direct)) 2,074 = 15.9% of the day;
 * the four prior Thursdays carried 1,063 / 425 / 471 / 213. Ex the segment the Thursday reads +0.7%.
 *
 * Against pre-E227 `origin/main` the "wired" describe fails on module load (no `sessionsExSegment`
 * export) and the source-scan describe fails on every assertion — the red is behavioural.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SG_DIRECT_RULE } from '../../scripts/agents/direct-bot-lib';
import * as lib from '../../scripts/agents/revenue-guardrail-lib';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// GA4 property 437117335, pulled 2026-10-17 for the judged day 2026-10-15 and its four prior Thursdays.
const DAY = '2026-10-15';
const PRIOR = ['2026-10-08', '2026-10-01', '2026-09-24', '2026-09-17'];
const SITE: lib.SessionsByDate = { '2026-10-15': 13022, '2026-10-08': 11550, '2026-10-01': 10909, '2026-09-24': 12303, '2026-09-17': 10916 };
const SEGMENT: lib.SessionsByDate = { '2026-10-15': 2074, '2026-10-08': 1063, '2026-10-01': 425, '2026-09-24': 471, '2026-09-17': 213 };

describe('E227 — the segment rule is E216\'s constant, not a copy', () => {
  it('SESSIONS_SEGMENT_RULE is the very object direct-bot-lib exports', () => {
    expect(lib.SESSIONS_SEGMENT_RULE).toBe(SG_DIRECT_RULE);
  });

  it('the GA4 dimensionFilter is built from the imported rule (country + sessionSource, EXACT)', () => {
    expect(lib.segmentDimensionFilter()).toEqual({
      andGroup: {
        expressions: [
          { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: SG_DIRECT_RULE.country } } },
          { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'EXACT', value: SG_DIRECT_RULE.source } } },
        ],
      },
    });
  });

  it('neither the lib nor the script restates the rule\'s values as literals (comments stripped)', () => {
    for (const f of ['scripts/agents/revenue-guardrail-lib.ts', 'scripts/agents/revenue-guardrail.ts']) {
      const src = stripComments(readFileSync(join(ROOT, f), 'utf8'));
      expect(src, f).not.toContain(`'${SG_DIRECT_RULE.country}'`);
      expect(src, f).not.toContain(`"${SG_DIRECT_RULE.country}"`);
      expect(src, f).not.toContain(`'${SG_DIRECT_RULE.source}'`);
      expect(src, f).not.toContain(`"${SG_DIRECT_RULE.source}"`);
    }
    expect(stripComments(readFileSync(join(ROOT, 'scripts/agents/revenue-guardrail-lib.ts'), 'utf8'))).toMatch(/from '\.\/direct-bot-lib'/);
  });

  it('the result names the rule it subtracted', () => {
    const x = lib.sessionsExSegment(DAY, PRIOR, SITE, SEGMENT)!;
    expect(x.rule).toEqual({ experiment: SG_DIRECT_RULE.experiment, country: SG_DIRECT_RULE.country, source: SG_DIRECT_RULE.source });
  });
});

describe('E227 — the 2026-10-15 Thursday: raw +14.0% is the segment; ex-segment +0.7%', () => {
  const x = lib.sessionsExSegment(DAY, PRIOR, SITE, SEGMENT)!;

  it('raw and ex-segment both print, with the segment share', () => {
    expect(x.raw).toEqual({ actual: 13022, expected: 11419.5 });
    expect(x.segment.actual).toBe(2074);
    expect(x.segment.expected).toBe(543);
    expect(x.exSegment).toEqual({ actual: 10948, expected: 10876.5 });
    expect(x.raw.actual / x.raw.expected - 1).toBeCloseTo(0.1403, 3);
    expect(x.exSegment.actual / x.exSegment.expected - 1).toBeCloseTo(0.0066, 3);
    expect(x.segment.shareActual!).toBeCloseTo(0.1593, 3);
    expect(x.segment.shareExpected!).toBeCloseTo(0.0475, 3);
    expect(x.priorDays).toEqual(PRIOR);
  });

  it('the line carries raw → ex-segment → share, in that order', () => {
    const line = lib.sessionsExSegmentLine(x);
    expect(line).toBe(
      `sessions ex ${SG_DIRECT_RULE.country} ${SG_DIRECT_RULE.source} (${SG_DIRECT_RULE.experiment}, GA4): raw 13,022 vs 11,420 (+14.0%) → ex-segment 10,948 vs 10,877 (+0.7%) · segment 2,074 = 15.93% of the day (controls 4.76%, 4 same weekdays)`,
    );
  });
});

describe('E227 — a day with zero segment rows is unchanged', () => {
  it('empty segment → ex-segment equals raw exactly, share 0', () => {
    const x = lib.sessionsExSegment(DAY, PRIOR, SITE, {})!;
    expect(x.exSegment).toEqual(x.raw);
    expect(x.segment).toEqual({ actual: 0, expected: 0, shareActual: 0, shareExpected: 0 });
    expect(lib.sessionsExSegmentLine(x)).toContain('raw 13,022 vs 11,420 (+14.0%) → ex-segment 13,022 vs 11,420 (+14.0%) · segment 0 = 0.00% of the day');
  });

  it('segment rows on other dates only do not change the judged day', () => {
    const x = lib.sessionsExSegment(DAY, PRIOR, SITE, { '2026-10-14': 1845 })!;
    expect(x.exSegment).toEqual(x.raw);
  });
});

describe('E227 — unavailable is a word, never a number', () => {
  it('judged day missing from the site pull → null', () => {
    expect(lib.sessionsExSegment(DAY, PRIOR, { '2026-10-08': 1 }, SEGMENT)).toBeNull();
  });

  it('fewer than two same-weekday controls → null; two is enough and the mean is over the present ones', () => {
    expect(lib.sessionsExSegment(DAY, PRIOR, { [DAY]: 13022, '2026-10-08': 11550 }, SEGMENT)).toBeNull();
    const x = lib.sessionsExSegment(DAY, PRIOR, { [DAY]: 13022, '2026-10-08': 11550, '2026-10-01': 10909 }, SEGMENT)!;
    expect(x.priorDays).toEqual(['2026-10-08', '2026-10-01']);
    expect(x.raw.expected).toBe((11550 + 10909) / 2);
  });

  it('the line says unavailable and carries the reason, no digits', () => {
    const line = lib.sessionsExSegmentLine(null, 'GA4 could-not-run: no credentials');
    expect(line).toMatch(/^sessions ex .*: unavailable — GA4 could-not-run: no credentials$/);
    // nothing on the line may look like a reading: no "n vs n", no delta, no share
    expect(line).not.toMatch(/\d[\d,]*\s+vs\s+\d/);
    expect(line).not.toMatch(/[+-]?\d+(\.\d+)?%/);
    expect(line).not.toMatch(/raw|ex-segment|segment \d/);
  });
});

describe('E227 — the script is wired to the lib and the status rules still read Mediavine', () => {
  const src = stripComments(readFileSync(join(ROOT, 'scripts/agents/revenue-guardrail.ts'), 'utf8'));

  it('pulls GA4 with segmentDimensionFilter() and prints sessionsExSegmentLine()', () => {
    expect(src).toMatch(/segmentDimensionFilter\(\)/);
    expect(src).toMatch(/sessionsExSegment\(/);
    expect(src).toMatch(/sessionsExSegmentLine\(/);
  });

  it('the status rules are still computed from the Mediavine rows (rSess from actualDay/expectedDay)', () => {
    expect(src).toMatch(/rSess = actualDay\.sessions \/ expectedDay\.sessions/);
    expect(src).not.toMatch(/rSess\s*=\s*[^;]*exSegment/);
  });
});
