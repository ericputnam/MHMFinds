/**
 * Page-RPM snapshot — pure library (no network, no fs, no Prisma).
 *
 * Buckets Mediavine `/reports/pages` rows into the page *types* the funnel
 * team ships against (home, collection, mod detail, /go interstitial, /play,
 * blog article) and rolls them up into revenue / pageviews / page RPM per type,
 * so that every ad-adjacent change has a dated "Before" the 09-29-style read
 * can be measured against.
 *
 * Why buckets and not paths: Mediavine's pages report is capped at the top 150
 * paths per query (`meta.total_count` is always 150, page 2 is empty), and
 * /mods/[id] and /go/[modId] are a 16K-path long tail. A single path from that
 * tail is noise; the type-level mean over a week is the signal. Coverage
 * (bucket revenue seen ÷ site revenue) is reported explicitly so nobody reads a
 * partial bucket as the whole page type.
 *
 * The entrypoint (`page-rpm-snapshot.ts`) owns every fetch and every write.
 */

export type PageBucket = 'home' | 'collection' | 'mod' | 'go' | 'play' | 'blog' | 'other';

export const BUCKET_ORDER: PageBucket[] = ['home', 'collection', 'mod', 'go', 'play', 'blog', 'other'];

export const BUCKET_LABEL: Record<PageBucket, string> = {
  home: '/ (homepage grid)',
  collection: '/games/[game]/[topic]/ (collection pages)',
  mod: '/mods/[id]/ (mod detail)',
  go: '/go/[modId]/ (download interstitial)',
  play: '/play/ (daily game)',
  blog: 'blog articles (WordPress, apex-proxied)',
  other: 'other Next.js routes',
};

/**
 * First path segments that are Next.js app routes but not one of the named
 * earning page types. Anything else with a dot-free first segment is a
 * WordPress article proxied at the apex (see `NEXTJS_PREFIXES` in middleware.ts).
 */
const OTHER_APP_PREFIXES = new Set([
  'api', 'admin', 'creators', 'account', 'sign-in', 'submit-mod', 'about',
  'privacy-policy', 'terms', 'top-creators', 'simple-main', 'verify-md',
  '_next', 'sitemap', 'manifest', 'downloads', 'feeds', 'search',
  'forgot-password', 'set-password', 'lookbooks', 'premium',
]);

/** Strip query/hash, guarantee a leading slash, collapse `//`. */
export function normalizePath(raw: string): string {
  let p = (raw ?? '').trim();
  const q = p.search(/[?#]/);
  if (q >= 0) p = p.slice(0, q);
  if (!p.startsWith('/')) p = `/${p}`;
  p = p.replace(/\/{2,}/g, '/');
  return p === '' ? '/' : p;
}

export function bucketFor(rawPath: string): PageBucket {
  const path = normalizePath(rawPath);
  if (path === '/') return 'home';
  const first = path.split('/')[1] ?? '';
  if (first === 'games') return 'collection';
  if (first === 'mods') return 'mod';
  if (first === 'go') return 'go';
  if (first === 'play') return 'play';
  if (first === 'blog') return 'blog';
  if (OTHER_APP_PREFIXES.has(first)) return 'other';
  // Dotted first segment = a file (robots.txt, llms.txt, sitemap-*.xml, the
  // IndexNow key) — never an article.
  if (first.includes('.')) return 'other';
  return 'blog';
}

/** One row of Mediavine `/reports/pages`. Only the fields the rollup uses. */
export interface MvPageRow {
  path: string;
  pageviews: number;
  monetizable_pageviews?: number;
  page_revenue: number;
  impressions?: number;
  viewable_impressions?: number;
  viewed_impressions?: number;
}

export interface DayRows {
  /** YYYY-MM-DD */
  day: string;
  rows: MvPageRow[];
}

export interface BucketTotals {
  bucket: PageBucket;
  /** distinct paths seen across the window */
  paths: number;
  pageviews: number;
  revenue: number;
  impressions: number;
  viewableImpressions: number;
  viewedImpressions: number;
  /** revenue / pageviews × 1000, 2dp; null when no pageviews */
  rpm: number | null;
  /** impressions / pageviews, 2dp; null when no pageviews */
  impressionsPerPageview: number | null;
  /** viewed / viewable, %, 1dp; null when no viewable impressions */
  viewabilityPct: number | null;
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Roll rows up by bucket. Rows are de-duplicated on (day, path) first, so the
 * same day can be fetched under two sort orders (by revenue and by pageviews)
 * to widen coverage of the long tail without double counting.
 */
export function aggregateBuckets(days: DayRows[]): Record<PageBucket, BucketTotals> {
  const seen = new Set<string>();
  const acc = {} as Record<PageBucket, BucketTotals & { pathSet: Set<string> }>;
  for (const b of BUCKET_ORDER) {
    acc[b] = {
      bucket: b, paths: 0, pageviews: 0, revenue: 0, impressions: 0,
      viewableImpressions: 0, viewedImpressions: 0, rpm: null,
      impressionsPerPageview: null, viewabilityPct: null, pathSet: new Set(),
    };
  }
  for (const { day, rows } of days) {
    for (const row of rows) {
      const path = normalizePath(row.path);
      const key = `${day} ${path}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const t = acc[bucketFor(path)];
      t.pathSet.add(path);
      t.pageviews += Number(row.pageviews) || 0;
      t.revenue += Number(row.page_revenue) || 0;
      t.impressions += Number(row.impressions) || 0;
      t.viewableImpressions += Number(row.viewable_impressions) || 0;
      t.viewedImpressions += Number(row.viewed_impressions) || 0;
    }
  }
  const out = {} as Record<PageBucket, BucketTotals>;
  for (const b of BUCKET_ORDER) {
    const { pathSet, ...t } = acc[b];
    t.paths = pathSet.size;
    t.revenue = r2(t.revenue);
    t.rpm = t.pageviews > 0 ? r2((t.revenue / t.pageviews) * 1000) : null;
    t.impressionsPerPageview = t.pageviews > 0 ? r2(t.impressions / t.pageviews) : null;
    t.viewabilityPct = t.viewableImpressions > 0 ? r1((t.viewedImpressions / t.viewableImpressions) * 100) : null;
    out[b] = t;
  }
  return out;
}

/** Share of a site total that the bucket rows account for, %, 1dp; null if no total. */
export function coveragePct(part: number, total: number | null | undefined): number | null {
  if (!total || total <= 0) return null;
  return r1((part / total) * 100);
}

/**
 * One-sided keep floor. Page RPM is a must-not-fall guardrail, so the keep
 * rule is `rpm ≥ floor`, never a ±band — E24's symmetric ±5% flagged a +13.8%
 * gain as a miss (2026-09-15). Default tolerance 3% matches the E55 read.
 */
export function keepFloor(rpm: number | null, tolerancePct = 3): number | null {
  if (rpm == null) return null;
  return r2(rpm * (1 - tolerancePct / 100));
}

export interface TopPath {
  path: string;
  bucket: PageBucket;
  pageviews: number;
  revenue: number;
  rpm: number | null;
}

/** Top-N paths by revenue from a single range pull (already sorted or not). */
export function topPaths(rows: MvPageRow[], n = 10): TopPath[] {
  return [...rows]
    .map((row) => {
      const path = normalizePath(row.path);
      const pageviews = Number(row.pageviews) || 0;
      const revenue = r2(Number(row.page_revenue) || 0);
      return { path, bucket: bucketFor(path), pageviews, revenue, rpm: pageviews > 0 ? r2((revenue / pageviews) * 1000) : null };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, n);
}

export interface SiteTotals {
  revenue: number;
  pageviews: number;
  sessions: number;
  /** revenue / pageviews × 1000 */
  pageRpm: number | null;
  /** revenue / sessions × 1000 */
  sessionRpm: number | null;
}

export function siteTotalsFromEarnings(rows: Array<{ revenue?: number | string; pageviews?: number | string; sessions?: number | string }>): SiteTotals {
  const sum = (k: 'revenue' | 'pageviews' | 'sessions') => rows.reduce((a, r) => a + (Number(r[k]) || 0), 0);
  const revenue = r2(sum('revenue'));
  const pageviews = sum('pageviews');
  const sessions = sum('sessions');
  return {
    revenue,
    pageviews,
    sessions,
    pageRpm: pageviews > 0 ? r2((revenue / pageviews) * 1000) : null,
    sessionRpm: sessions > 0 ? r2((revenue / sessions) * 1000) : null,
  };
}

export interface SnapshotReport {
  start: string;
  end: string;
  generatedAt: string;
  site: SiteTotals | null;
  siteError?: string;
  buckets: Record<PageBucket, BucketTotals>;
  /** GA4 screenPageViews per bucket over the same window; absent when GA4 was unavailable */
  ga4Pageviews?: Partial<Record<PageBucket, number>> & { total?: number };
  ga4Error?: string;
  top: TopPath[];
  /** how many per-day pulls succeeded out of how many attempted */
  pulls: { attempted: number; ok: number };
  tolerancePct: number;
}

/**
 * Site totals minus every path seen in any pull: the long tail the top-150
 * report cannot show. Its blended RPM is the only obtainable Before for
 * `/mods/[id]/` and `/go/[modId]/`, which dominate it by pageviews.
 */
export function unseenRemainder(rep: Pick<SnapshotReport, 'site' | 'buckets'>): { pageviews: number; revenue: number; rpm: number | null } | null {
  if (!rep.site) return null;
  const seenRev = BUCKET_ORDER.reduce((a, b) => a + rep.buckets[b].revenue, 0);
  const seenPv = BUCKET_ORDER.reduce((a, b) => a + rep.buckets[b].pageviews, 0);
  const pageviews = Math.max(0, rep.site.pageviews - seenPv);
  const revenue = r2(Math.max(0, rep.site.revenue - seenRev));
  return { pageviews, revenue, rpm: pageviews > 0 ? r2((revenue / pageviews) * 1000) : null };
}

const money = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n: number) => n.toLocaleString('en-US');
const fmtRpm = (n: number | null) => (n == null ? '—' : `$${n.toFixed(2)}`);
const pct = (n: number | null) => (n == null ? '—' : `${n.toFixed(1)}%`);

export function renderMd(rep: SnapshotReport): string {
  const L: string[] = [];
  L.push(`# Page-RPM baseline — ${rep.start} → ${rep.end}`);
  L.push('');
  L.push(`_Generated ${rep.generatedAt} by \`scripts/agents/page-rpm-snapshot.ts\`. Source: Mediavine \`/reports/pages\` (top-150 paths per query, pulled per day under two sort orders and de-duplicated on day+path) and \`/reports/metrics/earnings\` for site totals. This is the **Before** for any ad-adjacent change on these page types (E55 grid-card decision, /play ad density, /go countdown). Keep rules are one-sided floors: a page type is unharmed if its post-change RPM is ≥ floor._`);
  L.push('');
  if (rep.site) {
    L.push(`**Site (Mediavine, ${rep.start}→${rep.end}):** revenue **${money(rep.site.revenue)}** · pageviews ${num(rep.site.pageviews)} · sessions ${num(rep.site.sessions)} · page RPM **${fmtRpm(rep.site.pageRpm)}** · session RPM ${fmtRpm(rep.site.sessionRpm)}`);
  } else {
    L.push(`**Site totals:** _unavailable — ${rep.siteError ?? 'earnings endpoint failed'}_`);
  }
  L.push(`Per-day page pulls: ${rep.pulls.ok}/${rep.pulls.attempted} ok.`);
  L.push('');
  L.push('## By page type');
  L.push('');
  const hasGa4 = !!rep.ga4Pageviews;
  L.push(`| Page type | Paths seen | MV pageviews | Revenue | Page RPM | Imp/pv | Viewability | Rev. coverage | ${hasGa4 ? 'GA4 pageviews | PV coverage | ' : ''}Keep floor (−${rep.tolerancePct}%) |`);
  L.push(`|---|--:|--:|--:|--:|--:|--:|--:|${hasGa4 ? '--:|--:|' : ''}--:|`);
  for (const b of BUCKET_ORDER) {
    const t = rep.buckets[b];
    if (t.paths === 0 && !(hasGa4 && rep.ga4Pageviews?.[b])) continue;
    const cov = coveragePct(t.revenue, rep.site?.revenue);
    const ga = hasGa4 ? rep.ga4Pageviews?.[b] : undefined;
    const pvCov = hasGa4 ? coveragePct(t.pageviews, ga) : null;
    L.push(
      `| ${BUCKET_LABEL[b]} | ${num(t.paths)} | ${num(t.pageviews)} | ${money(t.revenue)} | **${fmtRpm(t.rpm)}** | ${t.impressionsPerPageview ?? '—'} | ${pct(t.viewabilityPct)} | ${pct(cov)} | ` +
        (hasGa4 ? `${ga == null ? '—' : num(ga)} | ${pct(pvCov)} | ` : '') +
        `${fmtRpm(keepFloor(t.rpm, rep.tolerancePct))} |`,
    );
  }
  const seenRev = r2(BUCKET_ORDER.reduce((a, b) => a + rep.buckets[b].revenue, 0));
  const seenPv = BUCKET_ORDER.reduce((a, b) => a + rep.buckets[b].pageviews, 0);
  const rem = unseenRemainder(rep);
  if (rem) {
    L.push(`| **Unseen remainder** (site − every path seen; the long tail below the daily top-150 cut, i.e. \`/mods/[id]/\`, \`/go/[modId]/\` and small blog posts) | — | ${num(rem.pageviews)} | ${money(rem.revenue)} | **${fmtRpm(rem.rpm)}** | — | — | ${pct(coveragePct(rem.revenue, rep.site!.revenue))} | ${hasGa4 ? '— | — | ' : ''}${fmtRpm(keepFloor(rem.rpm, rep.tolerancePct))} |`);
  }
  L.push('');
  L.push(`- Revenue seen across all buckets: ${money(seenRev)} on ${num(seenPv)} pageviews${rep.site ? ` = ${pct(coveragePct(seenRev, rep.site.revenue))} of site revenue` : ''}.`);
  L.push('- **Read a bucket\'s RPM only where coverage is high.** A low-coverage bucket is biased toward its best-earning paths (the report is sorted by revenue), so its RPM is an upper bound, not a mean.');
  if (rem) {
    const modGo = (rep.ga4Pageviews?.mod ?? 0) + (rep.ga4Pageviews?.go ?? 0);
    const share = hasGa4 && rem.pageviews > 0 ? coveragePct(modGo, rem.pageviews) : null;
    const bound = (b: PageBucket) => {
      const pv = rep.ga4Pageviews?.[b];
      return pv != null && rep.site?.pageRpm != null ? `${money(r2((pv * rep.site.pageRpm) / 1000))}` : '—';
    };
    L.push(
      `- **\`/mods/[id]/\` and \`/go/[modId]/\` cannot be read from \`/reports/pages\` at all** — no single mod or interstitial path earns enough in a day to enter the top 150. ` +
        `Their Before is (a) the unseen-remainder row above${share != null ? ` — of which they are only ${pct(share)} of pageviews; the rest is the blog long tail` : ''} — and (b) an upper bound of GA4 pv × site page RPM: /mods/ ≤ ${bound('mod')}, /go/ ≤ ${bound('go')} for the window. ` +
        `A change on those pages is read against the remainder RPM floor **and** the site page RPM floor (${fmtRpm(keepFloor(rep.site!.pageRpm, rep.tolerancePct))}), one-sided, never against a per-path number.`,
    );
  }
  if (hasGa4 && rep.ga4Pageviews?.total && rep.site) {
    const same = Math.abs(rep.ga4Pageviews.total - rep.site.pageviews) / rep.site.pageviews < 0.005;
    L.push(`- GA4 \`screenPageViews\` total for the window: ${num(rep.ga4Pageviews.total)} vs Mediavine pageviews ${num(rep.site.pageviews)} — ${same ? 'identical: Mediavine sources pageviews from the GA4 connection, so PV coverage is an absolute share, not an estimate' : `differ by ${pct(r1(((rep.ga4Pageviews.total - rep.site.pageviews) / rep.site.pageviews) * 100))}; treat PV coverage as approximate`}.`);
  }
  if (rep.ga4Error) L.push(`- GA4 denominators: _unavailable — ${rep.ga4Error}_`);
  L.push('');
  L.push('## Top paths by revenue (whole window, single pull)');
  L.push('');
  L.push('| # | Path | Type | Pageviews | Revenue | Page RPM |');
  L.push('|--:|---|---|--:|--:|--:|');
  rep.top.forEach((t, i) => L.push(`| ${i + 1} | \`${t.path}\` | ${t.bucket} | ${num(t.pageviews)} | ${money(t.revenue)} | ${fmtRpm(t.rpm)} |`));
  L.push('');
  L.push('## How to re-read');
  L.push('');
  L.push('```');
  L.push(`npx tsx scripts/agents/page-rpm-snapshot.ts --start <YYYY-MM-DD> --end <YYYY-MM-DD> --out reports/funnel/page-rpm-<label>.md`);
  L.push('```');
  L.push(`Same window length, same weekday mix, Mediavine-finalized days only (end ≤ 2 days ago).`);
  L.push('');
  L.push(
    `**On the read date, re-pull the baseline window in the same session** (run the command twice, once per window) and compare the two fresh files — ` +
      `do not compare a fresh read against the figures in this file. Mediavine's per-path attribution in \`/reports/pages\` keeps settling after a day's site totals are final: ` +
      `on 2026-09-16 two pulls of 2026-09-08→2026-09-14 an hour apart returned identical site totals but moved homepage pageviews 4,364 → 4,658 (+6.7%) and homepage RPM $10.58 → $10.12, ` +
      `i.e. more than the ${rep.tolerancePct}% keep tolerance. The keep floors above are only meaningful against a baseline re-pulled at the same maturity.`,
  );
  return L.join('\n') + '\n';
}
