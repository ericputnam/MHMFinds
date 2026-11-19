import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  HUB_IMAGE_COUNT,
  IMAGE_SITEMAP_NS,
  escapeXml,
  imageEntries,
  isSitemapImageUrl,
} from '@/lib/seo/sitemapImage';

/**
 * E431 / E432 (Pip, 2026-11-19) — image-sitemap helpers.
 *
 * Both sitemaps that carry <image:image> children build them here, so the
 * escaping and the absolute-URL rule are tested once. Pre-fix origin/main has
 * no lib/seo/sitemapImage.ts, so this file fails to import there.
 */

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('escapeXml / isSitemapImageUrl', () => {
  it('escapes the five XML specials', () => {
    expect(escapeXml(`a & b < c > "d" 'e'`)).toBe('a &amp; b &lt; c &gt; &quot;d&quot; &apos;e&apos;');
  });

  it('accepts only absolute http(s) URLs', () => {
    expect(isSitemapImageUrl('https://blog.musthavemods.com/x.jpg')).toBe(true);
    expect(isSitemapImageUrl('http://example.com/x.jpg')).toBe(true);
    expect(isSitemapImageUrl('/images/x.jpg')).toBe(false);
    expect(isSitemapImageUrl('data:image/png;base64,AAAA')).toBe(false);
    expect(isSitemapImageUrl('https://')).toBe(false);
    expect(isSitemapImageUrl('')).toBe(false);
    expect(isSitemapImageUrl(null)).toBe(false);
    expect(isSitemapImageUrl(undefined)).toBe(false);
  });
});

describe('imageEntries()', () => {
  it('emits one escaped <image:image> per absolute URL and skips the rest', () => {
    const out = imageEntries([
      { loc: 'https://cdn.example/a.jpg?w=1&h=2', title: ' Alpha & <Beta> ' },
      { loc: '/relative.jpg', title: 'skipped' },
      { loc: 'https://cdn.example/c.webp', title: null },
      { loc: 'https://cdn.example/d.png', title: '   ' },
    ]);
    expect((out.match(/<image:image>/g) ?? []).length).toBe(3);
    expect(out).toContain('<image:loc>https://cdn.example/a.jpg?w=1&amp;h=2</image:loc>');
    expect(out).toContain('<image:title>Alpha &amp; &lt;Beta&gt;</image:title>');
    expect(out).not.toContain('relative.jpg');
    // No title → no <image:title> element (an empty one is invalid).
    expect((out.match(/<image:title>/g) ?? []).length).toBe(1);
    expect(out).not.toContain('<image:title></image:title>');
  });

  it('returns an empty string when nothing qualifies, so callers splice unconditionally', () => {
    expect(imageEntries([])).toBe('');
    expect(imageEntries([{ loc: '/x.jpg' }, { loc: '' }])).toBe('');
  });

  it('names the Google image-sitemap namespace and bounds the hub image count', () => {
    expect(IMAGE_SITEMAP_NS).toBe('http://www.google.com/schemas/sitemap-image/1.1');
    expect(HUB_IMAGE_COUNT).toBeGreaterThan(0);
    expect(HUB_IMAGE_COUNT).toBeLessThanOrEqual(24);
  });
});

describe('source guards', () => {
  it('both sitemaps declare the image namespace and build images through the shared helper', () => {
    for (const route of ['app/sitemap-mods.xml/route.ts', 'app/sitemap-nextjs.xml/route.ts']) {
      const src = stripComments(read(route));
      expect(src, route).toContain('xmlns:image="${IMAGE_SITEMAP_NS}"');
      expect(src, route).toMatch(/imageEntries\(/);
      // Never hand-build the element in a route: escaping lives in one place.
      expect(src, route).not.toContain('<image:loc>');
    }
  });

  it('the hub image query mirrors the hub page where-clause (gameVersion + isNSFW:false) and never reads updatedAt', () => {
    const lib = stripComments(read('lib/seo/sitemapImage.ts'));
    expect(lib).toContain('...buildWhereClause(collection.filter)');
    expect(lib).toContain('gameVersion: collection.game');
    expect(lib).toContain('isNSFW: false');
    expect(lib).toContain("orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }]");
    expect(lib).not.toContain('updatedAt');
    // The hub page uses the same ordering; a drift here means the sitemap
    // names images the page does not show first.
    const page = stripComments(read('app/games/[game]/[topic]/page.tsx'));
    expect(page).toContain("{ downloadCount: 'desc' as const }, { createdAt: 'desc' as const }");
  });
});
