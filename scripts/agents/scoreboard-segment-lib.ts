/**
 * E236 (2026-10-18, Ops; spec Pip 10-16) — the scoreboard's Audience table and 28d headline, read
 * EX the Singapore Direct segment. Pure: no network, no fs, no env.
 *
 * The segment is E216's `SG_DIRECT_RULE` (country = Singapore AND sessionSource = "(direct)"),
 * imported via `revenue-guardrail-lib.ts`'s `segmentDimensionFilter` — the same object E227's
 * guardrail line uses, never a restated copy. Its source leg is the scoreboard `bySource` Direct
 * selector (`src === '(direct)'`), so the segment is a strict subset of the Direct row and
 * subtracts from it with no basis gap.
 *
 * Two outputs:
 *  - `direct_ex_sg_bot` row: Direct 7d / prev 7d minus the segment over the same two windows.
 *  - 28d headline ex segment: the history.json sessions (Mediavine basis) for the last 28 days with
 *    data, each day scaled by (1 − segment ÷ GA4 site sessions) for that day, vs the same days'
 *    expectedSessions (the line). The GA4 count is never subtracted from a Mediavine count — only
 *    its *share* crosses bases. The line itself is NOT ex segment (its same-weekday comps carry the
 *    segment since ~09-15), so this read is conservative.
 *
 * A failed pull or a missing day returns null and prints "unavailable — why"; unknown is never a
 * reading, and nothing here feeds a flag or a verdict.
 */
import { SESSIONS_SEGMENT_RULE, segmentDimensionFilter, type SessionsByDate } from './revenue-guardrail-lib';

export { SESSIONS_SEGMENT_RULE, segmentDimensionFilter };

/** The Audience-table label. Fixed string: /admin/funnel/ and Quinn's digest grep for it. */
export const DIRECT_EX_SEGMENT_CHANNEL = 'direct_ex_sg_bot';
export const HEADLINE_EX_SEGMENT_DAYS = 28;

const num = (n: number) => Math.round(n).toLocaleString('en-US');
function pct(curr: number, prev: number): string {
  if (!prev) return 'n/a';
  const p = ((curr - prev) / prev) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}

export interface DirectExSegment {
  rule: { experiment: string; country: string; source: string };
  direct: { curr: number; prev: number };
  segment: { curr: number; prev: number };
  exSegment: { curr: number; prev: number };
}

/**
 * Direct minus the segment for both windows. Null when either segment total is unknown (pull failed),
 * or when a segment exceeds its Direct total — that can only mean the two reads are not on the same
 * basis, and a negative row would be a wrong number, not a reading.
 */
export function directExSegment(
  direct: { curr: number; prev: number },
  segment: { curr: number; prev: number } | null,
): DirectExSegment | null {
  if (!segment) return null;
  if (!Number.isFinite(segment.curr) || !Number.isFinite(segment.prev)) return null;
  if (segment.curr > direct.curr || segment.prev > direct.prev) return null;
  return {
    rule: { experiment: SESSIONS_SEGMENT_RULE.experiment, country: SESSIONS_SEGMENT_RULE.country, source: SESSIONS_SEGMENT_RULE.source },
    direct,
    segment,
    exSegment: { curr: direct.curr - segment.curr, prev: direct.prev - segment.prev },
  };
}

/** One Audience-table row; prints "unavailable" cells (never a number) when the read could not run. */
export function directExSegmentRow(x: DirectExSegment | null): string {
  if (!x) return `| ${DIRECT_EX_SEGMENT_CHANNEL} | unavailable | unavailable | — |`;
  return `| ${DIRECT_EX_SEGMENT_CHANNEL} | ${num(x.exSegment.curr)} | ${num(x.exSegment.prev)} | ${pct(x.exSegment.curr, x.exSegment.prev)} |`;
}

/** The subset of a history.json `days[]` entry this read needs (field names are the dashboard contract). */
export interface HistoryDayLike {
  date: string;
  sessions: number | null;
  expectedSessions: number | null;
}

export interface HeadlineExSegment {
  rule: { experiment: string; country: string; source: string };
  start: string;
  end: string;
  days: number;
  sessions: number;
  line: number;
  ratio: number;
  exSegmentSessions: number;
  exSegmentRatio: number;
  /** Σ segment ÷ Σ GA4 site sessions over the same days (diagnostic). */
  segmentShareGa4: number;
}

export type HeadlineExSegmentResult = { ok: true; value: HeadlineExSegment } | { ok: false; why: string };

/**
 * The last `windowDays` consecutive history days ending at the newest day with sessions. Every day needs
 * sessions, expectedSessions and a GA4 site count (a day absent from `segment` is zero segment, matching
 * `sessionsExSegment`). Any gap → not ok, with the reason.
 */
export function headlineExSegment(
  history: HistoryDayLike[],
  site: SessionsByDate,
  segment: SessionsByDate,
  windowDays = HEADLINE_EX_SEGMENT_DAYS,
): HeadlineExSegmentResult {
  const withData = history.filter((d) => d.sessions != null).sort((a, b) => a.date.localeCompare(b.date));
  if (withData.length < windowDays) return { ok: false, why: `history.json has ${withData.length} day(s) with sessions (< ${windowDays})` };
  const byDate = new Map(history.map((d) => [d.date, d]));
  const end = withData[withData.length - 1].date;
  const dates: string[] = [];
  const [y, m, dd] = end.split('-').map(Number);
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    const dt = new Date(Date.UTC(y, m - 1, dd - i));
    dates.push(dt.toISOString().slice(0, 10));
  }
  let sessions = 0;
  let line = 0;
  let ex = 0;
  let siteSum = 0;
  let segSum = 0;
  for (const d of dates) {
    const h = byDate.get(d);
    if (!h || h.sessions == null) return { ok: false, why: `history.json has no sessions for ${d}` };
    if (h.expectedSessions == null) return { ok: false, why: `history.json has no expectedSessions for ${d}` };
    if (!(d in site) || !(site[d] > 0)) return { ok: false, why: `GA4 site sessions missing for ${d}` };
    const seg = segment[d] ?? 0;
    if (seg > site[d]) return { ok: false, why: `GA4 segment ${seg} > site ${site[d]} on ${d}` };
    sessions += h.sessions;
    line += h.expectedSessions;
    ex += h.sessions * (1 - seg / site[d]);
    siteSum += site[d];
    segSum += seg;
  }
  if (!(line > 0)) return { ok: false, why: 'line is 0' };
  return {
    ok: true,
    value: {
      rule: { experiment: SESSIONS_SEGMENT_RULE.experiment, country: SESSIONS_SEGMENT_RULE.country, source: SESSIONS_SEGMENT_RULE.source },
      start: dates[0],
      end,
      days: windowDays,
      sessions,
      line,
      ratio: sessions / line,
      exSegmentSessions: ex,
      exSegmentRatio: ex / line,
      segmentShareGa4: siteSum > 0 ? segSum / siteSum : 0,
    },
  };
}

/** One bullet, printed every run under the Audience table. */
export function headlineExSegmentLine(r: HeadlineExSegmentResult): string {
  const tag = `28d headline ex ${SESSIONS_SEGMENT_RULE.country} ${SESSIONS_SEGMENT_RULE.source} (E236 · rule ${SESSIONS_SEGMENT_RULE.experiment})`;
  if (!r.ok) return `${tag}: unavailable — ${r.why}`;
  const x = r.value;
  const p = (v: number) => `${(v * 100).toFixed(1)}%`;
  return `${tag}: sessions ${num(x.sessions)} vs line ${num(x.line)} = ${p(x.ratio)} → ex segment ${num(x.exSegmentSessions)} = ${p(x.exSegmentRatio)} of line (${x.start}→${x.end}; segment ${p(x.segmentShareGa4)} of GA4 sessions, applied per day; the line still carries the segment, so this read is conservative)`;
}
