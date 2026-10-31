import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { CHRISTMAS_THEME, applyChristmasTheme, isChristmasTitle } from '@/lib/christmasThemeRules';
import { detectRoomThemes } from '@/lib/services/contentTypeDetector';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-10-31 audit (E307) of the
// `christmas` theme (312 rows, 59.6% title-supported before the repair) and of
// every whole-word Christmas candidate across 17,132 rows.

describe('isChristmasTitle — accepted words (counts in lib/christmasThemeRules.ts)', () => {
  it.each([
    'Christmas Tree Set',
    'Merry Christmas 2025', // 17 dl
    'Christmas Elf Costume',
    'Xmas Loading Screen',
    'X-Mas Industry Fireplace',
    'Winterfest Dream House',
    '6 Winterfest CC Hairs',
    'Santa Time Pose Pack',
    'Santa’s Angels – Xmas Accessories', // curly apostrophe after a whole word
    'Father Winter As Santa: A Default Replacement',
    'Christmassy Fireplace', // 'christmassy' — found in the first dry run's STRIP list
    'Under The Mistletoe',
    'Gingerbread PJ Set',
    'Candy Cane Nails',
    'Jingle Bells Set',
  ])('accepts %s', (title) => {
    expect(isChristmasTitle(title)).toBe(true);
  });
});

describe('isChristmasTitle — rows the description/keyword pass got wrong', () => {
  // Tagged christmas before 10-31; none of them says so in the title.
  it.each([
    'Beard N3', // was card #3 (39 dl)
    'FSP Family Portrait', // was card #4
    'Sims 4 Vampire Couple Poses',
    'Wall Decals 5',
    'Crystal Wallow Mansion', // a gym
    '25 Vacation Days',
    'Aurum Bedroom Decorations',
    'Infant Elf Sleeper', // 'elf' rejected
  ])('rejects %s', (title) => {
    expect(isChristmasTitle(title)).toBe(false);
  });

  // Rejected-candidate words, each with the real title that justified it.
  it.each([
    'Festive Appetizers', // 'festive' = any holiday
    '94 Festive Glam Set',
    'Holiday Wonderland Dining', // 'holiday' is holidays-cc territory
    'Winter Holidays Set',
    'Merry Nails', // bare 'merry'
    '62 Merry Modieval',
    'Advent Calendar Car Poses', // a December release, not Christmas CC
    'Evergreen Holiday Tree', // 6 dl; probably a Christmas tree, title does not say so
    'Deck The Halls Pose Pack',
    'Chistmas Dress', // typo row — not evidence
    'Elf Bar Vape', // 1,089 dl
    'Blood Elf Village',
    'Aura Stockings', // hosiery, 369 dl
    'Holly Hair V2', // a name
    'Snowflake Hospital Center', // winter, not Christmas
    'Noel Beard N32',
    'New Year Party Dress',
    'Candy Corn Fudge', // 'candy' alone is Halloween food
    '',
  ])('rejects %s', (title) => {
    expect(isChristmasTitle(title)).toBe(false);
  });

  it('does not match inside another word', () => {
    expect(isChristmasTitle('Santander Bank Lot')).toBe(false);
    expect(isChristmasTitle('Xmasterpiece')).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isChristmasTitle(null)).toBe(false);
    expect(isChristmasTitle(undefined)).toBe(false);
  });
});

describe('applyChristmasTheme', () => {
  it('adds the theme once and preserves the others in order', () => {
    expect(applyChristmasTheme(['winter', 'cozy'], 'Christmas Tree Set')).toEqual(['winter', 'cozy', CHRISTMAS_THEME]);
    expect(applyChristmasTheme([CHRISTMAS_THEME], 'Xmas Pants')).toEqual([CHRISTMAS_THEME]);
  });
  it('strips the theme when the title does not support it', () => {
    expect(applyChristmasTheme(['winter', CHRISTMAS_THEME, 'cozy'], 'Beard N3')).toEqual(['winter', 'cozy']);
  });
});

describe('christmas is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Christmas Living Room Set')).toContain(CHRISTMAS_THEME);
    expect(detectRoomThemes('Winterfest Park')).toContain(CHRISTMAS_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'The best Sims 4 Christmas CC: trees, Santa outfits and festive holiday decor for your sims.';
    expect(detectRoomThemes('Beard N3', desc)).not.toContain(CHRISTMAS_THEME);
  });

  // `christmas` IS in FACET_VALUES.themes (the AI prompt may emit it), so the
  // guard is the halloween one: no keyword maps to it, the keyword pass uses the
  // shared title rule, and an AI-only christmas is filtered at the merge.
  const src = readFileSync(join(process.cwd(), 'lib/services/aiFacetExtractor.ts'), 'utf8')
    // strip comments: they quote the removed keywords on purpose
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('the facet extractor maps no keyword to the christmas theme', () => {
    expect(src).not.toMatch(/:\s*'christmas'/);
  });
  it('the facet extractor uses the shared title rule and filters AI-only christmas tags', () => {
    expect(src).toMatch(/isChristmasTitle\(title\)/);
    expect(src).toMatch(/t !== CHRISTMAS_THEME \|\| keywordFacets\.themes\.includes\(CHRISTMAS_THEME\)/);
  });

  it('/games/sims-4/christmas-cc/ filters on exactly this theme', () => {
    const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'christmas-cc');
    expect(c?.filter).toEqual({ themesAny: [CHRISTMAS_THEME] });
    // autonomy.md Tier 0: a collection page must have >= 20 mods.
    expect(c?.expectedCount).toBeGreaterThanOrEqual(20);
  });
});
