/**
 * indexnow-submit.ts — push new mod pages + collection pages to Bing/Yandex/
 * Seznam/Naver via IndexNow (E47, 2026-09-14). Sage, Search & AI.
 *
 *   npx tsx scripts/agents/indexnow-submit.ts                 # dry run (default): prints the list, sends nothing
 *   npx tsx scripts/agents/indexnow-submit.ts --apply          # live POST to https://api.indexnow.org/indexnow
 *   npx tsx scripts/agents/indexnow-submit.ts --days 3 --cap 200 --no-collections
 *   npx tsx scripts/agents/indexnow-submit.ts --apply --creators --days 2   # E95: + every /creator/[slug]/ page
 *
 * Selection mirrors /sitemap-mods.xml exactly (isNSFW=false, isVerified=true)
 * so we never push a URL the sitemap would not list; mods are those created in
 * the last --days (default 7), newest first, collections come first, and the
 * whole list is capped at HARD_CAP (500) no matter what flags say — except a
 * `--creators` run (E95, 2026-09-24), which appends every creator page from
 * lib/creators.ts listCreators() (the /sitemap-creators.xml population, so
 * again nothing the sitemap would not list) under CREATORS_HARD_CAP (1000).
 * `--creators` is a one-off / occasional push, not part of the daily runner.
 *
 * Safety rails, in order:
 *   1. --apply is required to send; everything else is a dry run.
 *   2. Live mode first fetches https://musthavemods.com/<key>.txt and refuses
 *      to POST unless it is a 200 whose body is the key (COULD-NOT-RUN,
 *      exit 2). Submitting before the key file is live is a guaranteed 403.
 *   3. Every URL passes isCanonicalUrl() — https, apex host, trailing slash —
 *      anything else is dropped and counted, never sent.
 *   4. One summary line is appended to logs/indexnow.log on every path,
 *      including the ones that could not run, so silence is falsifiable.
 *
 * Exit codes (house discipline): 0 = ran (dry or live OK), 2 = could not run
 * (no DATABASE_URL, DB error, key file not live), 1 = IndexNow rejected it.
 *
 * Reads .env.local only for DATABASE_URL, only when the environment lacks it,
 * and never prints it. The IndexNow key is public by design and is a constant.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  CREATORS_HARD_CAP,
  DEFAULT_DAYS,
  HARD_CAP,
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  buildPayload,
  capCeiling,
  exitCodeFor,
  interpretResponse,
  keyLocation,
  parseArgs,
  selectUrls,
  summaryLine,
  type RunSummary,
  type SubmitStatus,
} from './indexnow-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? process.cwd();
const LOG_PATH = join(PROJECT_DIR, 'logs', 'indexnow.log');

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

function ensureDatabaseUrl(): boolean {
  if (process.env.DATABASE_URL) return true;
  const fileEnv = readEnvFile(join(PROJECT_DIR, '.env.local'));
  if (fileEnv.DATABASE_URL) {
    process.env.DATABASE_URL = fileEnv.DATABASE_URL;
    return true;
  }
  return false;
}

function writeLog(line: string): void {
  try {
    mkdirSync(join(PROJECT_DIR, 'logs'), { recursive: true });
    appendFileSync(LOG_PATH, `${line}\n`);
  } catch (err) {
    console.error(`[indexnow] could not write ${LOG_PATH}: ${(err as Error).message}`);
  }
}

function finish(summary: RunSummary): never {
  const line = summaryLine(summary);
  writeLog(line);
  console.log(line);
  process.exit(exitCodeFor(summary.status));
}

function usage(): void {
  console.log(
    [
      'indexnow-submit — push new mod + collection URLs to IndexNow (Bing, Yandex, Seznam, Naver)',
      '',
      '  --apply             send for real (default is a dry run that prints the list)',
      `  --days N            mods created in the last N days (default ${DEFAULT_DAYS})`,
      `  --cap N             max URLs per run, clamped to ${HARD_CAP} (${CREATORS_HARD_CAP} with --creators)`,
      '  --no-collections    skip homepage / game hubs / collection pages',
      '  --creators          also submit every /creator/[slug]/ page (the /sitemap-creators.xml population)',
      '',
      `Key: ${INDEXNOW_KEY} (public; served at ${keyLocation()})`,
      `Log: ${LOG_PATH}`,
    ].join('\n'),
  );
}

async function fetchNewModIds(days: number, cap: number): Promise<string[]> {
  const since = new Date(Date.now() - days * 24 * 3600e3);
  // Imported lazily so DATABASE_URL is in place before lib/prisma.ts builds its client.
  const { prisma } = await import('../../lib/prisma');
  try {
    const rows = await prisma.mod.findMany({
      where: { isNSFW: false, isVerified: true, createdAt: { gte: since } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: cap,
    });
    return rows.map((r) => r.id);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

/**
 * Every creator page slug, from the same query /sitemap-creators.xml serves
 * (lib/creators.ts listCreators — junk slugs already filtered). Imported
 * lazily for the same DATABASE_URL reason as fetchNewModIds.
 */
async function fetchCreatorSlugs(): Promise<string[]> {
  const { listCreators } = await import('../../lib/creators');
  const { prisma } = await import('../../lib/prisma');
  try {
    const rows = await listCreators();
    return rows.map((r) => r.slug);
  } finally {
    await prisma.$disconnect().catch(() => undefined);
  }
}

/** The key file must be live before a submit can succeed; check it, don't assume it. */
async function keyFileIsLive(): Promise<{ live: boolean; http: number | null }> {
  try {
    const res = await fetch(keyLocation(), { headers: { 'User-Agent': 'mhm-indexnow-submit/1.0' }, redirect: 'manual' });
    if (res.status !== 200) return { live: false, http: res.status };
    const body = (await res.text()).trim();
    return { live: body === INDEXNOW_KEY, http: res.status };
  } catch {
    return { live: false, http: null };
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  const mode: RunSummary['mode'] = args.apply ? 'live' : 'dry-run';
  const base: RunSummary = {
    when: new Date(),
    mode,
    status: 'COULD-NOT-RUN',
    urls: 0,
    mods: 0,
    collections: 0,
    dropped: 0,
    cap: args.cap,
    days: args.days,
  };

  if (!ensureDatabaseUrl()) {
    finish({ ...base, reason: 'no-database-url' });
  }

  let modIds: string[];
  try {
    modIds = await fetchNewModIds(args.days, args.cap);
  } catch (err) {
    console.error(`[indexnow] DB query failed: ${String((err as Error).message ?? err).slice(0, 200)}`);
    finish({ ...base, reason: 'db-error' });
  }

  let creatorSlugs: string[] = [];
  if (args.creators) {
    try {
      creatorSlugs = await fetchCreatorSlugs();
    } catch (err) {
      console.error(`[indexnow] creator query failed: ${String((err as Error).message ?? err).slice(0, 200)}`);
      finish({ ...base, reason: 'db-error-creators' });
    }
  }

  const sel = selectUrls({
    modIds: modIds!,
    creatorSlugs,
    includeCollections: args.collections,
    cap: args.cap,
    ceiling: capCeiling(args),
  });
  const counts = {
    urls: sel.urls.length,
    mods: sel.mods,
    collections: sel.collections,
    creators: sel.creators,
    dropped: sel.dropped.length,
  };
  if (sel.dropped.length) {
    console.error(`[indexnow] dropped ${sel.dropped.length} non-canonical URL(s):`);
    for (const u of sel.dropped.slice(0, 10)) console.error(`  - ${u}`);
  }
  if (sel.capped) console.error(`[indexnow] list truncated at cap=${args.cap}`);

  console.log(
    `[indexnow] ${mode}: ${counts.urls} URL(s) — ${counts.collections} collection/hub, ${counts.mods} mods from the last ${args.days} day(s)` +
      (args.creators ? `, ${counts.creators} creator pages` : ''),
  );
  const preview = sel.urls.slice(0, 25);
  for (const u of preview) console.log(`  ${u}`);
  if (sel.urls.length > preview.length) console.log(`  … +${sel.urls.length - preview.length} more`);

  if (!args.apply) {
    finish({ ...base, ...counts, status: 'DRY-RUN', reason: 'dry-run-nothing-sent' });
  }

  if (sel.urls.length === 0) {
    // A clean zero is a run, not a failure — but there is nothing to POST.
    finish({ ...base, ...counts, status: 'OK', reason: 'nothing-to-submit' });
  }

  const key = await keyFileIsLive();
  if (!key.live) {
    console.error(`[indexnow] key file not live at ${keyLocation()} (http=${key.http ?? 'network-error'}); refusing to submit`);
    finish({ ...base, ...counts, http: key.http, reason: 'key-file-not-live' });
  }

  let http: number | null = null;
  let status: SubmitStatus = 'FAIL';
  let reason = 'network-error';
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'User-Agent': 'mhm-indexnow-submit/1.0' },
      body: JSON.stringify(buildPayload(sel.urls)),
    });
    http = res.status;
    const verdict = interpretResponse(res.status);
    status = verdict.ok ? 'OK' : 'FAIL';
    reason = verdict.reason;
    if (!verdict.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 200);
      if (text) console.error(`[indexnow] response body: ${text}`);
    }
  } catch (err) {
    console.error(`[indexnow] POST failed: ${String((err as Error).message ?? err).slice(0, 200)}`);
  }

  finish({ ...base, ...counts, status, http, reason });
}

main().catch((err) => {
  console.error(`[indexnow] crashed: ${String((err as Error)?.message ?? err).slice(0, 200)}`);
  finish({
    when: new Date(),
    mode: process.argv.includes('--apply') ? 'live' : 'dry-run',
    status: 'COULD-NOT-RUN',
    urls: 0,
    mods: 0,
    collections: 0,
    dropped: 0,
    cap: HARD_CAP,
    days: DEFAULT_DAYS,
    reason: 'crashed',
  });
});
