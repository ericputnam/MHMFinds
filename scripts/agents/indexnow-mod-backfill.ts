/**
 * indexnow-mod-backfill.ts — E411 (Sage, 2026-11-15): one-shot IndexNow push
 * of the never-submitted /mods/<id>/ pages, randomized 50/50 holdout by id
 * hash. Rationale and the pre-registered grading rule live in
 * `scripts/agents/indexnow-backfill-lib.ts`.
 *
 *   npx tsx scripts/agents/indexnow-mod-backfill.ts                     # dry run: arm counts + preview, sends nothing
 *   npx tsx scripts/agents/indexnow-mod-backfill.ts --apply             # live POST of the treatment arm (≤10,000 URLs)
 *   npx tsx scripts/agents/indexnow-mod-backfill.ts --grade --pre 2026-11-01,2026-11-14 --post 2026-11-16,2026-11-29
 *
 * Population = /sitemap-mods.xml (isNSFW=false, isVerified=true) with
 * createdAt < BACKFILL_CUTOFF. Control is never sent. This is not part of the
 * daily runner and must not become one: IndexNow is for changed URLs, and a
 * repeated full-catalog push of unchanged pages is what the protocol asks
 * senders not to do. Exit codes: 0 ok / dry run, 1 IndexNow rejected,
 * 2 could not run. Every path appends one line to logs/indexnow.log.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { checkKeyFile, exitCodeFor, isCanonicalUrl, keyLocation, modUrl, postIndexNow, type SubmitStatus } from './indexnow-lib';
import {
  BACKFILL_CUTOFF,
  E411_SALT,
  INDEXNOW_MAX_URLS_PER_POST,
  aggregateArmLandings,
  gradeE411,
  splitBackfill,
  type BackfillRow,
} from './indexnow-backfill-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? process.cwd();
const LOG_PATH = join(PROJECT_DIR, 'logs', 'indexnow.log');
const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';

function readEnvValue(path: string, key: string): string | undefined {
  if (!existsSync(path)) return undefined;
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line.startsWith(`${key}=`)) continue;
    let val = line.slice(key.length + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    return val;
  }
  return undefined;
}

function ensureDatabaseUrl(): boolean {
  if (process.env.DATABASE_URL) return true;
  const v = readEnvValue(join(PROJECT_DIR, '.env.local'), 'DATABASE_URL');
  if (v) process.env.DATABASE_URL = v;
  return Boolean(v);
}

function log(line: string): void {
  try {
    mkdirSync(join(PROJECT_DIR, 'logs'), { recursive: true });
    appendFileSync(LOG_PATH, `${line}\n`);
  } catch (err) {
    console.error(`[e411] could not write ${LOG_PATH}: ${(err as Error).message}`);
  }
  console.log(line);
}

function done(status: SubmitStatus, fields: Record<string, string | number | boolean | null>): never {
  const kv = Object.entries(fields).map(([k, v]) => `${k}=${v}`).join(' ');
  log(`${new Date().toISOString()} kind=mod-backfill-E411 status=${status} ${kv}`);
  process.exit(exitCodeFor(status));
}

async function fetchPopulation(): Promise<BackfillRow[]> {
  const { prisma } = await import('../../lib/prisma');
  try {
    return await prisma.mod.findMany({
      where: { isNSFW: false, isVerified: true },
      select: { id: true, createdAt: true },
    });
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

function googleCredentialsPath(): string | undefined {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'));
    return cfg?.mcpServers?.['google-analytics']?.env?.GOOGLE_APPLICATION_CREDENTIALS ?? cfg?.mcpServers?.gsc?.env?.GOOGLE_APPLICATION_CREDENTIALS;
  } catch {
    return undefined;
  }
}

async function ga4ModLandings(start: string, end: string) {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const [res] = await client.runReport({
    property: `properties/${GA4_PROPERTY}`,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'landingPage' }, { name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: { filter: { fieldName: 'landingPage', stringFilter: { matchType: 'BEGINS_WITH', value: '/mods/' } } },
    limit: 250000,
  });
  const rows = (res.rows ?? []).map((r) => ({
    landingPage: r.dimensionValues?.[0]?.value ?? '',
    source: r.dimensionValues?.[1]?.value ?? '',
    medium: r.dimensionValues?.[2]?.value ?? '',
    sessions: Number(r.metricValues?.[0]?.value ?? 0),
  }));
  // Completeness guard: a truncated GA4 read is a plausible, wrong population.
  if (Number(res.rowCount ?? rows.length) > rows.length) throw new Error(`GA4 read truncated (${rows.length} of ${res.rowCount})`);
  return rows;
}

function windowArg(argv: string[], flag: string): [string, string] | null {
  const i = argv.indexOf(flag);
  const v = i >= 0 ? argv[i + 1] : undefined;
  const m = v ? /^(\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})$/.exec(v) : null;
  return m ? [m[1], m[2]] : null;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  const grade = argv.includes('--grade');
  const base = { salt: E411_SALT, cutoff: BACKFILL_CUTOFF.toISOString().slice(0, 10) };

  if (!ensureDatabaseUrl()) done('COULD-NOT-RUN', { ...base, reason: 'no-database-url' });
  let rows: BackfillRow[] = [];
  try {
    rows = await fetchPopulation();
  } catch (err) {
    console.error(`[e411] DB query failed: ${String((err as Error).message ?? err).slice(0, 200)}`);
    done('COULD-NOT-RUN', { ...base, reason: 'db-error' });
  }
  // Grading uses the uncapped arms; the cap only bounds what one POST carries.
  const split = splitBackfill(rows, { max: grade ? Number.MAX_SAFE_INTEGER : INDEXNOW_MAX_URLS_PER_POST });
  if (split.treatment.length < 1000 || split.control.length < 1000) {
    // Vacuity guard: a population this small means the query or the cutoff is wrong.
    done('COULD-NOT-RUN', { ...base, reason: 'arm-too-small', treatment: split.treatment.length, control: split.control.length });
  }
  console.log(
    `[e411] population ${rows.length} · excluded (createdAt ≥ cutoff) ${split.excludedRecent} · treatment ${split.treatment.length}${split.capped ? ' (capped)' : ''} · control ${split.control.length}`,
  );

  if (grade) {
    const pre = windowArg(argv, '--pre');
    const post = windowArg(argv, '--post');
    if (!pre || !post) done('COULD-NOT-RUN', { ...base, reason: 'grade-needs---pre-and---post-YYYY-MM-DD,YYYY-MM-DD' });
    try {
      const a = aggregateArmLandings(await ga4ModLandings(pre![0], pre![1]), split);
      const b = aggregateArmLandings(await ga4ModLandings(post![0], post![1]), split);
      for (const [label, w, agg] of [['pre', pre!, a], ['post', post!, b]] as const) {
        for (const arm of ['treatment', 'control'] as const) {
          const x = agg[arm];
          console.log(
            `[e411] ${label} ${w[0]}→${w[1]} ${arm.padEnd(9)} mods=${x.mods} bing=${x.bingSessions} (${(x.bingSessions / x.mods).toFixed(4)}/mod, ${x.bingPages} pages) google=${x.googleSessions}`,
          );
        }
      }
      const g = gradeE411(a, b);
      done('OK', { ...base, mode: 'grade', verdict: g.verdict, detail: JSON.stringify(g.reason) });
    } catch (err) {
      console.error(`[e411] GA4 read failed: ${String((err as Error).message ?? err).slice(0, 200)}`);
      done('COULD-NOT-RUN', { ...base, mode: 'grade', reason: 'ga4-error' });
    }
  }

  const urls = split.treatment.map(modUrl).filter(isCanonicalUrl);
  const dropped = split.treatment.length - urls.length;
  for (const u of urls.slice(0, 10)) console.log(`  ${u}`);
  if (urls.length > 10) console.log(`  … +${urls.length - 10} more`);
  const counts = { ...base, urls: urls.length, control: split.control.length, dropped, capped: split.capped };

  if (!apply) done('DRY-RUN', { ...counts, mode: 'dry-run', reason: 'dry-run-nothing-sent' });

  const key = await checkKeyFile(fetch);
  if (!key.live) {
    console.error(`[e411] key file not live at ${keyLocation()} (http=${key.http ?? 'none'}); refusing to submit`);
    done('COULD-NOT-RUN', { ...counts, mode: 'live', http: key.http, reason: key.timedOut ? 'key-file-timeout' : 'key-file-not-live' });
  }
  // A ~0.5 MB body; give the POST more than the daily push's 30 s.
  const posted = await postIndexNow(urls, fetch, 120_000);
  if (posted.detail) console.error(`[e411] ${posted.http === null ? 'POST failed' : 'response body'}: ${posted.detail}`);
  done(posted.status, { ...counts, mode: 'live', http: posted.http, reason: posted.reason });
}

main().catch((err) => {
  console.error(`[e411] crashed: ${String((err as Error)?.message ?? err).slice(0, 200)}`);
  process.exit(2);
});
