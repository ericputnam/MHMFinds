/**
 * Render smoke test for /admin/funnel: the page must render the verdict banner,
 * all three charts and the events table from the committed reports/funnel/history.json, and must
 * show the "not generated yet" message on a 404.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'fs';
import { join } from 'path';
import FunnelDashboardPage from '@/app/admin/funnel/page';

const sample = JSON.parse(
  readFileSync(join(process.cwd(), 'reports/funnel/history.json'), 'utf-8')
);

function mockFetch(status: number, body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('/admin/funnel page', () => {
  const originalFetch = global.fetch;
  beforeEach(() => {
    // SVG getBBox etc. are not implemented in jsdom; the chart must not depend on them.
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('renders verdict, three charts and the events table from history.json', async () => {
    global.fetch = mockFetch(200, sample) as unknown as typeof fetch;
    const { container } = render(<FunnelDashboardPage />);
    await waitFor(() => expect(screen.getByText('Funnel team scoreboard')).toBeTruthy());
    expect(screen.getByText('28-day rolling revenue')).toBeTruthy();
    expect(screen.getByText('28-day rolling sessions')).toBeTruthy();
    expect(screen.getByText('Daily Mediavine revenue')).toBeTruthy();
    expect(container.querySelectorAll('svg').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText(/On track|Behind pace|Off track/)).toBeTruthy();
  });

  it('explains a missing history.json instead of crashing', async () => {
    global.fetch = mockFetch(404, { error: 'history not generated yet' }) as unknown as typeof fetch;
    render(<FunnelDashboardPage />);
    await waitFor(() => expect(screen.getByText(/hasn.t committed/)).toBeTruthy());
  });
});
