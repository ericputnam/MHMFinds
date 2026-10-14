import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  summarizeCreatorLandings,
  formatCreatorLandings,
  CREATOR_LANDING_BASELINE,
  EARNED_CHANNEL_GROUPS,
  type ChannelRow,
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
