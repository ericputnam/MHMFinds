/**
 * `/go/[modId]` funnel read — entrypoint (all network and file writes live here).
 *
 *   npx tsx scripts/agents/go-funnel-read.ts [--start YYYY-MM-DD] [--end YYYY-MM-DD]
 *        [--out reports/funnel/go-read-<end>.md] [--json <path>]
 *
 * Defaults: start = E99 window start (2026-09-25), end = yesterday. Pulls
 * GA4 distinct users + event counts per day for the `/go/` events listed in
 * `go-funnel-lib.ts` and renders the read with `render` users as the only
 * denominator (see the lib's file comment for why `page_view` is not).
 *
 * Exit codes (house 0/2/1): 0 = report written; 2 = could not run (no
 * credentials, GA4 error, zero reported days); 1 = crashed. Error strings go
 * through `redactError()` before they are printed or written. Aggregates only.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { redactError } from './operator-did-probe-lib';
import {
  buildGoRead,
  E99_RULE,
  GO_EVENTS,
  GO_PAGE_PREFIX,
  renderGoReadMd,
  type GoDailyRow,
} from './go-funnel-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? resolve(__dirname, '..', '..');
const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}
function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
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

async function pullGoRows(start: string, end: string): Promise<GoDailyRow[]> {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const [res] = await client.runReport({
    property: `properties/${GA4_PROPERTY}`,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'date' }, { name: 'eventName' }],
    metrics: [{ name: 'totalUsers' }, { name: 'eventCount' }],
    dimensionFilter: {
      andGroup: {
        expressions: [
          { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'BEGINS_WITH', value: GO_PAGE_PREFIX } } },
          { filter: { fieldName: 'eventName', inListFilter: { values: [...GO_EVENTS] } } },
        ],
      },
    },
    limit: 2000,
  });
  return (res.rows ?? []).map((row) => ({
    date: row.dimensionValues?.[0]?.value ?? '',
    eventName: row.dimensionValues?.[1]?.value ?? '',
    users: Number(row.metricValues?.[0]?.value ?? 0),
    events: Number(row.metricValues?.[1]?.value ?? 0),
  }));
}

async function main(): Promise<number> {
  const start = arg('start') ?? E99_RULE.start;
  const end = arg('end') ?? daysAgo(1);
  const outPath = arg('out') ?? join(PROJECT_DIR, 'reports', 'funnel', `go-read-${end}.md`);
  const jsonPath = arg('json');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    say(`COULD-NOT-RUN reason=bad-range start=${start} end=${end}`);
    return 2;
  }

  let rows: GoDailyRow[];
  try {
    rows = await pullGoRows(start, end);
  } catch (e) {
    say(`COULD-NOT-RUN reason=ga4 ${(e as Error).message}`);
    return 2;
  }

  const read = buildGoRead(rows, start, end);
  const md = renderGoReadMd(read);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, redactError(md));
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, redactError(JSON.stringify(read, null, 2)) + '\n');
  }
  if (read.status !== 'ok') {
    say(`COULD-NOT-RUN reason=${read.reason} out=${outPath}`);
    return 2;
  }
  const s = read.stats;
  const e = read.e99;
  say(
    `OK ${start}→${end} reported=${read.reportedDays.length}/${read.days.length} render/day=${s.render.perDay} page_view_coverage=${read.pageViewCoverage == null ? 'n/a' : (read.pageViewCoverage * 100).toFixed(1) + '%'} patreon_click/day=${s.patreon_click.perDay} after_wait/day=${s.patreon_click_after_wait.perDay} e99 ${e.users}u/${e.daysReported}d ${e.perDay}/day ${e.onPace == null ? 'n/a' : e.onPace ? 'on-pace' : 'below'}${e.complete ? ' complete' : ` (${e.daysUnreported} unreported)`} out=${outPath}`,
  );
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    say(`FAIL go-funnel-read crashed: ${(e as Error).message}`);
    process.exit(1);
  });
