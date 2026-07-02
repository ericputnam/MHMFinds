/**
 * Mediavine reporting API client.
 *
 * Thin wrapper around the (undocumented) Mediavine dashboard REST API that powers
 * https://reporting.mediavine.com. Endpoint surface was reverse-engineered from the
 * dashboard SPA's RTK-Query definitions (app.bfdaffc.js) — see README.md for the map.
 *
 * Auth: every request carries `Authorization: Bearer <jwt>`. The JWT is the same token
 * the SPA stores in localStorage["dashboard"].jwt. It EXPIRES, so the server treats a
 * 401 as a recoverable "token needs refreshing" condition rather than a hard crash.
 */

const BASE = 'https://dashboard.mediavine.com';

/** One day of the `earnings` report. Fields mirror the Mediavine response. */
export interface EarningsRow {
  date: string;
  revenue: number;
  pageviews: number;
  monetizable_pageviews: number;
  sessions: number;
  monetizable_sessions: number;
  session_rpm: number;
  monetizable_session_rpm: number;
  page_rpm: number;
  paid_impressions: number;
  overall_viewability: number;
  [k: string]: number | string;
}

export interface MetricsSummary {
  range: { start: string; end: string };
  days: number;
  revenue: number;
  pageviews: number;
  sessions: number;
  monetizable_sessions: number;
  paid_impressions: number;
  /** Blended (revenue / sessions * 1000) over the whole range. */
  session_rpm: number;
  monetizable_session_rpm: number;
  page_rpm: number;
  /** Impression-weighted average viewability across the range. */
  overall_viewability: number;
}

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;

/** Roll daily earnings rows up into a single headline summary with correctly
 *  blended (not naively averaged) RPMs and impression-weighted viewability. */
function aggregateEarnings(rows: EarningsRow[], start: string, end: string): MetricsSummary {
  const sum = (k: keyof EarningsRow) => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const revenue = sum('revenue');
  const pageviews = sum('pageviews');
  const sessions = sum('sessions');
  const monetizable_sessions = sum('monetizable_sessions');
  const paid_impressions = sum('paid_impressions');
  const viewabilityWeighted = rows.reduce((a, r) => a + (Number(r.overall_viewability) || 0) * (Number(r.paid_impressions) || 0), 0);
  return {
    range: { start, end },
    days: rows.length,
    revenue: round(revenue),
    pageviews,
    sessions,
    monetizable_sessions,
    paid_impressions,
    session_rpm: sessions ? round((revenue / sessions) * 1000) : 0,
    monetizable_session_rpm: monetizable_sessions ? round((revenue / monetizable_sessions) * 1000) : 0,
    page_rpm: pageviews ? round((revenue / pageviews) * 1000) : 0,
    overall_viewability: paid_impressions ? round(viewabilityWeighted / paid_impressions) : 0,
  };
}

export class MediavineAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MediavineAuthError';
  }
}

export interface MediavineConfig {
  jwt: string;
  siteId: string;
}

export class MediavineClient {
  constructor(private cfg: MediavineConfig) {}

  /** Low-level GET against the dashboard API. Returns parsed JSON.
   *  Retries transient 5xx outages (Mediavine returns an HTML "try again in a minute"
   *  page on some legacy v1 endpoints) with short linear backoff. Auth (401/403) and
   *  other 4xx fail fast — retrying won't help. */
  private async get(path: string, params?: Record<string, string | undefined>): Promise<unknown> {
    const url = new URL(BASE + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v != null) url.searchParams.set(k, v);
      }
    }

    const MAX_ATTEMPTS = 3;
    let lastBody = '';
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.cfg.jwt}`,
          Accept: 'application/json',
        },
      });

      if (res.status === 401 || res.status === 403) {
        throw new MediavineAuthError(
          `Mediavine API returned ${res.status} — the JWT is expired or invalid. ` +
            `Refresh MEDIAVINE_JWT (see scripts/mcp-mediavine/README.md "Refreshing the token").`,
        );
      }
      if (res.ok) return res.json();

      lastBody = await res.text().catch(() => '');
      // Retry only on transient server errors; 4xx (other than auth) won't self-heal.
      if (res.status >= 500 && attempt < MAX_ATTEMPTS) {
        await new Promise((r) => setTimeout(r, 1500 * attempt));
        continue;
      }
      throw new Error(`Mediavine API ${res.status} for ${path}: ${lastBody.slice(0, 200).replace(/\s+/g, ' ')}`);
    }
    // Exhausted retries on 5xx.
    throw new Error(`Mediavine API still failing after ${MAX_ATTEMPTS} attempts for ${path}: ${lastBody.slice(0, 200).replace(/\s+/g, ' ')}`);
  }

  private site(suffix: string): string {
    return `/api/v2/sites/${this.cfg.siteId}${suffix}`;
  }
  private siteV1(suffix: string): string {
    return `/api/v1/sites/${this.cfg.siteId}${suffix}`;
  }

  // ---- Revenue / earnings -------------------------------------------------

  /** Daily earnings rows for a range: revenue, RPM, sessions, pageviews, impressions,
   *  viewability, etc. This is the richest revenue endpoint and powers the summary +
   *  daily tools below. */
  async earnings(start: string, end: string): Promise<{ earnings: EarningsRow[]; meta?: unknown }> {
    return (await this.get(this.siteV1('/reports/metrics/earnings'), {
      start_date: start,
      end_date: end,
    })) as { earnings: EarningsRow[]; meta?: unknown };
  }

  /** Full daily metrics report. Mediavine deprecated the legacy v1 `/reports/metrics`
   *  rollup (now 503s), so this returns the daily `earnings` rows, which carry the same
   *  per-day revenue/RPM/sessions/pageviews data. */
  async metrics(start: string, end: string): Promise<EarningsRow[]> {
    const { earnings } = await this.earnings(start, end);
    return earnings;
  }

  /** Headline numbers for a date range: total revenue, blended RPMs, sessions,
   *  pageviews, impressions, viewability. Aggregated from the daily `earnings` rows
   *  (the legacy v1 `/reports/metrics/summary` rollup is deprecated / 503s). */
  async metricsSummary(start: string, end: string): Promise<MetricsSummary> {
    const { earnings } = await this.earnings(start, end);
    return aggregateEarnings(earnings, start, end);
  }

  /** Itemized revenue details (v2). */
  revenueDetails(start: string, end: string) {
    return this.get(this.site('/reports/revenue_details'), { start_date: start, end_date: end });
  }

  /** Gross revenue (v1). */
  grossRevenue(start: string, end: string) {
    return this.get(this.siteV1('/reports/gross-revenue'), { start_date: start, end_date: end });
  }

  /** Ad-unit level metrics. */
  adUnits(start: string, end: string) {
    return this.get(this.siteV1('/reports/metrics/adunits'), { start_date: start, end_date: end });
  }

  /** Advertiser breakdown (v2). */
  advertisers(start: string, end: string) {
    return this.get(this.site('/reports/metrics/advertisers'), { start_date: start, end_date: end });
  }

  /** Per-device (desktop/mobile/tablet) breakdown. */
  devices(start: string, end: string) {
    return this.get(this.siteV1('/reports/metrics/devices'), { start_date: start, end_date: end });
  }

  // ---- Traffic / content --------------------------------------------------

  /** Top pages by revenue/sessions. Supports paging + sort. */
  pages(start: string, end: string, opts: { page?: number; perPage?: number; sort?: string; direction?: string } = {}) {
    return this.get(this.siteV1('/reports/pages'), {
      start_date: start,
      end_date: end,
      page: opts.page?.toString(),
      per_page: opts.perPage?.toString(),
      sort: opts.sort,
      direction: opts.direction,
    });
  }

  /** Revenue/sessions by country. */
  countries(start: string, end: string) {
    return this.get(this.siteV1('/reports/countries'), { start_date: start, end_date: end });
  }

  // ---- Ad health (sidebar sticky, viewability, ads.txt, etc.) -------------

  /** Current ad-health status (sidebar sticky health, viewability, ads.txt, etc.). */
  healthCheckStatus() {
    return this.get(this.site('/reports/health_checks/current_status'));
  }

  /** Ad-health history over a date range (v2). */
  healthChecks(start: string, end: string) {
    return this.get(this.site('/reports/health_checks'), { start_date: start, end_date: end });
  }

  // ---- Payments -----------------------------------------------------------

  /** Payment history / pending balance. */
  payments() {
    return this.get(this.siteV1('/reports/payments'));
  }
}
