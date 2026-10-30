/**
 * Tumblr curve — pure helpers for scripts/agents/tumblr-curve.ts (E266, Pip).
 *
 * QUESTION THIS ANSWERS
 *   Tumblr is the healthiest non-Pinterest referral line (1,254 sessions/7d,
 *   +11.4% WoW on 2026-10-25). The MHMUtils `mhm-social-scheduler` plugin
 *   already posts one blog share a day to musthavemods.tumblr.com with an
 *   AI caption. So the blog→Tumblr path is automatic; the question is
 *   whether the sessions come from those fresh posts or from evergreen
 *   pages that nobody has posted in weeks. That decides the lever: more
 *   fresh posts (cadence) or re-pointing the daily slot at evergreen
 *   earners (selection).
 *
 * WHAT IS HERE
 *   - parseRssItems: the blog's own Tumblr RSS (20 newest posts) → one row
 *     per post with the musthavemods.com paths it links. Regex-based: the
 *     feed is tiny and we need no XML dependency.
 *   - buildCurves: per posted path, Tumblr sessions on day 0..N after the
 *     post, from GA4 date × landing-page rows.
 *   - splitFreshEvergreen: per landing path, 28d Tumblr sessions, first-7 /
 *     last-7 trend, and whether the path was posted in the RSS window.
 *   - rankReshare: evergreen candidates for a reshare slice, by Tumblr
 *     sessions (never recency), NSFW/non-content excluded.
 *   - renderReport: the markdown reading.
 *
 * No network, no filesystem. I/O lives in tumblr-curve.ts.
 */
import { isPostable, normalizeDestination } from './social-draft-lib';

export interface RssItem {
  title: string;
  link: string;
  /** ISO date (UTC) the post went up. */
  date: string;
  /** Normalized musthavemods.com paths linked from the post body or title. */
  paths: string[];
}

export interface DailyRow {
  /** YYYY-MM-DD */
  date: string;
  host: string;
  path: string;
  sessions: number;
}

export interface PathCurve {
  path: string;
  postedOn: string;
  title: string;
  /** sessions on day 0, 1, …, N after the post (index = day offset). */
  days: number[];
  total: number;
}

export interface PathSplit {
  path: string;
  total: number;
  first7: number;
  last7: number;
  fresh: boolean;
  postedOn?: string;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '');
}

function tag(block: string, name: string): string {
  const m = block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return m ? stripCdata(m[1].trim()) : '';
}

const PATH_RE = /https?:\/\/(?:www\.|blog\.)?musthavemods\.com(\/[^\s"'<>)]*)?/g;

/** Extract musthavemods.com paths from any text (HTML or plain), normalized and de-duplicated. */
export function extractPaths(text: string): string[] {
  const out = new Set<string>();
  for (const m of Array.from(text.matchAll(PATH_RE))) {
    const p = normalizeDestination('musthavemods.com', m[1] ?? '/');
    if (p) out.add(p);
  }
  return Array.from(out);
}

const MONTHS: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

/**
 * The calendar day the post went up in the feed's own offset (Tumblr writes
 * the blog's local time, e.g. "Fri, 23 Oct 2026 20:30:00 -0400"). Converting
 * to UTC would move every evening post to the next day and misalign day 0 of
 * the curve. Falls back to the UTC date when the RFC-822 shape is absent.
 */
export function localDate(pubDate: string, parsed: Date): string {
  const m = pubDate.match(/(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${MONTHS[m[2].toLowerCase()]}-${m[1].padStart(2, '0')}`;
  return parsed.toISOString().slice(0, 10);
}

/** Parse the Tumblr RSS feed. Items without a parsable pubDate are skipped. */
export function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  for (const m of Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g))) {
    const block = m[1];
    const pub = tag(block, 'pubDate');
    const d = new Date(pub);
    if (!pub || Number.isNaN(d.getTime())) continue;
    const title = decodeEntities(tag(block, 'title'));
    const link = tag(block, 'link');
    const desc = decodeEntities(tag(block, 'description'));
    const paths = extractPaths(`${title}\n${desc}\n${link}`);
    items.push({ title, link, date: localDate(pub, d), paths });
  }
  return items;
}

function dayDiff(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

/** Fold hosts and build a path → date → sessions map. */
export function indexDaily(rows: DailyRow[]): Map<string, Map<string, number>> {
  const idx = new Map<string, Map<string, number>>();
  for (const r of rows) {
    const p = normalizeDestination(r.host, r.path);
    if (!p) continue;
    let byDate = idx.get(p);
    if (!byDate) {
      byDate = new Map();
      idx.set(p, byDate);
    }
    byDate.set(r.date, (byDate.get(r.date) ?? 0) + (Number.isFinite(r.sessions) ? r.sessions : 0));
  }
  return idx;
}

/**
 * Per posted path, the Tumblr sessions on day 0..horizon after the post. A
 * path posted twice is counted from its earliest post. Only posts whose
 * day-`horizon` is ≤ `lastDate` get a full curve; others are marked by a
 * shorter `days` array (truncated at lastDate), never padded with zeros.
 */
export function buildCurves(items: RssItem[], rows: DailyRow[], lastDate: string, horizon = 7): PathCurve[] {
  const idx = indexDaily(rows);
  const seen = new Map<string, RssItem>();
  for (const it of items.slice().sort((a, b) => a.date.localeCompare(b.date))) {
    for (const p of it.paths) if (!seen.has(p)) seen.set(p, it);
  }
  const out: PathCurve[] = [];
  for (const [path, it] of Array.from(seen.entries())) {
    const byDate = idx.get(path) ?? new Map<string, number>();
    const days: number[] = [];
    for (let off = 0; off <= horizon; off += 1) {
      const d = new Date(Date.parse(`${it.date}T00:00:00Z`) + off * 86400000).toISOString().slice(0, 10);
      if (d > lastDate) break;
      days.push(byDate.get(d) ?? 0);
    }
    out.push({ path, postedOn: it.date, title: it.title, days, total: days.reduce((a, b) => a + b, 0) });
  }
  out.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path));
  return out;
}

/**
 * Every landing path's Tumblr sessions in [start, end], split into fresh
 * (posted in the RSS set during the window) and evergreen (not posted).
 */
export function splitFreshEvergreen(items: RssItem[], rows: DailyRow[], start: string, end: string): PathSplit[] {
  const idx = indexDaily(rows);
  const posted = new Map<string, string>();
  for (const it of items) {
    if (it.date < start || it.date > end) continue;
    for (const p of it.paths) if (!posted.has(p) || it.date < (posted.get(p) as string)) posted.set(p, it.date);
  }
  const first7End = new Date(Date.parse(`${start}T00:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
  const last7Start = new Date(Date.parse(`${end}T00:00:00Z`) - 6 * 86400000).toISOString().slice(0, 10);
  const out: PathSplit[] = [];
  for (const [path, byDate] of Array.from(idx.entries())) {
    let total = 0;
    let first7 = 0;
    let last7 = 0;
    for (const [d, s] of Array.from(byDate.entries())) {
      if (d < start || d > end) continue;
      total += s;
      if (d <= first7End) first7 += s;
      if (d >= last7Start) last7 += s;
    }
    if (total === 0) continue;
    const postedOn = posted.get(path);
    out.push({ path, total, first7, last7, fresh: postedOn !== undefined, postedOn });
  }
  out.sort((a, b) => b.total - a.total || a.path.localeCompare(b.path));
  return out;
}

export interface ShareSummary {
  total: number;
  fresh: number;
  evergreen: number;
  freshShare: number;
  freshPaths: number;
  evergreenPaths: number;
}

export function summarize(split: PathSplit[]): ShareSummary {
  let fresh = 0;
  let evergreen = 0;
  let freshPaths = 0;
  let evergreenPaths = 0;
  for (const s of split) {
    if (s.fresh) {
      fresh += s.total;
      freshPaths += 1;
    } else {
      evergreen += s.total;
      evergreenPaths += 1;
    }
  }
  const total = fresh + evergreen;
  return { total, fresh, evergreen, freshShare: total ? fresh / total : 0, freshPaths, evergreenPaths };
}

/** Evergreen reshare candidates, ranked by Tumblr sessions in the window; postable paths only. */
export function rankReshare(split: PathSplit[], top = 10, min = 20): PathSplit[] {
  return split.filter((s) => !s.fresh && s.total >= min && isPostable(s.path)).slice(0, top);
}

export interface ReportInput {
  generatedOn: string;
  start: string;
  end: string;
  items: RssItem[];
  curves: PathCurve[];
  split: PathSplit[];
  summary: ShareSummary;
  reshare: PathSplit[];
  channel7d: number;
  channelPrev7d: number;
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function renderReport(r: ReportInput): string {
  const L: string[] = [];
  const wow = r.channelPrev7d ? ((r.channel7d - r.channelPrev7d) / r.channelPrev7d) * 100 : 0;
  L.push(`# Tumblr curve — ${r.generatedOn}`);
  L.push('');
  L.push(`GA4 landing sessions, \`sessionSource\` contains "tumblr", ${r.start}→${r.end} (28d, anchored at the last finalized day). Own posts from musthavemods.tumblr.com/rss (${r.items.length} newest; the feed does not paginate, so posts older than the oldest item are invisible here and would read as "evergreen").`);
  L.push('');
  L.push('## Headline');
  L.push('');
  L.push(`- Tumblr sessions 7d: **${r.channel7d.toLocaleString()}** (prev 7d ${r.channelPrev7d.toLocaleString()}, ${wow >= 0 ? '+' : ''}${wow.toFixed(1)}%)`);
  L.push(`- 28d Tumblr landing sessions: **${r.summary.total.toLocaleString()}** · from pages posted in the window (fresh, ${r.summary.freshPaths} paths): **${r.summary.fresh.toLocaleString()} (${pct(r.summary.freshShare)})** · from pages not posted in the window (evergreen, ${r.summary.evergreenPaths} paths): **${r.summary.evergreen.toLocaleString()} (${pct(1 - r.summary.freshShare)})**`);
  L.push('');
  L.push('## Fresh-post curve (sessions on day 0..7 after our own post)');
  L.push('');
  L.push('| Posted | Path | d0 | d1 | d2 | d3 | d4 | d5 | d6 | d7 | Σ |');
  L.push('|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|');
  for (const c of r.curves) {
    const cells = Array.from({ length: 8 }, (_, i) => (i < c.days.length ? String(c.days[i]) : '·'));
    L.push(`| ${c.postedOn} | \`${c.path}\` | ${cells.join(' | ')} | ${c.total} |`);
  }
  if (!r.curves.length) L.push('| — | (no own posts with a musthavemods.com link in the feed) | | | | | | | | | |');
  L.push('');
  L.push('"·" = day not yet finalized. Σ is the 8-day total per posted path.');
  L.push('');
  L.push('## Evergreen earners (not posted in the window) — reshare candidates, ranked by sessions');
  L.push('');
  L.push('| # | Path | 28d | first 7 | last 7 |');
  L.push('|--:|---|--:|--:|--:|');
  r.reshare.forEach((s, i) => L.push(`| ${i + 1} | \`${s.path}\` | ${s.total} | ${s.first7} | ${s.last7} |`));
  L.push('');
  L.push('NSFW and non-content paths are excluded from this table by `isPostable()`; the exclusion is by design, not an oversight.');
  L.push('');
  L.push('## Top 15 Tumblr landing paths, all');
  L.push('');
  L.push('| Path | 28d | first 7 | last 7 | Posted by us |');
  L.push('|---|--:|--:|--:|---|');
  for (const s of r.split.slice(0, 15)) L.push(`| \`${s.path}\` | ${s.total} | ${s.first7} | ${s.last7} | ${s.fresh ? s.postedOn : '—'} |`);
  L.push('');
  L.push('## What this means for the lever');
  L.push('');
  L.push('- The blog→Tumblr path is already automatic (MHMUtils `mhm-social-scheduler`, ~1 post/day, AI caption). Cadence is not the constraint.');
  L.push('- If the fresh share is small and the evergreen table is dominated by a handful of pages, the lever is **selection**: point some of the daily slots at the evergreen earners above (reblog-friendly photoset, creator credited). That is a public post in the operator\'s account → **Tier 2**; the slice above is the package.');
  L.push('- If the fresh share is large, the lever is **cadence** (more posts/day) — also Tier 2 (operator account) but a different ask.');
  L.push('');
  L.push('_Generated by `scripts/agents/tumblr-curve.ts` (E266). Read-only: GA4 and a public RSS feed; nothing is posted._');
  L.push('');
  return L.join('\n');
}
