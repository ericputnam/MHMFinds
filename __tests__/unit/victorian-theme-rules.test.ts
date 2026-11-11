import { describe, it, expect } from 'vitest';
import {
  VICTORIAN_THEME,
  applyVictorianTheme,
  isVictorianTitle,
} from '@/lib/victorianThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-11-11 audit (E393) of
// every title carrying a Victorian-era word across 17,338 rows.

describe('isVictorianTitle — accepted titles', () => {
  it.each([
    'Modern Victorian Gothic: Obsidian Bedroom', // card #1, 30 downloads
    'Cutie Victorian Loveseat',
    'Victorian Silk Brocade Gown',
    'Victorian Lace Gloves',
    'Late Victorian Hair & Hat Set',
    'Victorian Gothic Purple And Black Cat Dress',
    'Victorian Police Station Lot', // typed gameplay-mod; the type is wrong, not the theme
    'Witch Victorian House',
    'Goth Gothic Victorian Pendalogie Makeup',
  ])('accepts %s', (title) => {
    expect(isVictorianTitle(title)).toBe(true);
  });
});

describe('isVictorianTitle — rejected titles (counts in lib/victorianThemeRules.ts)', () => {
  it.each([
    '6 Lady Rose Regency Gown', // regency 16
    'Bridgerton Collection Part 1', // bridgerton 13
    'Edwardian Dressing Gown', // edwardian 2
    'Steampunk Christmas Tree', // steampunk 2
    'Era Caps 2', // bare era 9
    'Goth Sims Black Lace Dress', // goth-cc owns bare goth
    'Victoriana', // not the whole word
    '',
  ])('rejects %s', (title) => {
    expect(isVictorianTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isVictorianTitle(null)).toBe(false);
    expect(isVictorianTitle(undefined)).toBe(false);
  });
});

describe('applyVictorianTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyVictorianTheme(['goth', 'bedroom'], 'Modern Victorian Gothic: Obsidian Bedroom')).toEqual([
      'goth',
      'bedroom',
      VICTORIAN_THEME,
    ]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyVictorianTheme(['vintage', VICTORIAN_THEME], 'Regency Silk Dress')).toEqual(['vintage']);
    expect(applyVictorianTheme([VICTORIAN_THEME], 'Victorian Dress')).toEqual([VICTORIAN_THEME]);
  });
});

describe('victorian is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Victorian Necklace')).toContain(VICTORIAN_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'The best Sims 4 Victorian CC: gowns, manors and gothic furniture.';
    expect(detectRoomThemes('Regency Silk Dress', desc)).not.toContain(VICTORIAN_THEME);
  });
  it('getSupportedRoomThemes lists it', () => {
    expect(getSupportedRoomThemes()).toContain(VICTORIAN_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(VICTORIAN_THEME)).toBe(false);
  });
});

describe('/games/sims-4/victorian-cc/', () => {
  const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'victorian-cc');
  it('filters on exactly this theme', () => {
    expect(c?.filter).toEqual({ themesAny: [VICTORIAN_THEME] });
  });
  it('clears the 20-mod traffic-page bar', () => {
    expect(c!.expectedCount).toBeGreaterThanOrEqual(20);
  });
  it('is linked from goth-cc and furniture-cc (E393)', () => {
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'goth-cc')!.related).toContain('victorian-cc');
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'furniture-cc')!.related).toContain('victorian-cc');
  });
  it('intro is 200–400 words', () => {
    const words = c!.intro.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(200);
    expect(words).toBeLessThanOrEqual(400);
  });
});
