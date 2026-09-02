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
 *   - WordPress REST: posts published in the last 30 days.
 *   - Pinner queue (Supabase, creds from ~/java_projects/MHMUtils/.env): last
 *     posted pin timestamp + unposted backlog (write-only pipeline liveness).
 *
 * Never prints secrets. Run: npx tsx scripts/agents/funnel-scoreboard.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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
function pct(curr: number, prev: number): string {
  if (!prev) return 'n/a';
  const p = ((curr - prev) / prev) * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(1)}%`;
}
const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-US');

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
    const msg = (err as Error).message ?? String(err);
    console.error(`[scoreboard] ${name}: ${msg.slice(0, 200)}`);
    return { ok: false, error: msg.slice(0, 200) };
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
  notSetLanding7d: number;
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
    metrics: [{ name: 'eventCount' }],
    dimensionFilter: {
      filter: {
        fieldName: 'eventName',
        inListFilter: { values: ['newsletter_signup', 'account_signup', 'patreon_click', 'premium_intent', 'sign_up', 'generate_lead', 'favorite', 'affiliate_click'] },
      },
    },
  });
  const captureEvents7d: Record<string, number> = {};
  for (const row of ev.rows ?? []) captureEvents7d[row.dimensionValues?.[0]?.value ?? '?'] = Number(row.metricValues?.[0]?.value ?? 0);

  const [ns] = await client.runReport({
    property,
    dateRanges: [{ startDate: start, endDate: end }],
    dimensions: [{ name: 'landingPagePlusQueryString' }],
    metrics: [{ name: 'sessions' }],
    dimensionFilter: { filter: { fieldName: 'landingPagePlusQueryString', stringFilter: { value: '(not set)', matchType: 'EXACT' } } },
  });
  const notSetLanding7d = Number(ns.rows?.[0]?.metricValues?.[0]?.value ?? 0);

  return {
    window: `${start}→${end} vs ${prevStart}→${prevEnd}`,
    sessions7d: curr.total,
    sessionsPrev7d: prev.total,
    byChannel7d: curr.channels,
    byChannelPrev7d: prev.channels,
    aiReferral7d: curr.ai,
    aiReferralPrev7d: prev.ai,
    captureEvents7d,
    notSetLanding7d,
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
  const d30 = new Date(Date.now() - 30 * 864e5);
  try {
    const [
      users, users7d, users30d,
      subscribers, subscribers7d, subscribers30d, subsBySource,
      favorites, favorites7d,
      downloadClicks7d, downloadClicks30d,
      affiliateClicks7d, affiliateClicks30d, affEarn,
      creatorProfiles, modSubmissions, mods, collections,
    ] = await Promise.all([
      prisma.user.count(), prisma.user.count({ where: { createdAt: { gte: d7 } } }), prisma.user.count({ where: { createdAt: { gte: d30 } } }),
      subs.count(), subs.count({ where: { createdAt: { gte: d7 } } }), subs.count({ where: { createdAt: { gte: d30 } } }),
      subs.groupBy({ by: ['source'], _count: { _all: true } }),
      prisma.favorite.count(), prisma.favorite.count({ where: { createdAt: { gte: d7 } } }),
      prisma.downloadClick.count({ where: { clickedAt: { gte: d7 } } }), prisma.downloadClick.count({ where: { clickedAt: { gte: d30 } } }),
      prisma.affiliateClick.count({ where: { clickedAt: { gte: d7 } } }), prisma.affiliateClick.count({ where: { clickedAt: { gte: d30 } } }),
      prisma.affiliateEarning.aggregate({ _sum: { commissionAmount: true } }).catch(() => ({ _sum: { commissionAmount: null } })),
      prisma.creatorProfile.count(), prisma.modSubmission.count(), prisma.mod.count(), prisma.collection.count(),
    ]);
    const subscribersBySource: Record<string, number> = {};
    for (const r of subsBySource as Array<{ source: string; _count: { _all: number } }>) subscribersBySource[r.source] = r._count._all;
    return {
      users, users7d, users30d,
      subscribers, subscribers7d, subscribers30d, subscribersBySource,
      favorites, favorites7d,
      downloadClicks7d, downloadClicks30d,
      affiliateClicks7d, affiliateClicks30d, affiliateEarnings30d: Number(affEarn._sum.commissionAmount ?? 0),
      creatorProfiles, modSubmissions, mods, collections,
    };
  } finally {
    await prisma.$disconnect();
  }
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
interface PinnerData { lastPostedDate: string | null; postedLast7d: number; unpostedBacklog: number; }
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
  const backlog = await q(`select=id&%22Is%20Posted%22=eq.false&limit=1`);
  return {
    lastPostedDate: posted.rows[0] ? String(posted.rows[0]['Post Date']).slice(0, 10) : null,
    postedLast7d: posted7.total,
    unpostedBacklog: backlog.total,
  };
}

// ---------------------------------------------------------------- main
async function main() {
  const today = iso(new Date());
  mkdirSync(OUT_DIR, { recursive: true });
  const targetsPath = join(PROJECT_DIR, '.claude', 'agents', 'mhm-funnel', 'targets.json');
  const targets = existsSync(targetsPath) ? JSON.parse(readFileSync(targetsPath, 'utf8')) : null;

  const [ga4, gsc, mv, db, patreon, wp, pinner] = await Promise.all([
    section('ga4', pullGa4), section('gsc', pullGsc), section('mediavine', pullMediavine),
    section('db', pullDb), section('patreon', pullPatreon), section('wordpress', pullWp), section('pinner', pullPinner),
  ]);

  // --- derived headline numbers
  const emailAdds7d = db.ok ? db.data.subscribers7d : null;
  const accountAdds7d = db.ok ? db.data.users7d : null;
  const ownedAdds7d = emailAdds7d != null && accountAdds7d != null ? emailAdds7d + accountAdds7d : null;
  const month = today.slice(0, 7);
  const ownedTarget = targets?.targets?.weekly?.ownedAudienceNetAdds?.[month] ?? null;
  const nonAdTarget = targets?.targets?.monthly?.nonAdRevenue?.[month] ?? null;
  const nonAdRevenue = (patreon.ok && patreon.data.grossMonthlyUsd != null ? patreon.data.grossMonthlyUsd : 0) + (db.ok ? db.data.affiliateEarnings30d : 0);

  const flags: string[] = [];
  if (mv.ok) {
    const ratio = mv.data.revenuePrev28d ? mv.data.revenue28d / mv.data.revenuePrev28d : 1;
    if (ratio < 0.9) flags.push(`🔴 Mediavine 28d revenue ${money(mv.data.revenue28d)} is ${pct(mv.data.revenue28d, mv.data.revenuePrev28d)} vs prior 28d — guardrail breached`);
    else if (ratio < 0.95) flags.push(`🟡 Mediavine 28d revenue ${pct(mv.data.revenue28d, mv.data.revenuePrev28d)} vs prior 28d`);
    for (const [k, v] of Object.entries(mv.data.health)) if (v !== 'ok' && k !== 'date') flags.push(`🔴 Mediavine health ${k}: ${String(v)}`);
    if (mv.data.tokenDaysLeft != null && mv.data.tokenDaysLeft <= 21) flags.push(`🟡 Mediavine JWT expires in ${mv.data.tokenDaysLeft} days`);
  } else flags.push(`🟡 Mediavine unavailable: ${errOf(mv)}`);
  if (pinner.ok) {
    const last = pinner.data.lastPostedDate;
    const staleDays = last ? Math.floor((Date.now() - new Date(last).getTime()) / 864e5) : 99;
    if (staleDays > 1) flags.push(`🔴 Pinner: last posted pin ${last ?? 'never'} (${staleDays}d ago) — the Pinterest pipeline is stalled`);
    if (pinner.data.unpostedBacklog === 0) flags.push(`🟡 Pinner: queue empty — nothing scheduled to post`);
  } else flags.push(`🟡 Pinner liveness unknown: ${errOf(pinner)}`);
  if (ga4.ok && ga4.data.sessionsPrev7d && ga4.data.sessions7d / ga4.data.sessionsPrev7d < 0.9) flags.push(`🔴 GA4 sessions 7d ${pct(ga4.data.sessions7d, ga4.data.sessionsPrev7d)} WoW`);
  if (ga4.ok && Object.keys(ga4.data.captureEvents7d).length === 0) flags.push(`🟡 GA4: no capture events fired in 7d (newsletter_signup/account_signup/patreon_click not instrumented)`);
  if (wp.ok && wp.data.posts7d === 0) flags.push(`🟡 No blog posts published in 7 days`);

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

  md += `## Content & distribution pipelines\n\n`;
  md += wp.ok ? `- Blog posts: ${wp.data.posts7d} in 7d, ${wp.data.posts30d} in 30d · latest: ${wp.data.latestPost ?? '?'}\n` : `- Blog: unavailable (${errOf(wp)})\n`;
  md += pinner.ok ? `- Pinner: last posted ${pinner.data.lastPostedDate ?? 'never'} · ${pinner.data.postedLast7d} pins in 7d · backlog ${pinner.data.unpostedBacklog}\n` : `- Pinner: unavailable (${errOf(pinner)})\n`;
  md += `\n_Generated by scripts/agents/funnel-scoreboard.ts. Sections fail independently; "unavailable" means the source, not the site._\n`;

  const json = {
    date: today,
    headline: { ownedAdds7d, ownedTargetWeekly: ownedTarget, nonAdRevenueMonthlyGross: nonAdRevenue, nonAdTarget, mediavine28d: mv.ok ? mv.data.revenue28d : null, mediavine28dPrev: mv.ok ? mv.data.revenuePrev28d : null },
    flags, ga4, gsc, mediavine: mv, db, patreon, wordpress: wp, pinner,
  };
  writeFileSync(join(OUT_DIR, `${today}.md`), md);
  writeFileSync(join(OUT_DIR, `${today}.json`), JSON.stringify(json, null, 2));
  console.log(md);
}

main().catch((err) => {
  console.error(`[scoreboard] fatal: ${(err as Error).message}`);
  process.exit(1);
});
