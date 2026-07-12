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

// --- Q3 Recovery Watch (seasonal CPM dip, Jun 29 2026) -----------------------
// Session RPM fell ~$25 → $17 across Jun 29-30 2026 on a pure CPM drop (Q2→Q3
// ad-budget reset; same -20% event occurred Jul 2025). Root cause + plan:
// reports/rpm-dip-mitigation-2026-07-02.md. This section tracks the recovery and
// self-retires after RECOVERY_WATCH_END.
const RECOVERY_WATCH_END = '2026-08-15';
const RECOVERY_CPM_TARGET = 0.95; // blended CPM ($/1000 paid impressions)
const RECOVERY_ESCALATE_AFTER = '2026-07-21'; // 3 wks past the 2025 recovery point
const WATCHED_DSPS = ['The Trade Desk', 'Kargo', 'GumGum']; // sharpest late-June pullback

interface AdvertiserRow {
  partner: string;
  revenue: number;
  cpm: number;
}

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
    // Mediavine posts revenue a day before session counts. A trailing day with
    // revenue but 0 sessions inside a rolling window understates the session
    // denominator and inflates session RPM and its WoW delta (2026-07-12: a
    // phantom "+14.2% vs prior 7d" because Jul 11 sessions hadn't posted yet).
    // Anchor every rolling window at the most recent FULLY finalized day.
    const recentDaily = await client.earnings(isoDaysAgo(7), isoDaysAgo(1));
    const latest = [...(recentDaily.earnings ?? [])]
      .reverse()
      .find((r) => Number(r.revenue) > 0 && Number(r.sessions) > 0);
    // Mediavine returns dates as "2026/07/10" — normalize to ISO for comparison.
    const latestDate = latest ? String(latest.date).slice(0, 10).replace(/\//g, '-') : null;
    const end = latestDate ? ([1, 2, 3, 4, 5, 6, 7].find((n) => isoDaysAgo(n) === latestDate) ?? 1) : 1;

    const [last7, prev7, last30, health, topPages] = await Promise.all([
      client.metricsSummary(isoDaysAgo(end + 6), isoDaysAgo(end)),
      client.metricsSummary(isoDaysAgo(end + 13), isoDaysAgo(end + 7)),
      client.metricsSummary(isoDaysAgo(end + 29), isoDaysAgo(end)),
      client.healthCheckStatus() as Promise<{ health_check?: Record<string, unknown> }>,
      client.pages(isoDaysAgo(end + 6), isoDaysAgo(end), { perPage: 5, sort: 'page_revenue', direction: 'desc' }) as Promise<{
        pages?: Array<Record<string, unknown>>;
      }>,
    ]);

    const row = (label: string, s: MetricsSummary, extra = '') =>
      `| ${label} | ${money(s.revenue)} | ${money(s.session_rpm)}${extra} | ${money(s.monetizable_session_rpm)} | ${num(s.sessions)} | ${s.overall_viewability.toFixed(1)}% |`;

    md += `## Headline\n\n`;
    md += `| Window | Revenue | Session RPM | Monetizable RPM | Sessions | Viewability |\n`;
    md += `|---|--:|--:|--:|--:|--:|\n`;

    if (latest) {
      md +=
        `| Latest finalized day (${latestDate}) | ${money(Number(latest.revenue))} | ${money(Number(latest.session_rpm))} | ` +
        `${money(Number(latest.monetizable_session_rpm))} | ${num(Number(latest.sessions))} | ${Number(latest.overall_viewability).toFixed(1)}% |\n`;
    }
    const windowNote = end > 1 ? ` (to ${latestDate})` : '';
    md += row(`Last 7 days${windowNote}`, last7, rpmTrend(last7.session_rpm, prev7.session_rpm)) + '\n';
    md += row(`Last 30 days${windowNote}`, last30) + '\n\n';

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

    // --- Q3 Recovery Watch --------------------------------------------------
    if (today <= RECOVERY_WATCH_END) {
      md += `## Q3 Recovery Watch (seasonal CPM dip — see reports/rpm-dip-mitigation-2026-07-02.md)\n\n`;
      try {
        const [advCurr, advPrev] = await Promise.all([
          client.advertisers(isoDaysAgo(end + 6), isoDaysAgo(end)) as Promise<{ advertisers?: AdvertiserRow[] }>,
          client.advertisers(isoDaysAgo(end + 13), isoDaysAgo(end + 7)) as Promise<{ advertisers?: AdvertiserRow[] }>,
        ]);

        const latestCpm =
          latest && Number(latest.paid_impressions) > 0
            ? (Number(latest.revenue) / Number(latest.paid_impressions)) * 1000
            : null;
        if (latestCpm != null) {
          const recovered = latestCpm >= RECOVERY_CPM_TARGET;
          const icon = recovered ? '🟢' : today > RECOVERY_ESCALATE_AFTER ? '🔴' : '🟡';
          md += `- ${icon} **Blended CPM (latest day)**: $${latestCpm.toFixed(2)} — target $${RECOVERY_CPM_TARGET.toFixed(2)} `;
          md += recovered ? `(recovered)\n` : `(recovering; dip began 2026-06-29)\n`;
          if (!recovered && today > RECOVERY_ESCALATE_AFTER) {
            md += `- 🔴 **ESCALATE**: CPM has not recovered by ${RECOVERY_ESCALATE_AFTER} (3 weeks past the 2025 recovery point). A second, non-seasonal factor may be in play — run a full ad-stack/code audit.\n`;
          }
        }

        const currRows = advCurr.advertisers ?? [];
        const prevRows = advPrev.advertisers ?? [];
        md += `- **DSP re-acceleration** (leading indicator of Q3 budgets flowing; revenue last 7d vs prior 7d):\n`;
        for (const name of WATCHED_DSPS) {
          const c = currRows.find((r) => r.partner === name);
          const p = prevRows.find((r) => r.partner === name);
          if (!c && !p) {
            md += `  - ${name}: no data\n`;
            continue;
          }
          const cr = c?.revenue ?? 0;
          const pr = p?.revenue ?? 0;
          const pct = pr ? ((cr - pr) / pr) * 100 : null;
          const arrow = pct == null ? '▪️' : pct > 5 ? '🔺' : pct < -5 ? '🔻' : '▪️';
          md += `  - ${name}: ${money(cr)} vs ${money(pr)} ${arrow}${pct != null ? ` ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% WoW` : ''} (CPM $${(c?.cpm ?? 0).toFixed(2)})\n`;
        }
      } catch (err) {
        md += `- ⚪ Recovery-watch data unavailable: ${(err as Error).message}\n`;
      }
      md += `\n`;
    }

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
