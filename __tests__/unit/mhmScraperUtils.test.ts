import { describe, it, expect } from 'vitest';
import {
  detectGameFromUrl,
  detectGameFromHtml,
  detectGame,
  detectContentTypeFromUrl,
  ensureAuthor,
  normalizeSlug,
  shouldSkipPost,
  type AuthorExtractionContext,
} from '@/lib/services/mhmScraperUtils';

// ============================================
// detectGameFromUrl
// ============================================

describe('detectGameFromUrl', () => {
  describe('Sims 4 detection', () => {
    it('detects "sims-4" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-sims-4-hair-cc/')).toBe('Sims 4');
    });

    it('detects "sims4" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/sims4-mods-list/')).toBe('Sims 4');
    });

    it('detects "ts4" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-ts4-cc-packs/')).toBe('Sims 4');
    });

    it('detects "maxis-match" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/maxis-match-hair-cc/')).toBe('Sims 4');
    });

    it('detects "cas-background" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/cas-background-mods/')).toBe('Sims 4');
    });

    it('detects "woohoo" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-woohoo-mods-sims-4-ultimate-guide/')).toBe('Sims 4');
    });

    it('detects "trait-mod" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/sims-4-trait-mods/')).toBe('Sims 4');
    });

    it('detects "hair-cc" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-hair-cc-2025/')).toBe('Sims 4');
    });

    it('detects "cc-clothes" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/cc-clothes-packs/')).toBe('Sims 4');
    });

    it('detects "makeup-cc" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/sims-4-makeup-cc/')).toBe('Sims 4');
    });

    it('detects "body-preset" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/sims-4-body-presets/')).toBe('Sims 4');
    });

    it('detects "eyelashes-cc" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/sims-4-eyelashes-cc/')).toBe('Sims 4');
    });

    it('detects "alpha-cc" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-alpha-cc-finds/')).toBe('Sims 4');
    });

    it('detects "mm-cc" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-mm-cc-packs/')).toBe('Sims 4');
    });
  });

  describe('Stardew Valley detection', () => {
    it('detects "stardew-valley" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-stardew-valley-mods/')).toBe('Stardew Valley');
    });

    it('detects "stardew" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/stardew-portrait-mods/')).toBe('Stardew Valley');
    });

    it('detects "sdv" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/sdv-mods-guide/')).toBe('Stardew Valley');
    });
  });

  describe('Minecraft detection', () => {
    it('detects "minecraft" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-minecraft-mods/')).toBe('Minecraft');
    });

    it('detects "shader" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-shader-packs-2025/')).toBe('Minecraft');
    });

    it('detects "shaders" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-shaders-for-java/')).toBe('Minecraft');
    });

    it('detects "resource-pack" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-resource-pack-list/')).toBe('Minecraft');
    });

    it('detects "texture-pack" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-texture-pack-guide/')).toBe('Minecraft');
    });

    it('detects "data-pack" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-data-pack-mods/')).toBe('Minecraft');
    });

    it('detects "optifine" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/optifine-guide/')).toBe('Minecraft');
    });

    it('detects "fabric-mod" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-fabric-mod-list/')).toBe('Minecraft');
    });

    it('detects "forge-mod" in URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-forge-mod-list/')).toBe('Minecraft');
    });
  });

  describe('defaults and edge cases', () => {
    it('defaults to Sims 4 for empty string', () => {
      expect(detectGameFromUrl('')).toBe('Sims 4');
    });

    it('defaults to Sims 4 for generic mod URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/best-mods-2025/')).toBe('Sims 4');
    });

    it('defaults to Sims 4 for ambiguous URL', () => {
      expect(detectGameFromUrl('https://musthavemods.com/top-picks/')).toBe('Sims 4');
    });

    it('handles URL without protocol', () => {
      expect(detectGameFromUrl('musthavemods.com/best-sims-4-cc/')).toBe('Sims 4');
    });

    it('is case-insensitive (URL is lowercased)', () => {
      expect(detectGameFromUrl('https://musthavemods.com/Best-Minecraft-Mods/')).toBe('Minecraft');
    });
  });
});

// ============================================
// detectGameFromHtml
// ============================================

describe('detectGameFromHtml', () => {
  describe('category-based detection', () => {
    it('detects Sims 4 from categories', () => {
      expect(detectGameFromHtml(['Sims 4', 'Hair CC'], 'Best Hair CC')).toBe('Sims 4');
    });

    it('detects Stardew from categories', () => {
      expect(detectGameFromHtml(['Stardew Valley'], 'Best Mods')).toBe('Stardew Valley');
    });

    it('detects Minecraft from categories', () => {
      expect(detectGameFromHtml(['Minecraft'], 'Top Mods')).toBe('Minecraft');
    });

    it('detects from category with "Shaders"', () => {
      expect(detectGameFromHtml(['Shaders'], 'Best Graphics')).toBe('Minecraft');
    });
  });

  describe('title-based detection', () => {
    it('detects Sims 4 from title', () => {
      expect(detectGameFromHtml([], '30+ Best Sims 4 Hair CC')).toBe('Sims 4');
    });

    it('detects Stardew from title', () => {
      expect(detectGameFromHtml([], 'Best Stardew Valley Portrait Mods')).toBe('Stardew Valley');
    });

    it('detects Minecraft from title', () => {
      expect(detectGameFromHtml([], '20 Best Minecraft Shader Packs')).toBe('Minecraft');
    });

    it('detects TS4 abbreviation', () => {
      expect(detectGameFromHtml([], 'Best TS4 CC Packs')).toBe('Sims 4');
    });

    it('detects SDV abbreviation', () => {
      expect(detectGameFromHtml([], 'Top SDV Mods')).toBe('Stardew Valley');
    });

    it('detects Maxis Match in title', () => {
      expect(detectGameFromHtml([], 'Best Maxis Match Hair')).toBe('Sims 4');
    });

    it('detects Alpha CC in title', () => {
      expect(detectGameFromHtml([], '25 Alpha CC Finds')).toBe('Sims 4');
    });
  });

  describe('defaults and edge cases', () => {
    it('defaults to Sims 4 for empty inputs', () => {
      expect(detectGameFromHtml([], '')).toBe('Sims 4');
    });

    it('defaults to Sims 4 for generic content', () => {
      expect(detectGameFromHtml(['Mods'], 'Best Mods')).toBe('Sims 4');
    });
  });
});

// ============================================
// detectGame (orchestrator)
// ============================================

describe('detectGame', () => {
  it('URL takes priority over HTML when URL is specific', () => {
    // URL says Minecraft, HTML says Sims 4 — URL wins
    expect(detectGame(
      'https://musthavemods.com/best-minecraft-mods/',
      ['Sims 4'],
      'Best Sims 4 Mods'
    )).toBe('Minecraft');
  });

  it('falls back to HTML when URL is ambiguous', () => {
    // URL is generic (defaults to Sims 4), but HTML says Stardew
    expect(detectGame(
      'https://musthavemods.com/best-mods-guide/',
      ['Stardew Valley'],
      'Best Mods'
    )).toBe('Stardew Valley');
  });

  it('URL Stardew overrides HTML Sims 4', () => {
    expect(detectGame(
      'https://musthavemods.com/stardew-portrait-mods/',
      ['Sims 4'],
      'Portrait Mods'
    )).toBe('Stardew Valley');
  });

  it('URL Minecraft overrides HTML default', () => {
    expect(detectGame(
      'https://musthavemods.com/best-shader-packs/',
      [],
      'Best Graphics Mods'
    )).toBe('Minecraft');
  });

  it('defaults to Sims 4 when both URL and HTML are ambiguous', () => {
    expect(detectGame(
      'https://musthavemods.com/top-picks/',
      [],
      'Our Top Picks'
    )).toBe('Sims 4');
  });

  it('HTML detects Minecraft when URL is generic', () => {
    expect(detectGame(
      'https://musthavemods.com/best-graphics-mods/',
      ['Minecraft'],
      'Best Graphics Mods'
    )).toBe('Minecraft');
  });
});

// ============================================
// detectContentTypeFromUrl
// ============================================

describe('detectContentTypeFromUrl', () => {
  describe('Sims 4 content types', () => {
    it('detects hair from "hair-cc"', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-hair-cc-2025/')).toBe('hair');
    });

    it('detects hair from "cc-hair"', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/cc-hair-packs/')).toBe('hair');
    });

    it('detects makeup from "makeup-cc"', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-makeup-cc/')).toBe('makeup');
    });

    it('detects lashes from "eyelash"', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-eyelashes-cc/')).toBe('lashes');
    });

    it('detects skin', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-skin-overlay-mods/')).toBe('skin');
    });

    it('detects furniture', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-furniture-cc/')).toBe('furniture');
    });

    it('detects poses', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-pose-pack-list/')).toBe('poses');
    });

    it('detects preset from "body-preset"', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-body-presets/')).toBe('preset');
    });

    it('detects gameplay-mod from "woohoo"', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-woohoo-mods/')).toBe('gameplay-mod');
    });

    it('detects trait from "trait-mod"', () => {
      // Updated 2026-04-28: trait-mods now resolve to the more specific 'trait'
      // facet rather than the catch-all 'gameplay-mod'. The 'trait' facet exists
      // separately in the seed (see scripts/seed-facet-definitions.ts).
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-trait-mods/')).toBe('trait');
    });

    it('detects gameplay-mod from "gameplay-mod"', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-gameplay-mod-list/')).toBe('gameplay-mod');
    });

    it('detects decor', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-decor-cc/')).toBe('decor');
    });

    it('detects tattoos', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-tattoo-cc/')).toBe('tattoos');
    });

    it('detects nails', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-nail-cc/')).toBe('nails');
    });

    it('detects shoes', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-shoes-cc/')).toBe('shoes');
    });

    it('detects jewelry from "jewelry"', () => {
      // Updated 2026-04-28: jewelry is now a separate contentType from accessories
      // (matching the existing facet definition). See PRD-scraper-facet-accuracy.
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-jewelry-cc/')).toBe('jewelry');
    });

    // ── New strict-segment-boundary tests (added 2026-04-28) ──
    // The previous substring-only matcher caught false positives like
    // "lighthouse" → lot. The seg() helper requires hyphen/slash boundaries.

    it('detects jewelry from rings/bracelets/necklaces/earrings/anklets/piercings', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-rings-cc/')).toBe('jewelry');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-bracelet-cc/')).toBe('jewelry');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-necklace-cc/')).toBe('jewelry');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-hoop-earrings-cc/')).toBe('jewelry');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-anklet-cc/')).toBe('jewelry');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-piercings/')).toBe('jewelry');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-nose-piercings/')).toBe('jewelry');
    });

    it('detects hats from flower-crown / crown / beanie', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-flower-crown-cc/')).toBe('hats');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-crown-cc/')).toBe('hats');
    });

    it('detects lot from house/cabin/cottage/mansion/bachelor-pad', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-sims-4-autumn-houses/')).toBe('lot');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-cabin-houses/')).toBe('lot');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-castles/')).toBe('lot');
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-sims-4-bachelor-pad-cc/')).toBe('lot');
    });

    it('does NOT match lot for "lighthouse" or other false-positive substrings', () => {
      // "lighthouse" no longer matches the segment-bounded "house" pattern.
      // (Pre-strictness: '/sims-4-lighthouse-cc/' → 'lot' WRONG)
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-lighthouse-cc/')).toBeUndefined();
    });

    it('does NOT match jewelry for "string" / "stringy" substrings', () => {
      // (Pre-strictness: 'string' contained 'ring' → false-positive jewelry)
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-string-quartet-cc/')).toBeUndefined();
    });

    it('does NOT match bottoms for "underpants" or generic substring', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-underpants-cc/')).toBeUndefined();
    });

    it('detects bedroom over generic furniture', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-bedroom-clutter/')).toBe('bedroom');
    });

    it('detects loading-screen', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-winter-loading-screens/')).toBe('loading-screen');
    });

    it('detects cas-background', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-cas-background/')).toBe('cas-background');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-cas-mirror-background/')).toBe('cas-background');
    });

    it('detects pregnancy', () => {
      // sims-4-pregnancy-mods → pregnancy
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-pregnancy-mods/')).toBe('pregnancy');
    });

    it('detects easter (seasonal collection)', () => {
      // Added 2026-04-28: easter is a contentType (mirrors pregnancy precedent).
      // Slug-driven so the whole article gets categorized consistently rather
      // than each mod's title voting on its own type.
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-easter-cc/')).toBe('easter');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-easter-mods/')).toBe('easter');
    });

    it('detects hair from hairstyle / male-hair / curly-hair / two-toned-hair variants', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-male-hair-vl-2-lookbook/')).toBe('hair');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-curly-hair-cc/')).toBe('hair');
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-two-toned-hair-lookbook/')).toBe('hair');
      expect(detectContentTypeFromUrl('https://musthavemods.com/afro-hair-sims-4/')).toBe('hair');
    });
  });

  describe('Minecraft content types', () => {
    it('detects shaders', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-minecraft-shader-packs/')).toBe('shaders');
    });

    it('detects resource-pack', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/minecraft-resource-pack-list/')).toBe('resource-pack');
    });

    it('detects texture-pack', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-minecraft-texture-pack/')).toBe('texture-pack');
    });

    it('detects modpack', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-minecraft-modpack-list/')).toBe('modpack');
    });

    it('detects data-pack', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-minecraft-data-pack-mods/')).toBe('data-pack');
    });
  });

  describe('Stardew content types', () => {
    it('detects portraits', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/stardew-portrait-mods/')).toBe('portraits');
    });

    it('detects retexture', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/stardew-retexture-mods/')).toBe('retexture');
    });

    it('detects farm-map', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/stardew-farm-map-mods/')).toBe('farm-map');
    });

    // Added 2026-04-28: previously these articles fell through to title-based
    // detection, which leaked Sims 4 contentTypes ("tops", "accessories")
    // onto Stardew mods. Now slug-driven so the whole article gets a
    // consistent, correct contentType.
    it('detects gameplay-mod from quality-of-life-mods', () => {
      expect(
        detectContentTypeFromUrl('https://musthavemods.com/stardew-valley-quality-of-life-mods/')
      ).toBe('gameplay-mod');
    });

    it('detects gameplay-mod from automation/economy/utility mod articles', () => {
      expect(
        detectContentTypeFromUrl('https://musthavemods.com/stardew-valley-automation-mods/')
      ).toBe('gameplay-mod');
      expect(
        detectContentTypeFromUrl('https://musthavemods.com/stardew-valley-economy-mods/')
      ).toBe('gameplay-mod');
      expect(
        detectContentTypeFromUrl('https://musthavemods.com/stardew-valley-utility-mods/')
      ).toBe('gameplay-mod');
    });

    it('detects expansion from expansion-mod / new-npc / custom-npc articles', () => {
      expect(
        detectContentTypeFromUrl('https://musthavemods.com/stardew-valley-expansion-mods/')
      ).toBe('expansion');
      expect(
        detectContentTypeFromUrl('https://musthavemods.com/stardew-valley-custom-npc-mods/')
      ).toBe('expansion');
    });

    it('does NOT match Sims 4 contentTypes for Stardew slugs (game-gated)', () => {
      // The Stardew dispatcher only consults STARDEW_CONTENT_MAPPINGS, so a
      // Stardew slug that incidentally contains Sims 4 keywords (e.g. "hat",
      // "top", "shirt") MUST NOT pick up a Sims 4 contentType. Returns
      // undefined when no Stardew-specific rule matches.
      expect(
        detectContentTypeFromUrl('https://musthavemods.com/stardew-valley-hat-mods/')
      ).toBeUndefined();
      expect(
        detectContentTypeFromUrl('https://musthavemods.com/stardew-valley-top-tier-mods/')
      ).toBeUndefined();
    });
  });

  describe('returns undefined for generic URLs', () => {
    it('returns undefined for generic mod URL', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/best-mods-2025/')).toBeUndefined();
    });

    it('returns undefined for empty URL', () => {
      expect(detectContentTypeFromUrl('')).toBeUndefined();
    });

    it('returns undefined for homepage', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/')).toBeUndefined();
    });

    it('returns undefined for ambiguous sims 4 URL', () => {
      expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-cc/')).toBeUndefined();
    });
  });
});

// ============================================
// ensureAuthor
// ============================================

describe('ensureAuthor', () => {
  describe('never-null guarantee', () => {
    it('returns truthy string for empty context', () => {
      const result = ensureAuthor({});
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('returns truthy string for all-undefined context', () => {
      const result = ensureAuthor({
        authorFromTitle: undefined,
        authorFromUrl: undefined,
        authorFromModPage: undefined,
        blogPostAuthor: undefined,
        downloadUrl: undefined,
      });
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('returns truthy string for all-empty context', () => {
      const result = ensureAuthor({
        authorFromTitle: '',
        authorFromUrl: '',
        authorFromModPage: '',
        blogPostAuthor: '',
        downloadUrl: '',
      });
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it('returns truthy string for single-char values', () => {
      const result = ensureAuthor({
        authorFromTitle: 'a',
        authorFromUrl: 'b',
        authorFromModPage: 'c',
        blogPostAuthor: 'd',
      });
      expect(result).toBeTruthy();
      // Single chars are too short (< 2), should fall through to fallback
      expect(result).toBe('MustHaveMods Community');
    });

    it('never returns empty string', () => {
      for (let i = 0; i < 20; i++) {
        const ctx: AuthorExtractionContext = {};
        const result = ensureAuthor(ctx);
        expect(result).not.toBe('');
      }
    });
  });

  describe('priority chain', () => {
    it('prefers authorFromTitle over all others', () => {
      expect(ensureAuthor({
        authorFromTitle: 'Title Author',
        authorFromUrl: 'URL Author',
        authorFromModPage: 'Page Author',
        blogPostAuthor: 'Blog Author',
        downloadUrl: 'https://thesimsresource.com/some-mod',
      })).toBe('Title Author');
    });

    it('prefers authorFromUrl when title is missing', () => {
      expect(ensureAuthor({
        authorFromUrl: 'URL Author',
        authorFromModPage: 'Page Author',
        blogPostAuthor: 'Blog Author',
      })).toBe('URL Author');
    });

    it('prefers authorFromModPage when title and url are missing', () => {
      expect(ensureAuthor({
        authorFromModPage: 'Page Author',
        blogPostAuthor: 'Blog Author',
      })).toBe('Page Author');
    });

    it('prefers domain hint when earlier sources are missing', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://www.curseforge.com/minecraft/mods/x',
      })).toBe('CurseForge Creator');
    });

    it('prefers blogPostAuthor when domain hint is unavailable', () => {
      expect(ensureAuthor({
        blogPostAuthor: 'Blog Author',
      })).toBe('Blog Author');
    });

    it('skips empty/short authorFromTitle and uses next', () => {
      expect(ensureAuthor({
        authorFromTitle: '',
        authorFromUrl: 'URL Author',
      })).toBe('URL Author');
    });

    it('skips single-char authorFromTitle', () => {
      expect(ensureAuthor({
        authorFromTitle: 'X',
        authorFromUrl: 'Valid Author',
      })).toBe('Valid Author');
    });

    it('skips whitespace-only authorFromTitle', () => {
      expect(ensureAuthor({
        authorFromTitle: '   ',
        authorFromUrl: 'Valid Author',
      })).toBe('Valid Author');
    });
  });

  describe('domain-based fallback', () => {
    it('falls back to TSR domain hint', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://www.thesimsresource.com/downloads/details/id/12345',
      })).toBe('The Sims Resource Creator');
    });

    it('falls back to CurseForge domain hint', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://www.curseforge.com/minecraft/mods/some-mod',
      })).toBe('CurseForge Creator');
    });

    it('falls back to Nexus Mods domain hint', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://www.nexusmods.com/stardewvalley/mods/1234',
      })).toBe('Nexus Mods Creator');
    });

    it('falls back to ModTheSims domain hint', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://modthesims.info/d/12345/some-mod.html',
      })).toBe('ModTheSims Creator');
    });

    it('falls back to Patreon domain hint', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://www.patreon.com/posts/12345',
      })).toBe('Patreon Creator');
    });

    it('falls back to Tumblr domain hint', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://someone.tumblr.com/post/12345',
      })).toBe('Tumblr Creator');
    });

    it('falls back to SimsDom domain hint', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://www.simsdom.com/downloads/12345',
      })).toBe('SimsDom Creator');
    });
  });

  describe('ultimate fallback', () => {
    it('returns "MustHaveMods Community" when everything fails', () => {
      expect(ensureAuthor({})).toBe('MustHaveMods Community');
    });

    it('returns fallback for unknown domain', () => {
      expect(ensureAuthor({
        downloadUrl: 'https://unknown-site.com/some-mod',
      })).toBe('MustHaveMods Community');
    });

    it('returns fallback for invalid download URL', () => {
      expect(ensureAuthor({
        downloadUrl: 'not-a-valid-url',
      })).toBe('MustHaveMods Community');
    });
  });

  describe('edge cases', () => {
    it('trims whitespace from author', () => {
      expect(ensureAuthor({
        authorFromTitle: '  Some Author  ',
      })).toBe('Some Author');
    });

    it('prefers domain hint over ultimate fallback', () => {
      expect(ensureAuthor({
        authorFromTitle: '',
        authorFromUrl: '',
        authorFromModPage: '',
        blogPostAuthor: '',
        downloadUrl: 'https://www.curseforge.com/minecraft/mods/x',
      })).toBe('CurseForge Creator');
    });

    it('handles undefined downloadUrl gracefully', () => {
      expect(ensureAuthor({
        authorFromTitle: undefined,
        downloadUrl: undefined,
      })).toBe('MustHaveMods Community');
    });
  });
});

// ============================================
// Integration scenarios
// ============================================

describe('integration: game + contentType detection', () => {
  it('Sims 4 hair CC URL → game=Sims 4, contentType=hair', () => {
    const url = 'https://musthavemods.com/best-sims-4-hair-cc-2025/';
    expect(detectGameFromUrl(url)).toBe('Sims 4');
    expect(detectContentTypeFromUrl(url)).toBe('hair');
  });

  it('Minecraft shaders URL → game=Minecraft, contentType=shaders', () => {
    const url = 'https://musthavemods.com/best-minecraft-shader-packs/';
    expect(detectGameFromUrl(url)).toBe('Minecraft');
    expect(detectContentTypeFromUrl(url)).toBe('shaders');
  });

  it('Stardew portrait URL → game=Stardew Valley, contentType=portraits', () => {
    const url = 'https://musthavemods.com/stardew-portrait-mods/';
    expect(detectGameFromUrl(url)).toBe('Stardew Valley');
    expect(detectContentTypeFromUrl(url)).toBe('portraits');
  });

  it('generic URL → game=Sims 4 (default), contentType=undefined', () => {
    const url = 'https://musthavemods.com/best-mods/';
    expect(detectGameFromUrl(url)).toBe('Sims 4');
    expect(detectContentTypeFromUrl(url)).toBeUndefined();
  });

  it('Sims 4 gameplay mod URL → game=Sims 4, contentType=gameplay-mod', () => {
    const url = 'https://musthavemods.com/best-woohoo-mods-sims-4-ultimate-guide/';
    expect(detectGameFromUrl(url)).toBe('Sims 4');
    expect(detectContentTypeFromUrl(url)).toBe('gameplay-mod');
  });

  it('Minecraft resource pack URL → game=Minecraft, contentType=resource-pack', () => {
    const url = 'https://musthavemods.com/best-minecraft-resource-pack-list/';
    expect(detectGameFromUrl(url)).toBe('Minecraft');
    expect(detectContentTypeFromUrl(url)).toBe('resource-pack');
  });

  it('Stardew farm map URL → game=Stardew Valley, contentType=farm-map', () => {
    const url = 'https://musthavemods.com/stardew-farm-map-mods/';
    expect(detectGameFromUrl(url)).toBe('Stardew Valley');
    expect(detectContentTypeFromUrl(url)).toBe('farm-map');
  });
});

// ============================================
// normalizeSlug — date and listicle stripping
// ============================================

describe('normalizeSlug', () => {
  it('strips trailing month + year ("april-2024")', () => {
    expect(normalizeSlug('sims-4-cc-finds-april-2024')).toBe('sims-4-cc-finds');
    expect(normalizeSlug('sims-4-cc-finds-january-2025')).toBe('sims-4-cc-finds');
  });

  it('strips standalone month names', () => {
    expect(normalizeSlug('sims-4-april-cc-finds')).toBe('sims-4-cc-finds');
    expect(normalizeSlug('december-cc-finds-sims-4')).toBe('cc-finds-sims-4');
  });

  it('strips year-only segments', () => {
    expect(normalizeSlug('sims-4-mods-2024')).toBe('sims-4-mods');
  });

  it('strips leading "best-"', () => {
    expect(normalizeSlug('best-sims-4-main-menu-overrides')).toBe(
      'sims-4-main-menu-overrides',
    );
  });

  it('strips leading count + "must-have-"', () => {
    expect(normalizeSlug('10-must-have-sims-4-mods')).toBe('sims-4-mods');
  });

  it('strips leading "top-N-"', () => {
    expect(normalizeSlug('top-10-sims-4-hair-cc')).toBe('sims-4-hair-cc');
  });

  it('strips leading "essential-" and "ultimate-"', () => {
    expect(normalizeSlug('essential-sims-4-mods')).toBe('sims-4-mods');
    expect(normalizeSlug('ultimate-sims-4-pose-pack')).toBe('sims-4-pose-pack');
  });

  it('does NOT strip month words mid-segment', () => {
    // Defensive: a hypothetical "marching-band" slug should keep "march" intact.
    expect(normalizeSlug('sims-4-marching-band-cc')).toBe(
      'sims-4-marching-band-cc',
    );
  });

  it('is idempotent (running twice produces the same result)', () => {
    const once = normalizeSlug('best-sims-4-cc-finds-april-2024');
    expect(once).toBe('sims-4-cc-finds');
    expect(normalizeSlug(once)).toBe(once);
  });

  it('handles leading slashes and trailing slashes', () => {
    expect(normalizeSlug('/sims-4-cc-finds-march-2026/')).toBe(
      'sims-4-cc-finds',
    );
  });
});

// ============================================
// New contentTypes (lookbook, challenge, main-menu, cc-finds)
// ============================================

describe('detectContentTypeFromUrl — new types (Apr 2026)', () => {
  it('detects lookbook contentType', () => {
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-fall-lookbook/'))
      .toBe('lookbook');
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-fairy-lookbook/'))
      .toBe('lookbook');
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-male-urban-lookbook-vl-2/'))
      .toBe('lookbook');
  });

  it('detects challenge contentType', () => {
    expect(detectContentTypeFromUrl('https://musthavemods.com/the-sims-4-very-veggie-challenge/'))
      .toBe('challenge');
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-challenges/'))
      .toBe('challenge');
  });

  it('detects main-menu contentType (after listicle stripping)', () => {
    expect(detectContentTypeFromUrl('https://musthavemods.com/best-sims-4-main-menu-overrides/'))
      .toBe('main-menu');
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-main-menu-cc/'))
      .toBe('main-menu');
  });

  it('detects cc-finds contentType after stripping month/year markers', () => {
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-cc-finds-april-2024/'))
      .toBe('cc-finds');
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-april-cc-finds/'))
      .toBe('cc-finds');
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-cc-finds/'))
      .toBe('cc-finds');
  });

  it('listicle-prefix stripping does not break existing rules', () => {
    // "best-sims-4-hair-cc" should still detect as `hair`.
    expect(detectContentTypeFromUrl('https://musthavemods.com/best-sims-4-hair-cc/'))
      .toBe('hair');
    // "10-must-have-sims-4-pose-packs" should still detect as `poses`.
    expect(detectContentTypeFromUrl('https://musthavemods.com/10-must-have-sims-4-pose-packs/'))
      .toBe('poses');
  });
});

// ============================================
// shouldSkipPost
// ============================================

describe('shouldSkipPost', () => {
  it('skips known EA pack/scenario posts', () => {
    expect(shouldSkipPost('https://musthavemods.com/sims-4-tiny-living/')).toBe(true);
    expect(shouldSkipPost('https://musthavemods.com/the-sims-4-adventure-awaits/')).toBe(true);
    expect(shouldSkipPost('https://musthavemods.com/restaurant-in-sims-4/')).toBe(true);
    expect(shouldSkipPost('https://musthavemods.com/sims-4-tray-importer/')).toBe(true);
  });

  it('skips cheat / error / how-to posts', () => {
    expect(shouldSkipPost('https://musthavemods.com/sims-4-friendship-cheats/')).toBe(true);
    expect(shouldSkipPost('https://musthavemods.com/sims-4-money-cheat/')).toBe(true);
    expect(shouldSkipPost('https://musthavemods.com/sims-4-delivery-express-error/')).toBe(true);
    expect(shouldSkipPost('https://musthavemods.com/how-to-install-sims-4-mods/')).toBe(true);
  });

  it('does NOT skip real mod posts', () => {
    expect(shouldSkipPost('https://musthavemods.com/sims-4-fall-lookbook/')).toBe(false);
    expect(shouldSkipPost('https://musthavemods.com/best-sims-4-main-menu-overrides/')).toBe(false);
    expect(shouldSkipPost('https://musthavemods.com/sims-4-cc-finds-april-2024/')).toBe(false);
    expect(shouldSkipPost('https://musthavemods.com/sims-4-hair-cc/')).toBe(false);
  });
});
