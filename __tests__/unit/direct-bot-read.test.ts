import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildDirectBotRead,
  dateKeys,
  ga4DateKey,
  renderDirectBotReadMd,
  SG_DIRECT_RULE,
  type DailyRow,
  type SegmentDailyRow,
} from '../../scripts/agents/direct-bot-lib';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Real GA4 rows (property 437117335, pulled 2026-10-16 via the MCP) for the two 7-day windows the
 * 2026-10-16 scoreboard compared: 10-01→10-07 vs 10-08→10-14. `segment` is country=Singapore AND
 * channel Direct; site is unfiltered. GA4 `date` arrives as YYYYMMDD.
 */
const DAYS = dateKeys('2026-10-01', '2026-10-14');
const SITE = [10909, 11874, 14558, 15548, 11519, 10949, 10893, 11550, 11804, 13739, 15424, 13880, 12071, 12688];
const DIRECT_EX = [484, 437, 541, 519, 449, 452, 396, 435, 402, 404, 453, 426, 441, 473];
const SEG = [425, 222, 350, 352, 299, 193, 220, 1063, 222, 415, 595, 1600, 829, 1845];
const SEG_USERS = [425, 222, 352, 352, 299, 193, 219, 1066, 222, 415, 596, 1603, 829, 1846];
const SEG_PV = [425, 222, 352, 352, 299, 193, 224, 1066, 222, 415, 596, 1603, 829, 1846];
const SEG_ENG = [17, 12, 18, 14, 25, 23, 13, 84, 65, 224, 40, 512, 486, 41];

const ga4 = (k: string) => k.replace(/-/g, '');
const site: DailyRow[] = DAYS.map((d, i) => ({ date: ga4(d), sessions: SITE[i] }));
const direct: DailyRow[] = DAYS.map((d, i) => ({ date: ga4(d), sessions: DIRECT_EX[i] + SEG[i] }));
const segment: SegmentDailyRow[] = DAYS.map((d, i) => ({
  date: ga4(d),
  sessions: SEG[i],
  users: SEG_USERS[i],
  pageviews: SEG_PV[i],
  engaged: SEG_ENG[i],
}));
const FINGERPRINTS = { '1280x1200': 6380, '1366x1366': 2300, '1440x900': 20, '390x844': 3 };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe('direct-bot-lib: date helpers', () => {
  it('normalizes GA4 YYYYMMDD and passes YYYY-MM-DD through', () => {
    expect(ga4DateKey('20261012')).toBe('2026-10-12');
    expect(ga4DateKey('2026-10-12')).toBe('2026-10-12');
    expect(ga4DateKey('(other)')).toBe('');
  });
  it('enumerates inclusive keys without DST drift', () => {
    expect(dateKeys('2026-10-30', '2026-11-02')).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
  });
});

describe('direct-bot-lib: the 2026-10-16 read', () => {
  const r = buildDirectBotRead({ start: '2026-10-01', end: '2026-10-14', site, direct, segment, fingerprintSessions: FINGERPRINTS });

  it('shares and shape come out of the daily rows, not a stored number', () => {
    expect(r.siteSessions).toBe(sum(SITE));
    expect(r.segmentSessions).toBe(sum(SEG));
    expect(r.segmentShare).toBeCloseTo(sum(SEG) / sum(SITE), 6);
    expect(r.usersPerSession).toBeCloseTo(sum(SEG_USERS) / sum(SEG), 6);
    expect(r.pvPerSession).toBeCloseTo(sum(SEG_PV) / sum(SEG), 6);
    expect(r.peak).toEqual({ date: '2026-10-14', sessions: 1845 });
  });

  it('the +5.7% all-sessions week is +0.5% ex segment, and Direct +78% is −7.4%', () => {
    const w = r.wow!;
    expect(w.currStart).toBe('2026-10-08');
    expect(w.prevEnd).toBe('2026-10-07');
    expect(w.all.pct! * 100).toBeCloseTo(5.69, 1);
    expect(w.allExSegment.pct! * 100).toBeCloseTo(0.47, 1);
    expect(w.direct.pct! * 100).toBeGreaterThan(70);
    expect(w.directExSegment.pct! * 100).toBeCloseTo(-7.44, 1);
    expect(w.directExSegment.curr).toBe(sum(DIRECT_EX.slice(7)));
  });

  it('classifies automated on all three legs, with each leg named', () => {
    expect(r.verdict).toBe('automated');
    expect(r.verdictWhy).toHaveLength(3);
    expect(r.fingerprintShare).toBeCloseTo(8680 / 8703, 4);
    expect(r.fingerprintTop[0]).toEqual({ resolution: '1280x1200', sessions: 6380 });
  });

  it('prints the decision rule before the reading, and the rule constants, not a copy', () => {
    const md = renderDirectBotReadMd(r);
    expect(md.indexOf('## Decision rule')).toBeGreaterThan(0);
    expect(md.indexOf('## Decision rule')).toBeLessThan(md.indexOf('## Reading'));
    expect(md).toContain(`users/session ≥ ${SG_DIRECT_RULE.automated.minUsersPerSession}`);
    expect(md).toContain(SG_DIRECT_RULE.fingerprints.join(' + '));
    expect(md).toContain('**All sessions ex segment**');
    expect(md).toContain('never "human"');
  });
});

describe('direct-bot-lib: the rule can say no', () => {
  it('human-shaped traffic (1.6 pv/session, many devices) is inconclusive, never automated', () => {
    const human = segment.map((s) => ({ ...s, pageviews: Math.round(s.sessions * 1.6), users: Math.round(s.sessions * 0.8) }));
    const r = buildDirectBotRead({ start: '2026-10-01', end: '2026-10-14', site, direct, segment: human, fingerprintSessions: { '390x844': 500, '1920x1080': 400, '1280x1200': 100 } });
    expect(r.verdict).toBe('inconclusive');
    expect(r.verdictWhy.join(' ')).toMatch(/pageviews\/session .* > /);
    expect(r.verdictWhy.join(' ')).toMatch(/fingerprint share .* < /);
  });
  it('a failed fingerprint pull is inconclusive, not a verdict', () => {
    const r = buildDirectBotRead({ start: '2026-10-01', end: '2026-10-14', site, direct, segment, fingerprintSessions: null });
    expect(r.verdict).toBe('inconclusive');
    expect(r.verdictWhy).toContain('fingerprint share unavailable');
  });
  it('a window shorter than 14 days has no WoW block and an empty segment is not automated', () => {
    const r = buildDirectBotRead({ start: '2026-10-08', end: '2026-10-14', site, direct, segment: [], fingerprintSessions: FINGERPRINTS });
    expect(r.wow).toBeNull();
    expect(r.segmentSessions).toBe(0);
    expect(r.verdict).toBe('inconclusive');
    expect(renderDirectBotReadMd(r)).not.toContain('## WoW');
  });
});

describe('direct-bot-read.ts mirrors its consumer and respects the project-dir guard', () => {
  const entry = stripComments(read('scripts/agents/direct-bot-read.ts'));
  const scoreboard = stripComments(read('scripts/agents/funnel-scoreboard.ts'));

  it('the segment selector is the scoreboard Direct selector (guard the constant, not a copy)', () => {
    expect(scoreboard).toContain(`src === '${SG_DIRECT_RULE.source}'`);
    expect(entry).toContain("fieldName: 'sessionSource'");
    expect(entry).toContain('SG_DIRECT_RULE.source');
    expect(entry).not.toMatch(/sessionDefaultChannelGroup/);
  });
  it('resolves its output dir through requireProjectDir (E215), never a hard-coded checkout', () => {
    expect(entry).toMatch(/requireProjectDir\('direct-bot-read\.ts'\)/);
    expect(entry).not.toMatch(/MHM_PROJECT_DIR \?\?/);
    expect(entry).not.toContain('/Users/');
  });
});
