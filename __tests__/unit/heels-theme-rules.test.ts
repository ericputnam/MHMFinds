import { describe, it, expect } from 'vitest';
import { HEELS_THEME, applyHeelsTheme, isHeelsTitle } from '@/lib/heelsThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-11-06 audit (E362) of
// every title containing heel / stiletto / pump across 17,250 rows.

describe('isHeelsTitle — accepted titles', () => {
  it.each([
    'Playb**ch Heels', // card #1, 635 downloads
    'Camille Heels',
    'Rica High Heels',
    'Leather high-Heel boots',
    'Denim Heeled Boots',
    'Sim-heeled boots',
    'Wedge Heel Slippers',
    'Block Heel Mary Janes',
    'Glitter Bow Stilettos S594',
    'Knee High Stiletto Boots',
    'Amina Muaddi Suede Pumps',
    '(80’s Things) Retro Peep Toe Elegant Pumps',
    'Edgy Sims 4 CC Heels',
  ])('accepts %s', (title) => {
    expect(isHeelsTitle(title)).toBe(true);
  });
});

describe('isHeelsTitle — rejected titles (counts in lib/heelsThemeRules.ts)', () => {
  it.each([
    'Valentine Long Stiletto Nails', // a nail shape
    'Oh My Goth – Long Stiletto Pierced Nails',
    'My Heel Perfume', // decor
    'Chanel Stiletto Flat', // a flat
    '2 Hell In Heel Clothing Set', // an outfit collection
    'Sims 4 50s Halter Top & Heels', // the download is the top
    'Pumped Hips & Thighs Body Preset', // not whole-word "pumps"
    'Pumpkin Spice Loading Screen',
    'The Sims 4 Wheelchair Functional', // "heel" inside "wheel"
    'Wheeler Hair Sims 4 Stranger Things CC',
    'Kio Platform Sneakers', // platform alone is not evidence
    '',
  ])('rejects %s', (title) => {
    expect(isHeelsTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isHeelsTitle(null)).toBe(false);
    expect(isHeelsTitle(undefined)).toBe(false);
  });
});

describe('applyHeelsTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyHeelsTheme(['goth', 'grunge'], 'Oh My Goth – Skull Heels')).toEqual(['goth', 'grunge', HEELS_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyHeelsTheme(['vintage', HEELS_THEME], 'Valentine Long Stiletto Nails')).toEqual(['vintage']);
    expect(applyHeelsTheme([HEELS_THEME], 'Sola Heels')).toEqual([HEELS_THEME]);
  });
});

describe('heels is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Lace Platform Heels')).toContain(HEELS_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'Pair this dress with the best Sims 4 heels, stilettos and pumps for a night out.';
    expect(detectRoomThemes('Satin Slip Dress', desc)).not.toContain(HEELS_THEME);
  });
  it('getSupportedRoomThemes lists it', () => {
    expect(getSupportedRoomThemes()).toContain(HEELS_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(HEELS_THEME)).toBe(false);
  });
});

describe('/games/sims-4/heels-cc/', () => {
  const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'heels-cc');
  it('filters on exactly this theme', () => {
    expect(c?.filter).toEqual({ themesAny: [HEELS_THEME] });
  });
  it('clears the 20-mod traffic-page bar', () => {
    expect(c!.expectedCount).toBeGreaterThanOrEqual(20);
  });
  it('is linked from female-clothes, the busiest collection page (E362)', () => {
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'female-clothes')!.related).toContain('heels-cc');
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'shoes-cc')!.related).toContain('heels-cc');
  });
  it('intro is 200–400 words', () => {
    const words = c!.intro.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(200);
    expect(words).toBeLessThanOrEqual(400);
  });
});
