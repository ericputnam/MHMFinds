import { describe, it, expect } from 'vitest';
import {
  HEADWEAR_THEME,
  applyHeadwearTheme,
  isHeadwearTitle,
} from '@/lib/headwearThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-11-09 audit (E382) of
// every title carrying a headwear word across 17,284 rows.

describe('isHeadwearTitle — accepted titles', () => {
  it.each([
    'Nike Skull Cap', // card #1, 646 downloads
    'Ushanka Hat Set',
    'Bonnet for Infants',
    'Younzoey Beanie Recolor',
    'Backward Strapped Baseball Hat',
    'Daydreamin’ DIY Basecap Set',
    'Spiky Snapback Cap',
    'Leslie Visor',
    'Equestrian Riding Helmets',
    'Ade-caleb Bandana',
    'Noir Headwear',
    'Late Victorian Hair & Hat Set',
    'Shower Cap Hat Conversion', // typed furniture, is a worn cap
  ])('accepts %s', (title) => {
    expect(isHeadwearTitle(title)).toBe(true);
  });
});

describe('isHeadwearTitle — rejected titles (counts in lib/headwearThemeRules.ts)', () => {
  it.each([
    'Graduation Cap & Gown',
    'Policewoman Costume + Hat',
    'TSM Aarbyville Outfits and Hats',
    'Medieval Concert Uniform – Dress and Hat',
    'Knit Swimwear and Hat Set',
    'Nike Puffer Jacket and Nike Beanie',
    'Western Shirt with Bandana Detail',
    'Hello Darlin’ Pose Pack + Cowboy Hat Accessory',
    'Santa Hat and Christmas Lights',
    'Peach Pocket Pajama & Hat',
    'Lamp Of Many Hats',
    'The Snowman in The Hat',
    'Remove Hats and More Indoors',
    // words measured and not accepted on their own
    'Crown Setting Diamond Studded Earrings',
    'Prom Queen Tiara',
    'Sims 4 Long Curly Hair with Headband',
    'Hood Princess Tattoos',
    'Cathedral Wedding Veil CC',
    'Gaming Bucket List Scratch Off Poster',
    'Vintage Coach Bag', // #2 in the `hats` content type today
    'Captivating Eyes', // "cap" inside a word
    'That Hatchback', // "hat" inside a word
    '',
  ])('rejects %s', (title) => {
    expect(isHeadwearTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isHeadwearTitle(null)).toBe(false);
    expect(isHeadwearTitle(undefined)).toBe(false);
  });
});

describe('applyHeadwearTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyHeadwearTheme(['goth', 'halloween'], 'Notis Witch Hat')).toEqual(['goth', 'halloween', HEADWEAR_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyHeadwearTheme(['vintage', HEADWEAR_THEME], 'Vintage Coach Bag')).toEqual(['vintage']);
    expect(applyHeadwearTheme([HEADWEAR_THEME], 'Cowboy Hat')).toEqual([HEADWEAR_THEME]);
  });
});

describe('headwear is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Denim Bucket Hat')).toContain(HEADWEAR_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'Top this outfit off with the best Sims 4 hats, caps and beanies.';
    expect(detectRoomThemes('Vintage Coach Bag', desc)).not.toContain(HEADWEAR_THEME);
  });
  it('getSupportedRoomThemes lists it', () => {
    expect(getSupportedRoomThemes()).toContain(HEADWEAR_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(HEADWEAR_THEME)).toBe(false);
  });
});

describe('/games/sims-4/hats-cc/', () => {
  const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'hats-cc');
  it('filters on exactly this theme, not the description-polluted `hats` content type', () => {
    expect(c?.filter).toEqual({ themesAny: [HEADWEAR_THEME] });
  });
  it('clears the 20-mod traffic-page bar', () => {
    expect(c!.expectedCount).toBeGreaterThanOrEqual(20);
  });
  it('is linked from male-clothes and jewelry-cc (E382)', () => {
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'male-clothes')!.related).toContain('hats-cc');
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'jewelry-cc')!.related).toContain('hats-cc');
  });
  it('intro is 200–400 words', () => {
    const words = c!.intro.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(200);
    expect(words).toBeLessThanOrEqual(400);
  });
});
