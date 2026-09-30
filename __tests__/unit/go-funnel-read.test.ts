import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildGoRead,
  E99_RULE,
  GO_DENOMINATOR_EVENT,
  GO_EVENTS,
  GO_PAGE_PREFIX,
  gridFromRows,
  renderGoReadMd,
  type GoDailyRow,
} from '../../scripts/agents/go-funnel-lib';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/**
 * Real GA4 rows for /go/, 2026-09-24→2026-09-29 (pulled 2026-09-30, MCP,
 * property 437117335). GA4 `date` values arrive as YYYYMMDD. 09-30 is the
 * partial "today" row (render 4 users at 06:52 EDT) that the first live run
 * counted as reported and read E99 as 3.5/day instead of 4.2.
 */
const FIXTURE: GoDailyRow[] = [
  { date: '20260930', eventName: 'render', users: 4, events: 6 },
  { date: '20260930', eventName: 'page_view', users: 2, events: 2 },
  { date: '20260930', eventName: 'patreon_click', users: 1, events: 1 },
  { date: '20260924', eventName: 'render', users: 86, events: 134 },
  { date: '20260924', eventName: 'page_view', users: 38, events: 48 },
  { date: '20260924', eventName: 'patreon_click', users: 7, events: 7 },
  { date: '20260924', eventName: 'patreon_click_after_wait', users: 2, events: 2 },
  { date: '20260924', eventName: 'patreon_post_connect_view', users: 4, events: 4 },
  { date: '20260924', eventName: 'patreon_follow_click', users: 2, events: 2 }, // not a GO_EVENT → dropped
  { date: '20260925', eventName: 'render', users: 87, events: 106 },
  { date: '20260925', eventName: 'page_view', users: 39, events: 43 },
  { date: '20260925', eventName: 'patreon_click', users: 9, events: 14 },
  { date: '20260925', eventName: 'patreon_click_after_wait', users: 3, events: 3 },
  { date: '20260926', eventName: 'render', users: 100, events: 117 },
  { date: '20260926', eventName: 'page_view', users: 29, events: 44 },
  { date: '20260926', eventName: 'patreon_click', users: 11, events: 19 },
  { date: '20260926', eventName: 'patreon_click_after_wait', users: 4, events: 4 },
  { date: '20260927', eventName: 'render', users: 103, events: 132 },
  { date: '20260927', eventName: 'page_view', users: 31, events: 41 },
  { date: '20260927', eventName: 'patreon_click', users: 9, events: 11 },
  { date: '20260927', eventName: 'patreon_click_after_wait', users: 4, events: 4 },
  { date: '20260928', eventName: 'render', users: 96, events: 125 },
  { date: '20260928', eventName: 'page_view', users: 53, events: 68 },
  { date: '20260928', eventName: 'patreon_click', users: 9, events: 9 },
  { date: '20260928', eventName: 'patreon_click_after_wait', users: 8, events: 8 },
  { date: '20260929', eventName: 'render', users: 76, events: 121 },
  { date: '20260929', eventName: 'page_view', users: 37, events: 44 },
  { date: '20260929', eventName: 'patreon_click', users: 7, events: 8 },
  { date: '20260929', eventName: 'patreon_click_after_wait', users: 2, events: 3 },
];
const NOW = new Date('2026-09-30T12:00:00Z');

describe('constants — guard the constant, not a copy of its value', () => {
  it('the /go denominator is the render event, and it is one of the pulled events', () => {
    expect(GO_DENOMINATOR_EVENT).toBe('render');
    expect(GO_EVENTS).toContain(GO_DENOMINATOR_EVENT);
    expect(GO_EVENTS).toContain('page_view'); // pulled so the coverage gap stays visible
    expect(GO_PAGE_PREFIX).toBe('/go/');
  });
  it('E99 rule matches experiments.md (after-wait ≥ 1.0 users/day, 09-25→10-01, read 10-01)', () => {
    expect(E99_RULE.event).toBe('patreon_click_after_wait');
    expect(E99_RULE.start).toBe('2026-09-25');
    expect(E99_RULE.end).toBe('2026-10-01');
    expect(E99_RULE.keepAtLeastUsersPerDay).toBe(1.0);
    expect(E99_RULE.readOn).toBe('2026-10-01');
    expect(GO_EVENTS).toContain(E99_RULE.event);
  });
});

describe('gridFromRows', () => {
  it('normalizes YYYYMMDD, drops non-GO events, sums duplicates', () => {
    const g = gridFromRows([
      ...FIXTURE.filter((x) => x.date === '20260924'),
      { date: '20260924', eventName: 'render', users: 1, events: 1 },
      { date: 'garbage', eventName: 'render', users: 99, events: 99 },
    ]);
    expect(Object.keys(g)).toEqual(['2026-09-24']);
    expect(g['2026-09-24']?.render).toEqual({ users: 87, events: 135 });
    expect((g['2026-09-24'] as Record<string, unknown>).patreon_follow_click).toBeUndefined();
  });
});

describe('buildGoRead — three-state days', () => {
  const r = buildGoRead(FIXTURE, '2026-09-24', '2026-09-30', { now: NOW });

  it('reports 6 of 7 days; today (09-30) is partial → unreported even though it has a render row', () => {
    expect(r.status).toBe('ok');
    expect(r.days).toHaveLength(7);
    expect(r.reportedDays).toEqual(['2026-09-24', '2026-09-25', '2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29']);
    expect(r.unreportedDays).toEqual(['2026-09-30']);
    expect(r.partialDays).toEqual(['2026-09-30']);
    expect(r.provisionalDays).toEqual(['2026-09-28', '2026-09-29']);
  });
  it('a day with no render row and not today is unreported but not partial', () => {
    const gap = buildGoRead(FIXTURE.filter((x) => x.date !== '20260927'), '2026-09-24', '2026-09-29', { now: NOW });
    expect(gap.unreportedDays).toEqual(['2026-09-27']);
    expect(gap.partialDays).toEqual([]);
    expect(gap.reportedDays).toHaveLength(5);
  });
  it('means are over reported days only, with render as the denominator', () => {
    expect(r.denominator).toBe(GO_DENOMINATOR_EVENT);
    expect(r.stats.render.users).toBe(548);
    expect(r.stats.render.perDay).toBe(91.33);
    expect(r.stats.page_view.users).toBe(227);
    // 227 / 548 — the ~40 % page_view coverage this read exists to expose
    expect(r.pageViewCoverage).toBe(0.4142);
    expect(r.stats.patreon_click.users).toBe(52);
    expect(r.stats.patreon_click.perDenominatorUser).toBe(0.0949);
    expect(r.stats.patreon_click_after_wait.users).toBe(23);
  });
  it('a reported day with no numerator row is a real 0 (member_skip_countdown fired on no day)', () => {
    expect(r.stats.member_skip_countdown).toEqual({ users: 0, perDay: 0, perDenominatorUser: 0 });
  });
  it('E99 so far: 21 users over the 5 reported window days = 4.2/day, on pace, not complete', () => {
    // 09-24 (2 users) is before the E99 window and must not count.
    expect(r.e99.users).toBe(21);
    expect(r.e99.daysReported).toBe(5);
    expect(r.e99.daysUnreported).toBe(2); // 09-30, 10-01
    expect(r.e99.perDay).toBe(4.2);
    expect(r.e99.onPace).toBe(true);
    expect(r.e99.complete).toBe(false);
  });
  it('a below-pace fixture reads BELOW, and an empty E99 window reads null, never false', () => {
    const low = buildGoRead(
      [
        { date: '2026-09-25', eventName: 'render', users: 50, events: 50 },
        { date: '2026-09-26', eventName: 'render', users: 50, events: 50 },
        { date: '2026-09-26', eventName: 'patreon_click_after_wait', users: 1, events: 1 },
      ],
      '2026-09-25',
      '2026-09-26',
      { now: NOW },
    );
    expect(low.e99.perDay).toBe(0.5);
    expect(low.e99.onPace).toBe(false);
    const before = buildGoRead(FIXTURE.filter((x) => x.date === '20260924'), '2026-09-24', '2026-09-24', { now: NOW });
    expect(before.status).toBe('ok');
    expect(before.e99.daysReported).toBe(0);
    expect(before.e99.onPace).toBeNull();
  });
});

describe('vacuity guard — could-not-run is never a verdict', () => {
  it('zero render rows → could-not-run, and the markdown carries no pace word', () => {
    const r = buildGoRead(
      [{ date: '2026-09-25', eventName: 'patreon_click_after_wait', users: 9, events: 9 }],
      '2026-09-25',
      '2026-09-26',
      { now: NOW },
    );
    expect(r.status).toBe('could-not-run');
    expect(r.reason).toMatch(/no `render` rows/);
    const md = renderGoReadMd(r);
    expect(md).toContain('COULD-NOT-RUN');
    expect(md).not.toMatch(/ON PACE|BELOW/);
  });
  it('a reversed range is could-not-run with a bad-range reason', () => {
    const r = buildGoRead(FIXTURE, '2026-09-30', '2026-09-24', { now: NOW });
    expect(r.status).toBe('could-not-run');
    expect(r.reason).toMatch(/bad-range/);
  });
});

describe('renderGoReadMd', () => {
  const r = buildGoRead(FIXTURE, '2026-09-24', '2026-09-30', { now: NOW });
  const md = renderGoReadMd(r);

  it('prints the decision rule before the first reading', () => {
    const rule = md.indexOf('**Rule (pre-committed, E99):**');
    const table = md.indexOf('## By day');
    expect(rule).toBeGreaterThan(-1);
    expect(table).toBeGreaterThan(rule);
    expect(md).toContain('≥ 1.0 → KEEP');
  });
  it('rates are labelled per render user and the unreported day is marked', () => {
    expect(md).toContain('Rates over reported days (per `render` user)');
    expect(md).toContain('| 2026-09-30 | _partial_');
    expect(md).toContain('2026-09-30 partial/today');
    expect(md).toContain('Provisional (GA4 may still move, <2 d old): 2026-09-28, 2026-09-29.');
    expect(md).toContain('page_view coverage of render: **41.4%**');
    expect(md).toContain('**21 users over 5 reported day(s)** in 2026-09-25→2026-10-01 = **4.20/day** vs keep ≥ 1.0 → **ON PACE**');
    expect(md).toContain('a pace, not the verdict');
  });
  it('no user data — the report has no email-shaped string', () => {
    expect(md).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
  });
});

describe('entrypoint source guard', () => {
  const src = stripComments(read('scripts/agents/go-funnel-read.ts'));
  it('imports its constants from the lib and filters on the shared /go prefix', () => {
    expect(src).toMatch(/from '\.\/go-funnel-lib'/);
    expect(src).toContain('GO_PAGE_PREFIX');
    expect(src).toContain('GO_EVENTS');
    expect(src).toContain('buildGoRead(');
  });
  it('never pulls screenPageViews as a /go denominator', () => {
    expect(src).not.toContain('screenPageViews');
  });
  it('redacts every printed or written string', () => {
    expect(src).toContain("import { redactError } from './operator-did-probe-lib'");
    expect(src).toMatch(/writeFileSync\(outPath, redactError\(/);
  });
});
