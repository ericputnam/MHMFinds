import { describe, it, expect } from 'vitest';
import {
  LIVING_ROOM_THEME,
  applyLivingRoomTheme,
  isLivingRoomTitle,
} from '@/lib/livingRoomThemeRules';
import { detectRoomThemes, getSupportedRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { pinnedIsNSFW } from '../../scripts/lib/hand-audited-content-types';

// Fixtures are real production titles from the 2026-11-17 audit (E425) of
// every row tagged `living-room` (1,459) and every title carrying a candidate
// word across the catalog.

describe('isLivingRoomTitle — accepted titles', () => {
  it.each([
    'January 2024 Living Room', // card #1, 2,004 downloads
    'Apollo Living Room Part 2',
    'Agota Livingroom',
    'Cozy Cushion Sofa',
    'Nuage Sectional Sofa',
    'Cutie Victorian Loveseat',
    'Old Skool Sitting Room Part 1',
    'Bohemian Sofas',
    'Victoria Living Loveseat', // typed glasses; the type is wrong, not the theme
  ])('accepts %s', (title) => {
    expect(isLivingRoomTitle(title)).toBe(true);
  });
});

describe('isLivingRoomTitle — rejected titles (counts in lib/livingRoomThemeRules.ts)', () => {
  it.each([
    'Tus & Lus Slippers', // was card #1 under the description rule
    'Denim Ripped Jeans', // 'den' substring
    'February 2026 Set: Garden Outdoor', // 'den' substring
    'Functional Skincare Mod',
    'Sofa Romance Pose Pack', // pose exclusion
    'Couch Kissing Animation', // animation exclusion
    'Couch Kissing 2', // kiss exclusion
    'The Sims 4 Cottage Living', // bare 'living' 171
    'Healthy Living Mod',
    'Fleece & Knit Sims 4 Loungewear Set', // lounge 15
    'Poolside Lounge Pack',
    'Sectional Library', // sectional 5
    '',
  ])('rejects %s', (title) => {
    expect(isLivingRoomTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isLivingRoomTitle(null)).toBe(false);
    expect(isLivingRoomTitle(undefined)).toBe(false);
  });
});

describe('applyLivingRoomTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyLivingRoomTheme(['boho', 'modern'], 'Boho Living Room')).toEqual(['boho', 'modern', LIVING_ROOM_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyLivingRoomTheme(['goth', LIVING_ROOM_THEME], 'Tus & Lus Slippers')).toEqual(['goth']);
    expect(applyLivingRoomTheme([LIVING_ROOM_THEME], 'Phlox Sofa')).toEqual([LIVING_ROOM_THEME]);
  });
});

describe('living-room is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Arden Living Room Part 1')).toContain(LIVING_ROOM_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'Cozy living room CC for your den, lounge and family room, plus garden decor and denim.';
    expect(detectRoomThemes('Tus & Lus Slippers', desc)).not.toContain(LIVING_ROOM_THEME);
    expect(detectRoomThemes('Garden Lounge', desc)).not.toContain(LIVING_ROOM_THEME);
  });
  it('getSupportedRoomThemes still lists it exactly once', () => {
    expect(getSupportedRoomThemes().filter((t) => t === LIVING_ROOM_THEME)).toHaveLength(1);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(LIVING_ROOM_THEME)).toBe(false);
  });
});

describe('/games/sims-4/living-room-cc/', () => {
  const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'living-room-cc');
  it('filters on exactly this theme', () => {
    expect(c?.filter).toEqual({ themesAny: [LIVING_ROOM_THEME] });
  });
  it('clears the 20-mod traffic-page bar', () => {
    expect(c!.expectedCount).toBeGreaterThanOrEqual(20);
  });
  it('is linked from furniture-cc and kitchen-cc (E425)', () => {
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'furniture-cc')!.related).toContain('living-room-cc');
    expect(SIMS4_COLLECTIONS.find((x) => x.slug === 'kitchen-cc')!.related).toContain('living-room-cc');
  });
  it('intro is 200–400 words', () => {
    const words = c!.intro.split(/\s+/).filter(Boolean).length;
    expect(words).toBeGreaterThanOrEqual(200);
    expect(words).toBeLessThanOrEqual(400);
  });
  it('the one adult-art row found in its population is pinned NSFW (E425)', () => {
    expect(pinnedIsNSFW('cmikivd5c006voxnaup0dfup1')).toBe(true);
  });
});
