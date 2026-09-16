import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  aggregateBuckets,
  bucketFor,
  coveragePct,
  keepFloor,
  normalizePath,
  renderMd,
  siteTotalsFromEarnings,
  topPaths,
  unseenRemainder,
  type SnapshotReport,
} from '../../scripts/agents/page-rpm-lib';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('bucketFor', () => {
  it('maps each earning page type', () => {
    expect(bucketFor('/')).toBe('home');
    expect(bucketFor('/games/sims-4/hair-cc/')).toBe('collection');
    expect(bucketFor('/mods/cmsmczfbc0115oxeu8gxj9o8h/')).toBe('mod');
    expect(bucketFor('/go/cmsmczfbc0115oxeu8gxj9o8h/')).toBe('go');
    expect(bucketFor('/play/')).toBe('play');
    expect(bucketFor('/play')).toBe('play');
  });
  it('treats an unlisted dot-free slug as a WordPress article, mirroring the middleware catch-all', () => {
    expect(bucketFor('/new-sims-4-mods-2026/')).toBe('blog');
    expect(bucketFor('/black-sims-4-cc/')).toBe('blog');
    expect(bucketFor('/blog/page/2/')).toBe('blog');
  });
  it('sends other app routes and dotted files to other', () => {
    expect(bucketFor('/account/')).toBe('other');
    expect(bucketFor('/top-creators/')).toBe('other');
    expect(bucketFor('/llms.txt')).toBe('other');
    expect(bucketFor('/sitemap-nextjs.xml')).toBe('other');
    expect(bucketFor('/feeds/mods.json')).toBe('other');
  });
  it('ignores query strings and hashes, and tolerates a missing leading slash', () => {
    expect(bucketFor('/?search=hair')).toBe('home');
    expect(bucketFor('/mods/abc/?ref=pin#top')).toBe('mod');
    expect(normalizePath('games/sims-4/shoes-cc/')).toBe('/games/sims-4/shoes-cc/');
    expect(normalizePath('')).toBe('/');
  });
});

describe('aggregateBuckets', () => {
  const rowA = { path: '/', pageviews: 100, page_revenue: 1.0, impressions: 1000, viewable_impressions: 800, viewed_impressions: 400 };
  const rowB = { path: '/mods/x/', pageviews: 50, page_revenue: 1.0, impressions: 500, viewable_impressions: 400, viewed_impressions: 100 };
  const rowC = { path: '/mods/y/', pageviews: 50, page_revenue: 0.5 };

  it('de-duplicates the same day+path across two sort orders and sums the rest', () => {
    const out = aggregateBuckets([
      { day: '2026-09-08', rows: [rowA, rowB] }, // sorted by revenue
      { day: '2026-09-08', rows: [rowB, rowC] }, // sorted by pageviews — rowB repeats
    ]);
    expect(out.home.pageviews).toBe(100);
    expect(out.home.revenue).toBe(1);
    expect(out.home.rpm).toBe(10);
    expect(out.mod.paths).toBe(2);
    expect(out.mod.pageviews).toBe(100);
    expect(out.mod.revenue).toBe(1.5);
    expect(out.mod.rpm).toBe(15);
  });
  it('counts the same path on two different days twice for pageviews but once for paths', () => {
    const out = aggregateBuckets([
      { day: '2026-09-08', rows: [rowA] },
      { day: '2026-09-09', rows: [rowA] },
    ]);
    expect(out.home.pageviews).toBe(200);
    expect(out.home.paths).toBe(1);
  });
  it('derives imp/pv and viewability from the raw counts, null when the denominator is zero', () => {
    const out = aggregateBuckets([{ day: '2026-09-08', rows: [rowA] }]);
    expect(out.home.impressionsPerPageview).toBe(10);
    expect(out.home.viewabilityPct).toBe(50);
    expect(out.go.rpm).toBeNull();
    expect(out.go.viewabilityPct).toBeNull();
    expect(out.go.paths).toBe(0);
  });
});

describe('keep floors and coverage', () => {
  it('keep floor is one-sided: a floor below the baseline, never a band', () => {
    expect(keepFloor(10.58)).toBe(10.26);
    expect(keepFloor(10.58, 5)).toBe(10.05);
    expect(keepFloor(null)).toBeNull();
  });
  it('coverage is a percentage of the site total, null without a total', () => {
    expect(coveragePct(25, 100)).toBe(25);
    expect(coveragePct(25, 0)).toBeNull();
    expect(coveragePct(25, null)).toBeNull();
  });
  it('site totals blend RPM from sums, not from averaging daily RPMs', () => {
    const s = siteTotalsFromEarnings([
      { revenue: 100, pageviews: 10000, sessions: 5000 },
      { revenue: 300, pageviews: 10000, sessions: 5000 },
    ]);
    expect(s.pageRpm).toBe(20);
    expect(s.sessionRpm).toBe(40);
  });
  it('topPaths sorts by revenue and buckets each row', () => {
    const t = topPaths([
      { path: '/mods/a/', pageviews: 10, page_revenue: 0.1 },
      { path: '/', pageviews: 100, page_revenue: 5 },
    ], 1);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ path: '/', bucket: 'home', rpm: 50 });
  });
});

describe('renderMd', () => {
  const rep: SnapshotReport = {
    start: '2026-09-08',
    end: '2026-09-14',
    generatedAt: '2026-09-16T12:00:00.000Z',
    site: { revenue: 1000, pageviews: 100000, sessions: 80000, pageRpm: 10, sessionRpm: 12.5 },
    buckets: aggregateBuckets([{ day: '2026-09-08', rows: [{ path: '/', pageviews: 1000, page_revenue: 10 }] }]),
    ga4Pageviews: { total: 120000, home: 2000 },
    top: [{ path: '/', bucket: 'home', pageviews: 1000, revenue: 10, rpm: 10 }],
    pulls: { attempted: 14, ok: 14 },
    tolerancePct: 3,
  };
  it('prints the keep floor next to each bucket and states coverage', () => {
    const md = renderMd(rep);
    expect(md).toContain('| / (homepage grid) | 1 | 1,000 | $10.00 | **$10.00** |');
    expect(md).toContain('$9.70 |'); // one-sided floor
    expect(md).toContain('50.0%'); // PV coverage 1000/2000
    expect(md).toContain('1.0% of site revenue');
    expect(md).toContain('top-150');
  });
  it('prints the unseen remainder as the only obtainable Before for /mods/ and /go/', () => {
    const rem = unseenRemainder(rep);
    expect(rem).toEqual({ pageviews: 99000, revenue: 990, rpm: 10 });
    const md = renderMd(rep);
    expect(md).toContain('**Unseen remainder**');
    expect(md).toContain('| 99,000 | $990.00 | **$10.00** |');
    expect(md).toContain('cannot be read from `/reports/pages` at all');
    expect(unseenRemainder({ ...rep, site: null })).toBeNull();
  });
  it('says outright when GA4 and Mediavine pageviews agree, so PV coverage is read as absolute', () => {
    const md = renderMd({ ...rep, ga4Pageviews: { total: 100000, home: 2000 } });
    expect(md).toContain('identical: Mediavine sources pageviews from the GA4 connection');
  });
  it('tells the reader to re-pull the baseline window on the read date, never to compare against the frozen file', () => {
    const md = renderMd(rep);
    expect(md).toContain('re-pull the baseline window');
    expect(md).toContain('do not compare a fresh read against the figures in this file');
  });
  it('degrades to a note when GA4 is unavailable rather than dropping the table', () => {
    const md = renderMd({ ...rep, ga4Pageviews: undefined, ga4Error: 'no creds' });
    expect(md).toContain('GA4 denominators: _unavailable — no creds_');
    expect(md).not.toContain('GA4 pageviews |');
  });
});

describe('the shipped entrypoint', () => {
  const src = read('scripts/agents/page-rpm-snapshot.ts');
  const lib = read('scripts/agents/page-rpm-lib.ts');
  it('keeps the lib pure and routes every output through redactError', () => {
    expect(lib).not.toMatch(/from ['"]node:fs['"]|fetch\(|@\/lib\/prisma/);
    expect(src).toMatch(/import \{ redactError \} from '\.\/operator-did-probe-lib'/);
    expect(src).toMatch(/writeFileSync\(outPath, redactError\(md\)\)/);
    expect(src).toMatch(/const say = \(s: string\) => console\.log\(redactError\(s\)\)/);
  });
  it('never interpolates the JWT and keeps the house 0/2/1 exit discipline', () => {
    expect(src).not.toMatch(/\$\{[^}]*jwt[^}]*\}/i);
    expect(src).toMatch(/COULD-NOT-RUN reason=auth-expired/);
    expect(src).toMatch(/COULD-NOT-RUN reason=no-jwt/);
    expect(src).toMatch(/process\.exit\(1\)/);
  });
  it('pulls each day under both sort orders so the long tail is covered as far as the 150 cap allows', () => {
    expect(src).toMatch(/\['page_revenue', 'pageviews'\] as const/);
    expect(src).toMatch(/const PER_PAGE = 150/);
  });
});
