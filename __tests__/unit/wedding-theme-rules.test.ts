import { describe, it, expect } from 'vitest';
import { WEDDING_THEME, applyWeddingTheme, isWeddingTitle } from '@/lib/weddingThemeRules';
import { detectRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-10-30 audit (E289) of
// every whole-word wedding candidate across 16,997 SFW Sims 4 rows.

describe('isWeddingTitle — accepted words', () => {
  it.each([
    'Camuflaje Wedding Day Collection', // 743 dl, card #1
    'Elongated Cushion Cut Diamond Wedding Rings Set',
    'I Do Wedding Pose Pack',
    'Sims 4 Wedding Venue & Park',
    '1 Wedding Disasters Mod',
    'Mably Store Bridal 33',
    'Sims 4 Bridal Shower Event Mod',
    'Bride Collection Part 1',
    'Sparkly Sims 4 Bridesmaid Shoes',
    'Round Cut Diamond Bezel Setting Engagement Ring',
    '3 Engagement Rings',
    'Just Married Mega Pose',
  ])('accepts %s', (title) => {
    expect(isWeddingTitle(title)).toBe(true);
  });
});

describe('isWeddingTitle — rejected words (counts in lib/weddingThemeRules.ts)', () => {
  it.each([
    'Bias Face Veil', // 'veil' — an accessory
    'Witch Hat with Veil & Rose',
    'Celestial Veil Eyes',
    'KK Tuxedo', // 'tuxedo' — formalwear
    'King Formal Tuxedo',
    'Pose Pack: Grand Bouquet of Roses', // 'bouquet'
    'Love and Marriage', // 'marriage' — a romance gameplay overhaul
    'Sims 4 Proposal Poses', // 'proposal' — adjacent, not a wedding
    'Propose Animations Pack',
    'Honeymoon Yacht',
    'Sims 4 Romantic Engagement', // bare 'engagement'
    'Groomed Brows', // substring 'groom'
    'Bridge Lot', // substring 'brid'
    '',
  ])('rejects %s', (title) => {
    expect(isWeddingTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isWeddingTitle(null)).toBe(false);
    expect(isWeddingTitle(undefined)).toBe(false);
  });
});

describe('applyWeddingTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyWeddingTheme(['romantic', 'luxury'], 'Bridal 48 Wedding Dress')).toEqual(['romantic', 'luxury', WEDDING_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyWeddingTheme(['romantic', WEDDING_THEME], 'KK Tuxedo')).toEqual(['romantic']);
    expect(applyWeddingTheme([WEDDING_THEME], 'Wedding Poses')).toEqual([WEDDING_THEME]);
  });
});

describe('wedding is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Sims 4 Wedding Arches')).toContain(WEDDING_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'The perfect wedding CC for your sims: wedding dresses, bridal veils and more.';
    expect(detectRoomThemes('Floret Grove', desc)).not.toContain(WEDDING_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(WEDDING_THEME)).toBe(false);
  });
  it('/games/sims-4/wedding-cc/ filters on exactly this theme', () => {
    const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'wedding-cc');
    expect(c?.filter).toEqual({ themesAny: [WEDDING_THEME] });
  });
});
