import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { COLLECTION_COVERS } from '@/lib/collectionCovers';
import nextConfig from '../../next.config.js';

/**
 * lib/collectionCovers.ts is generated, so a collection added to the registry
 * after the last run has no cover until someone regenerates it. gshade-presets
 * (E272) shipped that way and rendered as a bare pill on the homepage
 * (2026-10-26). Fix: npx tsx scripts/generate-collection-covers.ts
 *
 * The homepage renders any entry of a list (covers[0] for thumbs, up to three
 * for cards), so every entry is checked, not just one. Covers go through
 * /_next/image, so each host must be in the real images.remotePatterns or the
 * optimizer answers 400 and the circle renders empty.
 */
const ROOT = path.resolve(__dirname, '../..');
const allCovers = Object.entries(COLLECTION_COVERS).flatMap(([slug, urls]) => urls.map((u) => ({ slug, u })));

const patterns: { protocol?: string; hostname: string }[] = nextConfig.images?.remotePatterns ?? [];
// Next's remotePatterns: "*" is one host label, "**" any number of them.
function hostAllowed(url: URL): boolean {
  return patterns.some((p) => {
    if (p.protocol && `${p.protocol}:` !== url.protocol) return false;
    const re = new RegExp(
      '^' +
        p.hostname
          .split('.')
          .map((l) => (l === '**' ? '.+' : l === '*' ? '[^.]+' : l.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')))
          .join('\\.') +
        '$',
    );
    return re.test(url.hostname);
  });
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\w\\])\/\/.*$/gm, '$1');
}

describe('collection covers cover the registry', () => {
  it('scans a real registry (vacuity guard)', () => {
    expect(SIMS4_COLLECTIONS.length).toBeGreaterThan(20);
    expect(allCovers.length).toBeGreaterThan(50);
    expect(patterns.length).toBeGreaterThan(5);
  });

  it('every Sims 4 collection has at least one cover', () => {
    const missing = SIMS4_COLLECTIONS.map((c) => c.slug).filter((slug) => !(COLLECTION_COVERS[slug] ?? []).length);
    expect(missing, 'run: npx tsx scripts/generate-collection-covers.ts').toEqual([]);
  });

  it('every cover entry is https', () => {
    expect(allCovers.filter(({ u }) => !u.startsWith('https://'))).toEqual([]);
  });

  it('every cover host is in next.config.js images.remotePatterns', () => {
    expect(allCovers.filter(({ u }) => !hostAllowed(new URL(u)))).toEqual([]);
  });

  it('the host matcher rejects lookalikes (guard on the guard)', () => {
    expect(hostAllowed(new URL('https://blog.musthavemods.com/a.jpg'))).toBe(true);
    expect(hostAllowed(new URL('https://x.public.blob.vercel-storage.com/a.jpg'))).toBe(true);
    expect(hostAllowed(new URL('https://musthavemods.com.evil.example/a.jpg'))).toBe(false);
    expect(hostAllowed(new URL('https://c10.patreonusercontent.com/a.jpg'))).toBe(false);
    expect(hostAllowed(new URL('http://blog.musthavemods.com/a.jpg'))).toBe(false);
  });

  it('has no covers for collections that no longer exist', () => {
    const slugs = new Set(SIMS4_COLLECTIONS.map((c) => c.slug));
    expect(Object.keys(COLLECTION_COVERS).filter((s) => !slugs.has(s))).toEqual([]);
  });

  it('homepage covers are optimized, not shipped as full-size originals', () => {
    const src = stripComments(fs.readFileSync(path.join(ROOT, 'app/HomeCollections.tsx'), 'utf8'));
    expect(src).toMatch(/<Image\b/);
    expect(src).not.toMatch(/\bunoptimized\b/);
  });
});
