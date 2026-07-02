#!/usr/bin/env -S npx tsx
/**
 * Mediavine daily revenue + ad-health report.
 *
 * Pulls yesterday / 7-day / 30-day headline metrics, ad-health status, and top pages
 * from the Mediavine reporting API, writes a dated Markdown report to
 * reports/mediavine/, and prints it to stdout (so a launchd/cron job can capture it).
 *
 * Also checks the JWT's remaining lifetime and prints a loud warning when it is within
 * 21 days of expiry — your once-a-year cue to refresh the token (see
 * scripts/mcp-mediavine/README.md). There is no autonomous refresh: the token lasts ~1
 * year, so a yearly manual re-copy is the right trade-off.
 *
 * Run manually:   npx tsx scripts/agents/mediavine-daily-report.ts
 * Scheduled via:  ~/Library/LaunchAgents/com.mhmfinds.mediavine-daily-report.plist
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { loadConfig, tokenDaysRemaining } from '../mcp-mediavine/config.js';
import type { MetricsSummary } from '../mcp-mediavine/client.js';

const PROJECT_DIR = '/Users/eputnam/java_projects/MHMFinds';
const TOKEN_WARN_DAYS = 21;

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-US');

/** Compare two summaries and render an arrow + percent delta on session RPM. */
function rpmTrend(curr: number, prev: number): string {
  if (!prev) return '';
  const pct = ((curr - prev) / prev) * 100;
  const arrow = pct > 1 ? '🔺' : pct < -1 ? '🔻' : '▪️';
  return ` ${arrow} ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs prior 7d`;
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  let md = `# Mediavine Daily Report — ${today}\n\n`;

  let cfg;
  try {
    cfg = loadConfig();
  } catch (err) {
    console.error(`[mediavine-daily] ${(err as Error).message}`);
    process.exit(1);
  }
  const { client, siteId, jwt } = cfg;

  // --- Token expiry guard ---------------------------------------------------
  const daysLeft = tokenDaysRemaining(jwt);
  if (daysLeft != null && daysLeft <= TOKEN_WARN_DAYS) {
    md += `> ⚠️ **TOKEN EXPIRES IN ${daysLeft} DAYS.** Refresh MEDIAVINE_JWT soon — see scripts/mcp-mediavine/README.md.\n\n`;
  }

  try {
    const [recentDaily, last7, prev7, last30, health, topPages] = await Promise.all([
      client.earnings(isoDaysAgo(4), isoDaysAgo(1)),
      client.metricsSummary(isoDaysAgo(7), isoDaysAgo(1)),
      client.metricsSummary(isoDaysAgo(14), isoDaysAgo(8)),
      client.metricsSummary(isoDaysAgo(30), isoDaysAgo(1)),
      client.healthCheckStatus() as Promise<{ health_check?: Record<string, unknown> }>,
      client.pages(isoDaysAgo(7), isoDaysAgo(1), { perPage: 5, sort: 'page_revenue', direction: 'desc' }) as Promise<{
        pages?: Array<Record<string, unknown>>;
      }>,
    ]);

    const row = (label: string, s: MetricsSummary, extra = '') =>
      `| ${label} | ${money(s.revenue)} | ${money(s.session_rpm)}${extra} | ${money(s.monetizable_session_rpm)} | ${num(s.sessions)} | ${s.overall_viewability.toFixed(1)}% |`;

    md += `## Headline\n\n`;
    md += `| Window | Revenue | Session RPM | Monetizable RPM | Sessions | Viewability |\n`;
    md += `|---|--:|--:|--:|--:|--:|\n`;

    // Mediavine finalizes ad revenue with a 1–2 day lag, so show the most recent day
    // that actually has revenue rather than a half-empty "yesterday".
    // Require BOTH revenue and sessions finalized — Mediavine posts revenue a day
    // before session counts, so a revenue-only day would show a bogus $0 RPM.
    const latest = [...(recentDaily.earnings ?? [])].reverse().find((r) => Number(r.revenue) > 0 && Number(r.sessions) > 0);
    if (latest) {
      md +=
        `| Latest day (${latest.date}) | ${money(Number(latest.revenue))} | ${money(Number(latest.session_rpm))} | ` +
        `${money(Number(latest.monetizable_session_rpm))} | ${num(Number(latest.sessions))} | ${Number(latest.overall_viewability).toFixed(1)}% |\n`;
    }
    md += row('Last 7 days', last7, rpmTrend(last7.session_rpm, prev7.session_rpm)) + '\n';
    md += row('Last 30 days', last30) + '\n\n';

    // --- Ad health ----------------------------------------------------------
    md += `## Ad Health\n\n`;
    const hc = health.health_check ?? {};
    const healthKeys = Object.keys(hc).filter((k) => !['site_id', 'created_at', 'updated_at'].includes(k));
    if (healthKeys.length) {
      for (const k of healthKeys) {
        const v = hc[k];
        const icon = v === 'ok' ? '🟢' : v === 'warning' ? '🟡' : v === 'date' || k === 'date' ? '📅' : '🔴';
        md += `- ${icon} **${k}**: ${String(v)}\n`;
      }
    } else {
      md += `_No health-check fields returned._\n`;
    }
    md += `\n`;

    // --- Top pages ----------------------------------------------------------
    md += `## Top Pages (by revenue, last 7d)\n\n`;
    const pages = topPages.pages ?? [];
    if (pages.length) {
      md += `| Page | Revenue | Pageviews | Page RPM |\n|---|--:|--:|--:|\n`;
      for (const p of pages.slice(0, 5)) {
        const path = String(p.path ?? '—').slice(0, 60);
        const rev = Number(p.page_revenue ?? 0);
        const pv = Number(p.pageviews ?? 0);
        const rpm = Number(p.rpm ?? (pv ? (rev / pv) * 1000 : 0));
        md += `| ${path} | ${money(rev)} | ${num(pv)} | ${money(rpm)} |\n`;
      }
    } else {
      md += `_No page data returned._\n`;
    }
    md += `\n`;

    if (daysLeft != null) md += `---\n_Token valid ~${daysLeft} more days. Site ${siteId}._\n`;
  } catch (err) {
    const msg = (err as Error).message;
    const isAuth = msg.includes('JWT is expired') || msg.includes('401') || msg.includes('403');
    md += isAuth
      ? `> 🔴 **AUTH FAILED** — the Mediavine token is expired or invalid. Refresh MEDIAVINE_JWT (scripts/mcp-mediavine/README.md).\n\n${msg}\n`
      : `> 🔴 **Report failed:** ${msg}\n`;
    console.error(`[mediavine-daily] ${msg}`);
  }

  // --- Persist + emit -------------------------------------------------------
  const outDir = join(PROJECT_DIR, 'reports', 'mediavine');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, `${today}.md`);
  writeFileSync(outFile, md);
  console.log(md);
  console.error(`[mediavine-daily] wrote ${outFile}`);
}

main();
