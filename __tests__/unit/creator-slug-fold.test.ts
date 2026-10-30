/**
 * E293 (Nova, 2026-10-30): one creator, one page.
 *
 * "sixam-cc" (16 mods) and "sixamcc" (11) were two indexed /creator/ pages
 * for one creator; 108 such split groups on 2026-10-30. The fold key drops
 * every separator, the canonical URL is the dash-slug with the most mods, and
 * every other spelling 308s there. These cases are red on pre-E293 main
 * (creatorKey / canonicalCreatorSlug / creatorRedirectSlug did not exist, and
 * findAuthorVariants matched the dash-slug).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  authorSlug,
  canonicalCreatorSlug,
  creatorKey,
  creatorRedirectSlug,
} from '../../lib/creatorSlug';
import { creatorHrefFor } from '../../lib/creatorMods';

const read = (p: string) => readFileSync(join(__dirname, '..', '..', p), 'utf8');
const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1').replace(/--.*$/gm, '');

describe('creatorKey folds spaced and run-together spellings', () => {
  it.each([
    ['Sixam CC', 'SixamCC'],
    ['sixam-cc', 'sixamcc'],
    ['Marsmerizing Sims', 'MarsmerizingSims'],
    ['The Clutter Cat', 'thecluttercat'],
    ['Nekochan Simmer', 'nekochansimmer'],
  ])('%s == %s', (a, b) => {
    expect(creatorKey(a)).toBe(creatorKey(b));
  });

  it('a slug and its author fold to the same key', () => {
    for (const a of ['Sixam CC', 'D.O.Lilac', 'A Deep Indigo', 'gege_sims']) {
      expect(creatorKey(authorSlug(a))).toBe(creatorKey(a));
    }
  });

  it('different creators stay different', () => {
    expect(creatorKey('Sixam')).not.toBe(creatorKey('Sixam CC'));
  });
});

describe('canonicalCreatorSlug picks the dash-slug with the most mods', () => {
  it('sums spellings per slug before choosing (16 vs 11 → sixam-cc)', () => {
    const variants = [
      { author: 'SixamCC', mods: 11 },
      { author: 'Sixam CC', mods: 9 },
      { author: 'sixam cc', mods: 7 },
    ];
    expect(canonicalCreatorSlug(variants, 'sixamcc')).toBe('sixam-cc');
  });

  it('ties break by slug ASC (byte order, as the SQL uses COLLATE "C")', () => {
    const variants = [
      { author: 'Twisted Cat', mods: 5 },
      { author: 'TwistedCat', mods: 5 },
    ];
    expect(canonicalCreatorSlug(variants, 'twistedcat')).toBe('twisted-cat');
  });

  it('no variants → the requested slug', () => {
    expect(canonicalCreatorSlug([], 'whoever')).toBe('whoever');
  });
});

describe('creatorRedirectSlug', () => {
  it('redirects a non-canonical spelling to the canonical one', () => {
    expect(creatorRedirectSlug('sixamcc', 'sixam-cc', false)).toBe('sixam-cc');
  });
  it('never redirects the canonical slug to itself', () => {
    expect(creatorRedirectSlug('sixam-cc', 'sixam-cc', false)).toBeNull();
  });
  it('never redirects a slug that holds a CreatorProfile', () => {
    expect(creatorRedirectSlug('sacrificial-mods', 'sacrificialmods', true)).toBeNull();
  });
});

describe('mod-page author link goes straight to the canonical page (no 308 hop)', () => {
  it('uses the folded variants when given', () => {
    const variants = [
      { author: 'Sixam CC', mods: 16 },
      { author: 'SixamCC', mods: 11 },
    ];
    expect(creatorHrefFor('SixamCC', 27, variants)).toBe('/creator/sixam-cc/');
  });
  it('without variants keeps the pre-E293 behaviour', () => {
    expect(creatorHrefFor('SixamCC', 11)).toBe('/creator/sixamcc/');
  });
});

describe('wiring: SQL and pages use the fold', () => {
  const lib = stripComments(read('lib/creators.ts'));
  it('listCreators and findAuthorVariants group by the separator-free key', () => {
    const fold = /regexp_replace\(lower\(author\), '\[\^a-z0-9\]\+', '', 'g'\)/g;
    expect((lib.match(fold) ?? []).length).toBeGreaterThanOrEqual(2);
    expect(lib).toContain('creatorKey(slug)');
    expect(lib).toMatch(/GROUP BY ckey/);
  });
  it('the SQL canonical-slug tie-break is byte order, matching JS string compare', () => {
    expect(lib).toMatch(/slug COLLATE "C" ASC/);
  });
  it('getCreatorPageData returns redirectTo from creatorRedirectSlug', () => {
    expect(lib).toMatch(/redirectTo = creatorRedirectSlug\(slug, canonicalCreatorSlug\(variants, slug\), Boolean\(profile\)\)/);
  });
  it.each([
    ['app/creator/[slug]/page.tsx', 'permanentRedirect(creatorHref(data.redirectTo))'],
    ['app/creator/[slug]/badge/page.tsx', 'permanentRedirect(badgeHref(data.redirectTo))'],
  ])('%s 308s a non-canonical spelling', (file, call) => {
    expect(stripComments(read(file))).toContain(call);
  });
});
