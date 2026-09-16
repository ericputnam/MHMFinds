/**
 * Page-RPM snapshot — entrypoint (all network and file writes live here).
 *
 *   npx tsx scripts/agents/page-rpm-snapshot.ts [--start YYYY-MM-DD --end YYYY-MM-DD]
 *        [--out reports/funnel/page-rpm-baseline-<date>.md] [--json <path>]
 *        [--no-ga4] [--tolerance 3]
 *
 * Defaults to the last 7 Mediavine-finalized days (8→2 days ago). Pulls the
 * top-150 pages per day under two sort orders (revenue, pageviews) so the
 * long tail is covered as far as the API allows, de-duplicates on day+path,
 * and rolls up by page type. GA4 `screenPageViews` per page type is fetched as
 * a denominator when credentials are available; a GA4 failure degrades the
 * report, never fails it.
 *
 * Exit codes (house 0/2/1): 0 = report written; 2 = could not run (no JWT,
 * auth expired, every page pull failed); 1 = crashed. Every error string goes
 * through `redactError()` before it is printed or written.
 *
 * Aggregates only: paths, counts and dollars. No token, no user data.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { readFileSync } from 'node:fs';

import { loadConfig } from '../mcp-mediavine/config';
import { MediavineAuthError } from '../mcp-mediavine/client';
import { redactError } from './operator-did-probe-lib';
import {
  aggregateBuckets,
  BUCKET_ORDER,
  renderMd,
  siteTotalsFromEarnings,
  topPaths,
  type DayRows,
  type MvPageRow,
  type PageBucket,
  type SnapshotReport,
} from './page-rpm-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..', '..');
const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';
const PER_PAGE = 150; // Mediavine's hard cap on /reports/pages

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}
function eachDay(start: string, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  for (; d <= e; d.setUTCDate(d.getUTCDate() + 1)) out.push(d.toISOString().slice(0, 10));
  return out;
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const flag = (name: string) => process.argv.includes(`--${name}`);
const say = (s: string) => console.log(redactError(s));

function googleCredentialsPath(): string | undefined {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'));
    return cfg?.mcpServers?.['google-analytics']?.env?.GOOGLE_APPLICATION_CREDENTIALS ?? cfg?.mcpServers?.gsc?.env?.GOOGLE_APPLICATION_CREDENTIALS;
  } catch {
    return undefined;
  }
}

/** GA4 pagePath filter per bucket. `home` is the exact root; the rest are prefixes. */
const GA4_BUCKET_FILTER: Partial<Record<PageBucket, { value: string; matchType: 'EXACT' | 'BEGINS_WITH' }>> = {
  home: { value: '/', matchType: 'EXACT' },
  collection: { value: '/games/', matchType: 'BEGINS_WITH' },
  mod: { value: '/mods/', matchType: 'BEGINS_WITH' },
  go: { value: '/go/', matchType: 'BEGINS_WITH' },
  play: { value: '/play', matchType: 'BEGINS_WITH' },
};

async function pullGa4(start: string, end: string): Promise<SnapshotReport['ga4Pageviews']> {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const property = `properties/${GA4_PROPERTY}`;
  const total = async (filter?: { value: string; matchType: 'EXACT' | 'BEGINS_WITH' }) => {
    const [res] = await client.runReport({
      property,
      dateRanges: [{ startDate: start, endDate: end }],
      metrics: [{ name: 'screenPageViews' }],
      ...(filter ? { dimensionFilter: { filter: { fieldName: 'pagePath', stringFilter: filter } } } : {}),
    });
    return Number(res.rows?.[0]?.metricValues?.[0]?.value ?? 0);
  };
  const out: NonNullable<SnapshotReport['ga4Pageviews']> = { total: await total() };
  for (const b of BUCKET_ORDER) {
    const f = GA4_BUCKET_FILTER[b];
    if (f) out[b] = await total(f);
  }
  return out;
}

async function main(): Promise<number> {
  const start = arg('start') ?? daysAgo(8);
  const end = arg('end') ?? daysAgo(2);
  const tolerancePct = Number(arg('tolerance') ?? 3);
  const outPath = arg('out') ?? join(PROJECT_DIR, 'reports', 'funnel', `page-rpm-${end}.md`);
  const jsonPath = arg('json');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    say(`COULD-NOT-RUN reason=bad-range start=${start} end=${end}`);
    return 2;
  }

  let client;
  try {
    ({ client } = loadConfig());
  } catch (e) {
    say(`COULD-NOT-RUN reason=no-jwt ${(e as Error).message}`);
    return 2;
  }

  // Site totals from the daily earnings rows.
  let site: SnapshotReport['site'] = null;
  let siteError: string | undefined;
  try {
    const { earnings } = await client.earnings(start, end);
    site = siteTotalsFromEarnings(earnings);
  } catch (e) {
    if (e instanceof MediavineAuthError) {
      say(`COULD-NOT-RUN reason=auth-expired ${e.message}`);
      return 2;
    }
    siteError = redactError((e as Error).message);
  }

  // Per-day pulls under two sort orders; the lib de-duplicates on day+path.
  const days: DayRows[] = [];
  const dayList = eachDay(start, end);
  const pulls = { attempted: 0, ok: 0 };
  for (const day of dayList) {
    for (const sort of ['page_revenue', 'pageviews'] as const) {
      pulls.attempted += 1;
      try {
        const res = (await client.pages(day, day, { perPage: PER_PAGE, page: 1, sort, direction: 'desc' })) as { pages?: MvPageRow[] };
        days.push({ day, rows: res.pages ?? [] });
        pulls.ok += 1;
      } catch (e) {
        if (e instanceof MediavineAuthError) {
          say(`COULD-NOT-RUN reason=auth-expired ${e.message}`);
          return 2;
        }
        say(`WARN pages ${day} sort=${sort}: ${(e as Error).message}`);
      }
    }
  }
  if (pulls.ok === 0) {
    say(`COULD-NOT-RUN reason=no-page-pulls attempted=${pulls.attempted}`);
    return 2;
  }

  // Whole-window pull for the top-paths table (one query, top 150 by revenue).
  let top: SnapshotReport['top'] = [];
  try {
    const res = (await client.pages(start, end, { perPage: PER_PAGE, page: 1, sort: 'page_revenue', direction: 'desc' })) as { pages?: MvPageRow[] };
    top = topPaths(res.pages ?? [], 12);
  } catch (e) {
    say(`WARN whole-window pages pull failed: ${(e as Error).message}`);
  }

  let ga4Pageviews: SnapshotReport['ga4Pageviews'];
  let ga4Error: string | undefined;
  if (!flag('no-ga4')) {
    try {
      ga4Pageviews = await pullGa4(start, end);
    } catch (e) {
      ga4Error = redactError((e as Error).message);
    }
  }

  const rep: SnapshotReport = {
    start,
    end,
    generatedAt: new Date().toISOString(),
    site,
    siteError,
    buckets: aggregateBuckets(days),
    ga4Pageviews,
    ga4Error,
    top,
    pulls,
    tolerancePct,
  };

  const md = renderMd(rep);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, redactError(md));
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, redactError(JSON.stringify(rep, null, 2)) + '\n');
  }
  const b = rep.buckets;
  say(
    `OK ${start}→${end} site_rpm=${site?.pageRpm ?? 'n/a'} home=${b.home.rpm ?? 'n/a'} collection=${b.collection.rpm ?? 'n/a'} mod=${b.mod.rpm ?? 'n/a'} go=${b.go.rpm ?? 'n/a'} play=${b.play.rpm ?? 'n/a'} pulls=${pulls.ok}/${pulls.attempted} ga4=${ga4Pageviews ? 'ok' : 'unavailable'} out=${outPath}`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    say(`FAIL page-rpm-snapshot crashed: ${(e as Error).message}`);
    process.exit(1);
  });
