import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { collectionCovers } from '@/lib/collectionCovers';
import { collectionMetadata, collectionOgImage } from '@/lib/seo/collectionMetadata';

/**
 * E298 (Pip, 2026-10-30): every collection page must ship an og:image and a
 * twitter:image. Before this, /games/sims-4/* emitted og:title, og:description
 * and twitter:card=summary_large_image with no image at all, so a collection
 * URL shared on Tumblr / Reddit / Discord / X, or saved to Pinterest from its
 * URL, rendered as a text-only card.
 *
 * The image is the first cover from the generated registry
 * (lib/collectionCovers.ts). This test guards the real helper the page calls,
 * not a copy of its output, and the page is checked (comments stripped) to
 * still call that helper so the lib cannot drift away from the route.
 *
 * Red on the pre-fix tree: cases 1 and 2 (no images on any entry) and 4
 * (page built metadata inline without the helper).
 */
const ROOT = path.resolve(__dirname, '../..');
const PAGE = path.join(ROOT, 'app/games/[game]/[topic]/page.tsx');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('collection pages ship og:image / twitter:image (E298)', () => {
  it('vacuity guard: the registry has at least 20 collections', () => {
    expect(SIMS4_COLLECTIONS.length).toBeGreaterThanOrEqual(20);
  });

  it('1. every collection has an https openGraph image equal to its first cover', () => {
    for (const c of SIMS4_COLLECTIONS) {
      const md = collectionMetadata(c);
      const og = md.openGraph as { images?: Array<{ url: string; alt?: string }> } | undefined;
      expect(og?.images?.length, `${c.slug}: og:image`).toBe(1);
      const url = og!.images![0].url;
      expect(url.startsWith('https://'), `${c.slug}: og:image must be https`).toBe(true);
      expect(url, `${c.slug}: og:image must be the first registry cover`).toBe(collectionCovers(c.slug)[0]);
      expect(og!.images![0].alt, `${c.slug}: og:image alt`).toBe(c.heading);
    }
  });

  it('2. every collection has a twitter image matching the og image', () => {
    for (const c of SIMS4_COLLECTIONS) {
      const md = collectionMetadata(c);
      const tw = md.twitter as { card?: string; images?: string[] } | undefined;
      expect(tw?.card, `${c.slug}: twitter card`).toBe('summary_large_image');
      expect(tw?.images, `${c.slug}: twitter image`).toEqual([collectionOgImage(c)]);
    }
  });

  it('3. canonical and feed alternate are unchanged by the refactor', () => {
    for (const c of SIMS4_COLLECTIONS) {
      const md = collectionMetadata(c);
      const canonical = `https://musthavemods.com/games/${c.gameSlug}/${c.slug}/`;
      expect(md.alternates?.canonical, `${c.slug}: canonical`).toBe(canonical);
      expect((md.alternates?.types as Record<string, string>)['application/rss+xml']).toBe(
        `https://musthavemods.com/feeds/${c.gameSlug}/${c.slug}/`,
      );
      expect((md.openGraph as { url?: string }).url).toBe(canonical);
      expect(md.title).toBe(c.metaTitle);
    }
  });

  it('4. the route builds its metadata through collectionMetadata()', () => {
    const src = stripComments(fs.readFileSync(PAGE, 'utf8'));
    expect(src).toMatch(/collectionMetadata\(collection\)/);
    // No inline openGraph block left in the page: the lib is the only place
    // metadata is assembled, so the test above covers what production emits.
    expect(src).not.toMatch(/openGraph\s*:/);
  });

  it('5. a slug without covers yields no image rather than a broken one', () => {
    const fake = { ...SIMS4_COLLECTIONS[0], slug: 'no-such-collection-xyz' };
    expect(collectionOgImage(fake)).toBeNull();
    const md = collectionMetadata(fake);
    expect((md.openGraph as { images?: unknown[] }).images).toEqual([]);
    expect((md.twitter as { images?: unknown[] }).images).toEqual([]);
  });
});
