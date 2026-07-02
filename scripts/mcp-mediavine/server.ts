#!/usr/bin/env -S npx tsx
/**
 * Mediavine Reporting MCP server (stdio).
 *
 * Exposes the MustHaveMods Mediavine ad-revenue dashboard to Claude/agents as MCP
 * tools, so mhm-ad-revenue / mhm-finance can pull RPM, revenue, sessions and ad-health
 * alongside the GA4 + GSC data they already use.
 *
 * Config (env vars):
 *   MEDIAVINE_JWT      (required)  Bearer token from localStorage["dashboard"].jwt
 *   MEDIAVINE_SITE_ID  (optional)  defaults to 14318 (MustHaveMods)
 *
 * The server loads scripts/mcp-mediavine/.env.local (gitignored) if present, so the
 * JWT never has to live in your shell profile.
 *
 * Run standalone for a smoke test:  npx tsx scripts/mcp-mediavine/server.ts --selftest
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { MediavineAuthError, type MediavineClient } from './client.js';
import { loadConfig } from './config.js';

// --- Config loading ---------------------------------------------------------

let client: MediavineClient;
let SITE_ID: string;
try {
  const cfg = loadConfig();
  client = cfg.client;
  SITE_ID = cfg.siteId;
} catch (err) {
  console.error(`[mediavine-mcp] ${(err as Error).message}`);
  process.exit(1);
}

// --- Date helpers -----------------------------------------------------------

/** YYYY-MM-DD for a Date in UTC. */
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Resolve a friendly range keyword (or explicit dates) to {start, end}. */
function resolveRange(range?: string, start?: string, end?: string): { start: string; end: string } {
  if (start && end) return { start, end };
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const daysAgo = (n: number) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - n);
    return d;
  };
  switch (range) {
    case 'today':
      return { start: iso(today), end: iso(today) };
    case 'yesterday':
      return { start: iso(daysAgo(1)), end: iso(daysAgo(1)) };
    case 'last_7_days':
      return { start: iso(daysAgo(6)), end: iso(today) };
    case 'last_30_days':
      return { start: iso(daysAgo(29)), end: iso(today) };
    case 'month_to_date': {
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { start: iso(first), end: iso(today) };
    }
    default:
      // sensible default: trailing 7 days
      return { start: iso(daysAgo(6)), end: iso(today) };
  }
}

const RANGE_ENUM = z
  .enum(['today', 'yesterday', 'last_7_days', 'last_30_days', 'month_to_date'])
  .optional()
  .describe('Friendly preset range. Ignored if start_date+end_date are provided.');
const START = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Explicit start date YYYY-MM-DD');
const END = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Explicit end date YYYY-MM-DD');

// --- Server -----------------------------------------------------------------

const server = new McpServer({ name: 'mediavine-reporting', version: '0.1.0' });

/** Wrap a client call: resolve dates, call, return JSON text content, surface auth errors cleanly. */
async function run(fn: (start: string, end: string) => Promise<unknown>, range?: string, start?: string, end?: string) {
  const r = resolveRange(range, start, end);
  try {
    const data = await fn(r.start, r.end);
    return {
      content: [{ type: 'text' as const, text: JSON.stringify({ site_id: SITE_ID, range: r, data }, null, 2) }],
    };
  } catch (err) {
    const isAuth = err instanceof MediavineAuthError;
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: isAuth
            ? `AUTH_EXPIRED: ${(err as Error).message}`
            : `ERROR: ${(err as Error).message}`,
        },
      ],
    };
  }
}

const dateShape = { range: RANGE_ENUM, start_date: START, end_date: END };

server.tool(
  'mv_metrics_summary',
  'Headline Mediavine numbers for a range: total revenue, session RPM, sessions, impressions. Best first call for "how are we doing?".',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.metricsSummary(s, e), range, start_date, end_date),
);

server.tool(
  'mv_earnings',
  'Earnings broken out (typically per day) for a range. Use for revenue trend / daily totals.',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.earnings(s, e), range, start_date, end_date),
);

server.tool(
  'mv_metrics_daily',
  'Full daily metrics report (revenue, RPM, sessions, pageviews, impressions per day).',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.metrics(s, e), range, start_date, end_date),
);

server.tool(
  'mv_revenue_details',
  'Itemized revenue details (v2) for a range.',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.revenueDetails(s, e), range, start_date, end_date),
);

server.tool(
  'mv_devices',
  'Revenue / RPM / sessions split by device (desktop, mobile, tablet).',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.devices(s, e), range, start_date, end_date),
);

server.tool(
  'mv_ad_units',
  'Per-ad-unit metrics (impressions, RPM, revenue) for a range.',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.adUnits(s, e), range, start_date, end_date),
);

server.tool(
  'mv_advertisers',
  'Advertiser-level breakdown (v2) for a range.',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.advertisers(s, e), range, start_date, end_date),
);

server.tool(
  'mv_countries',
  'Revenue and sessions by country for a range.',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.countries(s, e), range, start_date, end_date),
);

server.tool(
  'mv_top_pages',
  'Top pages by revenue/sessions for a range. Supports paging and sort.',
  {
    ...dateShape,
    page: z.number().int().positive().optional(),
    per_page: z.number().int().positive().max(100).optional(),
    sort: z.string().optional().describe('Sort column, e.g. "revenue", "sessions"'),
    direction: z.enum(['asc', 'desc']).optional(),
  },
  ({ range, start_date, end_date, page, per_page, sort, direction }) => {
    const r = resolveRange(range, start_date, end_date);
    return run(() => client.pages(r.start, r.end, { page, perPage: per_page, sort, direction }), range, start_date, end_date);
  },
);

server.tool(
  'mv_health_status',
  'Current ad-health status: sidebar sticky health score, viewability, ads.txt, privacy policy. No date range — returns latest. Use to monitor the Mediavine sidebar sticky health work tracked in CLAUDE.md.',
  {},
  async () => {
    try {
      const data = await client.healthCheckStatus();
      return { content: [{ type: 'text' as const, text: JSON.stringify({ site_id: SITE_ID, data }, null, 2) }] };
    } catch (err) {
      const isAuth = err instanceof MediavineAuthError;
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `${isAuth ? 'AUTH_EXPIRED' : 'ERROR'}: ${(err as Error).message}` }],
      };
    }
  },
);

server.tool(
  'mv_health_history',
  'Ad-health history (sidebar sticky health etc.) over a date range.',
  dateShape,
  ({ range, start_date, end_date }) => run((s, e) => client.healthChecks(s, e), range, start_date, end_date),
);

server.tool(
  'mv_payments',
  'Payment history and pending balance. No date range.',
  {},
  async () => {
    try {
      const data = await client.payments();
      return { content: [{ type: 'text' as const, text: JSON.stringify({ site_id: SITE_ID, data }, null, 2) }] };
    } catch (err) {
      const isAuth = err instanceof MediavineAuthError;
      return {
        isError: true,
        content: [{ type: 'text' as const, text: `${isAuth ? 'AUTH_EXPIRED' : 'ERROR'}: ${(err as Error).message}` }],
      };
    }
  },
);

// --- Entrypoint -------------------------------------------------------------

async function selftest() {
  console.error('[mediavine-mcp] self-test: fetching metrics summary (last_7_days)…');
  const r = resolveRange('last_7_days');
  try {
    const data = await client.metricsSummary(r.start, r.end);
    console.error('[mediavine-mcp] OK — sample response:');
    console.error(JSON.stringify(data, null, 2).slice(0, 1200));
    process.exit(0);
  } catch (err) {
    console.error('[mediavine-mcp] FAILED:', (err as Error).message);
    process.exit(1);
  }
}

if (process.argv.includes('--selftest')) {
  selftest();
} else {
  const transport = new StdioServerTransport();
  server.connect(transport).then(() => {
    console.error(`[mediavine-mcp] ready — site ${SITE_ID}, 12 tools registered.`);
  });
}
