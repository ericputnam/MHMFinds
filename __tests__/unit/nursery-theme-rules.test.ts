import { describe, it, expect } from 'vitest';
import {
  NURSERY_THEME,
  applyNurseryTheme,
  isNurseryTitle,
} from '@/lib/nurseryThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-11-13 audit (E404) of
// every row tagged `nursery` (100) and every title carrying a nursery word
// across 17,396 rows.

describe('isNurseryTitle — accepted titles', () => {
  it.each([
    'Functional Infant Cribs', // card #1, 783 downloads
    'Jenny Sims 4 Nursery Furniture CC – Severinka',
    'Changing Tables and Baby Decor',
    'Contemporary Changing Table',
    'Sims 4 Crib CC – Pink Baddie',
    'Pandasama Toddler Crib Recolor',
    'Nautical Ocean Nursery Art', // typed hair; the type is wrong, not the theme
    'Nursery Walls',
    'Old Age Nursery – infant crib',
  ])('accepts %s', (title) => {
    expect(isNurseryTitle(title)).toBe(true);
  });
});

describe('isNurseryTitle — rejected titles (counts in lib/nurseryThemeRules.ts)', () => {
  it.each([
    'LittleMsSam’s Pregnancy Overhaul Mod', // was card #5 under the description rule
    'Slow Infant Needs',
    'Invisible Baby Crib Default Object', // invisible exclusion
    'Sims 4 Invisible Bassinet Mod', // bassinet 1, invisible
    'Sims 4 Toddler Room CC Set', // toddler room 6 → kids-room
    'Sims 4 Newborn Poses', // newborn 3
    'Functional Sims 4 Infant Playmat', // playmat 3
    'SimtriBullet Baby Set', // bare baby 79
    'Sims 4 Scribble Art Station', // 'crib' inside a word
    '',
  ])('rejects %s', (title) => {
    expect(isNurseryTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isNurseryTitle(null)).toBe(false);
    expect(isNurseryTitle(undefined)).toBe(false);
  });
});

describe('applyNurseryTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyNurseryTheme(['goth', 'kids-room'], 'Goth Nursery')).toEqual(['goth', 'kids-room', NURSERY_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyNurseryTheme(['outdoor', NURSERY_THEME], 'Briarheart Cottage')).toEqual(['outdoor']);
    expect(applyNurseryTheme([NURSERY_THEME], 'Boho Nursery')).toEqual([NURSERY_THEME]);
  });
});

describe('nursery is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Lullaby Nursery Set')).toContain(NURSERY_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'The best Sims 4 nursery CC: cribs, baby room sets and newborn decor for your infant.';
    expect(detectRoomThemes('Slow Infant Needs', desc)).not.toContain(NURSERY_THEME);
    expect(detectRoomThemes('Sims 4 Toddler Room CC Set', desc)).not.toContain(NURSERY_THEME);
  });
  it('getSupportedRoomThemes still lists it', () => {
    expect(getSupportedRoomThemes()).toContain(NURSERY_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(NURSERY_THEME)).toBe(false);
  });
});

describe('/games/sims-4/nursery-cc/', () => {
  const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'nursery-cc');
  it('filters on exactly this theme', () => {
    expect(c?.filter).toEqual({ themesAny: [NURSERY_THEME] });
  });
  it('clears the 20-mod traffic-page bar', () => {
    expect(c!.expectedCount).toBeGreaterThanOrEqual(20);
  });
  it('is linked from kids-cc and pregnancy-mods (E404)', () => {
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'kids-cc')!.related).toContain('nursery-cc');
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'pregnancy-mods')!.related).toContain('nursery-cc');
  });
  it('intro is 200–400 words', () => {
    const words = c!.intro.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(200);
    expect(words).toBeLessThanOrEqual(400);
  });
});
