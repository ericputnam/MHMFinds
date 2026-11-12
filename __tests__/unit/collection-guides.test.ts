import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import { SIMS4_COLLECTIONS } from '@/lib/collections';

/**
 * E203 (Sage, 2026-10-14): hub → guide internal links.
 *
 * The blog.* → apex host split (Q13, #208) moved every article's clicks to
 * its apex twin, and the twin starts with the inbound links it has on the
 * apex — for `/sims-4-hospital-lots/` that was two referring URLs. The page
 * went from 34 clicks/wk at pos 7.6 (blog.*) to 4 + 6 (blog + apex) at pos
 * 9–26, 40% of that week's −80 Google click drop. `guides` on the registry
 * gives such an article inbound links from the hubs Google already ranks
 * for the neighbouring query.
 *
 * Invariants:
 *  - a guide href is a relative apex path with a trailing slash, never a
 *    `/games/` collection (those are `related`), never a path vercel.json
 *    301s (the self-loop class canonical-trailing-slash.test.ts guards for
 *    `blogUrl`), and never the hub's own `blogUrl` twice;
 *  - the first guide, `/sims-4-hospital-lots/`, keeps ≥ 2 hub sources — one
 *    link from one hub is the state that was already measured as too little;
 *  - both surfaces that print a hub's guides (the page and llms-full.txt)
 *    read the same field, so the two cannot drift.
 */

const ROOT = path.resolve(__dirname, '../..');

function redirectedSources(): Set<string> {
  const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf-8')) as {
    redirects?: Array<{ source: string }>;
  };
  const out = new Set<string>();
  for (const r of vercel.redirects ?? []) {
    out.add(r.source.endsWith('/') ? r.source : `${r.source}/`);
  }
  return out;
}

const withGuides = SIMS4_COLLECTIONS.filter((c) => (c.guides?.length ?? 0) > 0);

describe('collection guides (E203)', () => {
  it('at least one hub links a guide (vacuity guard)', () => {
    expect(withGuides.length).toBeGreaterThanOrEqual(1);
  });

  it('every guide href is a relative apex article path that does not 301 and is not a collection', () => {
    const redirected = redirectedSources();
    expect(redirected.size).toBeGreaterThan(5); // vercel.json parsed something
    for (const c of withGuides) {
      const seen = new Set<string>();
      for (const g of c.guides!) {
        expect(g.href, `${c.slug} guide ${g.href}`).toMatch(/^\/[a-z0-9-]+\/$/);
        expect(g.href.startsWith('/games/'), `${c.slug} guide ${g.href} is a collection — use related`).toBe(false);
        expect(redirected.has(g.href), `${c.slug} guide ${g.href} 301s in vercel.json`).toBe(false);
        expect(g.href === c.blogUrl, `${c.slug} repeats its blogUrl ${g.href} as a guide`).toBe(false);
        expect(seen.has(g.href), `${c.slug} lists ${g.href} twice`).toBe(false);
        seen.add(g.href);
        expect(g.label.trim().length, `${c.slug} guide ${g.href} has an empty label`).toBeGreaterThan(8);
      }
    }
  });

  it('the host-split hospital-lots guide keeps at least two hub sources', () => {
    const sources = withGuides
      .filter((c) => c.guides!.some((g) => g.href === '/sims-4-hospital-lots/'))
      .map((c) => c.slug);
    expect(sources.length, `sources: ${sources.join(', ')}`).toBeGreaterThanOrEqual(2);
    expect(sources).toContain('pregnancy-mods');
    expect(sources).toContain('build-cc');
  });

  // E366 (Pip, 2026-11-07): the eight Bing-losing WordPress guides that had
  // no inbound link from any Next.js page. Each must keep a hub source, or
  // the experiment's treated set silently shrinks.
  it('every E366 Bing-losing guide keeps at least one hub source', () => {
    const E366 = [
      '/sims-4-sliders/',
      '/sims-4-reshade/',
      '/best-sims-4-wedding-cc/',
      '/sims-4-infant-cc/',
      '/sims-4-urban-cc/',
      '/sims-4-cowboy-cc/',
      '/new-sims-4-mods-2026/',
      '/black-sims-4-cc/',
    ];
    for (const href of E366) {
      const sources = withGuides.filter((c) => c.guides!.some((g) => g.href === href));
      expect(sources.length, `${href} has no hub source`).toBeGreaterThanOrEqual(1);
    }
  });

  // E375 (Pip, 2026-11-09): thirteen seasonal WordPress guides that had no
  // inbound link from any Next.js page before the holiday peak. Same rule as
  // E366: each keeps a hub source, or the treated set silently shrinks.
  it('every E375 seasonal guide keeps at least one hub source', () => {
    const E375 = [
      '/sims-4-christmas-tree-cc/',
      '/sims-4-christmas-clothes-cc/',
      '/sims-4-christmas-decor-cc/',
      '/sims-4-christmas-houses/',
      '/sims-4-christmas-poses/',
      '/sims-4-santa-cc/',
      '/sims-4-thanksgiving-cc/',
      '/sims-4-holiday-ideas/',
      '/sims-4-holiday-traditions/',
      '/sims-4-winter-loading-screens/',
      '/sims-4-christmas-cas-background/',
      '/sims-4-christmas-nails-cc/',
      '/sims-4-winter-clothes-cc/',
    ];
    for (const href of E375) {
      const sources = withGuides.filter((c) => c.guides!.some((g) => g.href === href));
      expect(sources.length, `${href} has no hub source`).toBeGreaterThanOrEqual(1);
    }
  });

  // E376 (Pip, 2026-11-09): the ten organic-losing WordPress guides with no
  // Next.js inbound link. Same rule as E366/E375.
  it('every E376 organic-losing guide keeps at least one hub source', () => {
    const E376 = [
      '/sims-4-build-cheats/',
      '/sims-4-career-mods/',
      '/sims-4-romance-mods/',
      '/sims-4-health-mods/',
      '/sims-4-drama-mods/',
      '/sims-4-skin-details/',
      '/sims-4-nursery-cc/',
      '/sims-4-school-mods/',
      '/sims-4-school-uniforms-cc/',
      '/sims-4-urban-hair-cc/',
    ];
    for (const href of E376) {
      const sources = withGuides.filter((c) => c.guides!.some((g) => g.href === href));
      expect(sources.length, `${href} has no hub source`).toBeGreaterThanOrEqual(1);
    }
  });

  it('the hub page and llms-full.txt both render the guides field', () => {
    const page = fs.readFileSync(path.join(ROOT, 'app/games/[game]/[topic]/CollectionPageClient.tsx'), 'utf-8');
    const llms = fs.readFileSync(path.join(ROOT, 'app/llms-full.txt/route.ts'), 'utf-8');
    expect(page).toContain('collection.guides?.map(');
    expect(llms).toContain('c.guides');
    // Plain anchors in the companion paragraph, above the main/aside split —
    // strip comments first: this repo's comments quote the patterns they warn about.
    const code = page.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
    const anchorAt = code.indexOf('collection.guides?.map(');
    // Since 2026-10-28 the .mv-ads container is LauncherGrid's, so the grid
    // element is the boundary; a literal mv-ads in this file counts too.
    const gridAt = code.indexOf('<LauncherGrid');
    const mvAdsAt = code.indexOf('mv-ads');
    expect(anchorAt).toBeGreaterThan(0);
    expect(gridAt).toBeGreaterThan(anchorAt);
    expect(mvAdsAt === -1 || anchorAt < mvAdsAt).toBe(true);
  });
});
