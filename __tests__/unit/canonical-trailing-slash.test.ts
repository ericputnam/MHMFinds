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
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

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

  it('sitemap-blog-posts.xml excludes every legacy post that 301s to a collection page', () => {
    const src = read('app/sitemap-blog-posts.xml/route.ts');
    const consolidatedPaths = [
      '/sims-4-female-clothes-cc/',
      '/sims-4-male-clothes-cc/',
      '/sims-4-cc-skin-details/',
      '/sims-4-gallery-poses/',
      '/sims-4-goth-cc/',
      '/sims-4-cottagecore-cc/',
    ];
    for (const p of consolidatedPaths) {
      expect(src, `${p} missing from REDIRECTED_POST_PATHS`).toContain(`'${p}'`);
    }
  });

  it('sitemap-blog-posts.xml keeps every un-redirected legacy post (they are live 200s)', () => {
    // Un-consolidated 2026-07 (body-presets) and 2026-09 (pregnancy,
    // y2k): these articles serve 200 on the apex again and must be
    // listed. Excluding a live page from the sitemap is a silent
    // ranking-signal loss, not a build error.
    const src = read('app/sitemap-blog-posts.xml/route.ts');
    const listStart = src.indexOf('const REDIRECTED_POST_PATHS');
    const listEnd = src.indexOf('];', listStart);
    const list = src.slice(listStart, listEnd);
    for (const p of ['/sims-4-pregnancy-mods/', '/sims-4-y2k-cc/', '/sims-4-body-presets/']) {
      expect(list, `${p} must not be in REDIRECTED_POST_PATHS`).not.toContain(`'${p}'`);
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
