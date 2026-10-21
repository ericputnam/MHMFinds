/**
 * Top-up grade — pure library (E251, Pip, Distribution).
 *
 * Every SD-10 floor top-up (E170/E188/E202/E209/E244 …) is graded on the same rule —
 * "treated-destination Pinterest WoW ≥ site Pinterest WoW, 0 writer rows, ≤7 rows per posting
 * date" — and until 2026-10-21 every grade was a hand GA4 pull with the windows, the host fold
 * and the control chosen at reading time. This module fixes all of that in code so the next
 * grade (E209 10-22, E244 10-27) is a re-run, not a re-derivation:
 *
 *   - the treated set is read from the top-up tool's own undo ledger
 *     (`reports/funnel/pin-runway-topup-<date>.json`, `entries[].post_url`), never retyped;
 *   - hosts are folded (blog.* → apex) and trailing slashes dropped, because GA4's `landingPage`
 *     prints "/sims-4-urban-tattoos" while the queue's Post URL ends in "/";
 *   - the lift window is the latest finalized 7 d vs the prior 7 d (what every grade so far
 *     quoted), and the post window is the posting dates vs the same dates −7 d (same weekdays —
 *     CLAUDE.md: "Same-weekday-match or drop holidays");
 *   - the rule is printed before the reading (TOPUP_GRADE_RULE), and the verdict is only ever
 *     KEEP or KILL (lift) — "the floor continues as runway-only" is policy, not this tool's call.
 *
 * No network, no filesystem, no secrets — same discipline as direct-bot-lib.ts and
 * rank-pin-destinations-lib.ts. All I/O lives in topup-grade.ts.
 */

import { normalizeHost, normalizePath } from './rank-pin-destinations-lib';

export const TOPUP_GRADE_RULE = {
  metric:
    'GA4 sessions with sessionSource CONTAINS "pinterest" (case-insensitive), landingPage exact on the treated paths, hosts folded (blog.musthavemods.com → apex), query and trailing slash dropped',
  liftKeepIf: 'treated-destination WoW ≥ site Pinterest WoW on the latest finalized 7 d vs the prior 7 d',
  perDateCap: 7,
  postWindowControl: 'the posting dates vs the same dates −7 d (same weekdays)',
} as const;

export interface TopupLedgerEntry {
  id: number;
  old_date: string;
  new_date: string;
  post_url: string;
  board_name?: string;
}

export interface TopupLedger {
  generated: string;
  experiment: string | null;
  entries: TopupLedgerEntry[];
}

export type WindowName = 'curr' | 'prev' | 'post' | 'postPrev';

export interface GradeWindow {
  name: WindowName;
  start: string;
  end: string;
}

/** One GA4 row for one named date range (host + landing path + sessions). */
export interface Ga4RangeRow {
  range: string;
  host: string;
  path: string;
  sessions: number;
}

export interface SiteRangeRow {
  range: string;
  sessions: number;
}

export interface Delta {
  curr: number;
  prev: number;
  /** (curr − prev) / prev, or null when prev is 0. */
  pct: number | null;
}

export interface DestinationDelta extends Delta {
  path: string;
  rows: number;
}

export interface TopupGrade {
  ledgerGenerated: string;
  experiment: string | null;
  end: string;
  rule: typeof TOPUP_GRADE_RULE;
  windows: GradeWindow[];
  treatedPaths: string[];
  rowsPerDate: Record<string, number>;
  rowCount: number;
  /** Leg: ≤ perDateCap rows on every posting date. */
  perDateCapMet: boolean;
  /** Posting dates that fall inside the lift window (curr) — how much of the treatment the lift read actually sees. */
  postingDatesInLiftWindow: number;
  postingDates: number;
  treated: Delta;
  site: Delta;
  perDestination: DestinationDelta[];
  destinationsUp: number;
  /** Post window (posting dates, clipped at `end`) vs the same dates −7 d. Null when no posting date ≤ end. */
  postWindow: { treated: Delta; site: Delta; partial: boolean } | null;
  liftMet: boolean | null;
  verdict: 'KEEP' | 'KILL (lift)' | 'INCONCLUSIVE';
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function shiftDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * 86_400_000).toISOString().slice(0, 10);
}

function num(v: unknown): number {
  const n = typeof v === 'string' ? Number(v) : (v as number);
  return Number.isFinite(n) ? n : NaN;
}

/** Parses a `pin-runway-topup-<date>.json` (or `revive-stranded-pins.py`) undo ledger. Throws on a shape it cannot grade. */
export function parseTopupLedger(raw: unknown): TopupLedger {
  if (!raw || typeof raw !== 'object') throw new Error('ledger is not an object');
  const obj = raw as Record<string, unknown>;
  const entriesRaw = obj.entries;
  if (!Array.isArray(entriesRaw) || entriesRaw.length === 0) throw new Error('ledger has no entries[]');
  const entries: TopupLedgerEntry[] = entriesRaw.map((e, i) => {
    const r = (e ?? {}) as Record<string, unknown>;
    const id = num(r.id);
    const newDate = String(r.new_date ?? '').slice(0, 10);
    const postUrl = String(r.post_url ?? '');
    if (!Number.isFinite(id)) throw new Error(`entries[${i}].id is not a number`);
    if (!DATE_RE.test(newDate)) throw new Error(`entries[${i}].new_date is not YYYY-MM-DD`);
    if (!postUrl) throw new Error(`entries[${i}].post_url is empty`);
    return {
      id,
      old_date: String(r.old_date ?? '').slice(0, 10),
      new_date: newDate,
      post_url: postUrl,
      ...(r.board_name ? { board_name: String(r.board_name) } : {}),
    };
  });
  const generated = String(obj.generated ?? '').slice(0, 10);
  if (!DATE_RE.test(generated)) throw new Error('ledger.generated is not YYYY-MM-DD');
  const experiment = obj.experiment == null ? null : String(obj.experiment);
  return { generated, experiment, entries };
}

/** Path key used for the join: normalised path, trailing slash dropped (root stays "/"). "" when unusable. */
export function pathKey(path: string | null | undefined): string {
  const p = normalizePath(path);
  if (!p) return '';
  const stripped = p.replace(/\/+$/, '');
  return stripped || '/';
}

/** Path key of a queue row's Post URL; "" when the URL does not parse. */
export function pathKeyFromUrl(url: string | null | undefined): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (!normalizeHost(u.hostname)) return '';
    return pathKey(u.pathname);
  } catch {
    return '';
  }
}

/** Distinct treated paths, sorted. Rows whose URL does not parse are dropped (and counted by the caller via `entries`). */
export function treatedPaths(ledger: TopupLedger): string[] {
  const set = new Set<string>();
  for (const e of ledger.entries) {
    const k = pathKeyFromUrl(e.post_url);
    if (k) set.add(k);
  }
  return Array.from(set).sort();
}

export function rowsPerDate(ledger: TopupLedger): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of ledger.entries) out[e.new_date] = (out[e.new_date] ?? 0) + 1;
  return out;
}

/**
 * The four windows for an `end` (last finalized GA4 day):
 *   curr = end−6..end, prev = end−13..end−7 (the lift read),
 *   post = first posting date .. min(last posting date, end), postPrev = post shifted −7 d.
 * `post` is omitted when no posting date is ≤ end.
 */
export function gradeWindows(end: string, ledger: TopupLedger): GradeWindow[] {
  if (!DATE_RE.test(end)) throw new Error('end is not YYYY-MM-DD');
  const windows: GradeWindow[] = [
    { name: 'curr', start: shiftDays(end, -6), end },
    { name: 'prev', start: shiftDays(end, -13), end: shiftDays(end, -7) },
  ];
  const dates = ledger.entries.map((e) => e.new_date).sort();
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first && first <= end) {
    const postEnd = last <= end ? last : end;
    windows.push({ name: 'post', start: first, end: postEnd });
    windows.push({ name: 'postPrev', start: shiftDays(first, -7), end: shiftDays(postEnd, -7) });
  }
  return windows;
}

function pct(curr: number, prev: number): number | null {
  return prev > 0 ? (curr - prev) / prev : null;
}

/** Sums treated-path sessions for one named range, hosts folded, paths matched on pathKey. */
export function sumTreated(rows: Ga4RangeRow[], paths: string[], range: string): { total: number; byPath: Record<string, number> } {
  const want = new Set(paths);
  const byPath: Record<string, number> = {};
  for (const p of paths) byPath[p] = 0;
  let total = 0;
  for (const r of rows) {
    if (r.range !== range) continue;
    if (!normalizeHost(r.host)) continue;
    const k = pathKey(r.path);
    if (!k || !want.has(k)) continue;
    const s = Number.isFinite(r.sessions) ? r.sessions : 0;
    byPath[k] += s;
    total += s;
  }
  return { total, byPath };
}

export function sumSite(rows: SiteRangeRow[], range: string): number {
  let total = 0;
  for (const r of rows) if (r.range === range && Number.isFinite(r.sessions)) total += r.sessions;
  return total;
}

export interface GradeInput {
  ledger: TopupLedger;
  end: string;
  treatedRows: Ga4RangeRow[];
  siteRows: SiteRangeRow[];
}

export function gradeTopup(input: GradeInput): TopupGrade {
  const { ledger, end } = input;
  const windows = gradeWindows(end, ledger);
  const paths = treatedPaths(ledger);
  const perDate = rowsPerDate(ledger);
  const postingDates = Object.keys(perDate).sort();
  const curr = windows.find((w) => w.name === 'curr')!;
  const perDateCapMet = Object.values(perDate).every((n) => n <= TOPUP_GRADE_RULE.perDateCap);

  const tCurr = sumTreated(input.treatedRows, paths, 'curr');
  const tPrev = sumTreated(input.treatedRows, paths, 'prev');
  const sCurr = sumSite(input.siteRows, 'curr');
  const sPrev = sumSite(input.siteRows, 'prev');

  const rowsByPath: Record<string, number> = {};
  for (const e of ledger.entries) {
    const k = pathKeyFromUrl(e.post_url);
    if (k) rowsByPath[k] = (rowsByPath[k] ?? 0) + 1;
  }
  const perDestination: DestinationDelta[] = paths
    .map((p) => ({ path: p, rows: rowsByPath[p] ?? 0, curr: tCurr.byPath[p], prev: tPrev.byPath[p], pct: pct(tCurr.byPath[p], tPrev.byPath[p]) }))
    .sort((a, b) => b.curr - a.curr || a.path.localeCompare(b.path));
  const destinationsUp = perDestination.filter((d) => d.curr > d.prev).length;

  const treated: Delta = { curr: tCurr.total, prev: tPrev.total, pct: pct(tCurr.total, tPrev.total) };
  const site: Delta = { curr: sCurr, prev: sPrev, pct: pct(sCurr, sPrev) };

  let postWindow: TopupGrade['postWindow'] = null;
  const post = windows.find((w) => w.name === 'post');
  if (post) {
    const pt = sumTreated(input.treatedRows, paths, 'post').total;
    const pp = sumTreated(input.treatedRows, paths, 'postPrev').total;
    const st = sumSite(input.siteRows, 'post');
    const sp = sumSite(input.siteRows, 'postPrev');
    const lastPosting = postingDates[postingDates.length - 1];
    postWindow = {
      treated: { curr: pt, prev: pp, pct: pct(pt, pp) },
      site: { curr: st, prev: sp, pct: pct(st, sp) },
      partial: lastPosting > end,
    };
  }

  const liftMet = treated.pct == null || site.pct == null ? null : treated.pct >= site.pct;
  const verdict: TopupGrade['verdict'] = liftMet == null ? 'INCONCLUSIVE' : liftMet ? 'KEEP' : 'KILL (lift)';

  return {
    ledgerGenerated: ledger.generated,
    experiment: ledger.experiment,
    end,
    rule: TOPUP_GRADE_RULE,
    windows,
    treatedPaths: paths,
    rowsPerDate: perDate,
    rowCount: ledger.entries.length,
    perDateCapMet,
    postingDatesInLiftWindow: postingDates.filter((d) => d >= curr.start && d <= curr.end).length,
    postingDates: postingDates.length,
    treated,
    site,
    perDestination,
    destinationsUp,
    postWindow,
    liftMet,
    verdict,
  };
}

export function fmtPct(p: number | null): string {
  return p == null ? '—' : `${p >= 0 ? '+' : ''}${(p * 100).toFixed(1)}%`;
}

export function renderTopupGradeMd(g: TopupGrade): string {
  const w = (name: WindowName) => g.windows.find((x) => x.name === name);
  const curr = w('curr')!;
  const prev = w('prev')!;
  const post = w('post');
  const postPrev = w('postPrev');
  const lines: string[] = [];
  lines.push(`# Top-up grade — ledger ${g.ledgerGenerated}${g.experiment ? ` (${g.experiment})` : ''} · read ${g.end} · E251, Pip`);
  lines.push('');
  lines.push('## Decision rule (fixed before the pull)');
  lines.push('');
  lines.push(`- Metric: ${g.rule.metric}`);
  lines.push(`- Lift leg — KEEP iff ${g.rule.liftKeepIf}; otherwise KILL (lift). The floor itself is governed by SD-10, not by this verdict.`);
  lines.push(`- Cap leg — ≤${g.rule.perDateCap} rows per posting date (from the ledger itself).`);
  lines.push(`- Post window (diagnostic, never the verdict): ${g.rule.postWindowControl}.`);
  lines.push('');
  lines.push('## Reading');
  lines.push('');
  lines.push(`- **Verdict: ${g.verdict}** — treated ${g.treated.curr} vs ${g.treated.prev} (${fmtPct(g.treated.pct)}) vs site Pinterest ${g.site.curr} vs ${g.site.prev} (${fmtPct(g.site.pct)}) · ${curr.start}→${curr.end} vs ${prev.start}→${prev.end}`);
  lines.push(`- Cap leg: ${g.perDateCapMet ? 'MET' : 'NOT MET'} — rows per posting date ${Object.entries(g.rowsPerDate).map(([d, n]) => `${d}: ${n}`).join(', ')} (${g.rowCount} rows, ${g.treatedPaths.length} destinations)`);
  lines.push(`- Lift window sees ${g.postingDatesInLiftWindow} of ${g.postingDates} posting dates; ${g.destinationsUp}/${g.perDestination.length} destinations up WoW`);
  if (g.postWindow && post && postPrev) {
    lines.push(
      `- Post window ${post.start}→${post.end} vs ${postPrev.start}→${postPrev.end}${g.postWindow.partial ? ' (partial — last posting date is after the read day)' : ''}: treated ${g.postWindow.treated.curr} vs ${g.postWindow.treated.prev} (${fmtPct(g.postWindow.treated.pct)}) vs site ${g.postWindow.site.curr} vs ${g.postWindow.site.prev} (${fmtPct(g.postWindow.site.pct)})`,
    );
  } else {
    lines.push('- Post window: none of the posting dates is on or before the read day');
  }
  lines.push('');
  lines.push('## Per destination (lift window)');
  lines.push('');
  lines.push('| path | rows | curr | prev | Δ |');
  lines.push('|---|--:|--:|--:|--:|');
  for (const d of g.perDestination) lines.push(`| ${d.path}/ | ${d.rows} | ${d.curr} | ${d.prev} | ${fmtPct(d.pct)} |`);
  lines.push('');
  lines.push('_Generated by scripts/agents/topup-grade.ts · rule E251 fixed 2026-10-21. A writer-row check is not in this read — it comes from the top-up tool\'s own dry-run line at apply time._');
  lines.push('');
  return lines.join('\n');
}
