/**
 * Canonical / trailing-slash hygiene regression tests.
 *
 * next.config.js sets `trailingSlash: true`, so every non-slash URL
 * 308-redirects to its slash variant. Any canonical tag, sitemap
 * <loc>, or JSON-LD @id that omits the trailing slash therefore
 * points at a redirect — Google treats that as a conflicting signal
 * and may refuse to index the page. This is exactly what happened to
 * /games/sims-4/pregnancy-mods/ ("Crawled - currently not indexed",
 * found in the 2026-07-02 growth audit; fixed 2026-07-03).
 *
 * These are source-level assertions (the same pattern as
 * sidebar-sticky-health.test.ts): they catch re-introduction of the
 * bad pattern without needing a running server.
 */
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

import { REDIRECTED_POST_PATHS, isRedirectedPostUrl } from '@/lib/seo/wpGuides';

// sitemap-nextjs.xml reads the DB for per-collection <lastmod> (E37); keep
// this suite hermetic. Rejecting exercises the template-date fallback.
vi.mock('@/lib/prisma', () => ({
  prisma: { mod: { aggregate: () => Promise.reject(new Error('no db in unit tests')) } },
  default: { mod: { aggregate: () => Promise.reject(new Error('no db in unit tests')) } },
}));

const read = (rel: string) =>
  fs.readFileSync(path.resolve(__dirname, '../../', rel), 'utf-8');

describe('next.config.js trailing slash contract', () => {
  it('trailingSlash: true is set (canonicals below depend on it)', () => {
    expect(read('next.config.js')).toMatch(/trailingSlash:\s*true/);
  });
});

describe('collection page canonicals (/games/[game]/[topic])', () => {
  const src = read('app/games/[game]/[topic]/page.tsx');

  it('generateMetadata canonical ends with a trailing slash', () => {
    // Both the metadata canonical and the JSON-LD canonical build the
    // URL from gameSlug + slug — assert every occurrence ends in `/`.
    const matches = src.match(/games\/\$\{collection\.gameSlug\}\/\$\{collection\.slug\}\/?`/g) || [];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.endsWith('/`')).toBe(true);
    }
  });
});

describe('game page canonicals (/games/[game])', () => {
  const src = read('app/games/[game]/page.tsx');

  it('canonical and og:url end with a trailing slash', () => {
    const matches = src.match(/\/games\/\$\{game\}\/?`/g) || [];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.endsWith('/`')).toBe(true);
    }
  });
});

describe('mod detail canonicals (/mods/[id])', () => {
  const src = read('app/mods/[id]/page.tsx');

  it('canonical URL ends with a trailing slash', () => {
    const matches = src.match(/\/mods\/\$\{mod\.id\}\/?`/g) || [];
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.endsWith('/`')).toBe(true);
    }
  });
});

describe('sitemap <loc> entries use trailing slashes', () => {
  it('sitemap-nextjs.xml route emits only trailing-slash locs', async () => {
    const { GET } = await import('@/app/sitemap-nextjs.xml/route');
    const response = await GET();
    const content = await response.text();
    const locs = (content.match(/<loc>[^<]+<\/loc>/g) || []).map((m) =>
      m.replace(/<\/?loc>/g, ''),
    );
    expect(locs.length).toBeGreaterThan(10); // 6 static + 10 collections
    for (const loc of locs) {
      expect(loc.endsWith('/'), `${loc} should end with /`).toBe(true);
    }
  });

  it('sitemap-mods.xml route source emits trailing-slash locs', () => {
    const src = read('app/sitemap-mods.xml/route.ts');
    expect(src).toContain('/mods/${m.id}/</loc>');
  });

  // E71: these two assert the *behaviour* of the shared constant
  // (lib/seo/wpGuides.ts), not a copy of its literal in one route's source.
  // The previous version grepped app/sitemap-blog-posts.xml/route.ts for the
  // strings; when the constant moved, the first test failed loudly and the
  // second passed vacuously (it sliced on a marker that no longer existed).
  it('sitemap-blog-posts.xml excludes every legacy post that 301s to a collection page', () => {
    const consolidatedPaths = [
      '/sims-4-female-clothes-cc/',
      '/sims-4-male-clothes-cc/',
      '/sims-4-cc-skin-details/',
      '/sims-4-gallery-poses/',
      '/sims-4-goth-cc/',
      '/sims-4-cottagecore-cc/',
    ];
    expect(REDIRECTED_POST_PATHS.length).toBeGreaterThanOrEqual(consolidatedPaths.length);
    for (const p of consolidatedPaths) {
      expect(
        isRedirectedPostUrl(`https://musthavemods.com${p}`),
        `${p} missing from REDIRECTED_POST_PATHS`,
      ).toBe(true);
    }
    // the sitemap must actually apply it
    expect(read('app/sitemap-blog-posts.xml/route.ts')).toContain('isRedirectedPostUrl(url)');
  });

  it('sitemap-blog-posts.xml keeps every un-redirected legacy post (they are live 200s)', () => {
    // Un-consolidated 2026-07 (body-presets) and 2026-09 (pregnancy,
    // y2k): these articles serve 200 on the apex again and must be
    // listed. Excluding a live page from the sitemap is a silent
    // ranking-signal loss, not a build error.
    const live = ['/sims-4-pregnancy-mods/', '/sims-4-y2k-cc/', '/sims-4-body-presets/'];
    expect(live.length).toBeGreaterThan(0);
    for (const p of live) {
      expect(
        isRedirectedPostUrl(`https://musthavemods.com${p}`),
        `${p} must not be in REDIRECTED_POST_PATHS`,
      ).toBe(false);
    }
  });
});

describe('un-consolidated legacy pairs (pregnancy-mods, y2k-cc — 2026-09)', () => {
  // Google refused the collection-page canonical for both pairs and
  // indexed the blog-subdomain copy of the article instead (pregnancy
  // pos 10.95 / 93 clicks per 28d vs facet pos 33 / 2 clicks; y2k pos
  // 10.2 / 20 vs pos 29.8 / 4 — GSC 2026-08-09→09-05). Same call as the
  // 2026-07 body-presets revert. All three layers must agree: no apex
  // redirect (vercel.json), no facet canonical (functions.php
  // consolidated map), crosslink box present (functions.php crosslink
  // map). A half-applied revert re-creates the canonical conflict.
  const PAIRS: Array<[string, string]> = [
    ['sims-4-pregnancy-mods', 'pregnancy-mods'],
    ['sims-4-y2k-cc', 'y2k-cc'],
  ];

  it('vercel.json has no redirect for either legacy slug', () => {
    const vercel = JSON.parse(read('vercel.json')) as {
      redirects: Array<{ source: string; destination: string }>;
    };
    for (const [legacy] of PAIRS) {
      const hits = vercel.redirects.filter(
        (r) => r.source === `/${legacy}` || r.source === `/${legacy}/`,
      );
      expect(hits, `${legacy} still redirects: ${JSON.stringify(hits)}`).toHaveLength(0);
    }
  });

  it('functions.php lists both slugs in the crosslink map, not the consolidated map', () => {
    const php = read('staging/wordpress/kadence-child-prod/functions.php');
    const section = (fn: string) => {
      const start = php.indexOf(`function ${fn}()`);
      expect(start, `${fn} missing from functions.php`).toBeGreaterThan(-1);
      return php.slice(start, php.indexOf('\n}', start));
    };
    const crosslink = section('mhm_collection_crosslink_map');
    const consolidated = section('mhm_consolidated_post_map');
    for (const [legacy, facet] of PAIRS) {
      expect(crosslink).toMatch(new RegExp(`'${legacy}'\\s*=>\\s*array\\(\\s*'${facet}'`));
      expect(consolidated).not.toMatch(new RegExp(`'${legacy}'\\s*=>`));
    }
  });
});

describe('games-page collection nav (GamePageClient)', () => {
  const src = read('app/games/[game]/GamePageClient.tsx');

  it('renders collection chips with trailing-slash hrefs, outside the ad flex row', () => {
    // Trailing slash keeps internal links pointed at the canonical
    // variant instead of a 308 (trailingSlash: true).
    expect(src).toContain('href={`/games/${gameSlug}/${c.slug}/`}');
    // Navigation strip must never become an ad-injection point.
    const navBlock = src.slice(src.indexOf('Browse collections'), src.indexOf('Main Content'));
    expect(navBlock).not.toContain('mv-ads');
  });

  it('games page renders dynamically so the chips reach served HTML', () => {
    // GamePageClient uses useSearchParams(); under SSG the prerendered
    // HTML is only the Suspense fallback — the chips (and the whole
    // page shell) never reach crawlers. force-dynamic keeps the full
    // shell in the response. Verified against prod 2026-07-03.
    const pageSrc = read('app/games/[game]/page.tsx');
    expect(pageSrc).toContain("export const dynamic = 'force-dynamic'");
  });

  it('collection chips are static — not gated behind the mods loading state', () => {
    // A loading guard here would hide the links (and delay layout) on
    // first paint. The strip must only depend on the collections prop.
    const navStart = src.indexOf('{collections.length > 0 && (');
    expect(navStart).toBeGreaterThan(-1);
    const navEnd = src.indexOf('</nav>');
    const navBlock = src.slice(navStart, navEnd);
    expect(navBlock).not.toContain('loading');
  });
});

describe('legacy/collection strategy (lib/collections.ts)', () => {
  // Collections whose legacy twin 301s INTO them (vercel.json,
  // 2026-07-03). They own their head terms; a blogUrl pointing at the
  // consolidated legacy article would 301 straight back to the same
  // page (self-loop).
  // pregnancy-mods and y2k-cc left this set 2026-09 (un-consolidated,
  // see the describe block above).
  const CONSOLIDATED = new Set([
    'female-clothes',
    'male-clothes',
    'skin-details',
    'poses',
    'goth-cc',
    'cottagecore-cc',
  ]);

  // Legacy paths that 301 to collection pages — a blogUrl must never
  // point at one of these.
  const REDIRECTED_LEGACY_PATHS = new Set([
    '/sims-4-female-clothes-cc/',
    '/sims-4-male-clothes-cc/',
    '/sims-4-cc-skin-details/',
    '/sims-4-gallery-poses/',
    '/sims-4-goth-cc/',
    '/sims-4-cottagecore-cc/',
  ]);

  it('every differentiated collection cross-links its legacy article via blogUrl', async () => {
    const { SIMS4_COLLECTIONS } = await import('@/lib/collections');
    for (const c of SIMS4_COLLECTIONS) {
      if (CONSOLIDATED.has(c.slug)) continue;
      expect(c.blogUrl, `${c.slug} should have a blogUrl`).toBeTruthy();
    }
  });

  it('no blogUrl points at a redirected legacy path (self-loop guard)', async () => {
    const { SIMS4_COLLECTIONS } = await import('@/lib/collections');
    for (const c of SIMS4_COLLECTIONS) {
      if (!c.blogUrl) continue;
      expect(c.blogUrl.startsWith('/')).toBe(true);
      expect(c.blogUrl.endsWith('/')).toBe(true);
      expect(
        REDIRECTED_LEGACY_PATHS.has(c.blogUrl),
        `${c.slug} blogUrl ${c.blogUrl} 301s back to a collection page`,
      ).toBe(false);
    }
  });

  // Regression guard (Nova, 2026-09-07). `app/games/[game]/[topic]/page.tsx`
  // resolves `related` with `.map(find).filter(Boolean)`, so a slug that
  // does not exist is silently dropped — no build error, no 404, the
  // related-collections strip just renders fewer cards. Three pages were
  // shipping dangling slugs ('furniture' instead of 'furniture-cc', and
  // 'decor' before the decor-cc page existed); /games/sims-4/clutter/
  // rendered one related card instead of three.
  it('every related slug resolves to a real collection', async () => {
    const { SIMS4_COLLECTIONS } = await import('@/lib/collections');
    const slugs = new Set(SIMS4_COLLECTIONS.map((c) => c.slug));
    for (const c of SIMS4_COLLECTIONS) {
      for (const rel of c.related) {
        expect(
          slugs.has(rel),
          `${c.slug} lists related "${rel}", which is not a collection slug`,
        ).toBe(true);
      }
      expect(
        c.related.includes(c.slug),
        `${c.slug} lists itself as a related collection`,
      ).toBe(false);
    }
  });

  it('every collection slug is unique', async () => {
    const { SIMS4_COLLECTIONS } = await import('@/lib/collections');
    const seen = new Set<string>();
    for (const c of SIMS4_COLLECTIONS) {
      expect(seen.has(c.slug), `duplicate collection slug "${c.slug}"`).toBe(false);
      seen.add(c.slug);
    }
  });

  // Nova, 2026-09-20 (E67). The link-graph invariants this page has to satisfy
  // (>= 2 inbound related edges, exactly 3 outbound, sources that are
  // themselves linked) are asserted for the whole registry by
  // `collection-link-graph.test.ts` (#120) — a scanner beats a per-page
  // assertion, so this one deliberately checks only what is specific to the
  // new row and cannot be scanned for: that it exists, that it sits on the
  // facet it claims, and that it clears the Tier 0 size floor.
  it('nails-cc is in the registry, on the nails facet, above the size floor', async () => {
    const { SIMS4_COLLECTIONS } = await import('@/lib/collections');
    const nails = SIMS4_COLLECTIONS.find((c) => c.slug === 'nails-cc');
    expect(nails, 'nails-cc is missing from the registry').toBeTruthy();
    expect(nails!.filter.contentType).toBe('nails');
    // autonomy.md Tier 0: a collection page must have >= 20 mods.
    expect(nails!.expectedCount).toBeGreaterThanOrEqual(20);
  });

  it('differentiated collections signal browse intent, distinct from legacy listicles', async () => {
    const { SIMS4_COLLECTIONS } = await import('@/lib/collections');
    for (const c of SIMS4_COLLECTIONS) {
      if (CONSOLIDATED.has(c.slug)) continue; // consolidated pages own head terms
      expect(
        /Finder|Browse/.test(c.metaTitle),
        `${c.slug} metaTitle should carry browse/finder intent: "${c.metaTitle}"`,
      ).toBe(true);
    }
  });
});

describe('related-collections strip (CollectionPageClient)', () => {
  const src = read('app/games/[game]/[topic]/CollectionPageClient.tsx');

  it('links related collections through collectionHref, not a bare path', () => {
    // A bare `/games/${gameSlug}/${slug}` 308s under trailingSlash:true,
    // so every one of these internal links pointed at a redirect instead
    // of the canonical URL until 2026-09-13.
    expect(src).toContain('href={collectionHref(rel)}');
    expect(src).not.toContain('href={`/games/${rel.gameSlug}/${rel.slug}`}');
  });
});

describe('shoes-cc registry placement (E43, 2026-09-13)', () => {
  it('precedes male-clothes and female-clothes so shoe mods get "Shoes CC" as the primary crumb', async () => {
    // male-clothes and female-clothes are composite contentTypeIn filters
    // that already include `shoes`, and filterSpecificity() scores all
    // three at 0 — registry order is the only tie-break. If shoes-cc ever
    // drifts below them, 633 mod pages silently revert to a
    // "Female Clothes CC" breadcrumb on a pair of boots.
    const { SIMS4_COLLECTIONS } = await import('@/lib/collections');
    const idx = (slug: string) => SIMS4_COLLECTIONS.findIndex((c) => c.slug === slug);
    expect(idx('shoes-cc')).toBeGreaterThan(-1);
    expect(idx('shoes-cc')).toBeLessThan(idx('male-clothes'));
    expect(idx('shoes-cc')).toBeLessThan(idx('female-clothes'));
  });

  it('a shoe mod resolves to Shoes CC first', async () => {
    const { getCollectionsForMod } = await import('@/lib/collections');
    const hits = getCollectionsForMod({
      gameVersion: 'Sims 4',
      isNSFW: false,
      contentType: 'shoes',
      genderOptions: ['feminine'],
      title: 'Camille Heels',
      description: null,
      themes: [],
      ageGroups: ['adult'],
      occultTypes: [],
      visualStyle: null,
    });
    expect(hits[0]?.slug).toBe('shoes-cc');
  });
});

/**
 * The slashless-href CLASS guard.
 *
 * `next.config.js` sets `trailingSlash: true`, so ANY internal href whose
 * path portion lacks a trailing slash answers 308 before it renders. Five
 * such links were live on 2026-09-15 — two of them in the site-wide
 * <Navbar> ("Browse by Game"), one in the collection-page breadcrumb, one
 * on /play, one in admin — plus 55 plain-string hrefs across app/ and
 * components/. Each one burns a round trip and dilutes the internal-link
 * signal to the very collection pages this site ranks on.
 *
 * Previous fixes closed single INSTANCES (the related-collections strip,
 * PR #95) and the class immediately reopened. This asserts the class:
 * every internal href in app/ and components/, string or template
 * literal, must have a path that ends in "/".
 *
 * Exemptions, and only these two:
 *   - a dotted last segment (e.g. /feeds/mods.json) — `trailingSlash`
 *     leaves dotted routes slashless, same rule as isCanonicalUrl() in
 *     scripts/agents/indexnow-lib.ts.
 *   - the path portion is exactly "/" (root with a query, e.g.
 *     `/?search=${tag}`), which is already canonical.
 */
describe('internal hrefs never point at a 308 (the slashless-href class)', () => {
  const ROOTS = ['app', 'components'];

  // The source comments in this repo deliberately contain the bad patterns
  // they warn about, so strip comments before asserting (house rule).
  const stripComments = (s: string) =>
    s
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // {/* JSX comment */}
      .replace(/\/\*[\s\S]*?\*\//g, '') // /* block comment */
      .replace(/^\s*\/\/.*$/gm, ''); // full-line // comment

  const walk = (dir: string): string[] => {
    const abs = path.resolve(__dirname, '../../', dir);
    if (!fs.existsSync(abs)) return [];
    const out: string[] = [];
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
        out.push(...walk(rel));
      } else if (entry.name.endsWith('.tsx')) {
        out.push(rel);
      }
    }
    return out;
  };

  // href="/x" | href={`/x`} | href={'/x'}
  const HREF_RE = /href=(?:"([^"]*)"|\{\s*[`'"]([^`'"]*)[`'"]\s*\})/g;

  const isCanonical = (href: string): boolean => {
    const pathPart = href.split(/[?#]/)[0];
    if (pathPart === '/') return true; // root with a query
    if (pathPart.endsWith('/')) return true;
    const last = pathPart.split('/').pop() || '';
    return last.includes('.'); // dotted route, e.g. /feeds/mods.json
  };

  const offenders: string[] = [];
  for (const file of ROOTS.flatMap(walk)) {
    const src = stripComments(read(file));
    for (const m of Array.from(src.matchAll(HREF_RE))) {
      const href = m[1] ?? m[2];
      if (!href || !href.startsWith('/')) continue; // external / mailto / anchor
      if (!isCanonical(href)) {
        const line = src.slice(0, m.index).split('\n').length;
        offenders.push(`${file}:${line} href=${href}`);
      }
    }
  }

  it('finds at least one internal href to check (the scanner works)', () => {
    // Guards against a regex/walk change that silently makes this suite vacuous.
    let total = 0;
    for (const file of ROOTS.flatMap(walk)) {
      const src = stripComments(read(file));
      for (const m of Array.from(src.matchAll(HREF_RE))) {
        const href = m[1] ?? m[2];
        if (href && href.startsWith('/')) total++;
      }
    }
    expect(total).toBeGreaterThan(50);
  });

  it('no internal href in app/ or components/ omits its trailing slash', () => {
    expect(offenders).toEqual([]);
  });
});
