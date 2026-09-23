#!/usr/bin/env -S npx tsx
/**
 * Funnel scoreboard — the deterministic "finance" of the funnel team.
 *
 * Pulls every number the team is judged on and writes
 *   reports/funnel/YYYY-MM-DD.md  (human)     reports/funnel/YYYY-MM-DD.json (agents)
 *
 * Sources (each section fails independently and reports why):
 *   - GA4 Data API (service account from GOOGLE_APPLICATION_CREDENTIALS, or the
 *     google-analytics MCP entry in ~/.claude.json): sessions by channel 7d/prev 7d,
 *     AI-referral sessions, capture events.
 *   - Google Search Console (same service account): clicks 28d vs prior 28d.
 *   - Mediavine reporting API (scripts/mcp-mediavine): revenue/RPM 7d, 28d, health.
 *   - Production DB via DIRECT_DATABASE_URL (.env.local): users, subscribers,
 *     favorites, download clicks, affiliate clicks/earnings, creators, submissions.
 *   - Patreon public page: paid patron count per tier, free member count.
 *   - Patreon Members API (creator token in .env.local via scripts/_patreon-auth.ts)
 *     + production DB: paid-and-connected, $3-tier joins/day, joins/cancels 7d —
 *     the E40 read (2026-09-19) and Q4 gate (2026-09-22) numbers. Aggregates only.
 *   - WordPress REST: posts published in the last 30 days.
 *   - Pinner queue (Supabase, creds from ~/java_projects/MHMUtils/config.json):
 *     schedulable / stranded / total unposted backlog, plus Pinterest's own
 *     `created_at` on the account's newest pins (GET /v5/pins) for liveness —
 *     the queue table has no posted-at column, and its `Post Date` is the
 *     scheduled date, not when the pin went out (E41, 2026-09-13). Also the
 *     *writer's* own liveness (Q11, 2026-09-16): rows in `n8n_pinterest_posts`
 *     attributable to the writer plugin (`Wordpress Post ID` set) by their own
 *     `created_at`, separate from queue depth — a low-runway flag only fires
 *     once borrowed inventory runs out, which can lag the writer's actual
 *     death by a week or more.
 *
 * Never prints secrets. Run: npx tsx scripts/agents/funnel-scoreboard.ts
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import {
  assessLiveness,
  assessRunway,
  assessWriterLiveness,
  DEFAULT_RUNWAY_HORIZON_DAYS,
  summarizePins,
  type LivenessAssessment,
  type PinLike,
  type RunwayAssessment,
  type WriterLivenessAssessment,
} from './pinner-liveness-lib';
import { redactError } from './operator-did-probe-lib';
import { captureRatePer1kSessions, nonPinterestShare } from '../../lib/funnel/captureMath';
import { computeRunSuccessShare, computeTeamStats, parseChangelogRows } from '../../lib/funnel/changelogStats';
import { resolveMetricOwners } from '../../lib/funnel/metricOwners';
import {
  E40_ANCHOR,
  E40_CLICK_BASELINE,
  formatPaidByAmount,
  ga4DateKey,
  meanDailyUsers,
  summarizePatreonMembers,
  type MeanDailyUsers,
  type PatreonMemberAttrs,
  type PatreonMembersSummary,
} from './patreon-members-lib';

const PROJECT_DIR = process.env.MHM_PROJECT_DIR ?? '/Users/eputnam/java_projects/MHMFinds';
const OUT_DIR = join(PROJECT_DIR, 'reports', 'funnel');
const GA4_PROPERTY = process.env.GA4_PROPERTY_ID ?? '437117335';
const GSC_SITE = process.env.GSC_SITE ?? 'sc-domain:musthavemods.com';
const PATREON_URL = 'https://www.patreon.com/MustHaveModsOfficial';
const WP_API = 'https://blog.musthavemods.com/wp-json/wp/v2';
const PINNER_ENV = process.env.MHM_UTILS_ENV ?? join(homedir(), 'java_projects', 'MHMUtils', '.env');
const AI_REFERRERS = ['chatgpt', 'perplexity', 'copilot', 'gemini', 'claude', 'openai', 'bing.com/chat', 'you.com'];

type Section<T> = { ok: true; data: T } | { ok: false; error: string };

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
function daysAhead(n: number): string {
  return daysAgo(-n);
}
/** ISO timestamp N hours before now, for `created_at=gte.` filters (timestamp, not date-only). */
function hoursAgoIso(n: number): string {
  return new Date(Date.now() - n * 3600e3).toISOString();
}
function pct(curr: number, prev: number): string {
  if (!prev) return 'n/a';
  const p = ((curr - prev) / prev) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-US');
/** Format a 0-1 fraction as a percent string, e.g. 0.523 -> "52.3%". Distinct from pct(), which formats a WoW delta between two counts. */
const frac = (v: number) => `${(v * 100).toFixed(1)}%`;

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

const errOf = (s: { ok: boolean; error?: string }): string => s.error ?? '';

async function section<T>(name: string, fn: () => Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    // The message is interpolated into the committed .md/.json and the Flags
    // list; Prisma errors embed the datasource URL, so scrub before it leaves.
    const msg = redactError((err as Error).message ?? String(err)).slice(0, 200);
    console.error(`[scoreboard] ${name}: ${msg}`);
    return { ok: false, error: msg };
  }
}

/** Locate the Google service-account file the MCP servers already use. */
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
interface Ga4Data {
  window: string;
  sessions7d: number;
  sessionsPrev7d: number;
  byChannel7d: Record<string, number>;
  byChannelPrev7d: Record<string, number>;
  aiReferral7d: number;
  aiReferralPrev7d: number;
  captureEvents7d: Record<string, number>;
  /** distinct users per capture event over the same 7d window (GA4 totalUsers, deduped across the window) */
  captureUsers7d: Record<string, number>;
  /**
   * E40 traffic leg: **mean of daily** distinct `patreon_click` users over the
   * 7d window — the same arithmetic as the frozen 8.75 baseline (35 users / 4
   * days, 09-08→09-11). Until 2026-09-14 this was `captureUsers7d.patreon_click / 7`,
   * a 7-day dedupe ÷ 7, which reads systematically lower than a mean of dailies.
   */
  patreonClickUsersPerDay7d: number;
  patreonClick7d: MeanDailyUsers;
  /** the frozen baseline window re-read from GA4 today, so drift in the source is visible next to the constant */
  patreonClickBaselineReread: MeanDailyUsers;
  /** daily distinct users, `YYYY-MM-DD` → users, from the baseline start through the window end */
  patreonClickUsersByDay: Record<string, number>;
  notSetLanding7d: number;
  /** GA4 newVsReturning sessions, returning / (new + returning). Null if the query fails to return usable rows. */
  returningShare7d: number | null;
  /** GA4 screenPageViewsPerSession over the same 7d window. */
  pagesPerSession7d: number | null;
  /** GA4 engagementRate (0-1) over the same 7d window. */
  engagementRate7d: number | null;
}

async function pullGa4(): Promise<Ga4Data> {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { BetaAnalyticsDataClient } = await import('@google-analytics/data');
  const client = new BetaAnalyticsDataClient({ keyFilename });
  const property = `properties/${GA4_PROPERTY}`;
  // GA4 finalizes ~24-48h late; anchor windows at 2 days ago.
  const end = daysAgo(2);
  const start = daysAgo(8);
  const prevEnd = daysAgo(9);
  const prevStart = daysAgo(15);

  async function bySource(s: string, e: string) {
    const [res] = await client.runReport({
      property,
      dateRanges: [{ startDate: s, endDate: e }],
      dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
      metrics: [{ name: 'sessions' }],
      limit: 200,
    });
    const channels: Record<string, number> = {};
    let ai = 0;
    let total = 0;
    for (const row of res.rows ?? []) {
      const src = (row.dimensionValues?.[0]?.value ?? '').toLowerCase();
      const med = (row.dimensionValues?.[1]?.value ?? '').toLowerCase();
      const n = Number(row.metricValues?.[0]?.value ?? 0);
      total += n;
      let ch = 'other';
      if (src.includes('pinterest')) ch = 'pinterest';
      else if (src === 'google' && med === 'organic') ch = 'google_organic';
      else if (src === 'bing' && med === 'organic') ch = 'bing_organic';
      else if (src === '(direct)') ch = 'direct';
      else if (src.includes('tumblr')) ch = 'tumblr';
      else if (src.includes('reddit')) ch = 'reddit';
      else if (med === 'organic') ch = 'other_search';
      else if (med === 'email' || src.includes('sendgrid')) ch = 'email';
      if (AI_REFERRERS.some((a) => src.includes(a)) || med.includes('ai')) {
        ch = 'ai_referral';
        ai += n;
      }
      channels[ch] = (channels[ch] ?? 0) + n;
    }
    return { channels, ai, total };
  }

  const [curr, prev] = await Promise.all([bySource(start, end), bySource(prevStart, prevEnd)]);

  const [ev] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['newsletter_signup', 'account_signup', 'patreon_click', 'premium_intent', 'sign_up', 'generate_lead', 'favorite', 'affiliate_click', 'member_skip_countdown'] },
      },
    },
  });
  const captureEvents7d: Record<string, number> = {};
  const captureUsers7d: Record<string, number> = {};
  for (const row of ev.rows ?? []) {
    const name = row.dimensionValues?.[0]?.value ?? '?';
    captureEvents7d[name] = Number(row.metricValues?.[0]?.value ?? 0);
    captureUsers7d[name] = Number(row.metricValues?.[1]?.value ?? 0);
  }
  // Daily distinct patreon_click users from the E40 baseline start through the
  // window end, so the gate's two sides are the same statistic (mean of dailies).
  const [daily] = await client.runReport({
    property,
    dateRanges: [{ startDate: E40_CLICK_BASELINE.start, endDate: end }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'totalUsers' }],
    dimensionFilter: { filter: { fieldName: 'eventName', stringFilter: { value: 'patreon_click', matchType: 'EXACT' } } },
    limit: 400,
  });
  const patreonClickUsersByDay: Record<string, number> = {};
  for (const row of daily.rows ?? []) {
    const k = ga4DateKey(row.dimensionValues?.[0]?.value ?? '');
    if (k) patreonClickUsersByDay[k] = Number(row.metricValues?.[0]?.value ?? 0);
  }
  const patreonClick7d = meanDailyUsers(patreonClickUsersByDay, start, end);
  const patreonClickBaselineReread = meanDailyUsers(patreonClickUsersByDay, E40_CLICK_BASELINE.start, E40_CLICK_BASELINE.end);
  const patreonClickUsersPerDay7d = patreonClick7d.perDay;

  const [ns] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: { filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { value: '(not set)', matchType: 'EXACT' } } },
  });
  const notSetLanding7d = Number(ns.rows?.[0]?.metricValues?.[0]?.value ?? 0);

  // Long-range health (E-audit, 2026-09-22): returning-visitor share and
  // engagement, degraded to null independently so one bad query doesn't sink
  // the rest of pullGa4 (the outer section() wrapper only catches a throw).
  let returningShare7d: number | null = null;
  try {
    const [nvr] = await client.runReport({
      property,
      dateRanges: [{ startDate: start, endDate: end }],
      dimensions: [{ name: 'newVsReturning' }],
      metrics: [{ name: 'sessions' }],
    });
    let newSessions = 0;
    let returningSessions = 0;
    for (const row of nvr.rows ?? []) {
      const label = (row.dimensionValues?.[0]?.value ?? '').toLowerCase();
      const n = Number(row.metricValues?.[0]?.value ?? 0);
      if (label === 'returning') returningSessions += n;
      else newSessions += n;
    }
    const nvrTotal = newSessions + returningSessions;
    returningShare7d = nvrTotal > 0 ? returningSessions / nvrTotal : null;
  } catch {
    returningShare7d = null;
  }

  let pagesPerSession7d: number | null = null;
  let engagementRate7d: number | null = null;
  try {
    const [eng] = await client.runReport({
      property,
      dateRanges: [{ startDate: start, endDate: end }],
      metrics: [{ name: 'screenPageViewsPerSession' }, { name: 'engagementRate' }],
    });
    const row = eng.rows?.[0];
    pagesPerSession7d = row?.metricValues?.[0]?.value != null ? Number(row.metricValues[0].value) : null;
    engagementRate7d = row?.metricValues?.[1]?.value != null ? Number(row.metricValues[1].value) : null;
  } catch {
    pagesPerSession7d = null;
    engagementRate7d = null;
  }

  return {
    window: `${start}→${end} vs ${prevStart}→${prevEnd}`,
    sessions7d: curr.total,
    sessionsPrev7d: prev.total,
    byChannel7d: curr.channels,
    byChannelPrev7d: prev.channels,
    aiReferral7d: curr.ai,
    aiReferralPrev7d: prev.ai,
    captureEvents7d,
    captureUsers7d,
    patreonClickUsersPerDay7d,
    patreonClick7d,
    patreonClickBaselineReread,
    patreonClickUsersByDay,
    notSetLanding7d,
    returningShare7d,
    pagesPerSession7d,
    engagementRate7d,
  };
}

// ---------------------------------------------------------------- GSC
interface GscData { window: string; clicks28d: number; clicksPrev28d: number; impressions28d: number; }

async function pullGsc(): Promise<GscData> {
  const keyFilename = googleCredentialsPath();
  if (!keyFilename) throw new Error('no Google service-account credentials found');
  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({ keyFilename, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
  const authClient = await auth.getClient();
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
  async function totals(startDate: string, endDate: string) {
    const res = await authClient.request<{ rows?: Array<{ clicks: number; impressions: number }> }>({
      url,
      method: 'POST',
      data: { startDate, endDate, dimensions: [], type: 'web' },
    });
    const r = res.data.rows?.[0];
    return { clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0 };
  }
  // GSC lags ~3 days.
  const end = daysAgo(3), start = daysAgo(30), prevEnd = daysAgo(31), prevStart = daysAgo(58);
  const [c, p] = await Promise.all([totals(start, end), totals(prevStart, prevEnd)]);
  return { window: `${start}→${end}`, clicks28d: c.clicks, clicksPrev28d: p.clicks, impressions28d: c.impressions };
}

// ---------------------------------------------------------------- Mediavine
interface MvData {
  latestDay: string | null;
  revenue7d: number; revenuePrev7d: number; rpm7d: number; rpmPrev7d: number; sessions7d: number;
  revenue28d: number; revenuePrev28d: number; rpm28d: number;
  health: Record<string, unknown>;
  tokenDaysLeft: number | null;
}

async function pullMediavine(): Promise<MvData> {
  const { loadConfig, tokenDaysRemaining } = await import('../mcp-mediavine/config.js');
  const { client, jwt } = loadConfig();
  const recent = await client.earnings(daysAgo(7), daysAgo(1));
  const latest = [...(recent.earnings ?? [])].reverse().find((r) => Number(r.revenue) > 0 && Number(r.sessions) > 0);
  const latestDay = latest ? String(latest.date).slice(0, 10).replace(/\//g, '-') : null;
  const end = latestDay ? ([1, 2, 3, 4, 5, 6, 7].find((n) => daysAgo(n) === latestDay) ?? 1) : 1;
  const [l7, p7, l28, p28, health] = await Promise.all([
    client.metricsSummary(daysAgo(end + 6), daysAgo(end)),
    client.metricsSummary(daysAgo(end + 13), daysAgo(end + 7)),
    client.metricsSummary(daysAgo(end + 27), daysAgo(end)),
    client.metricsSummary(daysAgo(end + 55), daysAgo(end + 28)),
    client.healthCheckStatus() as Promise<{ health_check?: Record<string, unknown> }>,
  ]);
  const hc = { ...(health.health_check ?? {}) };
  for (const k of ['site_id', 'created_at', 'updated_at']) delete hc[k];
  return {
    latestDay,
    revenue7d: l7.revenue, revenuePrev7d: p7.revenue, rpm7d: l7.session_rpm, rpmPrev7d: p7.session_rpm, sessions7d: l7.sessions,
    revenue28d: l28.revenue, revenuePrev28d: p28.revenue, rpm28d: l28.session_rpm,
    health: hc,
    tokenDaysLeft: tokenDaysRemaining(jwt),
  };
}

// ---------------------------------------------------------------- DB
interface DbData {
  users: number; users7d: number; users30d: number;
  subscribers: number; subscribers7d: number; subscribers30d: number; subscribersBySource: Record<string, number>;
  favorites: number; favorites7d: number;
  downloadClicks7d: number; downloadClicks30d: number;
  affiliateClicks7d: number; affiliateClicks30d: number; affiliateEarnings30d: number;
  creatorProfiles: number; modSubmissions: number; mods: number; collections: number;
  newMods7d: number; newModsPrior7d: number;
  /** ModSubmission.createdAt >= 7d ago (any submitter, linked account or not). */
  submissions7d: number;
  /** CreatorProfile.userId that also appears on >=1 ModSubmission.userId — "has shipped something", not just signed up. */
  creatorsOnboarded: number;
}

async function pullDb(): Promise<DbData> {
  const env = { ...readEnvFile(join(PROJECT_DIR, '.env.local')), ...process.env };
  const url = env.DIRECT_DATABASE_URL;
  if (!url || !url.startsWith('postgres')) throw new Error('DIRECT_DATABASE_URL missing from .env.local');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasourceUrl: url, log: ['error'] });
  // origin/main still calls the subscriber model `Waitlist`; feature/premium-intent-test renamed it
  // to `EmailSubscriber` (same table). Use whichever this checkout's Prisma client has.
  const anyPrisma = prisma as unknown as Record<string, { count: (a?: unknown) => Promise<number>; groupBy: (a: unknown) => Promise<unknown> }>;
  const subs = anyPrisma.emailSubscriber ?? anyPrisma.waitlist;
  if (!subs) throw new Error('no subscriber model in Prisma client');
  const d7 = new Date(Date.now() - 7 * 864e5);
  const d14 = new Date(Date.now() - 14 * 864e5);
  const d30 = new Date(Date.now() - 30 * 864e5);
  try {
    const [
      users, users7d, users30d,
      subscribers, subscribers7d, subscribers30d, subsBySource,
      favorites, favorites7d,
      downloadClicks7d, downloadClicks30d,
      affiliateClicks7d, affiliateClicks30d, affEarn,
      creatorProfiles, modSubmissions, mods, collections,
      newMods7d, newModsPrior7d, submissions7d,
    ] = await Promise.all([
      prisma.user.count(), prisma.user.count({ where: { createdAt: { gte: d7 } } }), prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      subs.count(), subs.count({ where: { createdAt: { gte: d7 } } }), subs.count({ where: { createdAt: { gte: d30 } } }),
      subs.groupBy({ by: ['source'], _count: { _all: true } }),
      prisma.favorite.count(), prisma.favorite.count({ where: { createdAt: { gte: d7 } } }),
      prisma.downloadClick.count({ where: { clickedAt: { gte: d7 } } }), prisma.downloadClick.count({ where: { clickedAt: { gte: d30 } } }),
      prisma.affiliateClick.count({ where: { clickedAt: { gte: d7 } } }), prisma.affiliateClick.count({ where: { clickedAt: { gte: d30 } } }),
      prisma.affiliateEarning.aggregate({ _sum: { commissionAmount: true } }).catch(() => ({ _sum: { commissionAmount: null } })),
      prisma.creatorProfile.count(), prisma.modSubmission.count(), prisma.mod.count(), prisma.collection.count(),
      prisma.mod.count({ where: { createdAt: { gte: d7 } } }),
      prisma.mod.count({ where: { createdAt: { gte: d14, lt: d7 } } }),
      prisma.modSubmission.count({ where: { createdAt: { gte: d7 } } }),
    ]);
    const subscribersBySource: Record<string, number> = {};
    for (const r of subsBySource as Array<{ source: string; _count: { _all: number } }>) subscribersBySource[r.source] = r._count._all;

    // Two-step join: ModSubmission.userId is nullable (anonymous submissions
    // allowed) and there's no direct Prisma relation from CreatorProfile to
    // ModSubmission, so "creator profiles with >=1 submission" needs a
    // distinct-userIds query followed by a count against CreatorProfile.
    let creatorsOnboarded = 0;
    try {
      const submitterIds = await prisma.modSubmission.findMany({
        where: { userId: { not: null } },
        select: { userId: true },
        distinct: ['userId'],
      });
      const ids = submitterIds.map((s) => s.userId).filter((id): id is string => !!id);
      creatorsOnboarded = ids.length ? await prisma.creatorProfile.count({ where: { userId: { in: ids } } }) : 0;
    } catch {
      creatorsOnboarded = 0;
    }

    return {
      users, users7d, users30d,
      subscribers, subscribers7d, subscribers30d, subscribersBySource,
      favorites, favorites7d,
      downloadClicks7d, downloadClicks30d,
      affiliateClicks7d, affiliateClicks30d, affiliateEarnings30d: Number(affEarn._sum.commissionAmount ?? 0),
      creatorProfiles, modSubmissions, mods, collections,
      newMods7d, newModsPrior7d, submissions7d, creatorsOnboarded,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// ---------------------------------------------------------------- Team (changelog.md)
interface TeamData {
  runSuccess14d: number;
  mergesByOwner7d: Record<string, number>;
  totalMerges7d: number;
  opsMergeShare7d: number | null;
  paperOnlyMerges7d: number;
}

/**
 * Reads reports/funnel/changelog.md (pipe-delimited, not chronological — see
 * lib/funnel/changelogStats.ts) for merge ownership over the last 7 days, and
 * the presence of a scoreboard JSON file for each of the last 14 calendar
 * days as a proxy for "the morning run fired". Read-only against local repo
 * files; no network/DB calls, so this section can't fail for the reasons the
 * others do — a missing changelog file just yields zeros, not a throw.
 */
async function pullTeam(): Promise<TeamData> {
  const changelogPath = join(OUT_DIR, 'changelog.md');
  const raw = existsSync(changelogPath) ? readFileSync(changelogPath, 'utf8') : '';
  const rows = parseChangelogRows(raw);
  const stats = computeTeamStats(rows, Date.now(), 7);

  const datesWithRun = new Set<string>();
  if (existsSync(OUT_DIR)) {
    for (const f of readdirSync(OUT_DIR)) {
      const m = f.match(/^(\d{4}-\d{2}-\d{2})\.json$/);
      if (m) datesWithRun.add(m[1]);
    }
  }
  const runSuccess14d = computeRunSuccessShare(datesWithRun, iso(new Date()), 14);

  return {
    runSuccess14d,
    mergesByOwner7d: stats.mergesByOwner,
    totalMerges7d: stats.totalMerges,
    opsMergeShare7d: stats.opsMergeShare,
    paperOnlyMerges7d: stats.paperOnlyMerges,
  };
}

// ---------------------------------------------------------------- Patreon (public page)
interface PatreonData { paidPatrons: number | null; freeMembers: number | null; tiers: Array<{ amountUsd: number; patrons: number; title: string; free: boolean }>; grossMonthlyUsd: number | null; }

async function pullPatreon(): Promise<PatreonData> {
  const res = await fetch(PATREON_URL, { headers: { 'user-agent': 'Mozilla/5.0 (MHM funnel scoreboard; contact hello@musthavemods.com)' } });
  if (!res.ok) throw new Error(`patreon ${res.status}`);
  const html = (await res.text()).replace(/\\"/g, '"');
  // Reward (tier) objects in the embedded JSON look like
  //   {"amount_cents":300, …, "is_free_tier":false, …, "patron_count":9, …, "title":"Support Tier"}
  // Walk each patron_count and read the nearest preceding amount_cents / is_free_tier.
  const tiers: Array<{ amountUsd: number; patrons: number; title: string; free: boolean }> = [];
  const re = /"patron_count":(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let back = html.slice(Math.max(0, m.index - 6000), m.index);
    const objStart = back.lastIndexOf('"type":"reward"');
    if (objStart >= 0) back = back.slice(objStart);
    const ahead = html.slice(m.index, m.index + 200);
    const amt = Array.from(back.matchAll(/"amount_cents":(\d+)/g)).pop();
    const freeFlag = Array.from(back.matchAll(/"is_free_tier":(true|false)/g)).pop();
    const title = ahead.match(/"title":"([^"]{0,80})"/)?.[1] ?? '';
    if (!amt || !freeFlag) continue;
    const free = freeFlag[1] === 'true';
    const amountUsd = Number(amt[1]) / 100;
    const patrons = Number(m[1]);
    if (tiers.some((t) => t.title === title && t.amountUsd === amountUsd)) continue;
    tiers.push({ amountUsd, patrons, title, free });
  }
  const paidTiers = tiers.filter((t) => !t.free && t.amountUsd > 0);
  const paidPatrons = paidTiers.length ? paidTiers.reduce((s, t) => s + t.patrons, 0) : null;
  const freeTier = tiers.find((t) => t.free);
  const freeMembers = freeTier ? freeTier.patrons : null;
  const grossMonthlyUsd = paidTiers.length ? paidTiers.reduce((s, t) => s + t.amountUsd * t.patrons, 0) : null;
  return { paidPatrons, freeMembers, tiers, grossMonthlyUsd };
}

// ---------------------------------------------------------------- Patreon (Members API + DB)
interface PatreonApiData extends PatreonMembersSummary {
  /** site accounts with Account.provider = 'patreon' (Patreon OAuth connected) */
  connectedAccounts: number;
  /** users the site currently treats as premium (JWT snapshot; see lib/membership.ts) */
  premiumUsers: number;
  anchor: string;
  window: string;
}

/**
 * The numbers behind the E40 read (2026-09-19) and the Q4 step-1 gate (2026-09-22),
 * pulled every morning so neither has to be hand-run. Same arithmetic as
 * `patreon-relaunch-read.ts` via the shared pure lib; aggregates only —
 * the Patreon user id (`relationships.user.data.id`, via `include=user`) and
 * the email are used solely to intersect the paid set with linked site
 * accounts (`Account.providerAccountId` / `User.email`) and never leave this
 * function. The id is the authoritative key (E50); email is the fallback.
 */
async function pullPatreonApi(): Promise<PatreonApiData> {
  // The runner invokes this script without dotenv; load only the keys the
  // Patreon helper needs, and only when the environment does not already have them.
  const fileEnv = readEnvFile(join(PROJECT_DIR, '.env.local'));
  for (const k of ['PATREON_CLIENT_ID', 'PATREON_CLIENT_SECRET', 'PATREON_CREATOR_ACCESS_TOKEN', 'PATREON_CREATOR_REFRESH_TOKEN', 'PATREON_CAMPAIGN_ID']) {
    if (!process.env[k] && fileEnv[k]) process.env[k] = fileEnv[k];
  }
  const campaign = process.env.PATREON_CAMPAIGN_ID ?? '13460416';
  const { patreonGet } = await import('../_patreon-auth');
  const members: PatreonMemberAttrs[] = [];
  let url: string | null =
    `https://www.patreon.com/api/oauth2/v2/campaigns/${campaign}/members?fields%5Bmember%5D=patron_status,pledge_relationship_start,last_charge_date,currently_entitled_amount_cents,email&include=user&page%5Bcount%5D=500`;
  let pages = 0;
  while (url && pages < 50) {
    const j: {
      data?: Array<{ attributes: PatreonMemberAttrs; relationships?: { user?: { data?: { id?: string } | null } } }>;
      links?: { next?: string };
    } = await patreonGet(url);
    // `include=user` puts the Patreon user id on the relationship; we never read
    // the `included` user objects (no user fields are requested).
    members.push(...(j.data ?? []).map((d) => ({ ...d.attributes, patreonUserId: d.relationships?.user?.data?.id ?? null })));
    url = j.links?.next ?? null;
    pages += 1;
  }

  const dbUrl = fileEnv.DIRECT_DATABASE_URL ?? process.env.DIRECT_DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('postgres')) throw new Error('DIRECT_DATABASE_URL missing from .env.local');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient({ datasourceUrl: dbUrl, log: ['error'] });
  try {
    const [linked, premiumUsers] = await Promise.all([
      prisma.account.findMany({ where: { provider: 'patreon' }, select: { providerAccountId: true, user: { select: { email: true } } } }),
      prisma.user.count({ where: { isPremium: true } }),
    ]);
    const now = new Date();
    const summary = summarizePatreonMembers(
      members,
      linked.map((a) => ({ providerAccountId: a.providerAccountId, email: a.user.email })),
      { now },
    );
    return {
      ...summary,
      connectedAccounts: linked.length,
      premiumUsers,
      anchor: E40_ANCHOR.slice(0, 10),
      window: `${iso(new Date(now.getTime() - 7 * 864e5))}→${iso(now)}`,
    };
  } finally {
    await prisma.$disconnect();
  }
}

// ---------------------------------------------------------------- WordPress
interface WpData { posts30d: number; posts7d: number; latestPost: string | null; }
async function pullWp(): Promise<WpData> {
  async function count(after: string) {
    const r = await fetch(`${WP_API}/posts?after=${after}T00:00:00&per_page=1&_fields=date,slug`);
    if (!r.ok) throw new Error(`wp ${r.status}`);
    const total = Number(r.headers.get('x-wp-total') ?? 0);
    const body = (await r.json()) as Array<{ date: string; slug: string }>;
    return { total, latest: body[0] ? `${body[0].date.slice(0, 10)} ${body[0].slug}` : null };
  }
  const [m, w] = await Promise.all([count(daysAgo(30)), count(daysAgo(7))]);
  return { posts30d: m.total, posts7d: w.total, latestPost: m.latest };
}

// ---------------------------------------------------------------- Pinner liveness (Supabase queue)
//
// `unpostedBacklog` counts every `Is Posted = false` row, which is NOT the
// number of pins that can actually go out. The poster on BigScoots
// (MHMUtils/supabase_pin_poster_server.py, `fetch_unposted_entries`) only
// selects rows whose `Post Date` falls inside
// `[today - BACKLOG_LOOKBACK_DAYS, today]` (lookback = 14). Rows dated before
// that window are invisible to it forever.
//
// On 2026-09-08 all 1,879 unposted rows were stranded outside the window and
// the drainable backlog was 0 — so the scoreboard was publishing "backlog 1879"
// as reassurance while the queue had no buffer at all. Report both.
const PINNER_LOOKBACK_DAYS = 14;
// Liveness (E41, 2026-09-13): `n8n_pinterest_posts` has no posted-at column.
// `Post Date` is the date the writer *scheduled* the row for, and the poster
// drains oldest-first inside its 14d window, so max(Post Date) over posted
// rows lags real posting by days whenever a batch is being worked through.
// On 2026-09-13 that proxy read "2026-09-11, 2d ago → 🔴 stalled" while
// Pinterest showed 47 pins created in the previous 24 h, the newest 6 minutes
// before the check. Liveness now comes from Pinterest's `created_at`
// (GET /v5/pins, newest first); the proxy is kept, labelled, and can only
// ever downgrade to "unverified", never to 🔴.
const PINNER_PINS_PAGE_SIZE = 100;
const PINNER_PINS_MAX_PAGES = 3;
// Runway (E51, 2026-09-15). Must match DEFAULT_RUNWAY_HORIZON_DAYS /
// DEFAULT_LOW_RUNWAY_DAYS in pinner-liveness-lib.ts and PINNER_RUNWAY_HORIZON_DAYS
// / PINNER_LOW_RUNWAY_DAYS in check-pinner.sh.
const PINNER_RUNWAY_HORIZON_DAYS = DEFAULT_RUNWAY_HORIZON_DAYS;
const PINNER_LOW_RUNWAY_DAYS = 3;
interface PinnerData {
  /** max(Post Date) over posted rows — the SCHEDULED date. Proxy only; see assessLiveness. */
  lastPostedDate: string | null;
  /** Pinterest `created_at` of the newest pin on the account (UTC ISO), or null if the API was unreachable. */
  lastPinCreatedAt: string | null;
  /** Pins Pinterest reports created in the last 24 h / 7 d (7 d is a floor when `pinsSampled` hit the page cap). */
  pinsCreated24h: number | null;
  pinsCreated7d: number | null;
  pinsSampled: number;
  liveness: LivenessAssessment;
  /** Why the Pinterest read failed, if it did (never a token). */
  pinterestError: string | null;
  /** Posted rows whose Post Date is in the last 7 d — scheduled-date proxy, kept for continuity. */
  postedLast7d: number;
  /** Every `Is Posted = true` row. A day-over-day delta of this is a second liveness signal. */
  postedTotal: number;
  /** Every `Is Posted = false` row. Kept for continuity; do not read it as a buffer. */
  unpostedBacklog: number;
  /** Rows the poster can actually pick up today (Post Date inside its lookback window). */
  drainableBacklog: number;
  /** Rows dated before the poster's window — queued but unreachable without re-dating. */
  strandedBacklog: number;
  /**
   * Unposted rows dated inside [today - lookback, today + PINNER_RUNWAY_HORIZON_DAYS]:
   * what the poster can reach today plus what enters its window over the horizon.
   * This — not `drainableBacklog` — is the buffer (E51).
   */
  inventoryRows: number;
  /** inventoryRows ÷ observed pins/day. The only queue-depth signal that may flag. */
  runway: RunwayAssessment;
  /** created_at of the newest row this repo can attribute to the writer plugin (Wordpress Post ID set); null if none found. "Queued at", not "published at" — see pinner-liveness-lib.ts. */
  lastWriterInsertAt: string | null;
  /** Wordpress Keyword / Post Title on that row, for a human-readable "newest source post" in the digest. */
  lastWriterInsertLabel: string | null;
  writerInserted24h: number;
  writerInserted7d: number;
  writerLiveness: WriterLivenessAssessment;
}
async function pullPinner(): Promise<PinnerData> {
  // The BigScoots cron uses MHMUtils/config.json (SUPABASE_URL + SUPABASE_KEY); the .env there is stale.
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
  if (!base || !key) throw new Error(`Supabase creds not found in MHMUtils config.json/.env`);
  base = base.replace(/\/$/, '');
  const headers = { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' };
  const table = `${base}/rest/v1/n8n_pinterest_posts`;
  async function q(params: string) {
    const r = await fetch(`${table}?${params}`, { headers });
    if (!r.ok) throw new Error(`supabase ${r.status}`);
    const total = Number((r.headers.get('content-range') ?? '/0').split('/')[1] ?? 0);
    return { total, rows: (await r.json()) as Array<Record<string, unknown>> };
  }
  const posted = await q(`select=%22Post%20Date%22&%22Is%20Posted%22=eq.true&order=%22Post%20Date%22.desc&limit=1`);
  const posted7 = await q(`select=id&%22Is%20Posted%22=eq.true&%22Post%20Date%22=gte.${daysAgo(7)}&limit=1`);
  const postedAll = await q(`select=id&%22Is%20Posted%22=eq.true&limit=1`);
  const backlog = await q(`select=id&%22Is%20Posted%22=eq.false&limit=1`);
  // Mirror of the poster's own query window (Post Date between floor and today).
  const floor = daysAgo(PINNER_LOOKBACK_DAYS);
  const drainable = await q(
    `select=id&%22Is%20Posted%22=eq.false&%22Post%20Date%22=gte.${floor}&%22Post%20Date%22=lte.${iso(new Date())}&limit=1`,
  );
  // Queried, not subtracted: future-dated rows are neither drainable today nor
  // stranded, and must not be folded into either number.
  const stranded = await q(
    `select=id&%22Is%20Posted%22=eq.false&%22Post%20Date%22=lt.${floor}&limit=1`,
  );
  // Inventory ahead of the poster (E51): the queue is drip-dated (E26 10/day,
  // E46 14/day), so "schedulable today" is only the residue of today's
  // allotment after the poster has drained most of it — 6 on 09-15 while 39
  // pins had been created in 24 h. The buffer is everything dated from the
  // window floor through the look-ahead horizon, divided by the observed rate.
  const inventory = await q(
    `select=id&%22Is%20Posted%22=eq.false&%22Post%20Date%22=gte.${floor}&%22Post%20Date%22=lte.${daysAhead(PINNER_RUNWAY_HORIZON_DAYS)}&limit=1`,
  );
  const lastPostedDate = posted.rows[0] ? String(posted.rows[0]['Post Date']).slice(0, 10) : null;

  // Writer liveness (Q11, 2026-09-16): rows the writer plugin itself inserted,
  // distinguished from this repo's own catalog-pin/revival tooling by
  // `Wordpress Post ID`, which the writer always sets (observed as the string
  // "0") and everything in this repo leaves null. See pinner-liveness-lib.ts.
  const writerFilter = `%22Wordpress%20Post%20ID%22=not.is.null`;
  const writerNewest = await q(
    `select=id,created_at,%22Wordpress%20Keyword%22,%22Post%20Title%22&${writerFilter}&order=created_at.desc&limit=1`,
  );
  const writer24h = await q(`select=id&${writerFilter}&created_at=gte.${hoursAgoIso(24)}&limit=1`);
  const writer7d = await q(`select=id&${writerFilter}&created_at=gte.${hoursAgoIso(24 * 7)}&limit=1`);
  const lastWriterInsertAt = writerNewest.rows[0] ? String(writerNewest.rows[0].created_at) : null;
  const lastWriterInsertLabel = writerNewest.rows[0]
    ? String(writerNewest.rows[0]['Wordpress Keyword'] ?? writerNewest.rows[0]['Post Title'] ?? '') || null
    : null;

  // Pinterest's own record of what went out. Fails soft: a Pinterest outage
  // must not take the queue numbers down with it, and the flag logic knows
  // how to read "unverified".
  let pins: PinLike[] = [];
  let pinterestError: string | null = null;
  try {
    pins = await fetchRecentPins(cfgPath);
  } catch (err) {
    pinterestError = (err as Error).message;
  }
  const summary = summarizePins(pins);
  const liveness = assessLiveness({ lastCreatedAt: summary.lastCreatedAt, lastPostDateProxy: lastPostedDate });
  const runway = assessRunway({
    inventoryRows: inventory.total,
    schedulableToday: drainable.total,
    pinsCreated7d: pins.length ? summary.created7d : null,
    pinsCreated24h: pins.length ? summary.created24h : null,
    horizonDays: PINNER_RUNWAY_HORIZON_DAYS,
    lowRunwayDays: PINNER_LOW_RUNWAY_DAYS,
  });
  const writerLiveness = assessWriterLiveness({
    lastWriterInsertAt,
    inserted24h: writer24h.total,
    inserted7d: writer7d.total,
    runwayDays: runway.runwayDays,
  });

  return {
    lastPostedDate,
    lastPinCreatedAt: summary.lastCreatedAt,
    pinsCreated24h: pins.length ? summary.created24h : null,
    pinsCreated7d: pins.length ? summary.created7d : null,
    pinsSampled: summary.sampled,
    liveness,
    pinterestError,
    postedLast7d: posted7.total,
    postedTotal: postedAll.total,
    unpostedBacklog: backlog.total,
    drainableBacklog: drainable.total,
    strandedBacklog: stranded.total,
    inventoryRows: inventory.total,
    runway,
    lastWriterInsertAt,
    lastWriterInsertLabel,
    writerInserted24h: writer24h.total,
    writerInserted7d: writer7d.total,
    writerLiveness,
  };
}

/**
 * Obtain a Pinterest access token that is valid *now* and list the account's
 * newest pins. The token comes from the same token manager the pinner uses
 * (scripts/agents/pinterest-token-status.py refreshes config.json in place
 * when the stored token has aged out); this function never logs it.
 */
async function fetchRecentPins(cfgPath: string): Promise<PinLike[]> {
  if (!existsSync(cfgPath)) throw new Error('MHMUtils config.json not found');
  const helper = join(PROJECT_DIR, 'scripts', 'agents', 'pinterest-token-status.py');
  if (existsSync(helper)) {
    // Output deliberately discarded: it is a status line, but we do not want
    // any path where a helper change could surface a token in the scoreboard.
    spawnSync('python3', [helper], {
      env: { ...process.env, MHM_UTILS_DIR: join(cfgPath, '..'), MHM_PINTEREST_CONFIG: cfgPath },
      stdio: 'ignore',
      timeout: 30_000,
    });
  }
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) as Record<string, string>;
  const token = cfg.creator_access_token ?? '';
  if (!token) throw new Error('creator_access_token missing from config.json');
  const headers = { Authorization: `Bearer ${token}` };
  const out: PinLike[] = [];
  const sevenDaysAgo = Date.now() - 7 * 864e5;
  let bookmark: string | null = null;
  for (let page = 0; page < PINNER_PINS_MAX_PAGES; page += 1) {
    const url = `https://api.pinterest.com/v5/pins?page_size=${PINNER_PINS_PAGE_SIZE}${bookmark ? `&bookmark=${encodeURIComponent(bookmark)}` : ''}`;
    const r = await fetch(url, { headers });
    if (!r.ok) throw new Error(`pinterest /v5/pins HTTP ${r.status}`);
    const body = (await r.json()) as { items?: PinLike[]; bookmark?: string | null };
    const items = body.items ?? [];
    out.push(...items);
    bookmark = body.bookmark ?? null;
    const oldest = items[items.length - 1];
    const oldestTs = oldest?.created_at ? Date.parse(`${oldest.created_at}Z`) : NaN;
    if (!bookmark || items.length === 0 || (!Number.isNaN(oldestTs) && oldestTs < sevenDaysAgo)) break;
  }
  return out;
}

// ---------------------------------------------------------------- main
async function main() {
  const today = iso(new Date());
  mkdirSync(OUT_DIR, { recursive: true });
  const targetsPath = join(PROJECT_DIR, '.claude', 'agents', 'mhm-funnel', 'targets.json');
  const targets = existsSync(targetsPath) ? JSON.parse(readFileSync(targetsPath, 'utf8')) : null;

  const [ga4, gsc, mv, db, patreon, patreonApi, wp, pinner, team] = await Promise.all([
    section('ga4', pullGa4), section('gsc', pullGsc), section('mediavine', pullMediavine),
    section('db', pullDb), section('patreon', pullPatreon), section('patreonApi', pullPatreonApi), section('wordpress', pullWp), section('pinner', pullPinner),
    section('team', pullTeam),
  ]);

  // --- derived headline numbers
  const emailAdds7d = db.ok ? db.data.subscribers7d : null;
  const accountAdds7d = db.ok ? db.data.users7d : null;
  const ownedAdds7d = emailAdds7d != null && accountAdds7d != null ? emailAdds7d + accountAdds7d : null;
  const month = today.slice(0, 7);
  const ownedTarget = targets?.targets?.weekly?.ownedAudienceNetAdds?.[month] ?? null;
  const nonAdTarget = targets?.targets?.monthly?.nonAdRevenue?.[month] ?? null;
  const nonAdRevenue = (patreon.ok && patreon.data.grossMonthlyUsd != null ? patreon.data.grossMonthlyUsd : 0) + (db.ok ? db.data.affiliateEarnings30d : 0);

  // --- long-range / product health (E-audit, 2026-09-22): each derived value
  // degrades to null independently when either of its inputs is unavailable —
  // never crash the scoreboard for a dashboard-only metric.
  const sessions7d = ga4.ok ? ga4.data.sessions7d : null;
  const captureRatePer1kSessions7d = captureRatePer1kSessions(ownedAdds7d, sessions7d);
  const nonPinterest = ga4.ok
    ? nonPinterestShare({ channels: ga4.data.byChannel7d, notSetSessions: ga4.data.notSetLanding7d })
    : { raw: null, adjusted: null };
  const owners = resolveMetricOwners(targets);

  const flags: string[] = [];
  if (mv.ok) {
    const ratio = mv.data.revenuePrev28d ? mv.data.revenue28d / mv.data.revenuePrev28d : 1;
    if (ratio < 0.9) flags.push(`🔴 Mediavine 28d revenue ${money(mv.data.revenue28d)} is ${pct(mv.data.revenue28d, mv.data.revenuePrev28d)} vs prior 28d — guardrail breached`);
    else if (ratio < 0.95) flags.push(`🟡 Mediavine 28d revenue ${pct(mv.data.revenue28d, mv.data.revenuePrev28d)} vs prior 28d`);
    for (const [k, v] of Object.entries(mv.data.health)) if (v !== 'ok' && k !== 'date') flags.push(`🔴 Mediavine health ${k}: ${String(v)}`);
    if (mv.data.tokenDaysLeft != null && mv.data.tokenDaysLeft <= 21) flags.push(`🟡 Mediavine JWT expires in ${mv.data.tokenDaysLeft} days`);
  } else flags.push(`🟡 Mediavine unavailable: ${errOf(mv)}`);
  if (pinner.ok) {
    // Liveness from Pinterest `created_at`, not from the queue's scheduled
    // `Post Date` (E41): the proxy said "2d ago → 🔴" on 2026-09-13 while the
    // poster had created 47 pins in 24 h. Proxy-only is 🟡 unverified, never 🔴.
    const live = pinner.data.liveness;
    if (live.level === 'red') flags.push(`🔴 Pinner: ${live.message}`);
    else if (live.level === 'unverified') flags.push(`🟡 Pinner: ${live.message}${pinner.data.pinterestError ? ` (${pinner.data.pinterestError})` : ''}`);
    // Queue depth (E51): flag on inventory runway, not on "schedulable today".
    // The E20 rule (🟡 at 0 or < 20 schedulable) fired on 09-10, 09-14 and 09-15
    // over a queue that is drip-dated at 24 rows/day by design — the morning
    // read only ever sees the residue of today's allotment after the poster
    // has drained most of it (6 left, 39 created in 24 h). The buffer is rows
    // dated through the horizon ÷ observed pins/day; 🟡 only when that is
    // under PINNER_LOW_RUNWAY_DAYS or the inventory is actually empty.
    // Liveness (above) stays the only 🔴 path.
    const rw = pinner.data.runway;
    if (rw.level === 'empty' || rw.level === 'low') {
      flags.push(`🟡 Pinner: ${rw.message}${rw.level === 'empty' && pinner.data.strandedBacklog > 0 ? ` — ${pinner.data.strandedBacklog} unposted rows are stranded before the poster's ${PINNER_LOOKBACK_DAYS}d window` : ''}`);
    }
    // Writer liveness (Q11, 2026-09-16): the queue's *inflow*, not its depth.
    // Idle since 2026-09-04 with no cron scheduled — runway alone only flags
    // once the borrowed inventory (three manual revival slices) runs out,
    // which can be a week or more after the writer actually died. Never 🔴
    // exit-code (writerLivenessExitCode is WARN-only): the fix is Q11
    // (BigScoots cron), which is Tier 2/operator-owned, not something this
    // repo can act on — but it must still be loud in the Flags section.
    const wl = pinner.data.writerLiveness;
    if (wl.level === 'red' || wl.level === 'warn') {
      flags.push(`${wl.level === 'red' ? '🔴' : '🟡'} Pinner writer: ${wl.message}`);
    }
  } else flags.push(`🟡 Pinner liveness unknown: ${errOf(pinner)}`);
  if (ga4.ok && ga4.data.sessionsPrev7d && ga4.data.sessions7d / ga4.data.sessionsPrev7d < 0.9) flags.push(`🔴 GA4 sessions 7d ${pct(ga4.data.sessions7d, ga4.data.sessionsPrev7d)} WoW`);
  if (ga4.ok && Object.keys(ga4.data.captureEvents7d).length === 0) flags.push(`🟡 GA4: no capture events fired in 7d (newsletter_signup/account_signup/patreon_click not instrumented)`);
  if (wp.ok && wp.data.posts7d === 0) flags.push(`🟡 No blog posts published in 7 days`);
  // Two decision gates (E40 read 09-19, Q4 gate 09-22) read this section; an
  // outage must show where the operator reads first, not only as a body note.
  if (!patreonApi.ok) flags.push(`🟡 Patreon Members API unavailable: ${errOf(patreonApi)} — E40 / Q4 gate numbers missing today`);
  else if (patreonApi.data.paid > 0 && patreonApi.data.paidWithUserId === 0) {
    flags.push(`🟡 Patreon Members API returned no user ids (include=user not honoured) — paid-and-connected fell back to the email-only join`);
  }

  // --- markdown
  let md = `# Funnel scoreboard — ${today}\n\n`;
  md += `**Headline:** owned-audience adds 7d **${ownedAdds7d ?? '?'}**${ownedTarget ? ` (target ${ownedTarget}/wk)` : ''} · non-ad revenue **${money(nonAdRevenue)}/mo gross**${nonAdTarget ? ` (target ${money(nonAdTarget)})` : ''} · Mediavine 28d **${mv.ok ? money(mv.data.revenue28d) : '?'}** ${mv.ok ? `(${pct(mv.data.revenue28d, mv.data.revenuePrev28d)} vs prior)` : ''}\n\n`;
  md += `## Flags\n\n${flags.length ? flags.map((f) => `- ${f}`).join('\n') : '- 🟢 none'}\n\n`;

  md += `## Audience (GA4 ${ga4.ok ? ga4.data.window : ''})\n\n`;
  if (ga4.ok) {
    const g = ga4.data;
    md += `| Channel | 7d | prev 7d | Δ |\n|---|--:|--:|--:|\n`;
    md += `| **All sessions** | ${num(g.sessions7d)} | ${num(g.sessionsPrev7d)} | ${pct(g.sessions7d, g.sessionsPrev7d)} |\n`;
    const chans = Object.keys({ ...g.byChannel7d, ...g.byChannelPrev7d }).sort((a, b) => (g.byChannel7d[b] ?? 0) - (g.byChannel7d[a] ?? 0));
    for (const c of chans) md += `| ${c} | ${num(g.byChannel7d[c] ?? 0)} | ${num(g.byChannelPrev7d[c] ?? 0)} | ${pct(g.byChannel7d[c] ?? 0, g.byChannelPrev7d[c] ?? 0)} |\n`;
    md += `\n- (not set) landing sessions 7d: ${num(g.notSetLanding7d)} (suspected bot/tag noise)\n`;
    md += `- Capture events 7d: ${Object.keys(g.captureEvents7d).length ? Object.entries(g.captureEvents7d).map(([k, v]) => `${k}=${v}`).join(', ') : 'none instrumented'}\n\n`;
  } else md += `_unavailable: ${errOf(ga4)}_\n\n`;

  md += `## Search (GSC ${gsc.ok ? gsc.data.window : ''})\n\n`;
  md += gsc.ok ? `- Clicks 28d: **${num(gsc.data.clicks28d)}** (${pct(gsc.data.clicks28d, gsc.data.clicksPrev28d)} vs prior 28d) · impressions ${num(gsc.data.impressions28d)}\n\n` : `_unavailable: ${errOf(gsc)}_\n\n`;

  md += `## Ad revenue (Mediavine, anchored ${mv.ok ? mv.data.latestDay : ''})\n\n`;
  if (mv.ok) {
    const m = mv.data;
    md += `| Window | Revenue | Δ | Session RPM | Sessions |\n|---|--:|--:|--:|--:|\n`;
    md += `| 7d | ${money(m.revenue7d)} | ${pct(m.revenue7d, m.revenuePrev7d)} | ${money(m.rpm7d)} (prev ${money(m.rpmPrev7d)}) | ${num(m.sessions7d)} |\n`;
    md += `| 28d | ${money(m.revenue28d)} | ${pct(m.revenue28d, m.revenuePrev28d)} | ${money(m.rpm28d)} | |\n\n`;
    md += `- Health: ${Object.entries(m.health).map(([k, v]) => `${k}=${String(v)}`).join(' · ') || 'n/a'}\n\n`;
  } else md += `_unavailable: ${errOf(mv)}_\n\n`;

  md += `## Owned audience & engagement (production DB)\n\n`;
  if (db.ok) {
    const d = db.data;
    md += `| Metric | Total | 7d | 30d |\n|---|--:|--:|--:|\n`;
    md += `| Registered accounts | ${num(d.users)} | +${d.users7d} | +${d.users30d} |\n`;
    md += `| Email subscribers | ${num(d.subscribers)} | +${d.subscribers7d} | +${d.subscribers30d} |\n`;
    md += `| Favorites | ${num(d.favorites)} | +${d.favorites7d} | |\n`;
    md += `| Download clicks | | ${num(d.downloadClicks7d)} | ${num(d.downloadClicks30d)} |\n`;
    md += `| Affiliate clicks | | ${num(d.affiliateClicks7d)} | ${num(d.affiliateClicks30d)} |\n`;
    md += `| Affiliate earnings | | | ${money(d.affiliateEarnings30d)} |\n\n`;
    md += `- Subscribers by source: ${Object.entries(d.subscribersBySource).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'}\n`;
    md += `- Catalog: ${num(d.mods)} mods · ${num(d.collections)} user collections · ${d.creatorProfiles} creator profiles · ${d.modSubmissions} submissions\n\n`;
  } else md += `_unavailable: ${errOf(db)}_\n\n`;

  md += `## Patreon (public page)\n\n`;
  if (patreon.ok) {
    const p = patreon.data;
    md += `- Paid patrons: **${p.paidPatrons ?? '?'}** · free members: **${p.freeMembers ?? '?'}** · gross ≈ ${p.grossMonthlyUsd != null ? money(p.grossMonthlyUsd) : '?'}/mo\n`;
    md += `- Tiers: ${p.tiers.filter((t) => !t.free).map((t) => `${t.title.trim()} $${t.amountUsd}×${t.patrons}`).join(', ') || 'not parsed'}\n\n`;
  } else md += `_unavailable: ${errOf(patreon)}_\n\n`;

  md += `## Patreon (Members API + site accounts) — E40 read 2026-09-19 · Q4 gate 2026-09-22\n\n`;
  if (patreonApi.ok) {
    const a = patreonApi.data;
    const click = ga4.ok ? ga4.data.patreonClick7d : null;
    const reread = ga4.ok ? ga4.data.patreonClickBaselineReread : null;
    const B = E40_CLICK_BASELINE;
    const connectedShare = a.paid ? Math.round((100 * a.paidAndConnected) / a.paid) : 0;
    md += `| Metric | Value |\n|---|--:|\n`;
    md += `| Paid patrons (API) | ${a.paid} (${formatPaidByAmount(a.paidByAmount)}) ≈ ${money(a.grossMonthlyUsd)}/mo |\n`;
    md += `| Paid-and-connected | **${a.paidAndConnected}** of ${a.connectedAccounts} linked accounts (${connectedShare}% of paid; gate needs ≥ 1/3) · by Patreon id ${a.paidAndConnectedById}, by email ${a.paidAndConnectedByEmail} (email-only was the pre-09-14 join) · ${a.linkedWithPatreonId} linked accounts carry a Patreon id, ${a.paidWithUserId} of ${a.paid} paid rows carry one · premium-flagged users ${a.premiumUsers} |\n`;
    md += `| $3-tier joins since ${a.anchor} | **${a.joinsSinceAnchorAtPerkTier}** (all tiers ${a.joinsSinceAnchor}) |\n`;
    md += `| $3-tier joins 7d (${a.window}) | ${a.perkTierJoins7d} → ${a.perkTierJoinsPerDay7d}/day |\n`;
    md += `| Paid joins / cancels 7d | ${a.joins7d} / ${a.cancels7d} (Aug 2026 pace: 17 / 16 per month) |\n`;
    md += `| patreon_click users/day (GA4, mean of daily distinct users${click ? `, ${click.window}` : ''}) | ${click ? `${click.perDay} (${click.users} users / ${click.days} days)` : 'unavailable'} vs E40 baseline ${B.usersPerDay} (${B.users} users / ${B.days} days, ${B.start}→${B.end}, frozen 09-12${reread ? `; GA4 re-reads that window today as ${reread.perDay}` : ''}) |\n\n`;
    md += `- E40 keep if: paid-and-connected ≥ 3 OR $3-tier joins 09-13→09-19 ≥ 11, with session RPM within ±5% of $17.55; revert if paid-and-connected still 0 AND joins < 8 AND patreon_click users/day (mean of daily distinct users over ${click ? click.window : 'the 7d GA4 window'}) < ${B.revertBelowPerDay} (50% of the ${B.usersPerDay} baseline, mean of daily distinct users ${B.start}→${B.end}). Paid-and-connected is the id join (fallback email); the E40 BEFORE of 0 was email-only.\n`;
    md += `- Q4 gate (2026-09-22): proceed to renames + $10 tier only if joins ≥ 17/mo pace AND ≥ 1/3 of paid patrons connected (id join); revert copy if cancels > 16/mo pace.\n\n`;
  } else md += `_unavailable: ${errOf(patreonApi)}_\n\n`;

  md += `## Content & distribution pipelines\n\n`;
  md += wp.ok ? `- Blog posts: ${wp.data.posts7d} in 7d, ${wp.data.posts30d} in 30d · latest: ${wp.data.latestPost ?? '?'}\n` : `- Blog: unavailable (${errOf(wp)})\n`;
  if (pinner.ok) {
    const p = pinner.data;
    const posting =
      p.lastPinCreatedAt
        ? `${p.liveness.message} · **${p.pinsCreated24h} pins in 24h**, ${p.pinsCreated7d}${p.pinsSampled >= PINNER_PINS_PAGE_SIZE * PINNER_PINS_MAX_PAGES ? '+' : ''} in 7d (Pinterest API)`
        : `${p.liveness.message} · ${p.postedLast7d} posted rows dated in the last 7d (queue proxy)`;
    md += `- Pinner: ${posting} · **${p.runway.message}** · ${p.strandedBacklog} stranded before the poster's ${PINNER_LOOKBACK_DAYS}d window, ${p.unpostedBacklog} unposted total, ${num(p.postedTotal)} posted rows all-time\n`;
    md += `  - queue \`Post Date\` is the scheduled date, not a posting timestamp — newest posted row is dated ${p.lastPostedDate ?? 'never'}; do not read it as staleness. "Schedulable today" is the residue of a drip-dated allotment, not a buffer — the runway above is.\n`;
    const writerIcon = p.writerLiveness.level === 'red' ? '🔴' : p.writerLiveness.level === 'warn' ? '🟡' : '🟢';
    md += `- ${writerIcon} Pinner writer (Q11): ${p.writerLiveness.message}${p.lastWriterInsertLabel ? ` — "${p.lastWriterInsertLabel}"` : ''}\n`;
  } else md += `- Pinner: unavailable (${errOf(pinner)})\n`;
  md += `## Long-range health\n\n`;
  md += `| Metric | Value | Owner |\n|---|--:|---|\n`;
  md += `| Returning-visitor share 7d | ${ga4.ok && ga4.data.returningShare7d != null ? frac(ga4.data.returningShare7d) : '—'} | ${owners.returningShare7d ?? '?'} |\n`;
  md += `| Non-Pinterest share 7d (adjusted) | ${nonPinterest.adjusted != null ? frac(nonPinterest.adjusted) : '—'} (raw ${nonPinterest.raw != null ? frac(nonPinterest.raw) : '—'}) | ${owners.nonPinterestShare7d ?? '?'} |\n`;
  md += `| Pages/session 7d | ${ga4.ok && ga4.data.pagesPerSession7d != null ? ga4.data.pagesPerSession7d.toFixed(2) : '—'} | ${owners.pagesPerSession7d ?? '?'} |\n`;
  md += `| Engagement rate 7d | ${ga4.ok && ga4.data.engagementRate7d != null ? frac(ga4.data.engagementRate7d) : '—'} | ${owners.engagementRate7d ?? '?'} |\n`;
  md += `| Favorites 7d | ${db.ok ? `+${db.data.favorites7d}` : '—'} | ${owners.favorites7d ?? '?'} |\n`;
  md += `| Download clicks 7d | ${db.ok ? num(db.data.downloadClicks7d) : '—'} | ${owners.downloadClicks7d ?? '?'} |\n`;
  md += `| New mods 7d (prior 7d) | ${db.ok ? `${num(db.data.newMods7d)} (${num(db.data.newModsPrior7d)})` : '—'} | ${owners.newMods7d ?? '?'} |\n`;
  md += `| Catalog total | ${db.ok ? num(db.data.mods) : '—'} | ${owners.catalogTotal ?? '?'} |\n`;
  md += `| Capture rate /1k sessions 7d | ${captureRatePer1kSessions7d != null ? captureRatePer1kSessions7d.toFixed(2) : '—'} | ${owners.captureRatePer1k ?? '?'} |\n`;
  md += `| Creators onboarded (>=1 submission) | ${db.ok ? num(db.data.creatorsOnboarded) : '—'} | ${owners.creatorsOnboarded ?? '?'} |\n`;
  md += `| Creator submissions 7d | ${db.ok ? num(db.data.submissions7d) : '—'} | ${owners.creatorSubmissions7d ?? '?'} |\n\n`;

  md += `## Team health\n\n`;
  if (team.ok) {
    const t = team.data;
    md += `- Run success 14d: **${frac(t.runSuccess14d)}** (owner: ${owners.runSuccess14d ?? '?'})\n`;
    md += `- Merges 7d by owner: ${Object.entries(t.mergesByOwner7d).map(([k, v]) => `${k}=${v}`).join(', ') || 'none'} (${t.totalMerges7d} total)\n`;
    md += `- Ops merge share 7d: ${t.opsMergeShare7d != null ? frac(t.opsMergeShare7d) : '—'} (cap 20%, owner: ${owners.opsMergeShare7d ?? '?'})\n`;
    md += `- Paper-only merges 7d: ${t.paperOnlyMerges7d} (owner: ${owners.paperOnlyMerges7d ?? '?'})\n\n`;
  } else md += `_unavailable: ${errOf(team)}_\n\n`;

  md += `\n_Generated by scripts/agents/funnel-scoreboard.ts. Sections fail independently; "unavailable" means the source, not the site._\n`;

  const json = {
    date: today,
    headline: { ownedAdds7d, ownedTargetWeekly: ownedTarget, nonAdRevenueMonthlyGross: nonAdRevenue, nonAdTarget, mediavine28d: mv.ok ? mv.data.revenue28d : null, mediavine28dPrev: mv.ok ? mv.data.revenuePrev28d : null },
    flags, ga4, gsc, mediavine: mv, db, patreon, patreonApi, wordpress: wp, pinner,
    longRange: {
      returningShare7d: ga4.ok ? ga4.data.returningShare7d : null,
      nonPinterestShare7d: nonPinterest.adjusted,
      nonPinterestShareRaw7d: nonPinterest.raw,
    },
    engagement: {
      pagesPerSession7d: ga4.ok ? ga4.data.pagesPerSession7d : null,
      engagementRate7d: ga4.ok ? ga4.data.engagementRate7d : null,
      favorites7d: db.ok ? db.data.favorites7d : null,
      downloadClicks7d: db.ok ? db.data.downloadClicks7d : null,
    },
    catalog: {
      newMods7d: db.ok ? db.data.newMods7d : null,
      newModsPrior7d: db.ok ? db.data.newModsPrior7d : null,
      total: db.ok ? db.data.mods : null,
    },
    capture: {
      ratePer1kSessions7d: captureRatePer1kSessions7d,
    },
    creators: {
      onboarded: db.ok ? db.data.creatorsOnboarded : null,
      submissions7d: db.ok ? db.data.submissions7d : null,
    },
    team,
    owners,
  };
  writeFileSync(join(OUT_DIR, `${today}.md`), md);
  writeFileSync(join(OUT_DIR, `${today}.json`), JSON.stringify(json, null, 2));
  console.log(md);
}

main().catch((err) => {
  console.error(`[scoreboard] fatal: ${(err as Error).message}`);
  process.exit(1);
});
