/**
 * /creator/ hub guard (Nova, E97, 2026-09-24).
 *
 * The ~540 /creator/[slug]/ pages (E85) were reachable only via
 * sitemap-creators.xml and mod-page author links; the Navbar's "Creators"
 * link went to /top-creators/, a client-fetched list of 20 CreatorProfile
 * rows that hands Google nothing. This suite pins the crawlable hub:
 *
 *   - the page exists, is a server component, renders per request, holds
 *     the Mediavine anchors, and links leaves with the trailing-slash helper;
 *   - the Navbar, the leaf breadcrumb, sitemap-nextjs.xml, llms.txt and the
 *     deploy smoke list all point at /creator/;
 *   - platform/aggregator "authors" never reach the hub.
 *
 * Against pre-E97 origin/main (7554037) the following fail: every case in
 * "the hub page" (file absent), "inbound links" (Navbar + breadcrumb still
 * /top-creators/), "discovery surfaces" (no /creator/ in sitemap, llms.txt,
 * smoke-render), and "non-creator slugs" (isNonCreatorSlug absent). The
 * pure-helper cases pass only once lib/creatorHub.ts exists.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { isNonCreatorSlug, NON_CREATOR_SLUGS, isJunkAuthorSlug, creatorHref } from '../../lib/creatorSlug';
import { groupByLetter, rankByDownloads, letterAnchorId, TOP_CREATORS } from '../../lib/creatorHub';

const ROOT = path.resolve(__dirname, '../../');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf-8');
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('the hub page (app/creator/page.tsx)', () => {
  const file = 'app/creator/page.tsx';

  it('exists next to the [slug] leaf route', () => {
    expect(fs.existsSync(path.join(ROOT, file))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'app/creator/[slug]/page.tsx'))).toBe(true);
  });

  it('is a per-request server component (no use client, force-dynamic)', () => {
    const src = read(file);
    expect(src).not.toMatch(/^\s*['"]use client['"]/m);
    expect(src).toMatch(/export const dynamic = ['"]force-dynamic['"]/);
  });

  it('renders both Mediavine anchors in the served HTML, aside empty and unpinned', () => {
    const src = stripComments(read(file));
    expect(src).toContain('id="secondary"');
    expect(src).toContain('widget-area primary-sidebar');
    expect(src).toContain('className="mv-ads"');
    const asideStart = src.indexOf('id="secondary"');
    const region = src.slice(asideStart, asideStart + 400);
    const cls = region.match(/className="([^"]*)"/)?.[1] ?? '';
    expect(cls).toContain('lg:block');
    expect(cls).not.toMatch(/sticky|fixed/);
    // Nothing between <aside ...> and </aside> but whitespace.
    const inner = region.slice(region.indexOf('>') + 1, region.indexOf('</aside>'));
    expect(inner.trim()).toBe('');
  });

  it('places the capture surface outside the .mv-ads wrapper and outside the aside', () => {
    const src = stripComments(read(file));
    const mvStart = src.indexOf('className="mv-ads"');
    const signup = src.indexOf('<NewsletterSignup');
    const aside = src.indexOf('id="secondary"');
    expect(mvStart).toBeGreaterThan(-1);
    expect(signup).toBeGreaterThan(mvStart);
    expect(signup).toBeLessThan(aside);
    // The .mv-ads wrapper closes before the signup block opens: count the
    // <section openings between them — both hub sections sit inside .mv-ads.
    const between = src.slice(mvStart, signup);
    expect((between.match(/<section\b/g) ?? []).length).toBe(2);
  });

  it('links every creator with the trailing-slash helper (plain <a>, not a client Link)', () => {
    const src = stripComments(read(file));
    expect(src).toMatch(/<a\s[^>]*href=\{creatorHref\(c\.slug\)\}/);
    expect(src).not.toMatch(/from ['"]next\/link['"]/);
    expect(creatorHref('ravasheen')).toBe('/creator/ravasheen/');
  });

  it('every literal internal href carries a trailing slash', () => {
    const src = stripComments(read(file));
    const hrefs = Array.from(src.matchAll(/href="([^"]*)"/g)).map((m) => m[1]);
    const internal = hrefs.filter((h) => h.startsWith('/'));
    expect(internal.length).toBeGreaterThanOrEqual(3); // /, /submit-mod/, /top-creators/
    for (const h of internal) expect(h.endsWith('/')).toBe(true);
  });

  it('never calls mediavine.newPageView (useAnalytics is the only caller)', () => {
    expect(read(file)).not.toContain('newPageView');
  });
});

describe('inbound links to the hub', () => {
  it('Navbar "Creators" (desktop + mobile) points at /creator/', () => {
    const src = stripComments(read('components/Navbar.tsx'));
    const creatorHrefs = Array.from(src.matchAll(/href="\/creator\/"/g));
    expect(creatorHrefs.length).toBeGreaterThanOrEqual(2);
    expect(src).not.toContain('href="/top-creators/"');
  });

  it('leaf-page breadcrumb "Creators" points at /creator/', () => {
    const src = stripComments(read('app/creator/[slug]/CreatorPageClient.tsx'));
    expect(src).toContain('href="/creator/"');
    expect(src).not.toContain('href="/top-creators/"');
  });

  it('the hub still links /top-creators/ so the leaderboard is not orphaned', () => {
    expect(stripComments(read('app/creator/page.tsx'))).toContain('href="/top-creators/"');
  });
});

describe('discovery surfaces', () => {
  it('sitemap-nextjs.xml lists /creator/', () => {
    expect(stripComments(read('app/sitemap-nextjs.xml/route.ts'))).toContain('/creator/`');
  });

  it('llms.txt names the hub under Key Pages', () => {
    expect(read('app/llms.txt/route.ts')).toContain('https://musthavemods.com/creator/');
  });

  it('smoke-render.ts checks /creator/ as an ad page after every deploy', () => {
    const src = stripComments(read('scripts/agents/smoke-render.ts'));
    expect(src).toMatch(/path: '\/creator\/', kind: 'catalog'/);
  });

  it('the sidebar registry covers the hub file', () => {
    expect(read('__tests__/unit/sidebar-sticky-health.test.ts')).toContain("file: 'app/creator/page.tsx'");
  });

  it("'creator' is in the middleware NEXTJS_PREFIXES (else WordPress 404s the hub)", () => {
    const src = read('middleware.ts');
    const block = src.slice(src.indexOf('NEXTJS_PREFIXES'), src.indexOf('NEXTJS_PREFIXES') + 2000);
    expect(block).toMatch(/['"]creator['"]/);
  });
});

describe('non-creator slugs', () => {
  it('rejects the platform/aggregator names found in the 2026-09-24 spot-check', () => {
    for (const s of ['simfileshare', 'curseforge-creator', 'amazon', 'simsfinds', 'google', 'unknown', 'sims4downloads']) {
      expect(isNonCreatorSlug(s), s).toBe(true);
    }
  });

  it('keeps real creators', () => {
    for (const s of ['ravasheen', 'seoulsoul-sims', 'littlemssam', 'syboulette', 'kiarasims4mods', 'pralinesims']) {
      expect(isNonCreatorSlug(s), s).toBe(false);
      expect(isJunkAuthorSlug(s), s).toBe(false);
    }
  });

  it('is a slug set (lowercase, dashed) so it matches what the SQL produces', () => {
    for (const s of Array.from(NON_CREATOR_SLUGS)) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});

describe('pure hub helpers', () => {
  it('groupByLetter puts digits/other last and sorts within a letter', () => {
    const rows = [{ slug: 'zed' }, { slug: '3d-sims' }, { slug: 'alpha' }, { slug: 'aardvark' }];
    const g = groupByLetter(rows);
    expect(g.map(([l]) => l)).toEqual(['A', 'Z', '#']);
    expect(g[0][1].map((r) => r.slug)).toEqual(['aardvark', 'alpha']);
  });

  it('rankByDownloads is downloads-first with mods as the tiebreak and does not mutate', () => {
    const rows = [
      { slug: 'a', mods: 100, downloads: 1 },
      { slug: 'b', mods: 5, downloads: 900 },
      { slug: 'c', mods: 50, downloads: 1 },
    ];
    const ranked = rankByDownloads(rows);
    expect(ranked.map((r) => r.slug)).toEqual(['b', 'a', 'c']);
    expect(rows.map((r) => r.slug)).toEqual(['a', 'b', 'c']);
  });

  it('letterAnchorId maps "#" to other', () => {
    expect(letterAnchorId('S')).toBe('creators-s');
    expect(letterAnchorId('#')).toBe('creators-other');
  });

  it('TOP_CREATORS is a sane rail size', () => {
    expect(TOP_CREATORS).toBeGreaterThanOrEqual(12);
    expect(TOP_CREATORS).toBeLessThanOrEqual(48);
  });
});
