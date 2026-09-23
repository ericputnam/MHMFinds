/**
 * Threshold / on-track layer of /admin/funnel: the verdict gates, range-driven KPI totals,
 * counter changes, the day-by-day status record, and the page wiring (range buttons drive the
 * tiles; the 28-day charts carry the gate lines).
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import FunnelDashboardPage from '@/app/admin/funnel/page';
import {
  FunnelDayRecord,
  StatusPoint,
  VERDICT_GATES,
  counterChange,
  formatCompactNumber,
  gradePct,
  statusScorecard,
  summarizeRange,
} from '@/lib/funnel/dashboardMath';

const sample = JSON.parse(readFileSync(join(process.cwd(), 'reports/funnel/history.json'), 'utf-8'));

function day(date: string, revenue: number | null, sessions: number | null, owned: number | null = null): FunnelDayRecord {
  return {
    date,
    revenue,
    sessions,
    rpm: revenue != null && sessions ? (revenue / sessions) * 1000 : null,
    expectedRevenue: 100,
    expectedSessions: 1000,
    nonAdMonthly: null,
    ownedAdds7d: owned,
    pinterestSessions7d: null,
  } as FunnelDayRecord;
}

describe('verdict gates', () => {
  it('gradePct uses the exported gates at their exact boundaries', () => {
    expect(gradePct(VERDICT_GATES.green)).toBe('green');
    expect(gradePct(VERDICT_GATES.green - 1e-9)).toBe('yellow');
    expect(gradePct(VERDICT_GATES.red)).toBe('yellow');
    expect(gradePct(VERDICT_GATES.red - 1e-9)).toBe('red');
    expect(VERDICT_GATES.red).toBeLessThan(VERDICT_GATES.green);
  });
});

describe('summarizeRange', () => {
  const days = [
    day('2026-09-01', 10, 100),
    day('2026-09-02', 20, 200),
    day('2026-09-03', 30, 300),
    day('2026-09-04', 40, 400),
    day('2026-09-05', null, null), // settling
  ];

  it('totals the last n days and the equal period before them', () => {
    const r = summarizeRange(days, '2026-09-04', 2);
    expect(r.current).toMatchObject({ days: 2, revenue: 70, sessions: 700 });
    expect(r.prior).toMatchObject({ days: 2, revenue: 30, sessions: 300 });
  });

  it('changes with n (the range buttons)', () => {
    expect(summarizeRange(days, '2026-09-04', 1).current.revenue).toBe(40);
    expect(summarizeRange(days, '2026-09-04', 3).current.revenue).toBe(90);
  });

  it('drops a prior period the history only partly covers', () => {
    // 3 days back from 09-04 = 09-02..09-04; prior would be 08-30..09-01, of which only 09-01 exists.
    expect(summarizeRange(days, '2026-09-04', 3).prior).toBeNull();
  });

  it('n<=0 covers everything through endDate and has no prior period', () => {
    const r = summarizeRange(days, '2026-09-04', 0);
    expect(r.current.revenue).toBe(100);
    expect(r.prior).toBeNull();
  });
});

describe('formatCompactNumber', () => {
  it('switches to millions', () => {
    expect(formatCompactNumber(1_192_100)).toBe('1.19M');
    expect(formatCompactNumber(355_800)).toBe('355.8k');
  });
});

describe('counterChange', () => {
  it('returns the first and last non-null reading inside the range', () => {
    const days = [day('2026-09-01', 1, 1, null), day('2026-09-02', 1, 1, 5), day('2026-09-03', 1, 1, null), day('2026-09-04', 1, 1, 9)];
    expect(counterChange(days, (d) => d.ownedAdds7d, '2026-09-01', '2026-09-04')).toEqual({
      first: { date: '2026-09-02', value: 5 },
      last: { date: '2026-09-04', value: 9 },
    });
    expect(counterChange(days, (d) => d.ownedAdds7d, '2026-09-03', '2026-09-03')).toBeNull();
  });
});

describe('statusScorecard', () => {
  const pt = (date: string, pct: number): StatusPoint => ({ date, revenuePct: pct, sessionsPct: pct, color: gradePct(pct) });
  const points = [
    pt('2026-08-30', 1.0), // before the commitment: excluded from counts, still a "last green"
    pt('2026-09-01', 1.0),
    pt('2026-09-02', 0.95),
    pt('2026-09-03', 0.85),
    pt('2026-09-04', 0.95),
    pt('2026-09-05', 0.95),
    pt('2026-09-06', 0.96),
    pt('2026-09-07', 0.96),
    pt('2026-09-08', 0.96),
  ];

  it('counts colors since the start date and reads the current streak', () => {
    const c = statusScorecard(points, '2026-09-01');
    expect(c).toMatchObject({ total: 8, green: 1, yellow: 6, red: 1 });
    expect(c.streak).toEqual({ color: 'yellow', days: 5 });
    expect(c.lastGreen).toBe('2026-09-01');
    expect(c.daysSinceGreen).toBe(7);
    expect(c.revenueTrend7d).toBeCloseTo(0.96 - 1.0);
  });

  it('is empty-safe', () => {
    expect(statusScorecard([], '2026-09-01')).toMatchObject({ total: 0, streak: null, lastGreen: null });
  });
});

describe('/admin/funnel thresholds and range wiring', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  async function renderPage() {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => sample }) as unknown as typeof fetch;
    const utils = render(<FunnelDashboardPage />);
    await waitFor(() => expect(screen.getByText('Funnel team scoreboard')).toBeTruthy());
    return utils;
  }

  it('the range buttons change the revenue tile', async () => {
    await renderPage();
    const tile = () => screen.getByText(/^Revenue, (last \d+d|all time)$/).closest('button')!;
    fireEvent.click(screen.getByRole('button', { name: '14d' }));
    expect(tile().textContent).toMatch(/Revenue, last 14d/);
    const seven = tile().textContent;
    fireEvent.click(screen.getByRole('button', { name: '30d' }));
    expect(tile().textContent).toMatch(/Revenue, last 30d/);
    fireEvent.click(screen.getByRole('button', { name: 'All' }));
    expect(tile().textContent).toMatch(/Revenue, all time.*vs expected/);
    expect(tile().textContent).not.toBe(seven);
  });

  it('shows the day-by-day record and the gate lines on both 28-day charts', async () => {
    await renderPage();
    expect(screen.getByText(/Is the team on track\?/)).toBeTruthy();
    expect(screen.getAllByText(/on-track gate/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/off-track gate/).length).toBeGreaterThanOrEqual(2);
    const toggle = screen.getByRole('button', { name: /Show ramp through/ });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: /Hide ramp through/ })).toBeTruthy();
  });
});
