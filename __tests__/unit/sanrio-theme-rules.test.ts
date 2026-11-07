import { describe, it, expect } from 'vitest';
import { SANRIO_THEME, applySanrioTheme, isSanrioTitle } from '@/lib/sanrioThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-11-07 audit (E373) of
// every Sanrio-named title across 17,279 rows.

describe('isSanrioTitle — accepted titles', () => {
  it.each([
    'Striped Hello Kitty Nails', // card #1
    'Hello Kitty Set W Pom Pom',
    'Hello Kitty Vanity',
    'Sanrio Theme CAS Background',
    'ACPC Sanrio Plushies Set',
    'Sweet My Melody Wallpaper',
    'My Melody and Sweet Piano Bag',
    'ACGN CAS Background + Cinnamoroll Mirror',
    'Cinnamoroll & Mocha Recolor Pajama Set',
    'Pompompurin Sleepwear Set',
    'Pochacco Plumbob',
    'Sanrio Ramen Bowl Plumbob Override',
    'Sanrio Klaws',
  ])('accepts %s', (title) => {
    expect(isSanrioTitle(title)).toBe(true);
  });
});

describe('isSanrioTitle — rejected titles (counts in lib/sanrioThemeRules.ts)', () => {
  it.each([
    'Aggressivekitty Seaside Home Collection', // a creator name
    'The Gothic Kitty – A Little Gothic Collection',
    'Kitty Hair',
    'Toddler Kitty Nails',
    'Kitty Cat Leg Warmers',
    'Kitty Kat Dress',
    'Moonlight Melody Tights',
    'Melody Poses',
    'Melody #1', // a My Melody plumbob per E343, but the title does not say so
    'Kawaii Space Buns', // kawaii is an aesthetic, not the brand
    'Cute and kawaii doll collection',
    '',
  ])('rejects %s', (title) => {
    expect(isSanrioTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isSanrioTitle(null)).toBe(false);
    expect(isSanrioTitle(undefined)).toBe(false);
  });
});

describe('applySanrioTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applySanrioTheme(['kitchen'], 'Hello Kitty Fridge')).toEqual(['kitchen', SANRIO_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applySanrioTheme(['cozy', SANRIO_THEME], 'Kitty Hair')).toEqual(['cozy']);
    expect(applySanrioTheme([SANRIO_THEME], 'Hello Kitty Top')).toEqual([SANRIO_THEME]);
  });
});

describe('sanrio is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Hello Kitty Plumbob')).toContain(SANRIO_THEME);
    expect(detectRoomThemes('Sanrio Bucket Hats')).toContain(SANRIO_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'The cutest Sims 4 Hello Kitty CC and Sanrio CC: My Melody, Cinnamoroll and Kuromi finds for your kawaii Sims.';
    expect(detectRoomThemes('Kawaii Pose Pack', desc)).not.toContain(SANRIO_THEME);
  });
  it('getSupportedRoomThemes lists it', () => {
    expect(getSupportedRoomThemes()).toContain(SANRIO_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(SANRIO_THEME)).toBe(false);
  });
});

describe('/games/sims-4/hello-kitty-cc/', () => {
  const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'hello-kitty-cc');
  it('filters on exactly this theme', () => {
    expect(c?.filter).toEqual({ themesAny: [SANRIO_THEME] });
  });
  it('clears the 20-mod traffic-page bar', () => {
    expect(c!.expectedCount).toBeGreaterThanOrEqual(20);
  });
  it('has two inbound related links (nails-cc, plumbob-overrides)', () => {
    const inbound = SIMS4_COLLECTIONS.filter((x) => x.related.includes('hello-kitty-cc')).map((x) => x.slug).sort();
    expect(inbound).toEqual(['nails-cc', 'plumbob-overrides']);
  });
  it('intro is 200–400 words', () => {
    const words = c!.intro.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(200);
    expect(words).toBeLessThanOrEqual(400);
  });
});
