import { describe, it, expect } from 'vitest';
import { PLUMBOB_THEME, applyPlumbobTheme, isPlumbobTitle } from '@/lib/plumbobThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-11-05 audit (E343) of
// every whole-word plumbob title across 17,225 rows.

describe('isPlumbobTitle — accepted titles', () => {
  it.each([
    'Cozy Winter Pt.2 (Loading Screen + Plumbob Override Animated)', // card #1, a loading screen that ships an override
    'Hello Kitty Plumbob',
    'Black Cat Plumbob Override',
    'Give Your Sims a Cute Star Plumbob',
    '2D Plumbob Override',
    'Plumbob Sultan’s Game', // a golden card replaces the diamond
    'Dark Green Plumbob for Loading Screen',
    'Bunny Plumbob Replacement',
    'Chalk’d Plumbob Override',
    'Plumbob Recolors',
    'Valentine Plumbobs', // plural
    'Paw Plumbobs',
    'Feeling Fruity Overhead Plumbob',
  ])('accepts %s', (title) => {
    expect(isPlumbobTitle(title)).toBe(true);
  });
});

describe('isPlumbobTitle — rejected titles (counts in lib/plumbobThemeRules.ts)', () => {
  it.each([
    'Ripple Junction Official Sims Plumbob T-shirt', // gift-guide merch
    'Sims Plumbob T-Shirt',
    'Sims Plumbob Notebook',
    'The Sims Plumbob Acrylic Block for Desk',
    'Hungry Plumbobs Fast Food Counter', // a restaurant counter
    'Paint Palette', // a real override, but the title does not say so — NULL beats a guess
    'Melody #1',
    '1970’s Toddler Dungarees', // creator is InfinitePlumbobs; the title is not evidence
    'Plumbobkingdom Hair', // not a whole word
    '',
  ])('rejects %s', (title) => {
    expect(isPlumbobTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isPlumbobTitle(null)).toBe(false);
    expect(isPlumbobTitle(undefined)).toBe(false);
  });
});

describe('applyPlumbobTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyPlumbobTheme(['living-room', 'cute'], '2D Plumbob Override')).toEqual(['living-room', 'cute', PLUMBOB_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyPlumbobTheme(['vintage', PLUMBOB_THEME], 'Sims Plumbob T-Shirt')).toEqual(['vintage']);
    expect(applyPlumbobTheme([PLUMBOB_THEME], 'Pochacco Plumbob')).toEqual([PLUMBOB_THEME]);
  });
});

describe('plumbob is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Angel Wing Plumbob')).toContain(PLUMBOB_THEME);
    expect(detectRoomThemes('Sanrio Ramen Bowl Plumbob Override')).toContain(PLUMBOB_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'The best Sims 4 plumbob replacements and plumbob overrides to swap the green diamond over your Sim.';
    expect(detectRoomThemes('Paint Palette', desc)).not.toContain(PLUMBOB_THEME);
  });
  it('getSupportedRoomThemes lists it', () => {
    expect(getSupportedRoomThemes()).toContain(PLUMBOB_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(PLUMBOB_THEME)).toBe(false);
  });
});

describe('/games/sims-4/plumbob-overrides/', () => {
  const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'plumbob-overrides');
  it('filters on exactly this theme', () => {
    expect(c?.filter).toEqual({ themesAny: [PLUMBOB_THEME] });
  });
  it('clears the 20-mod traffic-page bar', () => {
    expect(c!.expectedCount).toBeGreaterThanOrEqual(20);
  });
  it('intro is 200–400 words', () => {
    const words = c!.intro.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(200);
    expect(words).toBeLessThanOrEqual(400);
  });
});
