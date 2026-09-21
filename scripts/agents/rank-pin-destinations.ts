#!/usr/bin/env -S npx tsx
/**
 * Rank pin destinations by the Pinterest sessions they actually earn — the
 * producer for `revive-stranded-pins.py --ids-from` (Pip, Distribution;
 * plan item 2, 2026-09-22).
 *
 * WHY THIS EXISTS
 *   The 2026-09-19 read-back (reports/funnel/pinterest-read-2026-09-19.md §3)
 *   found the stranded-pin revival allocator's default selection (newest
 *   rows first) was anti-correlated with sessions: the 3 most-pinned
 *   destinations in a dry run earned 69 Pinterest sessions/7d combined; the
 *   2 best-earning destinations earned 1,359. PR #130 gave
 *   revive-stranded-pins.py an `--ids-from <json>` mode so an ordered id
 *   list can drive the allocator instead of recency, but the ranked package
 *   it consumed (reports/funnel/pin-revival-package-2026-09-20.json) was
 *   built by hand. This script is the producer.
 *
 * WHAT IT DOES — read-only, never touches the Supabase queue, never re-dates
 * a row, never calls --apply on anything
 *   1. Pulls Pinterest-referred sessions per landing page (GA4 `hostName` x
 *      `landingPagePlusQueryString`, `sessionSource` CONTAINS "pinterest" —
 *      the same wider definition the 2026-09-19 read-back used) for the
 *      last two finalized windows: 7d and 28d.
 *   2. Normalises hosts (blog.musthavemods.com -> musthavemods.com apex —
 *      the proxied duplicate serves the same content) and strips query
 *      strings (rank-pin-destinations-lib.ts: normalizeHost/normalizePath).
 *   3. Fetches unposted, stranded rows (Post Date before the poster's 14d
 *      window — same predicate as revive-stranded-pins.py's default
 *      selection) from the Supabase queue (n8n_pinterest_posts) and joins
 *      them to the session data by normalised destination.
 *   4. Ranks destinations by 7d sessions, drops any below --min-sessions
 *      (default 50, the E66-A rule), caps ids per destination at
 *      --max-per-url, and writes the JSON in exactly the shape
 *      revive-stranded-pins.py --ids-from / parse_ids_file reads
 *      (`destinations[].ids`, sessions-ranked).
 *   5. Writes a markdown table alongside the JSON.
 *
 *   Turning this output into a live revival is a separate, Tier 2 decision
 *   under SD-10 (Pinterest queue volume/timing/inventory) — this script only
 *   produces the ranked package; it never runs `--apply` on anything.
 *
 * USAGE
 *   npx tsx scripts/agents/rank-pin-destinations.ts
 *   npx tsx scripts/agents/rank-pin-destinations.ts --min-sessions 100 --max-per-url 5
 *   npx tsx scripts/agents/rank-pin-destinations.ts --pool-size 500 \
 *       --out reports/funnel/pin-revival-package-2026-09-22.json
 *   npx tsx scripts/agents/rank-pin-destinations.ts --no-write   # stdout only
 *
 * Then, once an operator approves a Tier 2 package built from this output:
 *   python3 scripts/agents/revive-stranded-pins.py \
 *       --ids-from reports/funnel/pin-revival-package-YYYY-MM-DD.json \
 *       --max-per-url 1 --per-day N --days N --apply
 *
 * ENV
 *   GOOGLE_APPLICATION_CREDENTIALS, or the google-analytics MCP entry in
 *   ~/.claude.json — same lookup funnel-scoreboard.ts uses.
 *   MHM_UTILS_ENV (default ~/java_projects/MHMUtils/.env) for the Supabase
 *   queue fallback; MHMUtils/config.json is tried first — same as
 *   funnel-scoreboard.ts and revive-stranded-pins.py.
 *
 * Never prints secrets.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  rankDestinations,
  renderMarkdownTable,
  toIdsFilePackage,
  type Ga4LandingRow,
  type StrandedPinRow,
} from './rank-pin-destinations-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? '/Users/eputnam/java_projects/MHMFinds';
const OUT_DIR = join(PROJECT_DIR, 'reports', 'funnel');
const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';
const PINNER_ENV = process.env.MHM_UTILS_ENV ?? join(homedir(), 'java_projects', 'MHMUtils', '.env');
// Must match BACKLOG_LOOKBACK_DAYS in MHMUtils/supabase_pin_poster_server.py
// and LOOKBACK_DAYS in revive-stranded-pins.py.
const POSTER_LOOKBACK_DAYS = 14;
const DEFAULT_MIN_SESSIONS_7D = 50;
const DEFAULT_MAX_PER_URL = 10;
const DEFAULT_POOL_SIZE = 1000;
const DEFAULT_SKIP_HOSTS = ['blog.musthavemods.com'];

// ---------------------------------------------------------------- helpers
function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}

/** Parse a dotenv file into a map without ever logging values. */
function readEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(path)) return out;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    out[key] = val;
  }
  return out;
}

/** Locate the Google service-account file the MCP servers already use (mirrors funnel-scoreboard.ts). */
function googleCredentialsPath(): string | undefined {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'));
    return cfg?.mcpServers?.['google-analytics']?.env?.GOOGLE_APPLICATION_CREDENTIALS ?? cfg?.mcpServers?.gsc?.env?.GOOGLE_APPLICATION_CREDENTIALS;
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------- GA4
async function fetchPinterestLandingSessions(startDate: string, endDate: string): Promise<Ga4LandingRow[]> {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const property = `properties/${GA4_PROPERTY}`;

  const PAGE = 100000;
  const rows: Ga4LandingRow[] = [];
  let offset = 0;
  for (;;) {
    const [res] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'hostName' }, { name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: {
        filter: {
          fieldName: 'sessionSource',
          stringFilter: { value: 'pinterest', matchType: 'CONTAINS' as const, caseSensitive: false },
        },
      },
      limit: PAGE,
      offset,
    });
    for (const row of res.rows ?? []) {
      rows.push({
        host: row.dimensionValues?.[0]?.value ?? '',
        path: row.dimensionValues?.[1]?.value ?? '',
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
      });
    }
    if (!res.rows || res.rows.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

// ---------------------------------------------------------------- Supabase (pinner queue)
async function loadSupabaseConfig(): Promise<{ base: string; key: string }> {
  let base = '';
  let key = '';
  const cfgPath = join(PINNER_ENV, '..', 'config.json');
  if (existsSync(cfgPath)) {
    const cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) as Record<string, string>;
    base = cfg.SUPABASE_URL ?? '';
    key = cfg.SUPABASE_KEY ?? cfg.SUPABASE_SERVICE_ROLE_KEY ?? '';
  }
  if (!base || !key) {
    const env = readEnvFile(PINNER_ENV);
    base = env.SUPABASE_URL ?? '';
    key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || '';
  }
  if (!base || !key) throw new Error('Supabase creds not found in MHMUtils config.json/.env');
  return { base: base.replace(/\/$/, ''), key };
}

/** Newest `poolSize` stranded rows (unposted, Post Date before the poster's window) — same predicate as revive-stranded-pins.py's default `fetch_stranded`. Read-only: GET only. */
async function fetchStrandedPool(poolSize: number): Promise<StrandedPinRow[]> {
  const { base, key } = await loadSupabaseConfig();
  const headers = { apikey: key, Authorization: `Bearer ${key}` };
  // Same floor the poster and revive-stranded-pins.py's default fetch_stranded use.
  const floor = daysAgo(POSTER_LOOKBACK_DAYS);
  const query =
    `select=id,%22Post%20Date%22,%22Post%20URL%22` +
    `&%22Is%20Posted%22=eq.false` +
    `&%22Post%20Date%22=lt.${floor}` +
    `&order=%22Post%20Date%22.desc&limit=${poolSize}`;
  const table = `${base}/rest/v1/n8n_pinterest_posts`;
  const r = await fetch(`${table}?${query}`, { headers });
  if (!r.ok) throw new Error(`supabase ${r.status}`);
  const raw = (await r.json()) as Array<Record<string, unknown>>;
  return raw.map((row) => ({
    id: Number(row.id),
    postUrl: String(row['Post URL'] ?? ''),
    postDate: String(row['Post Date'] ?? '').slice(0, 10),
  }));
}

// ---------------------------------------------------------------- CLI
interface Args {
  minSessions: number;
  maxPerUrl: number;
  poolSize: number;
  skipHosts: string[];
  out?: string;
  write: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    minSessions: DEFAULT_MIN_SESSIONS_7D,
    maxPerUrl: DEFAULT_MAX_PER_URL,
    poolSize: DEFAULT_POOL_SIZE,
    skipHosts: [...DEFAULT_SKIP_HOSTS],
    write: true,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--min-sessions') args.minSessions = Number(argv[++i]);
    else if (a === '--max-per-url') args.maxPerUrl = Number(argv[++i]);
    else if (a === '--pool-size') args.poolSize = Number(argv[++i]);
    else if (a === '--skip-host') args.skipHosts.push(String(argv[++i]).toLowerCase());
    else if (a === '--include-all-hosts') args.skipHosts = [];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--no-write') args.write = false;
    else if (a === '--help' || a === '-h') {
      console.log('See the header comment of this file for usage.');
      process.exit(0);
    }
  }
  return args;
}

// ---------------------------------------------------------------- main
async function main() {
  const args = parseArgs(process.argv.slice(2));

  // GA4 finalizes ~24-48h late; anchor windows at 2 days ago (same convention
  // as funnel-scoreboard.ts's pullGa4).
  const end = daysAgo(2);
  const start7d = daysAgo(8);
  const start28d = daysAgo(29);

  console.log(`[rank-pin-destinations] GA4 windows: 7d ${start7d}→${end}, 28d ${start28d}→${end}`);
  console.log(`[rank-pin-destinations] min-sessions=${args.minSessions} max-per-url=${args.maxPerUrl} pool-size=${args.poolSize} skip-hosts=${args.skipHosts.join(',') || '(none)'}`);

  const [sessions7dRows, sessions28dRows, strandedRows] = await Promise.all([
    fetchPinterestLandingSessions(start7d, end),
    fetchPinterestLandingSessions(start28d, end),
    fetchStrandedPool(args.poolSize),
  ]);

  const result = rankDestinations({
    strandedRows,
    sessions7dRows,
    sessions28dRows,
    minSessions7d: args.minSessions,
    maxPerUrl: args.maxPerUrl,
    skipHosts: args.skipHosts,
  });

  const today = iso(new Date());
  const meta = {
    generated: today,
    generator: 'scripts/agents/rank-pin-destinations.ts',
    status: 'GENERATED — read-only output; not a queued Tier 2 package until an operator/agent adds an experiment id and a per-day/days plan and gets approval (SD-10)',
    window_7d: `${start7d}..${end}`,
    window_28d: `${start28d}..${end}`,
    source: "GA4 hostName x landingPagePlusQueryString, sessionSource CONTAINS 'pinterest' (case-insensitive) — the wider definition used in reports/funnel/pinterest-read-2026-09-19.md",
    selection: `stranded rows (unposted, Post Date < today-${POSTER_LOOKBACK_DAYS}d), destination normalised (blog.musthavemods.com -> musthavemods.com, query stripped), >=${args.minSessions} Pinterest sessions/7d, <=${args.maxPerUrl} ids/destination`,
    pool_rows: result.poolRows,
    dropped_below_threshold_destinations: result.droppedBelowThreshold,
    dropped_skipped_host_rows: result.droppedSkippedHost,
    dropped_unparseable_url_rows: result.droppedUnparseableUrl,
    destinations_selected: result.destinations.length,
    ids_selected: result.destinations.reduce((n, d) => n + d.ids.length, 0),
    next_step: 'python3 scripts/agents/revive-stranded-pins.py --ids-from <this file> --max-per-url 1 --per-day N --days N   (dry run first; --apply needs Tier 2 approval, SD-10)',
  };

  const pkg = toIdsFilePackage(result, meta);

  console.log(`[rank-pin-destinations] pool ${result.poolRows} stranded row(s) -> ${result.destinations.length} destination(s) selected, ${meta.ids_selected} id(s); dropped ${result.droppedBelowThreshold} below threshold, ${result.droppedSkippedHost} on a skipped host, ${result.droppedUnparseableUrl} unparseable.`);
  const top = result.destinations.slice(0, 10);
  for (const d of top) {
    console.log(`  ${d.sessions7d.toString().padStart(6)}/7d  ${d.sessions28d.toString().padStart(7)}/28d  ${d.ids.length.toString().padStart(2)} id(s)  ${d.path}`);
  }
  if (result.destinations.length > 10) {
    console.log(`  ... and ${result.destinations.length - 10} more`);
  }

  if (!args.write) {
    console.log('[rank-pin-destinations] --no-write: not writing report files.');
    return;
  }

  const jsonPath = args.out ?? join(OUT_DIR, `pin-revival-package-${today}.json`);
  const mdPath = jsonPath.endsWith('.json') ? jsonPath.slice(0, -5) + '.md' : `${jsonPath}.md`;
  mkdirSync(dirname(jsonPath), { recursive: true });
  writeFileSync(jsonPath, JSON.stringify(pkg, null, 2) + '\n');
  writeFileSync(
    mdPath,
    `# Pin revival package — ranked by Pinterest sessions (${today})\n\n` +
      `Generated by \`scripts/agents/rank-pin-destinations.ts\`. Read-only: no Supabase row was written or re-dated to produce this.\n\n` +
      renderMarkdownTable(result, {
        'GA4 window (7d)': meta.window_7d,
        'GA4 window (28d)': meta.window_28d,
        'min sessions/7d': args.minSessions,
        'max ids/destination': args.maxPerUrl,
        'stranded-row pool size': args.poolSize,
      }) +
      '\n',
  );
  console.log(`[rank-pin-destinations] wrote ${jsonPath}`);
  console.log(`[rank-pin-destinations] wrote ${mdPath}`);
}

main().catch((err) => {
  console.error('[rank-pin-destinations] FAILED:', (err as Error).message ?? err);
  process.exit(1);
});
