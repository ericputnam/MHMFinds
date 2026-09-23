/**
 * Creator pages (/creator/[slug]/, Nova E85, 2026-09-23).
 *
 * Offline, source-level: the slug helpers are pure, and the wiring checks
 * read files from disk (no DB, no network).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { authorSlug, creatorHref, isJunkAuthorSlug } from '../../lib/creatorSlug';

const ROOT = path.resolve(__dirname, '../..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

describe('authorSlug', () => {
  it('folds case and punctuation so every stored spelling maps to one page', () => {
    // Real variants from the catalog on 2026-09-23.
    expect(authorSlug('Ravasheen')).toBe('ravasheen');
    expect(authorSlug('RAVASHEEN')).toBe('ravasheen');
    expect(authorSlug('LittleMsSam')).toBe('littlemssam');
    expect(authorSlug('Severinka_')).toBe('severinka');
    expect(authorSlug('Severinka ')).toBe('severinka');
    expect(authorSlug('SIMcredible!')).toBe('simcredible');
    expect(authorSlug('Joan Campbell Beauty ')).toBe('joan-campbell-beauty');
    expect(authorSlug('Beto_ae0')).toBe('beto-ae0');
  });

  it('never yields leading/trailing dashes or uppercase', () => {
    for (const s of ['  --x--  ', '!!!', 'A.B.C', 'Seoulsoul-sims']) {
      const slug = authorSlug(s);
      expect(slug).toBe(slug.toLowerCase());
      expect(slug.startsWith('-')).toBe(false);
      expect(slug.endsWith('-')).toBe(false);
    }
  });
});

describe('isJunkAuthorSlug', () => {
  it('rejects the scraper fallback strings (bare ids, title + post id, too short)', () => {
    expect(isJunkAuthorSlug(authorSlug('75940181'))).toBe(true);
    expect(isJunkAuthorSlug(authorSlug('Kobe Sweats 135179830'))).toBe(true);
    expect(isJunkAuthorSlug(authorSlug('January 2024 Set 96368659'))).toBe(true);
    expect(isJunkAuthorSlug(authorSlug(''))).toBe(true);
    expect(isJunkAuthorSlug(authorSlug('!!'))).toBe(true);
  });

  it('keeps real creator names, including ones with digits', () => {
    expect(isJunkAuthorSlug('ravasheen')).toBe(false);
    expect(isJunkAuthorSlug('rebellesims420')).toBe(false);
    expect(isJunkAuthorSlug('beto-ae0')).toBe(false);
    expect(isJunkAuthorSlug('seoulsoul-sims')).toBe(false);
  });
});

describe('creatorHref', () => {
  it('always carries the trailing slash (trailingSlash: true 308s bare paths)', () => {
    expect(creatorHref('ravasheen')).toBe('/creator/ravasheen/');
  });
});

describe('wiring', () => {
  it('lib/creators.ts SQL normalises the author the same way authorSlug does', () => {
    // The SQL expression and the TS function must agree or a linked author
    // 404s on its own page. Guard the exact expression text in both files.
    const expr = `trim(both '-' from lower(regexp_replace(author, '[^A-Za-z0-9]+', '-', 'g')))`;
    expect(read('lib/creators.ts')).toContain(expr);
    expect(read('app/sitemap-creators.xml/route.ts')).toContain(expr);
  });

  it('the creator page is registered in the sidebar guard and the sitemap index', () => {
    expect(read('__tests__/unit/sidebar-sticky-health.test.ts')).toContain(
      'app/creator/[slug]/CreatorPageClient.tsx',
    );
    expect(read('app/sitemap.xml/route.ts')).toContain('/sitemap-creators.xml');
  });

  it('the mod page links the author to the creator page', () => {
    const src = read('app/mods/[id]/ModDetailClient.tsx');
    expect(src).toContain('creatorHref(authorSlug(mod.author))');
  });
});
