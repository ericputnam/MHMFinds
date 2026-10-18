/**
 * E236 (2026-10-18, Ops; spec Pip 10-16) — the scoreboard prints a `direct_ex_sg_bot` row in its
 * Audience table and a 28d "headline ex segment" bullet, both built from E216's `SG_DIRECT_RULE`
 * (imported, never restated). 10-18's scoreboard read Direct 10,839 vs 5,904 (+83.6%) and the digest
 * quoted the 28d headline at 101.6% of line with "≈97.5% ex" computed by hand.
 *
 * Against pre-E236 `origin/main` the "wired" describe fails on every assertion (the scoreboard has no
 * row, no import, no bullet) and the lib describe fails on module load — the red is the row's absence.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SG_DIRECT_RULE } from '../../scripts/agents/direct-bot-lib';
import * as lib from '../../scripts/agents/scoreboard-segment-lib';

const ROOT = join(__dirname, '..', '..');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('E236 — the segment is E216\'s constant, not a copy', () => {
  it('the rule object is the one direct-bot-lib exports', () => {
    expect(lib.SESSIONS_SEGMENT_RULE).toBe(SG_DIRECT_RULE);
  });
  it('the GA4 filter is the andGroup of country + sessionSource EXACT from the imported rule', () => {
    expect(lib.segmentDimensionFilter()).toEqual({
      andGroup: {
        expressions: [
          { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: SG_DIRECT_RULE.country } } },
          { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'EXACT', value: SG_DIRECT_RULE.source } } },
        ],
      },
    });
  });
  it('the segment source is exactly the scoreboard Direct selector, so it subtracts cleanly', () => {
    const scoreboard = stripComments(readFileSync(join(ROOT, 'scripts/agents/funnel-scoreboard.ts'), 'utf8'));
    expect(scoreboard).toContain(`src === '${SG_DIRECT_RULE.source}'`);
  });
});

describe('E236 — direct_ex_sg_bot row', () => {
  it('subtracts the segment from Direct for both windows', () => {
    const x = lib.directExSegment({ curr: 10839, prev: 5904 }, { curr: 7000, prev: 2300 });
    expect(x).not.toBeNull();
    expect(x!.exSegment).toEqual({ curr: 3839, prev: 3604 });
    expect(lib.directExSegmentRow(x)).toBe('| direct_ex_sg_bot | 3,839 | 3,604 | +6.5% |');
  });
  it('a failed segment pull prints unavailable cells, never a number', () => {
    expect(lib.directExSegment({ curr: 10839, prev: 5904 }, null)).toBeNull();
    expect(lib.directExSegmentRow(null)).toBe('| direct_ex_sg_bot | unavailable | unavailable | — |');
  });
  it('a segment larger than Direct is a basis error, not a negative reading', () => {
    expect(lib.directExSegment({ curr: 100, prev: 100 }, { curr: 101, prev: 0 })).toBeNull();
  });
  it('an empty segment leaves Direct unchanged', () => {
    expect(lib.directExSegment({ curr: 50, prev: 40 }, { curr: 0, prev: 0 })!.exSegment).toEqual({ curr: 50, prev: 40 });
  });
});

describe('E236 — 28d headline ex segment', () => {
  const days = (n: number, end = '2026-10-16') => {
    const out: lib.HistoryDayLike[] = [];
    const [y, m, d] = end.split('-').map(Number);
    for (let i = n - 1; i >= 0; i -= 1) out.push({ date: new Date(Date.UTC(y, m - 1, d - i)).toISOString().slice(0, 10), sessions: 1000, expectedSessions: 1000 });
    return out;
  };
  const siteOf = (h: lib.HistoryDayLike[], v = 1000) => Object.fromEntries(h.map((d) => [d.date, v]));

  it('scales each day by (1 − segment ÷ GA4 site) and divides by the same days\' line', () => {
    const h = [...days(30), { date: '2026-10-17', sessions: null, expectedSessions: 14616 }];
    const seg = Object.fromEntries(h.slice(-29, -1).map((d) => [d.date, 40]));
    const r = lib.headlineExSegment(h, siteOf(h), seg);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.start).toBe('2026-09-19');
    expect(r.value.end).toBe('2026-10-16');
    expect(r.value.sessions).toBe(28000);
    expect(r.value.line).toBe(28000);
    expect(r.value.exSegmentSessions).toBeCloseTo(26880, 6);
    expect(r.value.exSegmentRatio).toBeCloseTo(0.96, 9);
    expect(r.value.segmentShareGa4).toBeCloseTo(0.04, 9);
    expect(lib.headlineExSegmentLine(r)).toContain('= 100.0% → ex segment 26,880 = 96.0% of line (2026-09-19→2026-10-16');
  });
  it('a GA4 day missing in the window is unavailable, not a reading', () => {
    const h = days(28);
    const site = siteOf(h);
    delete site['2026-10-01'];
    const r = lib.headlineExSegment(h, site, {});
    expect(r).toEqual({ ok: false, why: 'GA4 site sessions missing for 2026-10-01' });
    expect(lib.headlineExSegmentLine(r)).toMatch(/: unavailable — GA4 site sessions missing for 2026-10-01$/);
  });
  it('too little history or a gap in it is unavailable', () => {
    expect(lib.headlineExSegment(days(27), siteOf(days(27)), {}).ok).toBe(false);
    const h = days(28);
    h[3] = { ...h[3], expectedSessions: null };
    expect(lib.headlineExSegment(h, siteOf(h), {})).toEqual({ ok: false, why: `history.json has no expectedSessions for ${h[3].date}` });
  });
  it('an empty segment reads exactly the raw ratio', () => {
    const h = days(28);
    const r = lib.headlineExSegment(h, siteOf(h), {});
    expect(r.ok && r.value.exSegmentRatio).toBe(r.ok && r.value.ratio);
  });
});

describe('E236 — wired into funnel-scoreboard.ts', () => {
  const src = stripComments(readFileSync(join(ROOT, 'scripts/agents/funnel-scoreboard.ts'), 'utf8'));
  it('imports the lib and pulls the segment with segmentDimensionFilter (no restated rule)', () => {
    expect(src).toMatch(/from '\.\/scoreboard-segment-lib'/);
    expect(src).toContain('segmentDimensionFilter()');
    expect(src).not.toMatch(/value: 'Singapore'/);
  });
  it('prints the row inside the Audience table and the 28d bullet', () => {
    expect(src).toContain('directExSegmentRow(');
    expect(src).toContain('headlineExSegmentLine(');
  });
  it('the headline read comes from history.json via its contract fields, and writes no history file', () => {
    expect(src).toMatch(/'history\.json'/);
    expect(src).not.toMatch(/writeFileSync\([^)]*history/);
  });
});
