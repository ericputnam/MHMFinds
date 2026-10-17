import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  summarizeCreatorLandings,
  formatCreatorLandings,
  CREATOR_LANDING_BASELINE,
  EARNED_CHANNEL_GROUPS,
  type ChannelRow,
  sourceMatchedRead,
  bucketSource,
  SOURCE_BASELINE,
  SOURCE_BUCKETS,
} from '@/lib/funnel/creatorLandings';

// GA4 reads taken 2026-10-14 (landingPage BEGINS_WITH /creator/, by
// sessionDefaultChannelGroup) — the populations the E204 rule was written on.
const BASE_WEEK: ChannelRow[] = [ // 2026-09-23→2026-09-29
  { channelGroup: 'Direct', sessions: 420 },
  { channelGroup: 'Organic Search', sessions: 136 },
  { channelGroup: 'AI Assistant', sessions: 29 },
];
const READ_WEEK: ChannelRow[] = [ // 2026-10-07→2026-10-13 (E144 read)
  { channelGroup: 'Direct', sessions: 168 },
  { channelGroup: 'Organic Search', sessions: 120 },
  { channelGroup: 'AI Assistant', sessions: 12 },
  { channelGroup: 'Referral', sessions: 1 },
];
const SITE_BASE = 23746 + 370;
const SITE_READ = 21471 + 191;

describe('creator landings guard basis (E204)', () => {
  it('baseline is the frozen organic+AI re-read of the E144 week, not the all-channel 558', () => {
    expect(CREATOR_LANDING_BASELINE.window).toBe('2026-09-23→2026-09-29');
    expect(CREATOR_LANDING_BASELINE.creatorOrganicAi).toBe(136 + 29);
    expect(CREATOR_LANDING_BASELINE.siteOrganicAi).toBe(SITE_BASE);
    expect(CREATOR_LANDING_BASELINE.creatorOrganicAi).not.toBe(CREATOR_LANDING_BASELINE.supersededAllChannelBaseline);
    expect([...EARNED_CHANNEL_GROUPS].sort()).toEqual(['AI Assistant', 'Organic Search']);
  });

  it('the baseline week reproduces itself exactly (ratio 1, pass)', () => {
    const s = summarizeCreatorLandings(BASE_WEEK, SITE_BASE);
    expect(s.organicAi).toBe(165);
    expect(s.all).toBe(585);
    expect(s.ratio).toBeCloseTo(1, 10);
    expect(s.guard).toBe('pass');
  });

  it('a Direct-only collapse does not breach the guard (it did under the 558 basis)', () => {
    // Same earned traffic as the baseline, Direct falls 420 → 168.
    const rows = BASE_WEEK.map((r) => (r.channelGroup === 'Direct' ? { ...r, sessions: 168 } : r));
    const s = summarizeCreatorLandings(rows, SITE_BASE);
    expect(s.guard).toBe('pass');
    // The superseded rule would have read 333/558 = 59.7% and failed.
    expect(s.all / CREATOR_LANDING_BASELINE.supersededAllChannelBaseline).toBeLessThan(0.95);
  });

  it('a sitewide organic dip is not charged to /creator/* (site-relative)', () => {
    // Creator earned traffic falls 10% exactly in line with the site.
    const rows: ChannelRow[] = [{ channelGroup: 'Organic Search', sessions: 122 }, { channelGroup: 'AI Assistant', sessions: 26 }];
    const s = summarizeCreatorLandings(rows, Math.round(SITE_BASE * 0.9));
    expect(s.guard).toBe('pass');
  });

  it('the first real read (10-07→10-13) FAILS on the new basis too — re-basing is not laundering', () => {
    const s = summarizeCreatorLandings(READ_WEEK, SITE_READ);
    expect(s.organicAi).toBe(132);
    expect(s.direct).toBe(168);
    expect(s.ratio!).toBeGreaterThan(0.89);
    expect(s.ratio!).toBeLessThan(0.892);
    expect(s.guard).toBe('fail');
  });

  it('compares exact fractions at the 95% boundary', () => {
    // site flat: pass iff 100·c ≥ 95·165 = 15675 → c ≥ 156.75 → 157 passes, 156 fails.
    const at = (c: number) => summarizeCreatorLandings([{ channelGroup: 'Organic Search', sessions: c }], SITE_BASE).guard;
    expect(at(157)).toBe('pass');
    expect(at(156)).toBe('fail');
    // exact equality must pass: baseline 100/1000, read 95 with site flat.
    expect(summarizeCreatorLandings([{ channelGroup: 'Organic Search', sessions: 95 }], 1000, { creatorOrganicAi: 100, siteOrganicAi: 1000 }).guard).toBe('pass');
  });

  it('could-not-run is unknown, never a verdict', () => {
    expect(summarizeCreatorLandings([], SITE_READ).guard).toBe('unknown');
    expect(summarizeCreatorLandings(READ_WEEK, null).guard).toBe('unknown');
    expect(summarizeCreatorLandings(READ_WEEK, 0).guard).toBe('unknown');
    expect(formatCreatorLandings(summarizeCreatorLandings(READ_WEEK, null))).toContain('guard unknown');
  });

  it('the scoreboard prints the row through this module (not a hand-rolled copy)', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8');
    expect(src).toContain("from '../../lib/funnel/creatorLandings'");
    expect(src).toContain('summarizeCreatorLandings(');
    expect(src).toContain('formatCreatorLandings(');
    expect(src).toContain('Sessions to creator pages 7d');
  });
});

// E225 (2026-10-17): GA4 read of 2026-10-10→2026-10-16, landingPage BEGINS_WITH
// /creator/ by channel group × sessionSource (earned rows only + Direct).
const E225_CREATOR: ChannelRow[] = [
  { channelGroup: 'Direct', source: '(direct)', sessions: 73 },
  { channelGroup: 'Organic Search', source: 'google', sessions: 61 },
  { channelGroup: 'Organic Search', source: 'bing', sessions: 36 },
  { channelGroup: 'Organic Search', source: 'cn.bing.com', sessions: 12 },
  { channelGroup: 'AI Assistant', source: 'chatgpt.com', sessions: 7 },
  { channelGroup: 'Organic Search', source: 'yahoo', sessions: 6 },
  { channelGroup: 'Organic Search', source: 'uk.search.yahoo.com', sessions: 5 },
  { channelGroup: 'Organic Search', source: 'yandex.ru', sessions: 5 },
  { channelGroup: 'AI Assistant', source: 'gemini.google.com', sessions: 4 },
  { channelGroup: 'AI Assistant', source: 'copilot.com', sessions: 1 },
  { channelGroup: 'Organic Search', source: 'fi.search.yahoo.com', sessions: 1 },
  { channelGroup: 'Organic Search', source: 'it.search.yahoo.com', sessions: 1 },
];
// Sitewide organic+AI, same window: google 2,807; bing 14,794 + cn.bing 76;
// chatgpt.com 154; everything else 3,728 (total 21,559).
const E225_SITE: ChannelRow[] = [
  { channelGroup: 'Organic Search', source: 'google', sessions: 2807 },
  { channelGroup: 'Organic Search', source: 'bing', sessions: 14794 },
  { channelGroup: 'Organic Search', source: 'cn.bing.com', sessions: 76 },
  { channelGroup: 'AI Assistant', source: 'chatgpt.com', sessions: 154 },
  { channelGroup: 'Organic Search', source: 'yahoo', sessions: 3728 },
];

describe('source-matched control (E225, diagnostic only)', () => {
  it('per-bucket baseline sums to the frozen E204 baseline', () => {
    const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
    expect(sum(SOURCE_BASELINE.creator)).toBe(CREATOR_LANDING_BASELINE.creatorOrganicAi);
    expect(sum(SOURCE_BASELINE.site)).toBe(CREATOR_LANDING_BASELINE.siteOrganicAi);
    expect([...SOURCE_BUCKETS]).toEqual(['google', 'bing', 'chatgpt', 'other']);
  });

  it('buckets sources by exact host, not substring', () => {
    expect(bucketSource('google')).toBe('google');
    expect(bucketSource('gemini.google.com')).toBe('other');
    expect(bucketSource('cn.bing.com')).toBe('bing');
    expect(bucketSource('bing')).toBe('bing');
    expect(bucketSource('notbing.example')).toBe('other');
    expect(bucketSource('chatgpt.com')).toBe('chatgpt');
    expect(bucketSource(undefined)).toBe('other');
  });

  it('10-10→16: site-relative FAILs while source-matched is ~flat — the gap is sitewide ChatGPT', () => {
    const siteTotal = E225_SITE.reduce((n, r) => n + r.sessions, 0);
    expect(siteTotal).toBe(21559);
    const s = summarizeCreatorLandings(E225_CREATOR, siteTotal);
    expect(s.organicAi).toBe(139);
    expect(s.guard).toBe('fail');
    const m = sourceMatchedRead(E225_CREATOR, E225_SITE)!;
    expect(m.actual).toBe(139);
    expect(m.expected).toBeGreaterThan(139);
    expect(m.expected).toBeLessThan(139.5);
    expect(m.byBucket.chatgpt).toEqual({ actual: 7, expected: (29 * 154) / 337 });
    // Bing is the one real residual (E218's target): 48 vs 67.5.
    expect(m.byBucket.bing.actual).toBe(48);
    expect(m.byBucket.bing.expected).toBeCloseTo((77 * 14870) / 16972, 6);
    // Direct never enters the read.
    expect(Object.values(m.byBucket).reduce((n, b) => n + b.actual, 0)).toBe(139);
  });

  it('never changes the verdict, and prints only when it was read', () => {
    const siteTotal = 21559;
    const s = summarizeCreatorLandings(E225_CREATOR, siteTotal);
    const withRead = { ...s, sourceMatched: sourceMatchedRead(E225_CREATOR, E225_SITE) };
    expect(withRead.guard).toBe('fail');
    expect(formatCreatorLandings(withRead)).toContain('FAIL (≥95%) · source-matched 99.8% (diagnostic; google 61/52.0, bing 48/67.5, chatgpt 7/13.3, other 23/6.5)');
    expect(formatCreatorLandings(s)).not.toContain('source-matched');
  });

  it('is could-not-run (null) when source is missing or rows are empty', () => {
    expect(sourceMatchedRead(READ_WEEK, E225_SITE)).toBeNull();
    expect(sourceMatchedRead(E225_CREATOR, [])).toBeNull();
    expect(sourceMatchedRead([], E225_SITE)).toBeNull();
  });

  it('the scoreboard requests sessionSource and wires the read', () => {
    const src = readFileSync(join(process.cwd(), 'scripts/agents/funnel-scoreboard.ts'), 'utf8');
    expect(src).toContain('sourceMatchedRead(creatorRows, siteRows)');
    expect((src.match(/\{ name: 'sessionDefaultChannelGroup' \}, \{ name: 'sessionSource' \}/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
