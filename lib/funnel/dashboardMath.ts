/**
 * Pure math helpers for the /admin/funnel dashboard.
 *
 * These compute 28-day rolling totals against the committed expectation
 * ramp in reports/funnel/history.json, and grade the funnel team's actual
 * performance against it. Kept dependency-free and side-effect-free so the
 * page component and __tests__/unit/funnel-dashboard-math.test.ts can both
 * import them directly.
 */

export interface FunnelDayRecord {
  date: string; // YYYY-MM-DD
  revenue: number | null;
  sessions: number | null;
  rpm: number | null;
  expectedRevenue: number | null;
  expectedSessions: number | null;
  nonAdMonthly: number | null;
  ownedAdds7d: number | null;
  pinterestSessions7d: number | null;
}

export interface FunnelExpectation {
  startDate: string;
  endDate: string;
  revenue28dStart: number;
  revenue28dEnd: number;
  sessions28dStart: number;
  sessions28dEnd: number;
  basis: string;
}

export interface FunnelEvent {
  date: string;
  kind: 'merge' | 'rollback' | 'incident' | 'check' | 'operator';
  label: string;
  commit?: string;
  result?: string;
}

export interface FunnelHistory {
  generatedAt: string;
  expectation: FunnelExpectation;
  days: FunnelDayRecord[];
  events: FunnelEvent[];
}

export interface Rolling28dPoint {
  date: string;
  /** Sum of the trailing 28 days' revenue plus a pro-rated non-ad monthly contribution, or null if the window isn't fully finalized. */
  actualRevenue28d: number | null;
  /** Sum of the trailing 28 days' sessions, or null if the window isn't fully finalized. */
  actualSessions28d: number | null;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_MONTH = 30.4; // matches the spec's nonAdMonthly -> 28d pro-ration factor
const ROLLING_WINDOW_DAYS = 28;

/** Parse a YYYY-MM-DD date string as a UTC timestamp (avoids local-timezone drift). */
export function parseDateUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

/**
 * Linearly interpolate a value between (startDate, startVal) and (endDate, endVal)
 * at `atDate`. Clamped to the endpoints outside the [startDate, endDate] range,
 * since the expectation ramp is only defined across that span.
 */
export function interpolateExpectation(
  startDate: string,
  endDate: string,
  startVal: number,
  endVal: number,
  atDate: string
): number {
  const t0 = parseDateUTC(startDate);
  const t1 = parseDateUTC(endDate);
  const t = parseDateUTC(atDate);

  if (t1 <= t0) return endVal;
  if (t <= t0) return startVal;
  if (t >= t1) return endVal;

  const frac = (t - t0) / (t1 - t0);
  return startVal + (endVal - startVal) * frac;
}

export function expectedRevenueAt(expectation: FunnelExpectation, atDate: string): number {
  return interpolateExpectation(
    expectation.startDate,
    expectation.endDate,
    expectation.revenue28dStart,
    expectation.revenue28dEnd,
    atDate
  );
}

export function expectedSessionsAt(expectation: FunnelExpectation, atDate: string): number {
  return interpolateExpectation(
    expectation.startDate,
    expectation.endDate,
    expectation.sessions28dStart,
    expectation.sessions28dEnd,
    atDate
  );
}

/**
 * Compute the 28-day rolling actual revenue/sessions for every day in `days`
 * that has a full, finalized 28-day trailing window (no nulls in the window).
 * Days without enough finalized history get `null` for both fields so callers
 * can stop drawing the "actual" line there.
 *
 * Revenue includes a pro-rated non-ad monthly contribution
 * (nonAdMonthly * 28 / 30.4), taken from the window's most recent day.
 */
export function computeRolling28d(days: FunnelDayRecord[]): Rolling28dPoint[] {
  const points: Rolling28dPoint[] = [];

  for (let i = 0; i < days.length; i++) {
    const date = days[i].date;

    if (i < ROLLING_WINDOW_DAYS - 1) {
      points.push({ date, actualRevenue28d: null, actualSessions28d: null });
      continue;
    }

    const window = days.slice(i - (ROLLING_WINDOW_DAYS - 1), i + 1);
    const hasGap = window.some((d) => d.revenue === null || d.sessions === null);

    if (hasGap) {
      points.push({ date, actualRevenue28d: null, actualSessions28d: null });
      continue;
    }

    const revenueSum = window.reduce((sum, d) => sum + (d.revenue as number), 0);
    const sessionsSum = window.reduce((sum, d) => sum + (d.sessions as number), 0);
    const latestNonAdMonthly = window[window.length - 1].nonAdMonthly;
    const nonAdContribution =
      typeof latestNonAdMonthly === 'number'
        ? (latestNonAdMonthly * ROLLING_WINDOW_DAYS) / DAYS_PER_MONTH
        : 0;

    points.push({
      date,
      actualRevenue28d: revenueSum + nonAdContribution,
      actualSessions28d: sessionsSum,
    });
  }

  return points;
}

/** The last rolling point that has both actual values populated (i.e. fully finalized). */
export function latestFinalizedRolling28d(points: Rolling28dPoint[]): Rolling28dPoint | null {
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i].actualRevenue28d !== null && points[i].actualSessions28d !== null) {
      return points[i];
    }
  }
  return null;
}

export type VerdictColor = 'green' | 'yellow' | 'red';

export interface Verdict {
  color: VerdictColor;
  revenuePct: number; // actual / expected, e.g. 0.93
  sessionsPct: number;
  date: string;
  actualRevenue28d: number;
  expectedRevenue28d: number;
  actualSessions28d: number;
  expectedSessions28d: number;
}

/**
 * Grade the latest finalized 28d rolling actuals against the expectation ramp.
 * Rule (operator's words, enforced here): a revenue/RPM gain with falling
 * sessions does NOT count as green — both metrics must clear the bar.
 *   - red    if either metric < 90% of expectation
 *   - yellow if either metric < 97% of expectation (and neither is < 90%)
 *   - green  otherwise (both >= 97%)
 */
export function gradeVerdict(
  expectation: FunnelExpectation,
  point: Rolling28dPoint
): Verdict | null {
  if (point.actualRevenue28d === null || point.actualSessions28d === null) return null;

  const expectedRevenue28d = expectedRevenueAt(expectation, point.date);
  const expectedSessions28d = expectedSessionsAt(expectation, point.date);

  const revenuePct = expectedRevenue28d > 0 ? point.actualRevenue28d / expectedRevenue28d : 0;
  const sessionsPct = expectedSessions28d > 0 ? point.actualSessions28d / expectedSessions28d : 0;

  let color: VerdictColor;
  if (revenuePct < 0.9 || sessionsPct < 0.9) {
    color = 'red';
  } else if (revenuePct < 0.97 || sessionsPct < 0.97) {
    color = 'yellow';
  } else {
    color = 'green';
  }

  return {
    color,
    revenuePct,
    sessionsPct,
    date: point.date,
    actualRevenue28d: point.actualRevenue28d,
    expectedRevenue28d,
    actualSessions28d: point.actualSessions28d,
    expectedSessions28d,
  };
}

/** Convenience: run the whole pipeline (rolling -> latest finalized -> verdict) in one call. */
export function computeLatestVerdict(history: FunnelHistory): Verdict | null {
  const rolling = computeRolling28d(history.days);
  const latest = latestFinalizedRolling28d(rolling);
  if (!latest) return null;
  return gradeVerdict(history.expectation, latest);
}

/** Same-weekday-vs-expected ratio, used for the daily chart's red-band shading (actual < 80% of expected). */
export function isBelowThreshold(
  actual: number | null,
  expected: number | null,
  ratio = 0.8
): boolean {
  if (actual === null || expected === null || expected <= 0) return false;
  return actual < expected * ratio;
}

export function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('en-US')}`;
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return Math.round(value).toLocaleString('en-US');
}

export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function daysBetweenUTC(a: string, b: string): number {
  return Math.round((parseDateUTC(b) - parseDateUTC(a)) / MS_PER_DAY);
}

/** Format a UTC timestamp (ms) back to a YYYY-MM-DD string. */
export function formatDateUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Add `n` days (may be negative) to a YYYY-MM-DD date string, returning a YYYY-MM-DD string. */
export function addDaysUTC(dateStr: string, n: number): string {
  return formatDateUTC(parseDateUTC(dateStr) + n * MS_PER_DAY);
}
