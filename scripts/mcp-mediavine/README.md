# Mediavine Reporting MCP Server

A stdio [MCP](https://modelcontextprotocol.io) server that exposes the MustHaveMods
Mediavine ad-revenue dashboard (https://reporting.mediavine.com/sites/14318/) to
Claude/agents. It lets `mhm-ad-revenue` and `mhm-finance` pull RPM, revenue, sessions,
and ad-health metrics alongside the GA4 + GSC data they already use.

> **There is no official Mediavine API.** This wraps the private REST API that the
> dashboard SPA itself calls. Endpoints were reverse-engineered from the SPA's RTK-Query
> definitions. They can change without notice — if a tool starts 404ing, re-capture the
> endpoint map (see "Re-discovering endpoints").

## Setup

1. Install deps (already done if you ran `npm install` at the repo root):
   ```bash
   npm install --save-dev @modelcontextprotocol/sdk
   ```
2. Provide the token:
   ```bash
   cp scripts/mcp-mediavine/.env.example scripts/mcp-mediavine/.env.local
   # edit .env.local and paste your MEDIAVINE_JWT
   ```
3. Smoke-test it:
   ```bash
   npx tsx scripts/mcp-mediavine/server.ts --selftest
   ```
   You should see a JSON metrics-summary sample. `AUTH_EXPIRED` means the token is stale.

The server is registered in the repo-root `.mcp.json`, so Claude Code picks it up
automatically once `.env.local` exists.

## Tools

| Tool | What it returns | Date range? |
|------|-----------------|-------------|
| `mv_metrics_summary` | Headline: revenue, blended RPMs, sessions, impressions, viewability (aggregated from `earnings`) | yes |
| `mv_earnings` | Earnings broken out per day (raw response) | yes |
| `mv_metrics_daily` | Daily rows array (revenue, RPM, sessions, pageviews) | yes |
| `mv_revenue_details` | Itemized revenue details (v2) | yes |
| `mv_devices` | Split by desktop / mobile / tablet | yes |
| `mv_ad_units` | Per-ad-unit impressions / RPM / revenue | yes |
| `mv_advertisers` | Advertiser breakdown (v2) | yes |
| `mv_countries` | Revenue / sessions by country | yes |
| `mv_top_pages` | Top pages by revenue/sessions (paged, sortable) | yes |
| `mv_health_status` | **Current** sidebar sticky health, viewability, ads.txt | no |
| `mv_health_history` | Ad-health history over a range | yes |
| `mv_payments` | Payment history / pending balance | no |

Date ranges accept either a preset `range` (`today`, `yesterday`, `last_7_days`,
`last_30_days`, `month_to_date`) or explicit `start_date` + `end_date` (YYYY-MM-DD).
Default is the trailing 7 days.

## Auth & the token-refresh problem

Auth is a **JWT Bearer token** (`Authorization: Bearer <jwt>`), the same one the SPA
keeps in `localStorage["dashboard"].jwt`. Cookie-only access returns `401`.

**The token lasts ~1 year.** Decoding the JWT shows a total lifetime of 8766 hours
(365 days). So "refreshing" is a once-a-year, 10-second manual step — not a daily chore.

**There is no silent-refresh endpoint.** The only auth route in the SPA bundle is
`POST /api/v1/users/sign_in` (email/password), and the account has `twilio_verify` (SMS
2FA) endpoints, which would gate any headless login. The `jwt_secret` stored alongside the
`jwt` is part of the session payload, not an exchange token. **Conclusion: autonomous
refresh isn't worth building** — you'd store a password and automate a 2FA-gated login to
save one paste per year, for worse security.

**How refresh actually works:** the daily report
(`scripts/agents/mediavine-daily-report.ts`) decodes the token's expiry and prints a loud
warning starting 21 days out. When you see `AUTH_EXPIRED` (or that warning), grab a fresh
`jwt`:

1. In the dashboard tab's DevTools console: `copy(JSON.parse(localStorage.dashboard).jwt)`
2. In the terminal:
   ```bash
   { echo "MEDIAVINE_JWT=$(pbpaste)"; echo "MEDIAVINE_SITE_ID=14318"; } > scripts/mcp-mediavine/.env.local
   ```

## Daily report

`scripts/agents/mediavine-daily-report.ts` pulls the latest finalized day + 7-day + 30-day
headline (revenue, blended RPMs, sessions, viewability), ad-health status, and top pages,
then writes a dated Markdown file to `reports/mediavine/` and prints it. It's scheduled by
`~/Library/LaunchAgents/com.mhmfinds.mediavine-daily-report.plist` (8:07 AM daily; plist
copy lives in `scripts/agents/`). Run it manually any time:

```bash
npx tsx scripts/agents/mediavine-daily-report.ts
# or exactly as launchd runs it:
./scripts/agents/run-mediavine-daily-report.sh
```

Note: Mediavine finalizes revenue ~1–2 days late (and posts revenue a day before session
counts), so the report's "Latest day" is the most recent *fully finalized* day, not
literally yesterday. The 7-/30-day windows are always reliable.

## Re-discovering endpoints

The endpoint map came from the dashboard bundle. To refresh it after a Mediavine
redeploy, fetch `https://reporting.mediavine.com/static/js/app.<hash>.js` while logged in
and grep for `reports/` and `` url:`/api/ `` query definitions. Current confirmed surface:

```
GET /api/v1/sites/{id}/reports/metrics            ?start_date&end_date   # DEPRECATED — 503s
GET /api/v1/sites/{id}/reports/metrics/summary    ?start_date&end_date   # DEPRECATED — 503s
GET /api/v1/sites/{id}/reports/metrics/earnings   ?start_date&end_date   # ← daily rows; powers summary+daily
GET /api/v1/sites/{id}/reports/metrics/devices    ?start_date&end_date
GET /api/v1/sites/{id}/reports/metrics/adunits    ?start_date&end_date
GET /api/v1/sites/{id}/reports/metrics/credits    ?start_date&end_date
GET /api/v1/sites/{id}/reports/metrics/partners   ?start_date&end_date
GET /api/v1/sites/{id}/reports/gross-revenue      ?start_date&end_date
GET /api/v1/sites/{id}/reports/countries          ?start_date&end_date
GET /api/v1/sites/{id}/reports/pages              ?start_date&end_date&page&per_page&sort&direction
GET /api/v1/sites/{id}/reports/videos             ?start_date&end_date&...
GET /api/v1/sites/{id}/reports/source_reports     ?start_date&end_date
GET /api/v1/sites/{id}/reports/payments
GET /api/v2/sites/{id}/reports/revenue_details    ?start_date&end_date
GET /api/v2/sites/{id}/reports/metrics/advertisers ?start_date&end_date
GET /api/v2/sites/{id}/reports/health_checks      ?start_date&end_date
GET /api/v2/sites/{id}/reports/health_checks/current_status
```

## Security

The JWT grants full access to the Mediavine account. It lives only in `.env.local`,
which is gitignored (folder `.gitignore` + repo-root rules). Never commit it, never paste
it into a tool result, and rotate (re-login) if it leaks.
