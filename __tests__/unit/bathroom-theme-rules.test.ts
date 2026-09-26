import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BATHROOM_THEME, applyBathroomTheme, isBathroomTitle } from '@/lib/bathroomThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { BEDROOM_THEME } from '@/lib/bedroomThemeRules';
import { KITCHEN_THEME } from '@/lib/kitchenThemeRules';

// Fixtures are real production titles from the 2026-09-26 audit of the
// `bathroom` theme (456 SFW Sims 4 rows, 33.8% title-supported before the repair).

describe('isBathroomTitle — rows the old description/substring pass got wrong', () => {
  // Tagged bathroom before 09-26 by a shared blog-post description or a
  // substring ('tub' in "Tube"); none says bathroom in the title.
  it.each([
    'Wicked Whims', // was card #1 (2,239 downloads)
    'Functional Skincare Mod', // was card #2
    'Love Language Mod',
    'Pregnancy Test & Birth Control Clutter',
    'Noel Beard N32',
    'MM Modern House 155',
    'Short Cardigan & Ruffle Tube Top Dress', // substring 'tub'
    'Heavy Stubble Facial Hair', // substring 'tub'
    'Bathory Hair – Halloween Treat 1', // substring 'bath'
    'Asian Restaurant', // was tagged by a shared description
  ])('rejects %s', (title) => {
    expect(isBathroomTitle(title)).toBe(false);
  });

  // Weak-word titles the veto list overrules.
  it.each([
    'Sims 4 Baby Shower Event Mod',
    'Sims 4 Bridal Shower Event Mod',
    'Baby Shower Pose Pack',
    'Shower Cap Hat Conversion',
    'Shower Talk Poses',
    'Shower Tweaks',
    'Shower Woohoo Tweaks',
    'Cuddle and Bath Together', // would have been card #1 (598 downloads)
    'Quick Shower and Quick Bath',
    'Outdoor Hot Tub Set',
    'Spa Hot Tub Aspen Collection',
    'Protein Shaker And Protein Powder Tub',
    'Bath & Body Works Candle – Winter Collection',
  ])('rejects %s', (title) => {
    expect(isBathroomTitle(title)).toBe(false);
  });

  // Rejected-candidate words (see the header of lib/bathroomThemeRules.ts).
  it.each([
    'Kuhnå Sink Item',
    'Old-Fashioned Well as Outdoor Sink',
    'Vanity Locs',
    'Hello Kitty Vanity',
    'Myshuno Salon & Spa',
    'Sims 4 Laundry Room Clutter',
    'The Primary Bedroom With En-Suite',
    'Sims 4 Soap Brows',
    'Sims 4 Men’s Bathing Suit Recolor',
  ])('rejects %s', (title) => {
    expect(isBathroomTitle(title)).toBe(false);
  });
});

describe('isBathroomTitle — title evidence it must accept', () => {
  it.each([
    'Sims 4 Bathroom CC Pack', // card #1 after the repair
    'Luxe Bathroom Set',
    'Bathroom Clutter Collection',
    'Magnesium Shower',
    'Naturalis Shower',
    'Nordic Bath Shower',
    'Sims 4 Bath Clutter CC',
    'Skara Bath Mat',
    'Bed & Bath Sims 4 Furniture CC Pack',
    'Base Game Bathtubs',
    'Orbita Tub',
    'Bidet As It May Shower Tub Glass Combo',
    'Sims 4 Washroom Set',
    'Public Restroom Set',
    'Powder Room Wallpaper Collection',
    'Toilet Rug Set 3',
    'Hövolm Wooden Towel Racks',
    'Kids Ducky Bathroom Set', // strong words are never vetoed
  ])('accepts %s', (title) => {
    expect(isBathroomTitle(title)).toBe(true);
  });

  it('treats null / empty titles as no evidence', () => {
    expect(isBathroomTitle(null)).toBe(false);
    expect(isBathroomTitle('')).toBe(false);
  });
});

describe('applyBathroomTheme', () => {
  it('strips bathroom but preserves every other theme in order', () => {
    expect(applyBathroomTheme(['modern', 'bathroom', 'y2k'], 'Wicked Whims')).toEqual(['modern', 'y2k']);
  });
  it('adds bathroom once when the title supports it', () => {
    expect(applyBathroomTheme(['kitchen'], 'Onda Shower')).toEqual(['kitchen', BATHROOM_THEME]);
    expect(applyBathroomTheme(['bathroom'], 'Pink Bathroom Set')).toEqual([BATHROOM_THEME]);
  });
});

describe('detectRoomThemes — the ingest path uses the same title-only rule', () => {
  it('tags bathroom from the title and never from the description', () => {
    expect(detectRoomThemes('Xero Shower', 'a glass shower cubicle')).toContain(BATHROOM_THEME);
    expect(
      detectRoomThemes('Functional Skincare Mod', 'Your sims can use the bathroom mirror, shower and tub.'),
    ).not.toContain(BATHROOM_THEME);
    expect(detectRoomThemes('Sims 4 Baby Shower Event', 'a party')).not.toContain(BATHROOM_THEME);
  });

  it('lists every title-only room theme as supported', () => {
    expect(getSupportedRoomThemes()).toEqual(
      expect.arrayContaining([BATHROOM_THEME, KITCHEN_THEME, BEDROOM_THEME]),
    );
  });
});

describe('source guard — neither detector can regain a bathroom keyword rule', () => {
  // Comments in this repo quote the bad patterns they warn about, so strip
  // them before asserting anything about the code.
  const src = readFileSync(join(process.cwd(), 'lib/services/contentTypeDetector.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('has no keyword rule for the bathroom theme in ROOM_THEME_RULES', () => {
    expect(src).not.toMatch(/theme:\s*['"]bathroom['"]/);
    expect(src).not.toMatch(/['"]lavatory['"]/);
  });

  it('derives bathroom through the shared title-only rule', () => {
    expect(src).toContain('isBathroomTitle(title)');
    expect(src).toMatch(/from\s+['"]\.\.\/bathroomThemeRules['"]/);
  });

  it('the AI facet extractor cannot emit a bathroom theme (validateThemes filters to FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(BATHROOM_THEME)).toBe(false);
  });
});

describe('bathroom-cc collection is backed by the repaired theme', () => {
  it('filters on the shared theme constant', () => {
    const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'bathroom-cc');
    expect(c?.filter.themesAny).toEqual([BATHROOM_THEME]);
    expect(c?.expectedCount).toBeGreaterThanOrEqual(20);
  });
});
