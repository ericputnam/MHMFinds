/**
 * Interactive layer of /admin/funnel: the helpers behind the KPI tiles, weekly roll-up and event
 * filters, plus the page's metric tabs, day pinning and event filtering against the committed
 * reports/funnel/history.json.
 */
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import FunnelDashboardPage from '@/app/admin/funnel/page';
import {
  FunnelDayRecord,
  FunnelEvent,
  eventActor,
  lastFinalizedDay,
  pctChange,
  resultTone,
  sliceLastNDays,
  summarizeWindow,
  weekStartUTC,
  weeklySummary,
} from '@/lib/funnel/dashboardMath';

const sample = JSON.parse(readFileSync(join(process.cwd(), 'reports/funnel/history.json'), 'utf-8'));

function day(date: string, revenue: number | null, sessions: number | null, exp = 100): FunnelDayRecord {
  return {
    date,
    revenue,
    sessions,
    rpm: revenue != null && sessions ? (revenue / sessions) * 1000 : null,
    expectedRevenue: exp,
    expectedSessions: exp * 10,
    nonAdMonthly: null,
    ownedAdds7d: null,
    pinterestSessions7d: null,
  } as FunnelDayRecord;
}

describe('dashboardMath interactive helpers', () => {
  const days = [
    day('2026-09-14', 100, 1000), // Monday
    day('2026-09-15', 110, 1000),
    day('2026-09-16', 90, 1000),
    day('2026-09-21', 120, 1200), // next Monday
    day('2026-09-22', null, null), // settling
  ];

  it('lastFinalizedDay skips settling days', () => {
    expect(lastFinalizedDay(days)?.date).toBe('2026-09-21');
    expect(lastFinalizedDay([day('2026-09-22', null, null)])).toBeNull();
  });

  it('sliceLastNDays is calendar-based and n<=0 means all', () => {
    expect(sliceLastNDays(days, 2).map((d) => d.date)).toEqual(['2026-09-21', '2026-09-22']);
    expect(sliceLastNDays(days, 0)).toHaveLength(days.length);
  });

  it('summarizeWindow totals finalized days and only their expectations', () => {
    const s = summarizeWindow(days, '2026-09-16', 3);
    expect(s.days).toBe(3);
    expect(s.revenue).toBe(300);
    expect(s.expectedRevenue).toBe(300);
    expect(s.rpm).toBeCloseTo(100);
    const settling = summarizeWindow(days, '2026-09-22', 2);
    expect(settling.days).toBe(1);
    expect(settling.expectedRevenue).toBe(100);
  });

  it('pctChange guards missing and zero bases', () => {
    expect(pctChange(110, 100)).toBeCloseTo(0.1);
    expect(pctChange(1, 0)).toBeNull();
    expect(pctChange(null, 5)).toBeNull();
  });

  it('weekStartUTC returns the Monday', () => {
    expect(weekStartUTC('2026-09-20')).toBe('2026-09-14'); // Sunday
    expect(weekStartUTC('2026-09-14')).toBe('2026-09-14');
  });

  it('weeklySummary groups by ISO week, newest first, with event counts', () => {
    const events = [
      { date: '2026-09-15', kind: 'merge', label: 'Quinn: x' },
      { date: '2026-09-16', kind: 'rollback', label: 'Rio: y' },
    ] as FunnelEvent[];
    const weeks = weeklySummary(days, events);
    expect(weeks.map((w) => w.weekStart)).toEqual(['2026-09-21', '2026-09-14']);
    expect(weeks[1]).toMatchObject({ finalizedDays: 3, revenue: 300, merges: 1, rollbacks: 1 });
    expect(weeks[0].finalizedDays).toBe(1);
  });

  it('eventActor and resultTone classify labels and results', () => {
    expect(eventActor('Quinn: merged #147')).toBe('Quinn');
    expect(eventActor('no actor here')).toBeNull();
    expect(resultTone('PASS')).toBe('ok');
    expect(resultTone('MISSED')).toBe('bad');
    expect(resultTone(undefined)).toBe('other');
  });
});

describe('/admin/funnel interactions', () => {
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

  it('switches the explorer metric from the tabs', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('tab', { name: 'Sessions' }));
    expect(screen.getByText('Daily sessions')).toBeTruthy();
    fireEvent.click(screen.getByRole('tab', { name: 'RPM' }));
    expect(screen.getByText('Session RPM')).toBeTruthy();
  });

  it('pins a day from the events list and shows its detail panel', async () => {
    await renderPage();
    const firstEventDate = sample.events
      .map((e: FunnelEvent) => e.date)
      .sort()
      .reverse()[0] as string;
    const dateButtons = screen.getAllByTitle('Pin this day on the charts');
    fireEvent.click(dateButtons[0]);
    expect(screen.getByRole('button', { name: 'Unpin day' })).toBeTruthy();
    expect(screen.getAllByText(new RegExp(firstEventDate)).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Unpin day' }));
    expect(screen.queryByRole('button', { name: 'Unpin day' })).toBeNull();
  });

  it('filters events by kind chip and by search', async () => {
    await renderPage();
    const heading = screen.getByRole('heading', { name: /^Events/ });
    const countText = () => within(heading).getByText(/\d+ of \d+/).textContent!;
    const before = countText();

    fireEvent.change(screen.getByLabelText('Search events'), { target: { value: 'zzzz-no-such-event' } });
    expect(screen.getByText('No events match these filters.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Search events'), { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /merge/, pressed: true }));
    expect(countText()).not.toBe(before);
  });
});
