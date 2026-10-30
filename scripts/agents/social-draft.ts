#!/usr/bin/env npx tsx
/**
 * social-draft.ts — pick social-post destinations by earning power and emit
 * draft files for the operator to approve (E265, Pip — Traffic).
 *
 * WHAT IT DOES
 *   1. Pulls GA4 landing-page sessions (hostName × landingPagePlusQueryString)
 *      for the last finalized 7d and 28d windows, three times: all sources,
 *      sessionSource contains "pinterest", sessionSource contains "tumblr".
 *   2. Ranks destinations by non-Pinterest sessions 7d (default; the growth
 *      plan's headline), after dropping NSFW and non-content paths.
 *   3. For each of the top N destinations, looks up the catalog rows scraped
 *      from that URL (Mod.sourceUrl, isNSFW=false, creator not opted out) so
 *      the draft carries titles, creators to credit and a thumbnail to use.
 *   4. Writes reports/funnel/social/drafts/<date>/NN-<platform>-<slug>.md
 *      skeletons with every fact filled in and the Copy section EMPTY. The
 *      caption is written by a human (or by the agent, by hand, then linted):
 *      the operator's voice rule says it must not look like AI wrote it, and
 *      a template that fills captions would fail that by construction.
 *   5. `--lint` re-reads an existing batch and prints voice-rule violations
 *      per file, so hand-written copy can be checked before the queue row.
 *
 * WHAT IT NEVER DOES
 *   Post. `--post` exits 2 unless SOCIAL_POSTING_ENABLED=1, and even then
 *   exits 2 with "no poster wired": every account token is operator-owned
 *   (Tier 2), and every public post in a human voice is Tier 2 until
 *   2026-11-07 (growth-plan.md). Approval is the operator's reply
 *   "approve social <date>" on the operator-queue row.
 *
 * USAGE
 *   MHM_PROJECT_DIR=<worktree> npx tsx scripts/agents/social-draft.ts \
 *     [--date YYYY-MM-DD] [--top 6] [--rank-by nonPinterest7d|nonPinterest28d|tumblr28d|all7d] \
 *     [--platforms tumblr,short-video,reddit] [--kinds post,collection] [--dry-run]
 *   MHM_PROJECT_DIR=<worktree> npx tsx scripts/agents/social-draft.ts --lint --date YYYY-MM-DD
 *
 * Exit codes: 0 ok · 1 error · 2 refused (posting) / could-not-run.
 */
import '../lib/setup-env';

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { prisma } from '../../lib/prisma';
import { SIMS4_COLLECTIONS, collectionHref } from '../../lib/collections';
import { requireProjectDir } from './project-dir-guard';
import {
  PLATFORMS,
  SOCIAL_POSTING_FLAG,
  approvalString,
  draftFilename,
  isOptedOut,
  parseOptout,
  rankDestinations,
  renderBatchTable,
  renderDraft,
  voiceLint,
  type DraftMod,
  type LandingRow,
  type Platform,
  type RankBy,
  type RankedDestination,
} from './social-draft-lib';

const PROJECT_DIR = requireProjectDir('social-draft.ts');
const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';
const DRAFTS_ROOT = join(PROJECT_DIR, 'reports', 'funnel', 'social', 'drafts');
const OPTOUT_FILE = join(PROJECT_DIR, 'reports', 'funnel', 'social', 'creator-optout.txt');

const ACCOUNTS: Record<Platform, string> = {
  tumblr: 'musthavemods.tumblr.com (operator-owned; scheduler plugin token is Tier 2)',
  'short-video': 'TikTok / YouTube Shorts / Instagram Reels — account TBD by operator (Tier 2)',
  reddit: 'operator account, human voice only (Tier 2)',
  x: 'X @musthavemods via scheduler plugin (Tier 2)',
};

// ---------------------------------------------------------------- args
function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : dflt;
}
const has = (name: string) => process.argv.includes(`--${name}`);

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- GA4
function googleCredentialsPath(): string | undefined {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) return process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    const cfg = JSON.parse(readFileSync(join(homedir(), '.claude.json'), 'utf8'));
    return cfg?.mcpServers?.['google-analytics']?.env?.GOOGLE_APPLICATION_CREDENTIALS ?? cfg?.mcpServers?.gsc?.env?.GOOGLE_APPLICATION_CREDENTIALS;
  } catch {
    return undefined;
  }
}

async function fetchLanding(
  startDate: string,
  endDate: string,
  channel: LandingRow['channel'],
  window: LandingRow['window'],
): Promise<LandingRow[]> {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const property = `properties/${GA4_PROPERTY}`;
  const PAGE = 100000;
  const rows: LandingRow[] = [];
  let offset = 0;
  for (;;) {
    const [res] = await client.runReport({
      property,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'hostName' }, { name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }],
      ...(channel === 'all'
        ? {}
        : {
            dimensionFilter: {
              filter: {
                fieldName: 'sessionSource',
                stringFilter: { value: channel, matchType: 'CONTAINS' as const, caseSensitive: false },
              },
            },
          }),
      limit: PAGE,
      offset,
    });
    for (const row of res.rows ?? []) {
      rows.push({
        host: row.dimensionValues?.[0]?.value ?? '',
        path: row.dimensionValues?.[1]?.value ?? '',
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
        channel,
        window,
      });
    }
    if (!res.rows || res.rows.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

// ---------------------------------------------------------------- catalog
const APEX_HOST = 'musthavemods.com';

/** Mods scraped from this article URL (apex or blog host, with/without trailing slash). */
async function modsForPath(path: string, optout: Set<string>): Promise<DraftMod[]> {
  const bare = path.replace(/\/$/, '');
  const variants = [
    `https://${APEX_HOST}${path}`,
    `https://${APEX_HOST}${bare}`,
    `https://blog.${APEX_HOST}${path}`,
    `https://blog.${APEX_HOST}${bare}`,
    `https://www.${APEX_HOST}${path}`,
    `https://www.${APEX_HOST}${bare}`,
  ];
  const rows = await prisma.mod.findMany({
    where: { sourceUrl: { in: variants }, isNSFW: false },
    select: { id: true, title: true, author: true, thumbnail: true, downloadCount: true },
    orderBy: { downloadCount: 'desc' },
    take: 12,
  });
  return rows.filter((m) => !isOptedOut(m.author, optout)).map((m) => ({ id: m.id, title: m.title, author: m.author, thumbnail: m.thumbnail }));
}

/** A single mod page: the row itself. */
async function modForModPath(path: string, optout: Set<string>): Promise<DraftMod[]> {
  const id = path.split('/').filter(Boolean)[1];
  if (!id) return [];
  const m = await prisma.mod.findFirst({ where: { id, isNSFW: false }, select: { id: true, title: true, author: true, thumbnail: true } });
  if (!m || isOptedOut(m.author, optout)) return [];
  return [m];
}

function collectionTitle(path: string): string | null {
  const c = SIMS4_COLLECTIONS.find((x) => collectionHref(x) === path);
  return c ? c.title : null;
}

// ---------------------------------------------------------------- lint mode
function lintBatch(date: string): number {
  const dir = join(DRAFTS_ROOT, date);
  if (!existsSync(dir)) {
    console.error(`[social-draft] no batch at ${dir}`);
    return 2;
  }
  let violations = 0;
  let files = 0;
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.md') && x !== 'README.md').sort()) {
    const text = readFileSync(join(dir, f), 'utf8');
    const m = text.match(/## Copy\n([\s\S]*?)\n## /);
    const copy = (m?.[1] ?? '').trim();
    files += 1;
    if (!copy || copy.startsWith('_(write by hand')) {
      console.log(`${f}: NO COPY`);
      violations += 1;
      continue;
    }
    const v = voiceLint(copy);
    violations += v.length;
    console.log(`${f}: ${v.length ? v.map((x) => `${x.rule}(${x.detail})`).join('; ') : 'pass'}`);
    // Keep the front-matter honest once copy has been written by hand.
    const stamped = text.replace(/^voice_lint: .*$/m, `voice_lint: ${v.length ? `${v.length} violation(s)` : 'pass'}`);
    if (stamped !== text) writeFileSync(join(dir, f), stamped);
  }
  console.log(`\n${files} file(s), ${violations} violation(s). Approval string: "${approvalString(date)}"`);
  return violations ? 1 : 0;
}

// ---------------------------------------------------------------- main
async function main(): Promise<number> {
  if (has('post')) {
    if (process.env[SOCIAL_POSTING_FLAG] !== '1') {
      console.error(`[social-draft] REFUSED: ${SOCIAL_POSTING_FLAG} is not 1. Every public post is Tier 2 until 2026-11-07; the operator approves a batch by replying "${approvalString(arg('date', isoDaysAgo(0))!)}".`);
      return 2;
    }
    console.error('[social-draft] REFUSED: flag is on but no poster is wired — account tokens are operator-owned (Tier 2). Nothing was posted.');
    return 2;
  }

  const date = arg('date', isoDaysAgo(0))!;
  if (has('lint')) return lintBatch(date);

  const top = Number(arg('top', '6'));
  const rankBy = (arg('rank-by', 'nonPinterest7d') as RankBy) ?? 'nonPinterest7d';
  const platforms = (arg('platforms', 'tumblr,short-video,reddit')!.split(',') as Platform[]).filter((p) => (PLATFORMS as readonly string[]).includes(p));
  const kinds = arg('kinds', 'post,collection,mod')!.split(',') as Array<RankedDestination['kind']>;
  const dryRun = has('dry-run');
  if (!platforms.length) throw new Error('no valid --platforms');

  // Anchor at the last finalized GA4 day (daysAgo 2), like the scoreboard.
  const end = isoDaysAgo(2);
  const start7 = isoDaysAgo(8);
  const start28 = isoDaysAgo(29);
  console.log(`[social-draft] windows 7d ${start7}→${end} · 28d ${start28}→${end} · rank by ${rankBy} · top ${top} · platforms ${platforms.join(',')}`);

  const rows: LandingRow[] = [];
  for (const [channel, window, s] of [
    ['all', '7d', start7],
    ['all', '28d', start28],
    ['pinterest', '7d', start7],
    ['pinterest', '28d', start28],
    ['tumblr', '7d', start7],
    ['tumblr', '28d', start28],
  ] as Array<[LandingRow['channel'], LandingRow['window'], string]>) {
    const r = await fetchLanding(s, end, channel, window);
    console.log(`  GA4 ${channel} ${window}: ${r.length} rows, ${r.reduce((a, x) => a + x.sessions, 0)} sessions`);
    rows.push(...r);
  }
  const all7 = rows.filter((r) => r.channel === 'all' && r.window === '7d').reduce((a, x) => a + x.sessions, 0);
  if (all7 < 10000) throw new Error(`vacuity guard: all-sources 7d landing sessions = ${all7} (<10,000) — GA4 read looks truncated`);

  const ranked = rankDestinations({ rows, rankBy, kinds, min: 20 });
  console.log(`[social-draft] ${ranked.length} postable destinations ≥20 ${rankBy}`);

  const optout = existsSync(OPTOUT_FILE) ? parseOptout(readFileSync(OPTOUT_FILE, 'utf8')) : new Set<string>();
  console.log(`[social-draft] creator opt-out list: ${optout.size} name(s)`);

  const chosen = ranked.slice(0, top);
  const outDir = join(DRAFTS_ROOT, date);
  if (!dryRun) mkdirSync(outDir, { recursive: true });

  const tableItems: Array<{ platform: Platform; dest: RankedDestination; rank: number; file: string; lint: number | null }> = [];
  // A batch can be built in several runs (e.g. one ranked by nonPinterest7d for
  // short video, one ranked by tumblr28d for Tumblr); keep numbering continuous.
  let index = existsSync(outDir) ? readdirSync(outDir).filter((f) => /^\d{2}-/.test(f)).length : 0;
  for (let i = 0; i < chosen.length; i += 1) {
    const dest = chosen[i];
    const mods = dest.kind === 'mod' ? await modForModPath(dest.path, optout) : dest.kind === 'post' ? await modsForPath(dest.path, optout) : [];
    const title = dest.kind === 'collection' ? collectionTitle(dest.path) : null;
    // Round-robin platforms over the ranked list so the top URL gets the top-ranked platform.
    const platform = platforms[i % platforms.length];
    index += 1;
    const file = draftFilename(index, platform, dest.path);
    const asset = mods[0]?.thumbnail
      ? `${mods[0].thumbnail} (thumbnail of "${mods[0].title}"${mods[0].author ? ` by ${mods[0].author}` : ''}) — or a fresh in-game screenshot/clip`
      : title
        ? `screenshot of the collection grid at https://${APEX_HOST}${dest.path} (${title})`
        : '';
    const md = renderDraft({ date, index, platform, dest, mods, copy: '', asset, account: ACCOUNTS[platform], rankBy, rank: i + 1 });
    if (!dryRun) {
      const target = join(outDir, file);
      if (existsSync(target)) {
        console.log(`  keep   ${file} (exists; not overwriting hand-written copy)`);
      } else {
        writeFileSync(target, md);
        console.log(`  write  ${file}`);
      }
    } else {
      console.log(`  would write ${file}  ${dest.path}  nonPinterest7d=${dest.nonPinterest7d} tumblr28d=${dest.tumblr28d} mods=${mods.length}`);
    }
    tableItems.push({ platform, dest, rank: i + 1, file, lint: null });
  }

  if (!dryRun) {
    const readme = [
      `# Social drafts — batch ${date}`,
      '',
      `Tier 2 until 2026-11-07 (growth-plan.md). Nothing here posts until the operator replies **"${approvalString(date)}"** on the operator-queue row.`,
      '',
      `Generated by \`scripts/agents/social-draft.ts\` (rank by \`${rankBy}\`, GA4 7d ${start7}→${end}, 28d ${start28}→${end}). Copy is written by hand; run \`--lint --date ${date}\` before asking for approval.`,
      '',
      renderBatchTable(tableItems),
      '',
    ].join('\n');
    const readmePath = join(outDir, 'README.md');
    if (!existsSync(readmePath)) {
      writeFileSync(readmePath, readme);
    } else {
      // Second run into the same batch: append the new rows under their own heading.
      const extra = [`\n### Added by a later run (rank by \`${rankBy}\`)\n`, renderBatchTable(tableItems), ''].join('\n');
      writeFileSync(readmePath, readFileSync(readmePath, 'utf8') + extra);
    }
    console.log(`[social-draft] batch at ${outDir} (${tableItems.length} drafts). Next: write copy, then --lint.`);
  }
  return 0;
}

main()
  .then((code) => prisma.$disconnect().then(() => process.exit(code)))
  .catch(async (err) => {
    console.error('[social-draft] error:', err instanceof Error ? err.message : err);
    await prisma.$disconnect().catch(() => undefined);
    process.exit(1);
  });
