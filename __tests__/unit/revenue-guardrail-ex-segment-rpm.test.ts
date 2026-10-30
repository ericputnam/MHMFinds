/**
 * E271 (2026-10-25, Rio) — the revenue guardrail prints the ex-segment RPM on every day, green or red,
 * so a headline RPM move that is only the Singapore Direct segment's share moving is read as mix, in
 * either direction, and never booked as demand.
 *
 * Two real mornings pin the two reads:
 *   - 10-21 Wednesday (verdict 10-23): headline RPM +2.5%, segment 1.25% vs 6.29% → mix alone predicts
 *     +5.4%; ex-segment RPM $17.03 vs $17.09 (−0.3%) → mix. A flat demand day that read as a lift.
 *   - 10-23 Friday (verdict 10-25): headline RPM +10.8%, segment 1.92% vs 3.03% → mix alone predicts
 *     +1.1%; ex-segment RPM $18.38 vs $16.61 (+10.7%) → rate (imp/mon_pv +5.9% × CPM +4.8%).
 *
 * Against pre-E271 `origin/main` the lib describes fail on module load (no `exSegmentRpm` export) and the
 * source-scan describe fails on every assertion — the red is behavioural.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SG_DIRECT_RULE } from '../../scripts/agents/direct-bot-lib';
import * as lib from '../../scripts/agents/revenue-guardrail-lib';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const rule = { experiment: SG_DIRECT_RULE.experiment, country: SG_DIRECT_RULE.country, source: SG_DIRECT_RULE.source };

// guardrail-2026-10-25.json → sessionsExSegment (judged day 2026-10-23, GA4 property 437117335).
const THU_1023: lib.SessionsExSegment = {
  rule, day: '2026-10-23', priorDays: ['2026-10-16', '2026-10-09', '2026-10-02', '2026-09-25'],
  raw: { actual: 11849, expected: 12197.75 },
  segment: { actual: 228, expected: 369, shareActual: 228 / 11849, shareExpected: 369 / 12197.75 },
  exSegment: { actual: 11621, expected: 11828.75 },
};
// rio-verdict-2026-10-23.md §1b (judged day 2026-10-21): site 11,160 / segment 139; controls 734.5 of 11,669.25.
const WED_1021: lib.SessionsExSegment = {
  rule, day: '2026-10-21', priorDays: ['2026-10-14', '2026-10-07', '2026-09-30', '2026-09-23'],
  raw: { actual: 11160, expected: 11669.25 },
  segment: { actual: 139, expected: 734.5, shareActual: 139 / 11160, shareExpected: 734.5 / 11669.25 },
  exSegment: { actual: 11021, expected: 10934.75 },
};

describe('E271 — the band is one exported constant', () => {
  it('EX_SEGMENT_RPM_MIX_BAND is 1% and is the default the functions read', () => {
    expect(lib.EX_SEGMENT_RPM_MIX_BAND).toBe(0.01);
    const r = lib.exSegmentRpm(THU_1023, 213.63, 196.45)!;
    expect(r).toEqual(lib.exSegmentRpm(THU_1023, 213.63, 196.45, lib.EX_SEGMENT_RPM_MIX_BAND));
  });

  it('a delta exactly on the band reads mix; one hair outside reads rate', () => {
    // 1,000 ex-segment sessions both sides; revenue 101 vs 100 → delta exactly +1.0%.
    const flat: lib.SessionsExSegment = { ...THU_1023, exSegment: { actual: 1000, expected: 1000 } };
    expect(lib.exSegmentRpm(flat, 101, 100)!.read).toBe('mix');
    expect(lib.exSegmentRpm(flat, 101.01, 100)!.read).toBe('rate');
  });
});

describe('E271 — 2026-10-23 Friday: headline RPM +10.8% is rate, not the segment', () => {
  const r = lib.exSegmentRpm(THU_1023, 213.63, 196.45)!;

  it('ex-segment RPM $18.38 vs $16.61 (+10.7%), mix alone predicts +1.1% → rate', () => {
    expect(r.actual).toBeCloseTo(18.383, 2);
    expect(r.expected).toBeCloseTo(16.608, 2);
    expect(r.exSegmentRpmDelta).toBeCloseTo(0.1069, 3);
    expect(r.mixPredictedRpmDelta!).toBeCloseTo(0.0114, 3);
    expect(r.read).toBe('rate');
  });

  it('the line carries the rule, both RPMs, the delta, the mix prediction and the read, in that order', () => {
    expect(lib.exSegmentRpmLine(r)).toBe(
      `ex-segment RPM (${SG_DIRECT_RULE.experiment}; Mediavine revenue ÷ GA4 sessions ex ${SG_DIRECT_RULE.country} ${SG_DIRECT_RULE.source}): $18.38 vs $16.61 (+10.7%) · mix alone predicts raw RPM +1.1% → rate (mix band ±1%)`,
    );
  });
});

describe('E271 — 2026-10-21 Wednesday: headline RPM +2.5% was the segment shrinking', () => {
  const r = lib.exSegmentRpm(WED_1021, 187.68, 186.84)!;

  it('ex-segment RPM $17.03 vs $17.09 (−0.3%), mix alone predicts +5.4% → mix', () => {
    expect(r.actual).toBeCloseTo(17.029, 2);
    expect(r.expected).toBeCloseTo(17.087, 2);
    expect(r.exSegmentRpmDelta).toBeCloseTo(-0.0034, 3);
    expect(r.mixPredictedRpmDelta!).toBeCloseTo(0.0538, 3);
    expect(r.read).toBe('mix');
    expect(lib.exSegmentRpmLine(r)).toContain('$17.03 vs $17.09 (-0.3%) · mix alone predicts raw RPM +5.4% → mix');
  });
});

describe('E271 — could-not-run is unavailable, never a number', () => {
  it('null input, non-positive revenue, or non-positive ex-segment sessions → null', () => {
    expect(lib.exSegmentRpm(null, 213.63, 196.45)).toBeNull();
    expect(lib.exSegmentRpm(THU_1023, 0, 196.45)).toBeNull();
    expect(lib.exSegmentRpm(THU_1023, 213.63, 0)).toBeNull();
    expect(lib.exSegmentRpm({ ...THU_1023, exSegment: { actual: 0, expected: 11828.75 } }, 213.63, 196.45)).toBeNull();
    expect(lib.exSegmentRpm({ ...THU_1023, exSegment: { actual: 11621, expected: 0 } }, 213.63, 196.45)).toBeNull();
  });

  it('a null share leaves the mix prediction n/a but still classifies on the ex-segment delta', () => {
    const r = lib.exSegmentRpm({ ...THU_1023, segment: { ...THU_1023.segment, shareExpected: null } }, 213.63, 196.45)!;
    expect(r.mixPredictedRpmDelta).toBeNull();
    expect(r.read).toBe('rate');
    expect(lib.exSegmentRpmLine(r)).toContain('mix alone predicts raw RPM n/a → rate');
  });

  it('the line says unavailable and carries the reason, no digits that look like a reading', () => {
    const line = lib.exSegmentRpmLine(null, 'GA4 could-not-run: no credentials');
    expect(line).toMatch(/^ex-segment RPM .*: unavailable — GA4 could-not-run: no credentials$/);
    expect(line).not.toMatch(/\$\d/);
    expect(line).not.toMatch(/\d[\d,.]*\s+vs\s+\$?\d/);
    expect(line).not.toMatch(/→ (mix|rate)/);
  });
});

describe('E271 — the script is wired to the lib and the status rules still ignore it', () => {
  const src = stripComments(readFileSync(join(ROOT, 'scripts/agents/revenue-guardrail.ts'), 'utf8'));

  it('computes exSegmentRpm() from the Mediavine day/expected revenue and prints exSegmentRpmLine()', () => {
    expect(src).toMatch(/exSegmentRpm\(exSeg, actualDay\.revenue, expectedDay\.revenue\)/);
    expect(src).toMatch(/exSegmentRpmLine\(/);
    expect(src).toMatch(/sessionsExSegmentRpm: exSegRpm/);
    expect(src).toMatch(/sessionsExSegmentRpmLine: exSegRpmLine/);
  });

  it('no status assignment reads the ex-segment RPM (it is informational)', () => {
    const statusLines = src.split('\n').filter((l) => /status = '/.test(l) || /if \(\(?rRpm|else if \(rRev/.test(l));
    expect(statusLines.length).toBeGreaterThan(2);
    for (const l of statusLines) expect(l).not.toMatch(/exSegRpm|exSegmentRpm/);
  });

  it('neither the lib nor the script restates the band as a second literal (comments stripped)', () => {
    const libSrc = stripComments(readFileSync(join(ROOT, 'scripts/agents/revenue-guardrail-lib.ts'), 'utf8'));
    expect(libSrc.match(/\b0\.01\b/g)?.length ?? 0).toBe(1);
    expect(src).not.toMatch(/\b0\.01\b/);
  });
});
