/**
 * Singapore Direct read — entrypoint (all network and file writes live here). E216, Pip.
 *
 *   MHM_PROJECT_DIR=<worktree> npx tsx scripts/agents/direct-bot-read.ts \
 *        [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--out <md path>] [--json <path>]
 *
 * Defaults: end = yesterday (GA4 day may still be provisional — say so when quoting it),
 * start = end − 27 (28 days, so the WoW block has two full weeks). Pulls four GA4 reports
 * (site daily, Direct daily, the Singapore Direct segment daily, the segment by screen
 * resolution), classifies with `direct-bot-lib.ts` and writes
 * `reports/funnel/pip-singapore-direct-<end>.md`.
 *
 * Exit codes (house 0/2/1): 0 = report written; 2 = could not run (no project dir, bad range,
 * no credentials, GA4 error); 1 = crashed. Error strings go through `redactError()`.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  buildDirectBotRead,
  dateKeys,
  renderDirectBotReadMd,
  SG_DIRECT_RULE,
  type DailyRow,
  type SegmentDailyRow,
} from './direct-bot-lib';
import { redactError } from './operator-did-probe-lib';
import { requireProjectDir } from './project-dir-guard';

const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return iso(d);
}
function minusDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - n * 86_400_000).toISOString().slice(0, 10);
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

type Filter = Record<string, unknown>;
const countryIs: Filter = { filter: { fieldName: 'country', stringFilter: { matchType: 'EXACT', value: SG_DIRECT_RULE.country } } };
const sourceIs: Filter = { filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'EXACT', value: SG_DIRECT_RULE.source } } };
const segmentFilter: Filter = { andGroup: { expressions: [countryIs, sourceIs] } };

async function pull(start: string, end: string) {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const property = `properties/${GA4_PROPERTY}`;
  const dateRanges = [{ startDate: start, endDate: end }];

  async function daily(filter: Filter | undefined, metrics: string[]) {
    const [res] = await client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'date' }],
      metrics: metrics.map((name) => ({ name })),
      ...(filter ? { dimensionFilter: filter as never } : {}),
      limit: 400,
    });
    return (res.rows ?? []).map((row) => ({
      date: row.dimensionValues?.[0]?.value ?? '',
      values: metrics.map((_, i) => Number(row.metricValues?.[i]?.value ?? 0)),
    }));
  }

  const site: DailyRow[] = (await daily(undefined, ['sessions'])).map((r) => ({ date: r.date, sessions: r.values[0] }));
  const direct: DailyRow[] = (await daily(sourceIs, ['sessions'])).map((r) => ({ date: r.date, sessions: r.values[0] }));
  const segment: SegmentDailyRow[] = (await daily(segmentFilter, ['sessions', 'totalUsers', 'screenPageViews', 'engagedSessions'])).map((r) => ({
    date: r.date,
    sessions: r.values[0],
    users: r.values[1],
    pageviews: r.values[2],
    engaged: r.values[3],
  }));

  let fingerprintSessions: Record<string, number> | null = null;
  try {
    const [fp] = await client.runReport({
      property,
      dateRanges,
      dimensions: [{ name: 'screenResolution' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: segmentFilter as never,
      limit: 200,
    });
    fingerprintSessions = {};
    for (const row of fp.rows ?? []) {
      fingerprintSessions[row.dimensionValues?.[0]?.value ?? '(not set)'] = Number(row.metricValues?.[0]?.value ?? 0);
    }
  } catch (e) {
    say(`WARN fingerprint pull failed: ${(e as Error).message}`);
  }

  return { site, direct, segment, fingerprintSessions };
}

async function main(): Promise<number> {
  const projectDir = requireProjectDir('direct-bot-read.ts');
  const end = arg('end') ?? daysAgo(1);
  const start = arg('start') ?? (/^\d{4}-\d{2}-\d{2}$/.test(end) ? minusDays(end, 27) : '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
    say(`COULD-NOT-RUN reason=bad-range start=${start} end=${end}`);
    return 2;
  }
  const outPath = arg('out') ?? join(projectDir, 'reports', 'funnel', `pip-singapore-direct-${end}.md`);
  const jsonPath = arg('json');

  let pulled: Awaited<ReturnType<typeof pull>>;
  try {
    pulled = await pull(start, end);
  } catch (e) {
    say(`COULD-NOT-RUN reason=ga4 ${(e as Error).message}`);
    return 2;
  }

  const read = buildDirectBotRead({ start, end, ...pulled });
  const md = renderDirectBotReadMd(read);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, redactError(md));
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, redactError(JSON.stringify(read, null, 2)) + '\n');
  }

  const w = read.wow;
  say(
    `direct-bot-read: ${read.verdict} · segment ${read.segmentSessions} = ${read.segmentShare == null ? '—' : (read.segmentShare * 100).toFixed(2) + '%'} of ${read.siteSessions} (${dateKeys(start, end).length} d)` +
      (w
        ? ` · all WoW ${w.all.pct == null ? '—' : (w.all.pct * 100).toFixed(1) + '%'} → ex segment ${w.allExSegment.pct == null ? '—' : (w.allExSegment.pct * 100).toFixed(1) + '%'}` +
          ` · direct ${w.direct.pct == null ? '—' : (w.direct.pct * 100).toFixed(1) + '%'} → ex segment ${w.directExSegment.pct == null ? '—' : (w.directExSegment.pct * 100).toFixed(1) + '%'}`
        : '') +
      ` · wrote ${outPath}`,
  );
  return 0;
}

main().then(
  (code) => process.exit(code),
  (e) => {
    say(`CRASH ${(e as Error).message}`);
    process.exit(1);
  },
);
