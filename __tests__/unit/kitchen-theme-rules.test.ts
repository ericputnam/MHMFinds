import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { KITCHEN_THEME, applyKitchenTheme, isKitchenTitle } from '@/lib/kitchenThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-09-25 audit of the
// `kitchen` theme (345 SFW Sims 4 rows, 34.2% title-supported before the repair).

describe('isKitchenTitle — rows the old description/keyword pass got wrong', () => {
  // Tagged kitchen before 09-25 by a shared blog-post description or the
  // 'cooking' / 'chef' / 'culinary' keywords; none says kitchen in the title.
  it.each([
    'Realistic Cooking Mod', // was card #2 (639 downloads) — the old 'cooking' keyword
    'Soul food',
    'Breakfast Foods',
    'Kellogg’s Set',
    'Sims 4 Freelance Chef Active Career', // the old 'chef' keyword
    'Culinary Caddy Add-On', // the old 'culinary' keyword
    'Srsly’s Complete Cooking Overhaul',
    'Luma House', // whole-house lots were 47 of 345 rows
    'Caribbean Recipe Pack',
    'Counter Kissing Animation',
  ])('rejects %s', (title) => {
    expect(isKitchenTitle(title)).toBe(false);
  });

  // Kitchen-titled things that are not kitchen CC (the veto list).
  it.each([
    'Apron for Kitchen',
    'Apron for Kitchen and Bakery',
    'Sims 4 Seasonal and Sayings Kitchen Apron',
    'Sims 4 Toddler Play Kitchen Mod',
    'Petit Chef Kitchen Kid Toddler CC Sims 4',
    'Punk Pitstop Appliances', // a foosball table and a drinks tray
  ])('rejects %s', (title) => {
    expect(isKitchenTitle(title)).toBe(false);
  });

  // Rejected-candidate words (see the header of lib/kitchenThemeRules.ts).
  it.each([
    'Cottage-Inspired Fireplace Stove',
    'Sims 4 Furniture Stove Set', // a potbelly stove
    'Love Island Challenge',
    'Coffee Lipstick',
    'Fancy Pots Fancy Plants!',
    'Pumpkin Spice Cowlneck Sweater',
    'Mid Century Modern Cabinet',
    'Old-Fashioned Well as Outdoor Sink',
  ])('rejects %s', (title) => {
    expect(isKitchenTitle(title)).toBe(false);
  });
});

describe('isKitchenTitle — title evidence it must accept', () => {
  it.each([
    'Manon Kitchen Set', // card #1
    'Mega Kitchen Clutter Pack',
    'The Appliance Collection',
    'Stainless Steel Fridge and Stove',
    'Country Cottage Refrigerator',
    'Keep Life Simple Kitchen Dishwasher',
    'Naturalis Pantry Foods',
    'Small Spaces: Pantry Room CC Pack',
    'Soho Kitchenware Pt. 1 & 2',
    'Sims 4 50s CC Tea Kettle',
    'IND Restaurant – The Kitchen Area',
    'Kitchen Backsplashes 2',
  ])('accepts %s', (title) => {
    expect(isKitchenTitle(title)).toBe(true);
  });

  it('treats null / empty titles as no evidence', () => {
    expect(isKitchenTitle(null)).toBe(false);
    expect(isKitchenTitle('')).toBe(false);
  });
});

describe('applyKitchenTheme', () => {
  it('strips kitchen but preserves every other theme in order', () => {
    expect(applyKitchenTheme(['modern', 'kitchen', 'y2k'], 'Soul food')).toEqual(['modern', 'y2k']);
  });
  it('adds kitchen once when the title supports it', () => {
    expect(applyKitchenTheme(['bathroom'], 'Wine Fridge')).toEqual(['bathroom', KITCHEN_THEME]);
    expect(applyKitchenTheme(['kitchen'], 'Grunge Kitchen')).toEqual([KITCHEN_THEME]);
  });
});

describe('detectRoomThemes — the ingest path uses the same title-only rule', () => {
  it('tags kitchen from the title and never from the description', () => {
    expect(detectRoomThemes('Isla Refrigerator', 'a three-door fridge')).toContain(KITCHEN_THEME);
    expect(
      detectRoomThemes('Breakfast Foods', 'Fill your sims’ kitchen with cooking clutter from our chef.'),
    ).not.toContain(KITCHEN_THEME);
    expect(detectRoomThemes('Realistic Cooking Mod', 'cooking in the kitchen')).not.toContain(KITCHEN_THEME);
  });

  it('lists the title-only room themes as supported', () => {
    expect(getSupportedRoomThemes()).toEqual(expect.arrayContaining([KITCHEN_THEME, 'bedroom']));
  });
});

describe('source guard — neither detector can regain a kitchen keyword rule', () => {
  // Comments in this repo quote the bad patterns they warn about, so strip
  // them before asserting anything about the code.
  const src = readFileSync(join(process.cwd(), 'lib/services/contentTypeDetector.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  it('has no keyword rule for the kitchen theme in ROOM_THEME_RULES', () => {
    expect(src).not.toMatch(/theme:\s*['"]kitchen['"]/);
    expect(src).not.toMatch(/['"]culinary['"]/);
    expect(src).not.toMatch(/['"]dining kitchen['"]/);
  });

  it('derives kitchen through the shared title-only rule', () => {
    expect(src).toContain('isKitchenTitle(title)');
    expect(src).toMatch(/from\s+['"]\.\.\/kitchenThemeRules['"]/);
  });

  it('the AI facet extractor cannot emit a kitchen theme (validateThemes filters to FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(KITCHEN_THEME)).toBe(false);
  });
});

describe('kitchen-cc collection is backed by the repaired theme', () => {
  it('filters on the shared theme constant', () => {
    const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'kitchen-cc');
    expect(c?.filter.themesAny).toEqual([KITCHEN_THEME]);
    expect(c?.expectedCount).toBeGreaterThanOrEqual(20);
  });
});
