/**
 * E272 (Rowan, 2026-10-25): GShade / ReShade presets are `ui-preset`, derived
 * from the TITLE only, and the gshade-presets collection is backed by it.
 *
 * Against pre-fix origin/main (00ee825): every block but the FACET_VALUES one
 * fails — `lib/uiPresetRules.ts` does not exist, `detectContentType("… GShade
 * Preset")` returns undefined, `/sims-4-gshade-presets/` maps to `preset`, and
 * there is no `gshade-presets` registry entry.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  UI_PRESET_CONTENT_TYPE,
  UI_PRESET_TITLE_PATTERN,
  applyUiPresetContentType,
  isUiPresetTitle,
} from '@/lib/uiPresetRules';
import { isBodyPresetTitle } from '@/lib/bodyPresetRules';
import {
  CONTENT_TYPE_RULES,
  detectContentType,
  detectContentTypeWithConfidence,
  resolveIngestContentType,
} from '@/lib/services/contentTypeDetector';
import { detectContentTypeFromUrl } from '@/lib/services/mhmScraperUtils';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { HAND_AUDITED_CONTENT_TYPES } from '@/scripts/lib/hand-audited-content-types';
import { OFF_TYPE_RE } from '@/scripts/agents/collection-hub-eligibility-lib';

// Real production titles from the 2026-10-25 measurement (95 title-matched rows).
const ACCEPT = [
  'Nekoswirl Gshade Preset', // card #1, 1,145 downloads, was `preset`
  'Magnolia 1.0 GShade',
  'Dove 2.0 Sims 4 Reshade Preset',
  'Sims 4 Rose Milk Tea GShade Preset', // was NULL
  'Love Shade Vogue Sims 4 Reshade Preset',
  'Moonlight GShade',
  'Summer Date GShade Mod',
  'Sims 4 Reshade Angleic CAS',
  'Senshi Reshade',
  'Easy on the Eyes GShade Preset', // the E207 pin, now ui-preset
  'Coffee Jelly GShade for CAS',
];

describe('isUiPresetTitle — title evidence it must accept', () => {
  it.each(ACCEPT)('accepts %s', (title) => {
    expect(isUiPresetTitle(title)).toBe(true);
  });

  it('accepts the hyphenated spellings creators use', () => {
    expect(isUiPresetTitle('Honey G-Shade Preset')).toBe(true);
    expect(isUiPresetTitle('Honey Re-Shade')).toBe(true);
  });

  it('treats null / empty titles as no evidence', () => {
    expect(isUiPresetTitle(null)).toBe(false);
    expect(isUiPresetTitle(undefined)).toBe(false);
    expect(isUiPresetTitle('')).toBe(false);
  });
});

describe('isUiPresetTitle — rows it must leave alone', () => {
  // CAS presets that shared the `preset` facet with GShade until E272.
  it.each([
    'Skylar Nose Preset',
    'Solana Body Preset',
    'Female Eye Presets for Sims 4',
    'Lips Preset N23 To 30',
    '100+ Sims 4 CAS Presets',
    'Sims 4 Eye Sliders',
  ])('rejects CAS preset %s', (title) => {
    expect(isUiPresetTitle(title)).toBe(false);
  });

  // Rejected-candidate words (see the header of lib/uiPresetRules.ts).
  it.each([
    'Sildur’s Vibrant Shaders', // Minecraft, `shaders`
    'Iris Shaders',
    'CAS Lighting Mod', // lighting override, not a visual preset
    'Even Better In-game Lighting Mod',
    'Summer Shade', // bare "shade", a gym set
    'Palmshade Villa', // substring, no word boundary
    'Nightshade Anklet for Male',
    'Slip Shady',
    'Full Bloom Dress',
    'Graphic Tee Pack',
  ])('rejects %s', (title) => {
    expect(isUiPresetTitle(title)).toBe(false);
  });

  it('lists no singular/plural pair and no extra keyword', () => {
    // Guard the constant, not a copy: the pattern is exactly the two words.
    expect(UI_PRESET_TITLE_PATTERN.source).toBe('\\b(?:g-?shade|re-?shade)\\b');
  });
});

describe('applyUiPresetContentType', () => {
  it('moves a title-supported row to ui-preset whatever it was', () => {
    expect(applyUiPresetContentType('preset', 'Nekoswirl Gshade Preset')).toBe(UI_PRESET_CONTENT_TYPE);
    expect(applyUiPresetContentType(null, 'Moonlight GShade')).toBe(UI_PRESET_CONTENT_TYPE);
    expect(applyUiPresetContentType('eyes', 'Easy on the Eyes GShade Preset')).toBe(UI_PRESET_CONTENT_TYPE);
  });
  it('strips ui-preset to NULL without title evidence (NULL beats wrong), and leaves other types alone', () => {
    expect(applyUiPresetContentType(UI_PRESET_CONTENT_TYPE, 'Skylar Nose Preset')).toBeNull();
    expect(applyUiPresetContentType('preset', 'Skylar Nose Preset')).toBe('preset');
    expect(applyUiPresetContentType(null, 'Skylar Nose Preset')).toBeNull();
  });
});

describe('the body-preset veto and the ui-preset writer agree', () => {
  it.each(ACCEPT)('%s is never a body preset', (title) => {
    expect(isBodyPresetTitle(title)).toBe(false);
  });
});

describe('detector — the ingest path uses the same title-only rule', () => {
  it('types a GShade title ui-preset with high confidence, whatever the description says', () => {
    const r = detectContentTypeWithConfidence('Sims 4 Rose Milk Tea GShade Preset', 'warms the in-game lighting');
    expect(r.contentType).toBe(UI_PRESET_CONTENT_TYPE);
    expect(r.confidence).toBe('high');
    expect(detectContentType('Moonlight GShade')).toBe(UI_PRESET_CONTENT_TYPE);
  });

  it('never types ui-preset from a description — a shared blog description must not leak', () => {
    expect(
      detectContentType('Skylar Nose Preset', 'Screenshots taken with the Nekoswirl GShade preset and reshade.'),
    ).not.toBe(UI_PRESET_CONTENT_TYPE);
    expect(
      detectContentType('Soft Waves Hair', 'All previews use my gshade preset; reshade users see the same colours.'),
    ).not.toBe(UI_PRESET_CONTENT_TYPE);
  });

  it('beats the URL fallback at ingest', () => {
    expect(resolveIngestContentType('Moonlight GShade', null, 'preset')).toBe(UI_PRESET_CONTENT_TYPE);
  });

  it('has no keyword rule for ui-preset (it would match descriptions too)', () => {
    expect(CONTENT_TYPE_RULES.some((r) => r.contentType === UI_PRESET_CONTENT_TYPE)).toBe(false);
  });

  it('derives ui-preset through the shared title-only rule (source guard)', () => {
    // Comments in this repo quote the bad patterns they warn about, so strip
    // them before asserting anything about the code.
    const src = readFileSync(join(process.cwd(), 'lib/services/contentTypeDetector.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).toContain('isUiPresetTitle(title)');
    expect(src).toMatch(/from\s+['"]\.\.\/uiPresetRules['"]/);
  });
});

describe('blog-post URL map', () => {
  it('reads the two GShade/ReShade posts as ui-preset and leaves the CAS preset posts alone', () => {
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-gshade-presets/')).toBe(UI_PRESET_CONTENT_TYPE);
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-reshade/')).toBe(UI_PRESET_CONTENT_TYPE);
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-body-presets/')).toBe('body-preset');
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-nose-presets/')).toBe('preset');
  });
});

describe('taxonomy, pins and the gshade-presets collection', () => {
  it('ui-preset is an existing FACET_VALUES content type (no taxonomy change)', () => {
    expect((FACET_VALUES.contentType as readonly string[]).includes(UI_PRESET_CONTENT_TYPE)).toBe(true);
  });

  it('the E207 GShade pin moved with the facet', () => {
    expect(HAND_AUDITED_CONTENT_TYPES.cmijj22hv002loxs39fib12hv.contentType).toBe(UI_PRESET_CONTENT_TYPE);
  });

  it('no other pin holds a GShade/ReShade title at a different type', () => {
    const wrong = Object.entries(HAND_AUDITED_CONTENT_TYPES).filter(
      ([, v]) => isUiPresetTitle(v.why) && v.contentType !== UI_PRESET_CONTENT_TYPE && /^E\d+ "[^"]*(?:g-?shade|re-?shade)[^"]*"/i.test(v.why),
    );
    expect(wrong.map(([id]) => id)).toEqual([]);
  });

  it('gshade-presets filters on the shared constant and links its blog twin', () => {
    const c = SIMS4_COLLECTIONS.find((x) => x.slug === 'gshade-presets');
    expect(c).toBeDefined();
    expect(c!.filter).toEqual({ contentType: UI_PRESET_CONTENT_TYPE });
    expect(c!.expectedCount).toBeGreaterThanOrEqual(20);
    expect(c!.blogUrl).toBe('/sims-4-gshade-presets/');
  });

  it('the hub-eligibility off-type family exists and flags none of the accepted titles', () => {
    const re = OFF_TYPE_RE['ui-preset'];
    expect(re).toBeInstanceOf(RegExp);
    expect(ACCEPT.filter((t) => re.test(t))).toEqual([]);
    expect(re.test('Skylar Nose Preset')).toBe(true);
    expect(re.test('Solana Body Preset')).toBe(true);
  });
});
