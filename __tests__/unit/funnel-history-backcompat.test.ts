import { describe, it, expect } from 'vitest';
import { computeRolling28d, counterChange, FunnelDayRecord, summarizeRange } from '@/lib/funnel/dashboardMath';

/**
 * Backward-compat guard for the E-audit long-range/team-health fields added
 * to FunnelDayRecord (2026-09-22). Older reports/funnel/history.json days
 * were written before those fields existed, so this simulates parsing an
 * OLD-FORMAT day (JSON with none of the new keys) and confirms every
 * consumer in dashboardMath.ts degrades to null/absent rather than throwing.
 *
 * funnel-history.ts itself calls main() unconditionally at import time (it's
 * a standalone script, not a side-effect-free module), so it can't be
 * imported directly in a unit test -- this exercises the same DayEntry/
 * FunnelDayRecord contract through the pure consumer the page depends on.
 */

const OLD_FORMAT_DAY_JSON = `{
  "date": "2026-01-01",
  "revenue": 100,
  "sessions": 10000,
  "rpm": 10,
  "expectedRevenue": 100,
  "expectedSessions": 10000,
  "nonAdMonthly": 500,
  "ownedAdds7d": 12,
  "pinterestSessions7d": 3000
}`;

describe('FunnelDayRecord backward compatibility', () => {
  it('parses an old-format day (no long-range/team-health keys) as a valid FunnelDayRecord', () => {
    const day = JSON.parse(OLD_FORMAT_DAY_JSON) as FunnelDayRecord;
    expect(day.date).toBe('2026-01-01');
    // The new fields are simply absent -- optional-chaining reads null/undefined, never throws.
    expect(day.returningShare7d).toBeUndefined();
    expect(day.nonPinterestShare7d ?? null).toBeNull();
    expect(day.mergesByOwner7d ?? null).toBeNull();
  });

  it('computeRolling28d tolerates a mix of old-format and new-format days', () => {
    const oldDay = JSON.parse(OLD_FORMAT_DAY_JSON) as FunnelDayRecord;
    const newDay: FunnelDayRecord = {
      ...oldDay,
      date: '2026-01-02',
      returningShare7d: 0.42,
      catalogTotal: 5000,
    };
    expect(() => computeRolling28d([oldDay, newDay])).not.toThrow();
    const points = computeRolling28d([oldDay, newDay]);
    expect(points).toHaveLength(2);
  });

  it('summarizeRange and counterChange tolerate old-format days with the new fields missing', () => {
    const days: FunnelDayRecord[] = Array.from({ length: 5 }, (_, i) => ({
      ...(JSON.parse(OLD_FORMAT_DAY_JSON) as FunnelDayRecord),
      date: `2026-01-0${i + 1}`,
    }));
    expect(() => summarizeRange(days, '2026-01-05', 5)).not.toThrow();
    expect(() => counterChange(days, (d) => d.ownedAdds7d, '2026-01-01', '2026-01-05')).not.toThrow();
    // A field that doesn't exist on any day in range still degrades to a
    // clean "no data" read instead of throwing.
    expect(() => counterChange(days, (d) => d.captureRatePer1k ?? null, '2026-01-01', '2026-01-05')).not.toThrow();
  });

  it('a page-style tile reader falls back to "—" for a field absent from an old-format day', () => {
    const day = JSON.parse(OLD_FORMAT_DAY_JSON) as FunnelDayRecord;
    const renderTileValue = (v: number | null | undefined) => (v == null ? '—' : String(v));
    expect(renderTileValue(day.pagesPerSession7d)).toBe('—');
    expect(renderTileValue(day.ownedAdds7d)).toBe('12');
  });
});
