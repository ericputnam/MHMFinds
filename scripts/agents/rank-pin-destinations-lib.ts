/**
 * Rank pin destinations — pure helpers for scripts/agents/rank-pin-destinations.ts
 * (E70, plan item 2, 2026-09-22 — Pip, Distribution).
 *
 * WHY THIS EXISTS
 *   The 2026-09-19 read-back (reports/funnel/pinterest-read-2026-09-19.md §3)
 *   found revive-stranded-pins.py's default allocator (newest stranded rows
 *   first) was anti-correlated with sessions: in a dry run the 3 destinations
 *   that got the most pins (63 of 196, 32% of the slice) earned 69 Pinterest
 *   sessions/7d combined — 2.8% of the candidate set — while the 2
 *   best-earning destinations (1,359 sessions/7d, 55% of the set) got only 28
 *   pins. `--ids-from` (E70/PR earlier) lets an ordered id list drive the
 *   allocator instead of recency; this file is the pure ranking/normalisation
 *   logic behind the script that produces that ordered list. E66-A
 *   (reports/funnel/pin-revival-package-2026-09-20.json) proved the shape by
 *   hand; nothing built it automatically until this file.
 *
 * No network, no filesystem, no secrets — the same discipline as
 * pinner-liveness-lib.ts and patreon-members-lib.ts. All I/O (GA4, Supabase,
 * report files) lives in rank-pin-destinations.ts.
 */

export interface Ga4LandingRow {
  /** GA4 `hostName` dimension value, e.g. "musthavemods.com" or "blog.musthavemods.com". */
  host: string;
  /** GA4 `landingPagePlusQueryString` dimension value, e.g. "/sims-4-wedges-cc/?utm=..." or "(not set)". */
  path: string;
  sessions: number;
}

export interface StrandedPinRow {
  /** n8n_pinterest_posts.id */
  id: number;
  /** n8n_pinterest_posts."Post URL" */
  postUrl: string;
  /** n8n_pinterest_posts."Post Date", YYYY-MM-DD */
  postDate: string;
}

export interface RankedDestination {
  /** Path only (host stripped after normalisation), e.g. "/sims-4-wedges-cc/". */
  path: string;
  sessions7d: number;
  sessions28d: number;
  /** Count of stranded rows found for this destination, before --max-per-url capping. */
  strandedRows: number;
  /** Stranded row ids for this destination, oldest-post-date-first, capped at maxPerUrl. */
  ids: number[];
}

export interface RankResult {
  /** Sorted descending by sessions7d. */
  destinations: RankedDestination[];
  /** Distinct destinations that had stranded rows but < minSessions7d Pinterest sessions. */
  droppedBelowThreshold: number;
  /** Stranded rows whose "Post URL" would not parse as a URL. */
  droppedUnparseableUrl: number;
  /** Stranded rows whose destination host is in skipHosts. */
  droppedSkippedHost: number;
  /** Stranded rows given to rankDestinations, before any dropping. */
  poolRows: number;
}

const APEX_HOST = 'musthavemods.com';
const BLOG_HOST = 'blog.musthavemods.com';

/**
 * Lower-cases a host and folds the proxied blog subdomain into the apex —
 * the same content served twice, only one of them the canonical the rest of
 * the funnel optimises for (pinterest-read-2026-09-19.md §1-2).
 */
export function normalizeHost(host: string | null | undefined): string {
  const h = (host ?? '').trim().toLowerCase();
  if (h === BLOG_HOST) return APEX_HOST;
  return h;
}

/**
 * Strips query string and fragment, ensures a leading slash, collapses
 * doubled slashes. GA4's own "(not set)" landing-page value (unattributed
 * sessions, mostly the Pinterest in-app browser stripping the referrer
 * before the page-view fires — see the 2026-09-19 read §5) normalises to the
 * empty string so callers can drop it instead of accidentally joining it to
 * a real destination.
 */
export function normalizePath(path: string | null | undefined): string {
  let p = (path ?? '').trim();
  if (!p || p === '(not set)') return '';
  p = p.split('?')[0].split('#')[0];
  if (!p) return '';
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  return p;
}

/** host + normalised path as a single join key, or null when either half is empty. */
export function destinationKey(host: string | null | undefined, path: string | null | undefined): string | null {
  const h = normalizeHost(host);
  const p = normalizePath(path);
  if (!h || !p) return null;
  return `${h}${p}`;
}

/** Same join key, derived from a full destination URL (a queue row's "Post URL"). Null on anything unparseable. */
export function destinationKeyFromUrl(url: string | null | undefined): string | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return destinationKey(u.hostname, u.pathname);
  } catch {
    return null;
  }
}

/** Path half of a destination key, i.e. what pathFromKey(destinationKey(h, p)) returns. */
export function pathFromKey(key: string): string {
  const idx = key.indexOf('/');
  return idx === -1 ? key : key.slice(idx);
}

/** Best-effort hostname of a raw URL, lower-cased, '' if unparseable — used only to test skipHosts before the URL is otherwise touched. */
export function hostOfUrl(url: string | null | undefined): string {
  const raw = (url ?? '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Sums GA4 sessions by normalised destination key. Rows with an unparseable
 * host/path (including "(not set)") contribute nothing — that traffic is a
 * measurement artifact, not a destination a pin can be re-ranked toward
 * (pinterest-read-2026-09-19.md §5).
 */
export function aggregateSessions(rows: Ga4LandingRow[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const row of rows) {
    const key = destinationKey(row.host, row.path);
    if (!key) continue;
    out.set(key, (out.get(key) ?? 0) + (Number.isFinite(row.sessions) ? row.sessions : 0));
  }
  return out;
}

export interface RankOptions {
  strandedRows: StrandedPinRow[];
  sessions7dRows: Ga4LandingRow[];
  sessions28dRows: Ga4LandingRow[];
  /** Minimum 7d Pinterest sessions a destination must have to be included. Default 50 (the E66-A rule). */
  minSessions7d: number;
  /** Max stranded-row ids returned per destination. 0 or negative = no cap. */
  maxPerUrl: number;
  /** Destination hosts to exclude entirely (default: the proxied blog subdomain — revive-stranded-pins.py drops these at --apply time anyway; dropping here keeps the package honest about what is actually selectable). */
  skipHosts?: string[];
}

/**
 * Joins stranded queue rows to their destination's Pinterest sessions and
 * ranks by 7d sessions descending. Pure: same input, same output, every time.
 */
export function rankDestinations(opts: RankOptions): RankResult {
  const skipHosts = new Set((opts.skipHosts ?? []).map((h) => h.toLowerCase()));
  const sessions7d = aggregateSessions(opts.sessions7dRows);
  const sessions28d = aggregateSessions(opts.sessions28dRows);

  const byKey = new Map<string, StrandedPinRow[]>();
  let droppedUnparseableUrl = 0;
  let droppedSkippedHost = 0;

  for (const row of opts.strandedRows) {
    const host = hostOfUrl(row.postUrl);
    if (host && skipHosts.has(host)) {
      droppedSkippedHost++;
      continue;
    }
    const key = destinationKeyFromUrl(row.postUrl);
    if (!key) {
      droppedUnparseableUrl++;
      continue;
    }
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key)!.push(row);
  }

  const destinations: RankedDestination[] = [];
  let droppedBelowThreshold = 0;

  for (const [key, rows] of Array.from(byKey.entries())) {
    const s7 = sessions7d.get(key) ?? 0;
    if (s7 < opts.minSessions7d) {
      droppedBelowThreshold++;
      continue;
    }
    const s28 = sessions28d.get(key) ?? 0;
    const ordered = [...rows].sort((a, b) => {
      if (a.postDate !== b.postDate) return a.postDate < b.postDate ? -1 : 1;
      return a.id - b.id;
    });
    const capped = opts.maxPerUrl > 0 ? ordered.slice(0, opts.maxPerUrl) : ordered;
    destinations.push({
      path: pathFromKey(key),
      sessions7d: s7,
      sessions28d: s28,
      strandedRows: rows.length,
      ids: capped.map((r) => r.id),
    });
  }

  destinations.sort((a, b) => (b.sessions7d - a.sessions7d) || a.path.localeCompare(b.path));

  return {
    destinations,
    droppedBelowThreshold,
    droppedUnparseableUrl,
    droppedSkippedHost,
    poolRows: opts.strandedRows.length,
  };
}

/**
 * The exact shape scripts/agents/revive-stranded-pins.py's `parse_ids_file`
 * reads (`destinations[].ids`, sessions-ranked — see that file's
 * `--ids-from` docstring). Extra metadata keys are ignored by the parser but
 * kept here so a human reading the JSON has the context without the .md.
 */
export function toIdsFilePackage(
  result: RankResult,
  meta: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...meta,
    destinations: result.destinations.map((d) => ({
      path: d.path,
      sessions7d: d.sessions7d,
      sessions28d: d.sessions28d,
      stranded_rows: d.strandedRows,
      ids: d.ids,
    })),
  };
}

/** A markdown table for a human to read next to the JSON. */
export function renderMarkdownTable(result: RankResult, meta: Record<string, string | number>): string {
  const lines: string[] = [];
  lines.push('| Destination | 7d Pinterest sessions | 28d Pinterest sessions | stranded rows | ids offered |');
  lines.push('|---|--:|--:|--:|--:|');
  for (const d of result.destinations) {
    lines.push(`| \`${d.path}\` | ${d.sessions7d} | ${d.sessions28d} | ${d.strandedRows} | ${d.ids.length} |`);
  }
  const metaLines = Object.entries(meta).map(([k, v]) => `- **${k}:** ${v}`).join('\n');
  return [
    metaLines,
    '',
    `Dropped: ${result.droppedBelowThreshold} destination(s) below the session threshold, ` +
      `${result.droppedSkippedHost} row(s) on a skipped host, ${result.droppedUnparseableUrl} row(s) with an unparseable Post URL ` +
      `(pool ${result.poolRows} stranded row(s)).`,
    '',
    lines.join('\n'),
  ].join('\n');
}
