#!/usr/bin/env npx tsx
/**
 * tumblr-curve.ts — where do Tumblr sessions come from: our fresh posts or
 * evergreen pages? (E266, Pip — Traffic.)
 *
 * Reads the blog's own Tumblr RSS feed (public, 20 newest posts) and GA4
 * Tumblr landing sessions by date, then writes a markdown reading with the
 * per-post day-0..7 curve, the fresh-vs-evergreen split and a ranked
 * evergreen reshare slice. Read-only. Nothing is posted; the reshare slice
 * is a Tier 2 package (operator's Tumblr account).
 *
 * USAGE
 *   MHM_PROJECT_DIR=<worktree> npx tsx scripts/agents/tumblr-curve.ts [--date YYYY-MM-DD] [--out path.md] [--rss file.xml] [--top 10]
 *
 * Exit codes: 0 ok · 1 error · 2 could-not-run (no credentials / feed unreachable).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

import { requireProjectDir } from './project-dir-guard';
import {
  buildCurves,
  parseRssItems,
  rankReshare,
  renderReport,
  splitFreshEvergreen,
  summarize,
  type DailyRow,
} from './tumblr-curve-lib';

const PROJECT_DIR = requireProjectDir('tumblr-curve.ts');
const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';
const RSS_URL = 'https://musthavemods.tumblr.com/rss';

function arg(name: string, dflt?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return dflt;
  const v = process.argv[i + 1];
  return v && !v.startsWith('--') ? v : dflt;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
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

async function fetchTumblrDaily(startDate: string, endDate: string): Promise<DailyRow[]> {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw Object.assign(new Error('no Google service-account credentials found'), { exitCode: 2 });
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const PAGE = 100000;
  const rows: DailyRow[] = [];
  let offset = 0;
  for (;;) {
    const [res] = await client.runReport({
      property: `properties/${GA4_PROPERTY}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }, { name: 'hostName' }, { name: 'landingPagePlusQueryString' }],
      metrics: [{ name: 'sessions' }],
      dimensionFilter: {
        filter: { fieldName: 'sessionSource', stringFilter: { value: 'tumblr', matchType: 'CONTAINS' as const, caseSensitive: false } },
      },
      limit: PAGE,
      offset,
    });
    for (const row of res.rows ?? []) {
      const d = row.dimensionValues?.[0]?.value ?? '';
      rows.push({
        date: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`,
        host: row.dimensionValues?.[1]?.value ?? '',
        path: row.dimensionValues?.[2]?.value ?? '',
        sessions: Number(row.metricValues?.[0]?.value ?? 0),
      });
    }
    if (!res.rows || res.rows.length < PAGE) break;
    offset += PAGE;
  }
  return rows;
}

async function fetchRss(file?: string): Promise<string> {
  if (file) return readFileSync(file, 'utf8');
  const res = await fetch(RSS_URL, { headers: { 'user-agent': 'mhm-tumblr-curve/0.1 (+https://musthavemods.com)' } });
  if (!res.ok) throw Object.assign(new Error(`RSS ${res.status}`), { exitCode: 2 });
  return res.text();
}

async function main(): Promise<number> {
  const date = arg('date', isoDaysAgo(0))!;
  const top = Number(arg('top', '10'));
  const out = arg('out', join(PROJECT_DIR, 'reports', 'funnel', `tumblr-curve-${date}.md`))!;

  const end = isoDaysAgo(2); // last finalized GA4 day, as the scoreboard uses
  const start = isoDaysAgo(29); // 28 days inclusive
  const prevStart = isoDaysAgo(15);
  const last7Start = isoDaysAgo(8);
  console.log(`[tumblr-curve] GA4 ${start}→${end} · rss ${arg('rss') ?? RSS_URL}`);

  const [xml, rows] = await Promise.all([fetchRss(arg('rss')), fetchTumblrDaily(start, end)]);
  const items = parseRssItems(xml);
  if (items.length === 0) throw Object.assign(new Error('RSS parsed to 0 items'), { exitCode: 2 });
  const total = rows.reduce((a, r) => a + r.sessions, 0);
  if (total < 500) throw new Error(`vacuity guard: ${total} Tumblr sessions in 28d (<500) — read looks truncated`);
  console.log(`[tumblr-curve] ${items.length} RSS items (${items[items.length - 1]?.date}→${items[0]?.date}), ${items.reduce((a, i) => a + i.paths.length, 0)} linked paths · GA4 ${rows.length} rows, ${total} sessions`);

  const curves = buildCurves(items, rows, end);
  const split = splitFreshEvergreen(items, rows, start, end);
  const summary = summarize(split);
  const reshare = rankReshare(split, top);
  const channel7d = rows.filter((r) => r.date >= last7Start).reduce((a, r) => a + r.sessions, 0);
  const channelPrev7d = rows.filter((r) => r.date >= prevStart && r.date < last7Start).reduce((a, r) => a + r.sessions, 0);

  const md = renderReport({ generatedOn: date, start, end, items, curves, split, summary, reshare, channel7d, channelPrev7d });
  if (!existsSync(dirname(out))) mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, md);
  console.log(`[tumblr-curve] 7d ${channel7d} (prev ${channelPrev7d}) · 28d ${summary.total} · fresh ${summary.fresh} (${(summary.freshShare * 100).toFixed(1)}%) over ${summary.freshPaths} paths · evergreen ${summary.evergreen} over ${summary.evergreenPaths} paths`);
  console.log(`[tumblr-curve] reshare top ${reshare.length}: ${reshare.map((s) => `${s.path}=${s.total}`).join(', ')}`);
  console.log(`[tumblr-curve] wrote ${out}`);
  return 0;
}

main()
  .then((c) => process.exit(c))
  .catch((err: unknown) => {
    const e = err as { message?: string; exitCode?: number };
    console.error('[tumblr-curve] error:', e?.message ?? err);
    process.exit(e?.exitCode === 2 ? 2 : 1);
  });
