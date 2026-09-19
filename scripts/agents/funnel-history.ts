/**
 * funnel-history.ts — maintains reports/funnel/history.json, the data file behind the
 * /admin/funnel/ revenue dashboard. Deterministic: same inputs (Mediavine + this
 * worktree's scoreboard JSONs + changelog.md + incidents/*.md + targets.json) always
 * produce the same output. The output schema is a contract with the dashboard — field
 * names must not change.
 *
 * Usage:
 *   npx tsx scripts/agents/funnel-history.ts [--backfill-from YYYY-MM-DD] [--out path]
 *
 * Default run: load existing history.json, fetch the last 10 days from Mediavine,
 * upsert, recompute expected*, rebuild events from the changelog + incidents, rescan
 * the scoreboard JSONs for nonAdMonthly/ownedAdds7d/pinterestSessions7d, write.
 *
 * --backfill-from YYYY-MM-DD fetches Mediavine data from that date through today, in
 * chunks of at most 31 days (the Mediavine reporting API's practical window).
 *
 * Exit 0 on success. Exit 3 if the Mediavine fetch failed (the file is still written
 * — with whatever data was already on disk plus the freshly-recomputed derived fields
 * — as long as a history.json already existed before this run).
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// ---- CLI args -------------------------------------------------------------

const args = process.argv.slice(2);
const arg = (k: string): string | undefined => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};

// ---- date helpers (pattern shared with revenue-guardrail.ts) --------------

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}
function shift(isoDay: string, n: number): string {
  const [y, m, d] = isoDay.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return iso(dt);
}
function daysInMonth(period: string): number {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function lastDayOfMonth(period: string): string {
  return `${period}-${String(daysInMonth(period)).padStart(2, '0')}`;
}
const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const round = (n: number, dp = 2): number => Math.round(n * 10 ** dp) / 10 ** dp;

// ---- schema (contract with the /admin/funnel/ dashboard — do not rename) --

interface DayEntry {
  date: string;
  revenue: number | null;
  sessions: number | null;
  rpm: number | null;
  expectedRevenue: number | null;
  expectedSessions: number | null;
  nonAdMonthly: number | null;
  ownedAdds7d: number | null;
  pinterestSessions7d: number | null;
}

interface EventEntry {
  date: string;
  kind: 'merge' | 'rollback' | 'incident' | 'check' | 'operator';
  label: string;
  commit?: string;
  result?: string;
}

interface Expectation {
  startDate: string;
  endDate: string;
  revenue28dStart: number;
  revenue28dEnd: number;
  sessions28dStart: number;
  sessions28dEnd: number;
  basis: string;
}

interface History {
  generatedAt: string;
  expectation: Expectation;
  days: DayEntry[];
  events: EventEntry[];
}

// ---- minimal shapes for the JSON we read (avoid `any` leaking out) --------

interface Targets {
  quarterEnd: string;
  baseline: {
    sessions: { monthlyMediavine: number; period: string };
    adRevenue: { monthly: number; sessionRpm: number };
    nonAdRevenue: { monthlyTotal: number };
  };
  targets: {
    monthly: {
      sessions: Record<string, number>;
      nonAdRevenue: Record<string, number>;
    };
  };
}

interface ScoreboardJson {
  date?: string;
  headline?: {
    ownedAdds7d?: number;
    nonAdRevenueMonthlyGross?: number;
  };
  ga4?: {
    ok: boolean;
    data?: { byChannel7d?: Record<string, number> };
  };
}

// ---- Mediavine pull (import pattern from revenue-guardrail.ts) ------------

interface MvRow {
  date: string;
  revenue: number;
  sessions: number;
  rpm: number;
}

async function fetchMediavine(start: string, end: string): Promise<MvRow[]> {
  const { loadConfig } = await import('../mcp-mediavine/config.js');
  const { client } = loadConfig();

  const rows: MvRow[] = [];
  let chunkStart = start;
  while (chunkStart <= end) {
    const chunkEnd = ((): string => {
      const candidate = shift(chunkStart, 30); // <=31-day window inclusive
      return candidate > end ? end : candidate;
    })();
    const res = await client.earnings(chunkStart, chunkEnd);
    for (const r of res.earnings ?? []) {
      rows.push({
        date: String(r.date).slice(0, 10).replace(/\//g, '-'),
        revenue: Number(r.revenue) || 0,
        sessions: Number(r.sessions) || 0,
        rpm: Number(r.session_rpm) || 0,
      });
    }
    if (chunkEnd === end) break;
    chunkStart = shift(chunkEnd, 1);
  }
  return rows;
}

// ---- changelog.md / incidents/*.md -> events -------------------------------

function parseChangelogEvents(path: string): EventEntry[] {
  if (!existsSync(path)) return [];
  const lines = readFileSync(path, 'utf8').split('\n');
  const events: EventEntry[] = [];
  for (const line of lines) {
    if (!line.startsWith('| 20')) continue; // header/separator/prose rows
    const cols = line.split('|').map((c) => c.trim());
    // | when | mode | who/what | commit | deployment | result | notes |
    const when = cols[1] ?? '';
    const mode = cols[2] ?? '';
    const whoWhat = cols[3] ?? '';
    const commit = cols[4] ?? '';
    const result = cols[6] ?? '';
    const date = when.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    let kind: EventEntry['kind'] | null = null;
    if (result.startsWith('ROLLED BACK')) {
      kind = 'rollback';
    } else if (mode === 'after-merge') {
      kind = 'merge';
    } else if (mode === 'wp-push') {
      kind = 'operator';
    } else if ((mode === 'check' || mode === 'correction') && result !== 'PASS') {
      kind = 'check';
    }
    // smoke-only rows, and check/correction rows that PASS, are ledger noise — skip.
    if (!kind) continue;

    const event: EventEntry = { date, kind, label: whoWhat.slice(0, 160) };
    if (commit) event.commit = commit;
    if (result) event.result = result;
    events.push(event);
  }
  return events;
}

function parseIncidentEvents(dir: string): EventEntry[] {
  if (!existsSync(dir)) return [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  const events: EventEntry[] = [];
  for (const f of files) {
    const nameMatch = f.match(/^(\d{4}-\d{2}-\d{2})-\d{6}\.md$/);
    const date = nameMatch ? nameMatch[1] : f.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const content = readFileSync(join(dir, f), 'utf8');
    const firstLine = content.split('\n')[0] ?? '';
    const titleMatch = firstLine.match(/^#\s*Incident\s+\S+\s+\S+\s*—\s*(.+)$/);
    const label = titleMatch ? `Incident: ${titleMatch[1].trim()}` : firstLine.replace(/^#\s*/, '').trim() || `Incident ${date}`;
    const commitMatch = content.match(/\*\*Commit:\*\*\s*([0-9a-f]{7,40})/i);
    const event: EventEntry = { date, kind: 'incident', label };
    if (commitMatch) event.commit = commitMatch[1].slice(0, 7);
    events.push(event);
  }
  return events;
}

// ---- main -------------------------------------------------------------------

function readExisting(path: string): History | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as History;
  } catch {
    return null;
  }
}

function emptyDay(date: string): DayEntry {
  return {
    date,
    revenue: null,
    sessions: null,
    rpm: null,
    expectedRevenue: null,
    expectedSessions: null,
    nonAdMonthly: null,
    ownedAdds7d: null,
    pinterestSessions7d: null,
  };
}

async function main(): Promise<void> {
  const backfillFrom = arg('--backfill-from');
  const outArg = arg('--out');
  const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? process.cwd();
  const REPORTS_DIR = join(PROJECT_DIR, 'reports', 'funnel');
  const OUT = outArg ?? join(REPORTS_DIR, 'history.json');
  const TARGETS_PATH = join(PROJECT_DIR, '.claude', 'agents', 'mhm-funnel', 'targets.json');

  const existing = readExisting(OUT);
  const dayMap = new Map<string, DayEntry>();
  if (existing) for (const d of existing.days) dayMap.set(d.date, d);

  const today = iso(new Date());
  const fetchStart = backfillFrom ?? daysAgo(9);
  const fetchEnd = today;

  let mediavineError: Error | null = null;
  try {
    const rows = await fetchMediavine(fetchStart, fetchEnd);
    for (const r of rows) {
      const finalized = r.revenue > 0 && r.sessions > 0;
      const prior = dayMap.get(r.date);
      dayMap.set(r.date, {
        ...(prior ?? emptyDay(r.date)),
        date: r.date,
        revenue: finalized ? round(r.revenue) : null,
        sessions: finalized ? r.sessions : null,
        rpm: finalized ? round(r.rpm) : null,
      });
    }
  } catch (e) {
    mediavineError = e instanceof Error ? e : new Error(String(e));
    console.error('[funnel-history] Mediavine fetch failed:', mediavineError.message);
  }

  if (dayMap.size === 0) {
    console.error('[funnel-history] No data available (no existing history.json and the Mediavine fetch failed) — nothing to write.');
    process.exit(mediavineError ? 3 : 1);
  }

  // Fill a contiguous date range (no gaps) from the earliest known date through today.
  const knownDates = Array.from(dayMap.keys());
  const minDate = knownDates.reduce((a, b) => (a < b ? a : b));
  const maxDate = knownDates.reduce((a, b) => (a > b ? a : b), today);
  for (let d = minDate; d <= maxDate; d = shift(d, 1)) {
    if (!dayMap.has(d)) dayMap.set(d, emptyDay(d));
  }
  const sortedDates = Array.from(dayMap.keys()).sort();

  // targets.json — single source of truth for baseline/target numbers.
  const targets = JSON.parse(readFileSync(TARGETS_PATH, 'utf8')) as Targets;
  const nonAdBaseline = targets.baseline.nonAdRevenue.monthlyTotal;

  // nonAdMonthly / ownedAdds7d / pinterestSessions7d from the scoreboard JSONs.
  let lastKnownNonAd = nonAdBaseline;
  for (const d of sortedDates) {
    const entry = dayMap.get(d)!;
    const scoreboardPath = join(REPORTS_DIR, `${d}.json`);
    let scoreboard: ScoreboardJson | null = null;
    if (existsSync(scoreboardPath)) {
      try {
        scoreboard = JSON.parse(readFileSync(scoreboardPath, 'utf8')) as ScoreboardJson;
      } catch {
        scoreboard = null;
      }
    }

    const scoreboardNonAd = scoreboard?.headline?.nonAdRevenueMonthlyGross;
    if (typeof scoreboardNonAd === 'number') {
      lastKnownNonAd = scoreboardNonAd;
      entry.nonAdMonthly = scoreboardNonAd;
    } else if (d < '2026-09-01') {
      entry.nonAdMonthly = nonAdBaseline;
    } else {
      entry.nonAdMonthly = lastKnownNonAd;
    }

    const ownedAdds = scoreboard?.headline?.ownedAdds7d;
    entry.ownedAdds7d = typeof ownedAdds === 'number' ? ownedAdds : null;

    const pinterest = scoreboard?.ga4?.ok ? scoreboard.ga4.data?.byChannel7d?.pinterest : undefined;
    entry.pinterestSessions7d = typeof pinterest === 'number' ? pinterest : null;
  }

  // expectedRevenue / expectedSessions — mean of the same weekday, prior 4 weeks.
  for (const d of sortedDates) {
    const entry = dayMap.get(d)!;
    const revComps: number[] = [];
    const sessComps: number[] = [];
    for (const wk of [7, 14, 21, 28]) {
      const cmp = dayMap.get(shift(d, -wk));
      if (cmp?.revenue != null) revComps.push(cmp.revenue);
      if (cmp?.sessions != null) sessComps.push(cmp.sessions);
    }
    entry.expectedRevenue = revComps.length >= 2 ? round(mean(revComps)) : null;
    entry.expectedSessions = sessComps.length >= 2 ? Math.round(mean(sessComps)) : null;
  }

  // events — rebuilt fully every run from the changelog + incidents.
  const events = [
    ...parseChangelogEvents(join(REPORTS_DIR, 'changelog.md')),
    ...parseIncidentEvents(join(REPORTS_DIR, 'incidents')),
  ].sort((a, b) => a.date.localeCompare(b.date));

  // expectation — straight ramp derived entirely from targets.json.
  const baselinePeriod = targets.baseline.sessions.period;
  const quarterEnd = targets.quarterEnd;
  const endMonth = quarterEnd.slice(0, 7);
  const baselineFactor = 28 / daysInMonth(baselinePeriod);
  const endFactor = 28 / daysInMonth(endMonth);

  const adRevMonthly = targets.baseline.adRevenue.monthly;
  const sessionRpm = targets.baseline.adRevenue.sessionRpm;
  const sessionsBaselineMonthly = targets.baseline.sessions.monthlyMediavine;
  const sessionsEndTarget = targets.targets.monthly.sessions[endMonth];
  const nonAdEndTarget = targets.targets.monthly.nonAdRevenue[endMonth];

  const revenue28dStart = round(adRevMonthly * baselineFactor + nonAdBaseline * baselineFactor);
  const revenue28dEnd = round(sessionsEndTarget * endFactor * (sessionRpm / 1000) + nonAdEndTarget * endFactor);
  const sessions28dStart = Math.round(sessionsBaselineMonthly * baselineFactor);
  const sessions28dEnd = Math.round(sessionsEndTarget * endFactor);

  const expectation: Expectation = {
    startDate: lastDayOfMonth(baselinePeriod),
    endDate: quarterEnd,
    revenue28dStart,
    revenue28dEnd,
    sessions28dStart,
    sessions28dEnd,
    basis:
      `Straight ramp from the ${baselinePeriod} baseline (Mediavine $${adRevMonthly}/mo + non-ad $${nonAdBaseline}/mo ` +
      `at ${sessionsBaselineMonthly} sessions/mo) to the ${endMonth} targets in targets.json targets.monthly ` +
      `(${sessionsEndTarget} sessions/mo at the baseline RPM $${sessionRpm}, non-ad $${nonAdEndTarget}/mo), each prorated to a 28-day window.`,
  };

  const history: History = {
    generatedAt: new Date().toISOString(),
    expectation,
    days: sortedDates.map((d) => dayMap.get(d)!),
    events,
  };

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(history, null, 2));

  const days = history.days;
  let trailingNullDays = 0;
  for (let i = days.length - 1; i >= 0 && days[i].revenue === null; i--) trailingNullDays++;

  console.log(`funnel-history: ${days.length} days, ${days[0]?.date} -> ${days[days.length - 1]?.date}`);
  console.log(`funnel-history: ${trailingNullDays} trailing unfinalized/null day(s)`);
  console.log(`funnel-history: ${events.length} events`);
  console.log(
    `funnel-history: expectation revenue28d ${expectation.revenue28dStart} -> ${expectation.revenue28dEnd}, ` +
      `sessions28d ${expectation.sessions28dStart} -> ${expectation.sessions28dEnd}`,
  );
  console.log(`funnel-history: wrote ${OUT}`);

  if (mediavineError) process.exit(3);
}

main().catch((e) => {
  console.error('[funnel-history] fatal:', e instanceof Error ? e.message : e);
  process.exit(3);
});
