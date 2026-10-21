/**
 * Top-up grade — entrypoint (all network and file writes live here). E251, Pip.
 *
 *   MHM_PROJECT_DIR=<worktree> npx tsx scripts/agents/topup-grade.ts \
 *        --ledger reports/funnel/pin-runway-topup-2026-10-14.json \
 *        [--end YYYY-MM-DD] [--out <md path>] [--json <path>]
 *
 * Reads the treated destinations from the top-up tool's own undo ledger, pulls two GA4 reports
 * (treated landing paths by host, and the site Pinterest total, each over the four windows
 * `topup-grade-lib.ts` derives from `--end`), grades with the rule printed in the report, and writes
 * `reports/funnel/pip-topup-grade-<ledger date>-read-<end>.md`.
 *
 * Defaults: end = yesterday (a GA4 day can still be provisional — say so when quoting it).
 *
 * Exit codes (house 0/2/1): 0 = report written; 2 = could not run (no project dir, bad args,
 * unreadable ledger, no credentials, GA4 error); 1 = crashed. Error strings go through
 * `redactError()`. Read-only: never touches the queue.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, join } from 'node:path';

import { redactError } from './operator-did-probe-lib';
import { requireProjectDir } from './project-dir-guard';
import {
  fmtPct,
  gradeTopup,
  gradeWindows,
  parseTopupLedger,
  renderTopupGradeMd,
  treatedPaths,
  type Ga4RangeRow,
  type SiteRangeRow,
  type TopupLedger,
} from './topup-grade-lib';

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

const pinterestFilter = {
  filter: { fieldName: 'sessionSource', stringFilter: { matchType: 'CONTAINS', value: 'pinterest', caseSensitive: false } },
};

async function pull(ledger: TopupLedger, end: string): Promise<{ treatedRows: Ga4RangeRow[]; siteRows: SiteRangeRow[] }> {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const property = `properties/${GA4_PROPERTY}`;
  const windows = gradeWindows(end, ledger);
  const dateRanges = windows.map((w) => ({ startDate: w.start, endDate: w.end, name: w.name }));

  // GA4 prints landingPage without the trailing slash; the queue's Post URL carries one. Ask for both.
  const paths = treatedPaths(ledger);
  const values = paths.flatMap((p) => (p === '/' ? ['/'] : [p, `${p}/`]));
  const landingIn = { filter: { fieldName: 'landingPage', inListFilter: { values, caseSensitive: false } } };

  const [treated] = await client.runReport({
    property,
    dateRanges,
    dimensions: [{ name: 'landingPage' }, { name: 'hostName' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: { andGroup: { expressions: [pinterestFilter, landingIn] } } as never,
    limit: 5000,
  });
  const treatedRows: Ga4RangeRow[] = (treated.rows ?? []).map((row) => ({
    path: row.dimensionValues?.[0]?.value ?? '',
    host: row.dimensionValues?.[1]?.value ?? '',
    range: row.dimensionValues?.[2]?.value ?? '',
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  const [site] = await client.runReport({
    property,
    dateRanges,
    dimensions: [{ name: 'hostName' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: pinterestFilter as never,
    limit: 500,
  });
  const siteRows: SiteRangeRow[] = (site.rows ?? []).map((row) => ({
    range: row.dimensionValues?.[1]?.value ?? '',
    sessions: Number(row.metricValues?.[0]?.value ?? 0),
  }));

  return { treatedRows, siteRows };
}

async function main(): Promise<number> {
  const projectDir = requireProjectDir('topup-grade.ts');
  const ledgerArg = arg('ledger');
  if (!ledgerArg) {
    say('COULD-NOT-RUN reason=no-ledger usage: --ledger reports/funnel/pin-runway-topup-<date>.json [--end YYYY-MM-DD]');
    return 2;
  }
  const ledgerPath = isAbsolute(ledgerArg) ? ledgerArg : join(projectDir, ledgerArg);
  let ledger: TopupLedger;
  try {
    ledger = parseTopupLedger(JSON.parse(readFileSync(ledgerPath, 'utf8')));
  } catch (e) {
    say(`COULD-NOT-RUN reason=ledger ${(e as Error).message}`);
    return 2;
  }
  const end = arg('end') ?? daysAgo(1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    say(`COULD-NOT-RUN reason=bad-end end=${end}`);
    return 2;
  }
  const outPath = arg('out') ?? join(projectDir, 'reports', 'funnel', `pip-topup-grade-${ledger.generated}-read-${end}.md`);
  const jsonPath = arg('json');

  let pulled: Awaited<ReturnType<typeof pull>>;
  try {
    pulled = await pull(ledger, end);
  } catch (e) {
    say(`COULD-NOT-RUN reason=ga4 ${(e as Error).message}`);
    return 2;
  }

  const grade = gradeTopup({ ledger, end, ...pulled });
  const md = renderTopupGradeMd(grade);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, redactError(md));
  if (jsonPath) {
    mkdirSync(dirname(jsonPath), { recursive: true });
    writeFileSync(jsonPath, redactError(JSON.stringify(grade, null, 2)) + '\n');
  }

  const pw = grade.postWindow;
  say(
    `topup-grade: ${grade.verdict} · ledger ${grade.ledgerGenerated} (${grade.rowCount} rows / ${grade.treatedPaths.length} dests, cap ${grade.perDateCapMet ? 'MET' : 'NOT MET'})` +
      ` · treated ${grade.treated.curr} vs ${grade.treated.prev} (${fmtPct(grade.treated.pct)}) vs site ${fmtPct(grade.site.pct)}` +
      (pw ? ` · post window ${fmtPct(pw.treated.pct)} vs site ${fmtPct(pw.site.pct)}${pw.partial ? ' (partial)' : ''}` : '') +
      ` · ${grade.destinationsUp}/${grade.perDestination.length} dests up · wrote ${outPath}`,
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
