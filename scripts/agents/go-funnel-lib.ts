/**
 * `/go/[modId]` funnel read — pure arithmetic and rendering (no network, no fs).
 *
 * Why this file exists (E146, 2026-09-30): the `/go` interstitial's GA4
 * `page_view` records only a fraction of the visitors the page actually
 * serves. The page fires its own `render` event on first paint, and weekly
 * `page_view` users ÷ `render` users has read 205/531, 134/408, 248/613
 * (09-08→09-28) and 38/86, 39/87, 29/100, 31/103, 53/96, 37/76 by day
 * (09-24→09-29) — 29–55 %, ~40 % on average. Every conversion rate on `/go`
 * (E65 `patreon_click`, E99 `patreon_click_after_wait`, E74 post-connect)
 * therefore uses **`render` distinct users as the denominator**, never
 * `page_view` and never `screenPageViews`. Until the gap is explained, a rate
 * quoted "per page_view user" overstates conversion ~2.4×.
 *
 * Three-state days (house rule: "could not run" ≠ "is broken"):
 *   - a day with a `render` row is *reported*; a numerator event missing on
 *     such a day is a real 0;
 *   - a day inside the window with **no** `render` row, or **today** (a
 *     partial day — GA4 has only the hours so far), is *unreported* and is
 *     excluded from every mean rather than counted as 0 (on 09-30 a partial
 *     day with 4 render users read E99 as 3.5/day instead of 4.2);
 *   - a reported day inside the last `PROVISIONAL_DAYS` is *provisional* —
 *     GA4 finalizes 24–48 h late, so it counts but may still move;
 *   - a window with zero reported days is COULD-NOT-RUN, never a verdict.
 */
import { dateKeysInclusive, ga4DateKey } from './patreon-members-lib';

export const GO_PAGE_PREFIX = '/go/';

/** Reported days this close to `now` are flagged provisional (GA4 finalizes 24–48 h late). */
export const PROVISIONAL_DAYS = 2;

/** Local-calendar `YYYY-MM-DD` of `d`, matching the entrypoint's `daysAgo()` arithmetic. */
export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Events the read pulls for `pagePath` beginning with `/go/`. Order is the table's column order. */
export const GO_EVENTS = [
  'render',
  'page_view',
  'patreon_click',
  'patreon_click_after_wait',
  'member_skip_countdown',
  'patreon_post_connect_view',
] as const;
export type GoEvent = (typeof GO_EVENTS)[number];

/** The one denominator for every `/go` rate. See the file comment for the evidence. */
export const GO_DENOMINATOR_EVENT: GoEvent = 'render';

/**
 * E99 keep rule, frozen from experiments.md on 2026-09-30 (row shipped 09-24):
 * `patreon_click_after_wait` distinct users/day over 09-25→10-01 ≥ 1.0.
 * The read date is 2026-10-01; `perDay` is the mean over *reported* days.
 */
export const E99_RULE = {
  id: 'E99',
  event: 'patreon_click_after_wait' as GoEvent,
  start: '2026-09-25',
  end: '2026-10-01',
  keepAtLeastUsersPerDay: 1.0,
  readOn: '2026-10-01',
} as const;

export interface GoDailyRow {
  /** `YYYY-MM-DD` or GA4's `YYYYMMDD`; normalized on ingest */
  date: string;
  eventName: string;
  users: number;
  events: number;
}

export interface GoCell {
  users: number;
  events: number;
}

export interface GoEventStat {
  /** sum of per-day distinct users over reported days */
  users: number;
  /** users ÷ reported days, 2 dp */
  perDay: number;
  /** users ÷ denominator users over the same days, 0–1, 4 dp; null when the denominator is 0 */
  perDenominatorUser: number | null;
}

export interface E99SoFar {
  id: 'E99';
  event: GoEvent;
  window: string;
  keepAtLeastUsersPerDay: number;
  /** reported days inside the E99 window that also fall inside the read window */
  daysReported: number;
  /** E99-window days not yet reported (in the future or not finalized) */
  daysUnreported: number;
  users: number;
  perDay: number;
  /** perDay ≥ keepAtLeastUsersPerDay — a pace, not a verdict, until daysUnreported is 0 */
  onPace: boolean | null;
  /** true only when every day of the E99 window is reported */
  complete: boolean;
}

export interface GoRead {
  status: 'ok' | 'could-not-run';
  reason?: string;
  start: string;
  end: string;
  generatedAt: string;
  denominator: GoEvent;
  days: string[];
  reportedDays: string[];
  unreportedDays: string[];
  /** window days on or after `now`'s local date — partial, never reported */
  partialDays: string[];
  /** reported days within PROVISIONAL_DAYS of `now` — counted, may still move */
  provisionalDays: string[];
  byDay: Record<string, Partial<Record<GoEvent, GoCell>>>;
  stats: Record<GoEvent, GoEventStat>;
  /** page_view users ÷ render users over reported days (the measurement gap this read exists for) */
  pageViewCoverage: number | null;
  e99: E99SoFar;
}

function isGoEvent(name: string): name is GoEvent {
  return (GO_EVENTS as readonly string[]).includes(name);
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Fold GA4 rows into a per-day × per-event grid. Unknown events are dropped; duplicate rows are summed. */
export function gridFromRows(rows: GoDailyRow[]): Record<string, Partial<Record<GoEvent, GoCell>>> {
  const byDay: Record<string, Partial<Record<GoEvent, GoCell>>> = {};
  for (const r of rows) {
    if (!isGoEvent(r.eventName)) continue;
    const day = ga4DateKey(r.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const cell = (byDay[day] ??= {});
    const prev = cell[r.eventName] ?? { users: 0, events: 0 };
    cell[r.eventName] = { users: prev.users + (Number(r.users) || 0), events: prev.events + (Number(r.events) || 0) };
  }
  return byDay;
}

function statFor(
  byDay: GoRead['byDay'],
  days: string[],
  event: GoEvent,
  denominator: GoEvent,
): GoEventStat {
  const users = days.reduce((s, d) => s + (byDay[d]?.[event]?.users ?? 0), 0);
  const denom = days.reduce((s, d) => s + (byDay[d]?.[denominator]?.users ?? 0), 0);
  return {
    users,
    perDay: days.length ? round(users / days.length, 2) : 0,
    perDenominatorUser: denom > 0 ? round(users / denom, 4) : null,
  };
}

export function buildGoRead(
  rows: GoDailyRow[],
  start: string,
  end: string,
  opts: { now?: Date; denominator?: GoEvent } = {},
): GoRead {
  const denominator = opts.denominator ?? GO_DENOMINATOR_EVENT;
  const now = opts.now ?? new Date();
  const generatedAt = now.toISOString();
  const today = localDateKey(now);
  const provisionalFrom = localDateKey(new Date(now.getTime() - PROVISIONAL_DAYS * 864e5));
  const days = dateKeysInclusive(start, end);
  const byDay = gridFromRows(rows);
  const partialDays = days.filter((d) => d >= today);
  const reportedDays = days.filter((d) => d < today && (byDay[d]?.[denominator]?.users ?? 0) > 0);
  const unreportedDays = days.filter((d) => !reportedDays.includes(d));
  const provisionalDays = reportedDays.filter((d) => d >= provisionalFrom);

  const stats = Object.fromEntries(GO_EVENTS.map((e) => [e, statFor(byDay, reportedDays, e, denominator)])) as Record<
    GoEvent,
    GoEventStat
  >;
  const pageViewCoverage = stats.page_view.perDenominatorUser;

  const e99Days = dateKeysInclusive(E99_RULE.start, E99_RULE.end);
  const e99Reported = e99Days.filter((d) => reportedDays.includes(d));
  const e99Users = e99Reported.reduce((s, d) => s + (byDay[d]?.[E99_RULE.event]?.users ?? 0), 0);
  const e99PerDay = e99Reported.length ? round(e99Users / e99Reported.length, 2) : 0;
  const e99: E99SoFar = {
    id: 'E99',
    event: E99_RULE.event,
    window: `${E99_RULE.start}→${E99_RULE.end}`,
    keepAtLeastUsersPerDay: E99_RULE.keepAtLeastUsersPerDay,
    daysReported: e99Reported.length,
    daysUnreported: e99Days.length - e99Reported.length,
    users: e99Users,
    perDay: e99PerDay,
    onPace: e99Reported.length ? e99PerDay >= E99_RULE.keepAtLeastUsersPerDay : null,
    complete: e99Reported.length === e99Days.length,
  };

  const base = { start, end, generatedAt, denominator, days, reportedDays, unreportedDays, partialDays, provisionalDays, byDay, stats, pageViewCoverage, e99 };
  if (days.length === 0) return { status: 'could-not-run', reason: `bad-range start=${start} end=${end}`, ...base };
  if (reportedDays.length === 0) {
    return { status: 'could-not-run', reason: `no \`${denominator}\` rows in ${start}→${end} — GA4 not finalized, credentials wrong, or the event stopped firing; no verdict`, ...base };
  }
  return { status: 'ok', ...base };
}

const pct = (x: number | null, dp = 1) => (x == null ? '—' : `${(x * 100).toFixed(dp)}%`);

/** Markdown report. The decision rule is printed before any reading (house rule). */
export function renderGoReadMd(read: GoRead): string {
  const L: string[] = [];
  L.push(`# /go funnel read — ${read.start} → ${read.end}`);
  L.push('');
  L.push(
    `_Generated ${read.generatedAt} by \`scripts/agents/go-funnel-read.ts\`. Source: GA4 property events on \`pagePath\` beginning \`${GO_PAGE_PREFIX}\`, distinct users per day. **Denominator for every rate: \`${read.denominator}\` distinct users** — GA4 \`page_view\` records only ~40 % of the visitors \`/go\` serves (weekly 205/531, 134/408, 248/613), so a rate per page_view user overstates conversion ~2.4×. Aggregates only; no user data._`,
  );
  L.push('');
  L.push(`**Rule (pre-committed, ${read.e99.id}):** \`${read.e99.event}\` distinct users/day over ${read.e99.window} ≥ ${read.e99.keepAtLeastUsersPerDay.toFixed(1)} → KEEP; below → KILL (revert the after-wait line). Read on ${E99_RULE.readOn}. Mean is over *reported* days only (a day with no \`${read.denominator}\` row is unreported, not zero).`);
  L.push('');
  if (read.status !== 'ok') {
    L.push(`**COULD-NOT-RUN** — ${read.reason}. No numbers below are a verdict.`);
    L.push('');
    return L.join('\n');
  }

  L.push('## By day (distinct users; events in parentheses where they differ)');
  L.push('');
  L.push(`| Day | ${GO_EVENTS.join(' | ')} | page_view ÷ ${read.denominator} |`);
  L.push(`|---|${GO_EVENTS.map(() => '--:').join('|')}|--:|`);
  for (const d of read.days) {
    if (!read.reportedDays.includes(d)) {
      const tag = read.partialDays.includes(d) ? '_partial_' : '_unreported_';
      L.push(`| ${d} | ${GO_EVENTS.map(() => tag).join(' | ')} | — |`);
      continue;
    }
    const cells = GO_EVENTS.map((e) => {
      const c = read.byDay[d]?.[e];
      if (!c) return '0';
      return c.events !== c.users ? `${c.users} (${c.events})` : String(c.users);
    });
    const r = read.byDay[d]?.[read.denominator]?.users ?? 0;
    const pv = read.byDay[d]?.page_view?.users ?? 0;
    L.push(`| ${d} | ${cells.join(' | ')} | ${r ? pct(pv / r, 0) : '—'} |`);
  }
  L.push('');
  L.push(
    `Reported days: ${read.reportedDays.length} of ${read.days.length}${read.unreportedDays.length ? ` (unreported: ${read.unreportedDays.join(', ')}${read.partialDays.length ? ` — ${read.partialDays.join(', ')} partial/today` : ''})` : ''}.${read.provisionalDays.length ? ` Provisional (GA4 may still move, <${PROVISIONAL_DAYS} d old): ${read.provisionalDays.join(', ')}.` : ''}`,
  );
  L.push('');
  L.push(`## Rates over reported days (per \`${read.denominator}\` user)`);
  L.push('');
  L.push('| Event | Users | Users/day | Per render user |');
  L.push('|---|--:|--:|--:|');
  for (const e of GO_EVENTS) {
    const s = read.stats[e];
    L.push(`| ${e} | ${s.users} | ${s.perDay.toFixed(2)} | ${e === read.denominator ? '100%' : pct(s.perDenominatorUser)} |`);
  }
  L.push('');
  L.push(`- page_view coverage of ${read.denominator}: **${pct(read.pageViewCoverage)}** — the gap this read exists for. If it climbs to ≥ 90 % the denominator question is closed; until then quote /go rates per \`${read.denominator}\` user only.`);
  L.push('');
  L.push(`## ${read.e99.id} so far`);
  L.push('');
  const e = read.e99;
  const pace = e.onPace == null ? 'no reported days' : e.onPace ? 'ON PACE' : 'BELOW';
  L.push(
    `- \`${e.event}\`: **${e.users} users over ${e.daysReported} reported day(s)** in ${e.window} = **${e.perDay.toFixed(2)}/day** vs keep ≥ ${e.keepAtLeastUsersPerDay.toFixed(1)} → **${pace}**${e.complete ? ' (window complete — this is the reading)' : ` (${e.daysUnreported} day(s) unreported — a pace, not the verdict)`}.`,
  );
  L.push('');
  return L.join('\n');
}
