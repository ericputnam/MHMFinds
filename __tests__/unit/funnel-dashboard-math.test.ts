import { describe, it, expect } from 'vitest';
import {
  addDaysUTC,
  computeRolling28d,
  expectedRevenueAt,
  expectedSessionsAt,
  formatCurrency,
  formatCompactNumber,
  formatPercent,
  gradeVerdict,
  interpolateExpectation,
  isBelowThreshold,
  latestFinalizedRolling28d,
  parseDateUTC,
  FunnelDayRecord,
  FunnelExpectation,
} from '@/lib/funnel/dashboardMath';

/**
 * Tests for the /admin/funnel scoreboard math. These are pure-function tests
 * with hand-built fixtures (not the large sample history) so the expected
 * values can be checked by hand.
 */

function makeDay(overrides: Partial<FunnelDayRecord> & { date: string }): FunnelDayRecord {
  return {
    revenue: 100,
    sessions: 10000,
    rpm: 10,
    expectedRevenue: 100,
    expectedSessions: 10000,
    nonAdMonthly: null,
    ownedAdds7d: null,
    pinterestSessions7d: null,
    ...overrides,
  };
}

const EXPECTATION: FunnelExpectation = {
  startDate: '2026-01-01',
  endDate: '2026-01-31', // 30 days later
  revenue28dStart: 1000,
  revenue28dEnd: 4000,
  sessions28dStart: 100000,
  sessions28dEnd: 400000,
  basis: 'test fixture',
};

describe('parseDateUTC / addDaysUTC', () => {
  it('parses a date string as a UTC midnight timestamp', () => {
    expect(parseDateUTC('2026-01-01')).toBe(Date.UTC(2026, 0, 1));
  });

  it('adds days and rolls over month boundaries', () => {
    expect(addDaysUTC('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDaysUTC('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('interpolateExpectation', () => {
  it('returns the start value at the start date', () => {
    expect(interpolateExpectation('2026-01-01', '2026-01-31', 1000, 4000, '2026-01-01')).toBe(1000);
  });

  it('returns the end value at the end date', () => {
    expect(interpolateExpectation('2026-01-01', '2026-01-31', 1000, 4000, '2026-01-31')).toBe(4000);
  });

  it('interpolates linearly at the midpoint', () => {
    // 15 days into a 30-day span is exactly halfway
    const mid = interpolateExpectation('2026-01-01', '2026-01-31', 1000, 4000, '2026-01-16');
    expect(mid).toBeCloseTo(2500, 0);
  });

  it('clamps to the start value before the start date', () => {
    expect(interpolateExpectation('2026-01-01', '2026-01-31', 1000, 4000, '2025-12-01')).toBe(1000);
  });

  it('clamps to the end value after the end date', () => {
    expect(interpolateExpectation('2026-01-01', '2026-01-31', 1000, 4000, '2026-06-01')).toBe(4000);
  });
});

describe('expectedRevenueAt / expectedSessionsAt', () => {
  it('reads from the expectation object', () => {
    expect(expectedRevenueAt(EXPECTATION, '2026-01-01')).toBe(1000);
    expect(expectedSessionsAt(EXPECTATION, '2026-01-31')).toBe(400000);
  });
});

describe('computeRolling28d', () => {
  it('leaves the first 27 days null (not enough trailing history)', () => {
    const days: FunnelDayRecord[] = Array.from({ length: 27 }, (_, i) =>
      makeDay({ date: addDaysUTC('2026-01-01', i) })
    );
    const rolling = computeRolling28d(days);
    expect(rolling).toHaveLength(27);
    expect(rolling.every((p) => p.actualRevenue28d === null && p.actualSessions28d === null)).toBe(true);
  });

  it('sums a full 28-day trailing window on day 28', () => {
    const days: FunnelDayRecord[] = Array.from({ length: 28 }, (_, i) =>
      makeDay({ date: addDaysUTC('2026-01-01', i), revenue: 100, sessions: 10000 })
    );
    const rolling = computeRolling28d(days);
    const last = rolling[rolling.length - 1];
    expect(last.actualRevenue28d).toBe(28 * 100);
    expect(last.actualSessions28d).toBe(28 * 10000);
  });

  it('adds a pro-rated non-ad monthly contribution using the window\'s most recent day', () => {
    const days: FunnelDayRecord[] = Array.from({ length: 28 }, (_, i) =>
      makeDay({
        date: addDaysUTC('2026-01-01', i),
        revenue: 100,
        sessions: 10000,
        nonAdMonthly: i === 27 ? 304 : null, // only the latest day carries a value
      })
    );
    const rolling = computeRolling28d(days);
    const last = rolling[rolling.length - 1];
    // 28 * 100 = 2800 revenue, + 304 * 28 / 30.4 = 280 non-ad contribution
    expect(last.actualRevenue28d).toBeCloseTo(2800 + 280, 5);
  });

  it('returns null for a window containing an unfinalized (null) day', () => {
    const days: FunnelDayRecord[] = Array.from({ length: 28 }, (_, i) =>
      makeDay({
        date: addDaysUTC('2026-01-01', i),
        revenue: i === 27 ? null : 100,
        sessions: i === 27 ? null : 10000,
      })
    );
    const rolling = computeRolling28d(days);
    const last = rolling[rolling.length - 1];
    expect(last.actualRevenue28d).toBeNull();
    expect(last.actualSessions28d).toBeNull();
  });
});

describe('latestFinalizedRolling28d', () => {
  it('finds the last point with both actuals populated, skipping trailing nulls', () => {
    const days: FunnelDayRecord[] = Array.from({ length: 30 }, (_, i) =>
      makeDay({
        date: addDaysUTC('2026-01-01', i),
        revenue: i >= 28 ? null : 100, // last 2 days unfinalized
        sessions: i >= 28 ? null : 10000,
      })
    );
    const rolling = computeRolling28d(days);
    const latest = latestFinalizedRolling28d(rolling);
    expect(latest).not.toBeNull();
    expect(latest?.date).toBe(addDaysUTC('2026-01-01', 27));
  });

  it('returns null when nothing is finalized', () => {
    const rolling = [{ date: '2026-01-01', actualRevenue28d: null, actualSessions28d: null }];
    expect(latestFinalizedRolling28d(rolling)).toBeNull();
  });
});

describe('gradeVerdict', () => {
  it('grades green when both revenue and sessions meet or exceed 97% of expectation', () => {
    const v = gradeVerdict(EXPECTATION, {
      date: '2026-01-01', // expected = start values exactly
      actualRevenue28d: 1000,
      actualSessions28d: 100000,
    });
    expect(v?.color).toBe('green');
  });

  it('grades yellow when one metric is between 90% and 97% of expectation', () => {
    const v = gradeVerdict(EXPECTATION, {
      date: '2026-01-01',
      actualRevenue28d: 950, // 95% of 1000
      actualSessions28d: 100000, // 100%
    });
    expect(v?.color).toBe('yellow');
  });

  it('grades red when either metric is below 90% of expectation', () => {
    const v = gradeVerdict(EXPECTATION, {
      date: '2026-01-01',
      actualRevenue28d: 1000, // 100% revenue
      actualSessions28d: 80000, // 80% sessions — falling traffic should fail the grade
    });
    expect(v?.color).toBe('red');
  });

  it('does not let a revenue/RPM gain on falling sessions grade as green', () => {
    const v = gradeVerdict(EXPECTATION, {
      date: '2026-01-01',
      actualRevenue28d: 1500, // 150% of expected revenue
      actualSessions28d: 85000, // 85% of expected sessions
    });
    expect(v?.color).toBe('red');
  });

  it('returns null when the point is not finalized', () => {
    expect(gradeVerdict(EXPECTATION, { date: '2026-01-01', actualRevenue28d: null, actualSessions28d: 100000 })).toBeNull();
  });
});

describe('isBelowThreshold', () => {
  it('flags actual below the ratio of expected', () => {
    expect(isBelowThreshold(70, 100, 0.8)).toBe(true);
    expect(isBelowThreshold(80, 100, 0.8)).toBe(false);
    expect(isBelowThreshold(90, 100, 0.8)).toBe(false);
  });

  it('is false when either value is null', () => {
    expect(isBelowThreshold(null, 100)).toBe(false);
    expect(isBelowThreshold(70, null)).toBe(false);
  });
});

describe('formatters', () => {
  it('formatCurrency rounds and adds thousands separators', () => {
    expect(formatCurrency(1234.56)).toBe('$1,235');
  });

  it('formatCompactNumber abbreviates thousands', () => {
    expect(formatCompactNumber(12345)).toBe('12.3k');
    expect(formatCompactNumber(500)).toBe('500');
  });

  it('formatPercent renders a fraction as a percent string', () => {
    expect(formatPercent(0.0523, 1)).toBe('5.2%');
  });
});
