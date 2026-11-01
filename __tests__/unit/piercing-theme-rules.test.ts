import { describe, it, expect } from 'vitest';
import { PIERCING_THEME, applyPiercingTheme, isPiercingTitle } from '@/lib/piercingThemeRules';
import { detectRoomThemes } from '@/lib/services/contentTypeDetector';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';

// Fixtures are real production titles from the 2026-11-01 audit (E316) of
// every whole-word piercing candidate across 17,132 rows.

describe('isPiercingTitle — accepted phrases', () => {
  it.each([
    'Carly Piercings', // 470 dl, card #1
    'Piercing Ultimate Collection',
    'ORION Nose Piercings',
    'Lip Stud Piercing Collection',
    'Mermaid Piercings', // typed hair, still a piercing set
    'Stretched Septum Piercings',
    'Y2K Flame Septum',
    'Septum N001',
    'November Khaii Nose Ring',
    'Toni Nose Rings Set',
    'Spidey Nose Stud',
    'Nihil Nose Chains',
    'Body Gems Belly Rings', // 620 dl, never says "piercing"
    'New World Statement Lip Ring',
    'Angel Fangs and Snake Bites Piercing',
  ])('accepts %s', (title) => {
    expect(isPiercingTitle(title)).toBe(true);
  });
});

describe('isPiercingTitle — rejected phrases (counts in lib/piercingThemeRules.ts)', () => {
  it.each([
    'Pierced Bikini', // 'pierced' — swimwear
    'Oh My Goth – Long Stiletto Pierced Nails',
    'Thick Wavy Hoop Earrings', // 'hoops' — earrings, jewelry-cc
    'Spalding Basketball Hoop & Ball CC',
    'Thinner Ear Plug (EL) Override', // 'plugs' — an ear preset
    'Tempo Plug Collection',
    'Stacked Ear Gauges', // 'gauges' — 4 mixed rows, no rule
    'Studs Accessory Belt Set',
    'Flowers & Star Ear Cuffs',
    'Van Cleef Earrings and Necklace',
    'Nose Preset N12', // nose presets are body-presets territory
    'Belly Dancer Outfit',
    '',
  ])('rejects %s', (title) => {
    expect(isPiercingTitle(title)).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isPiercingTitle(null)).toBe(false);
    expect(isPiercingTitle(undefined)).toBe(false);
  });
});

describe('applyPiercingTheme', () => {
  it('adds the theme and preserves the others in order', () => {
    expect(applyPiercingTheme(['goth', 'cute'], 'Exile Piercings')).toEqual(['goth', 'cute', PIERCING_THEME]);
  });
  it('strips the theme when the title does not support it, and is idempotent', () => {
    expect(applyPiercingTheme(['goth', PIERCING_THEME], 'Thick Wavy Hoop Earrings')).toEqual(['goth']);
    expect(applyPiercingTheme([PIERCING_THEME], 'Carly Piercings')).toEqual([PIERCING_THEME]);
  });
});

describe('piercing is title-only at every writer', () => {
  it('the ingest detector tags it from the title', () => {
    expect(detectRoomThemes('Diamond Butterfly Septum Nose Piercing')).toContain(PIERCING_THEME);
    expect(detectRoomThemes('Body Gems Belly Rings')).toContain(PIERCING_THEME);
  });
  it('the ingest detector never tags it from a shared blog-post description', () => {
    const desc = 'The best Sims 4 piercings CC: septum rings, nose piercings, lip studs and belly bars for your sims.';
    expect(detectRoomThemes('Van Cleef Earrings and Necklace', desc)).not.toContain(PIERCING_THEME);
  });
  it('the AI facet extractor cannot emit it (not in FACET_VALUES.themes)', () => {
    expect((FACET_VALUES.themes as readonly string[]).includes(PIERCING_THEME)).toBe(false);
  });
  it('/games/sims-4/piercings-cc/ filters on exactly this theme', () => {
    const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'piercings-cc');
    expect(c?.filter).toEqual({ themesAny: [PIERCING_THEME] });
  });
});
