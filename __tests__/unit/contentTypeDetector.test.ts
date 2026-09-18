import { describe, it, expect } from 'vitest';
import {
  CONTENT_TYPE_RULES,
  detectContentType,
  detectContentTypeWithConfidence,
} from '@/lib/services/contentTypeDetector';

describe('detectContentType', () => {
  // ── Regression: TITLE must beat a DESCRIPTION-only match ───────────
  // A dress whose description incidentally says "...depending on the body
  // preset you use" must stay a dress, not become a preset. This was a real
  // mislabel found in the MustHaveMods scrape (June 2026).
  describe('title beats description-only matches', () => {
    it('keeps a dress a dress despite "body preset" in the description', () => {
      const desc =
        'A sleek mini dress. During testing it clips a little around the hips depending on the body preset you use.';
      expect(detectContentType('Tracy Short Dress with Open Back', desc)).toBe('dresses');
    });

    it('classifies a belly piercing as jewelry, not skin/preset, from the title', () => {
      expect(detectContentType('Demure Belly Button Piercing', 'comes with custom skins and presets')).toBe('jewelry');
    });

    it('falls back to the description only when the title is uninformative', () => {
      const r = detectContentTypeWithConfidence('Nettle', 'A delicate body preset for female sims.');
      expect(r.contentType).toBe('preset');
      expect(r.reasoning).toContain('description');
    });
  });

  // ── Newly covered keyword categories ──────────────────────────────
  describe('expanded keyword coverage', () => {
    it('detects suits as full-body', () => {
      expect(detectContentType('Sims 4 Men’s Three-Piece Suit')).toBe('full-body');
    });

    it('does not treat a "suite" (furniture) as a suit', () => {
      expect(detectContentType('Cozy Bedroom Suite')).not.toBe('full-body');
    });

    it('detects activewear as full-body', () => {
      expect(detectContentType('Sol Movement Activewear')).toBe('full-body');
    });

    it('detects a bob hairstyle as hair', () => {
      expect(detectContentType('Anastasia Rounded Bob')).toBe('hair');
    });

    it('detects corsets as tops', () => {
      expect(detectContentType('Innerbloom Corsets')).toBe('tops');
    });

    it('detects furniture words like shelving and drawers', () => {
      expect(detectContentType('Körborei Shelving Unit')).toBe('furniture');
      expect(detectContentType('Aarrekaappi Drawer')).toBe('furniture');
    });

    it('detects wallpaper as decor', () => {
      expect(detectContentType('Plaid Wallpaper CC')).toBe('decor');
    });

    it('detects a room-furniture set as furniture', () => {
      expect(detectContentType('Maiwi Living Room Set 1')).toBe('furniture');
      expect(detectContentType('Sleepy Lion Nursery Collection Part 1')).toBe('furniture');
    });
  });

  // ── Substring guards ──────────────────────────────────────────────
  describe('substring false-positive guards', () => {
    it('does not classify a headdress as a dress', () => {
      expect(detectContentType('Antaya Diamara Headdress')).not.toBe('dresses');
    });

    it('classifies house-style lots correctly', () => {
      expect(detectContentType('Sunflower Estate')).toBe('lot');
      expect(detectContentType('MM Modern Villa 20')).toBe('lot');
      expect(detectContentType('Large Brick Colonial')).toBe('lot');
    });
  });

  // ── Pose packs with scene words ───────────────────────────────────
  describe('pose packs with scene words', () => {
    it('classifies scene-named pose packs as poses, not furniture', () => {
      expect(detectContentType('Bed Talk Pose Compilation')).toBe('poses');
      expect(detectContentType('Bench Talk Poses')).toBe('poses');
      expect(detectContentType('Shower Talk Poses')).toBe('poses');
    });
  });

  // ── Regression: the `lighting` / `curtains` mis-tag (Nova, 2026-09-08) ──
  //
  // 140 mods carried contentType 'lighting' and 7 carried 'curtains', and
  // almost none of them were light fixtures or window treatments. Two causes,
  // both covered here. See scripts/retag-junk-build-facets.ts for the cleanup.
  describe('lighting / curtains false positives', () => {
    // Cause 1: `keywordToRegex` already appends an optional (s|es) plural, so a
    // rule listing BOTH 'light' and 'lights' scored two matches off the single
    // word "lights" — clearing the ">= 2 description matches = medium
    // confidence" bar from one incidental word.
    it('does not count a singular and its plural spelling as two matches', () => {
      const r = detectContentTypeWithConfidence(
        'Bright Corner',
        'A set of lights and more lights for any room.'
      );
      expect(r.matchedKeywords).toEqual(Array.from(new Set(r.matchedKeywords)));
      // 'light'/'lights' collapse to one concept, so this is not enough evidence.
      expect(r.contentType).not.toBe('lighting');
    });

    it('keeps a living-room set as furniture when its description mentions lights', () => {
      expect(
        detectContentType(
          'Kivik Living Room Part 1',
          'A cosy living room set. Includes a sofa, a coffee table and lights.'
        )
      ).toBe('furniture');
    });

    // Cause 2: the bare adjective 'light' was a `lighting` keyword.
    it('does not classify a light-toned skin overlay as lighting', () => {
      expect(detectContentType('Male Skin (Monolids) Light To Medium Skintones', 'A male skin overlay.')).toBe('skin');
    });

    it('does not classify a GShade preset as lighting', () => {
      expect(
        detectContentType(
          'Sims 4 Rose Milk Tea GShade Preset',
          'A soft gshade preset that warms the in-game lighting.'
        )
      ).toBeUndefined();
    });

    it('does not classify curtain-bangs hair as curtains', () => {
      expect(detectContentType('Pretty Curtain Male Hair CC', 'Curtain bangs for male sims.')).toBe('hair');
    });

    // ...while real fixtures and real window treatments still resolve.
    it('still detects genuine light fixtures', () => {
      expect(detectContentType('Scandinavian Dining Room Ceiling Lamp')).toBe('lighting');
      expect(detectContentType('Bamboo Lamp')).toBe('lighting');
      expect(detectContentType('Art Deco Lamps')).toBe('lighting');
      expect(detectContentType('Cozy Reading Nook', 'Comes with a floor lamp and a chandelier.')).toBe('lighting');
    });

    it('still detects genuine curtains', () => {
      expect(detectContentType('Blackout Curtains Set', 'Window curtains in eight swatches.')).toBe('curtains');
    });
  });

  // ── Gameplay mods: careers, aspirations, traits (Nova, 2026-09-10, E33) ──
  //
  // The four "mods" listicles ingested on 2026-09-09 (social-media, phone,
  // funeral, moving) contributed 81 rows with contentType NULL, because the
  // gameplay-mod rule had no nouns for the three things a gameplay mod is
  // usually named after. A row with no content type is in no facet, on no
  // collection page and in no /games/* grid.
  describe('gameplay mods named after a career / aspiration / trait', () => {
    it('detects a career mod', () => {
      expect(detectContentType('Social Media Influencer Career')).toBe('gameplay-mod');
      expect(detectContentType('Teen Criminal Career')).toBe('gameplay-mod');
    });

    it('detects an aspiration mod', () => {
      expect(detectContentType('Social Media Star Aspiration')).toBe('gameplay-mod');
      expect(detectContentType('Moving Out Custom Aspiration')).toBe('gameplay-mod');
    });

    it('detects a trait mod', () => {
      expect(detectContentType('Nonchalant New Trait')).toBe('gameplay-mod');
      expect(detectContentType('Heartbreaker Trait Pack')).toBe('gameplay-mod');
    });

    it('detects overhauls, life mods, side hustles and map replacements', () => {
      expect(detectContentType('Crush Overhaul')).toBe('gameplay-mod');
      expect(detectContentType('Prison Life Mod')).toBe('gameplay-mod');
      expect(detectContentType('Fitness Influencer Side Hustle')).toBe('gameplay-mod');
      expect(detectContentType('Tartosa Map Replacement Mod')).toBe('gameplay-mod');
      expect(detectContentType('Immersive Social Bunny')).toBe('gameplay-mod');
    });

    // ── Negative cases ──
    it('does not read "trait" out of "portrait"', () => {
      // \b in keywordToRegex already guards this; assert it so a future
      // author cannot loosen the boundary without a red test.
      expect(detectContentType('Watercolour Family Portraits')).not.toBe('gameplay-mod');
    });

    it('leaves career-themed CC to the CAS and build rules', () => {
      expect(detectContentType('Ultimate Teen Career Set')).not.toBe('gameplay-mod');
      expect(detectContentType('Doctor Career Outfit')).not.toBe('gameplay-mod');
      expect(detectContentType('Career Day Dress for Toddlers')).toBe('dresses');
    });

    it('does not classify anything merely described as "realistic" as a gameplay mod', () => {
      // 'realistic' was a keyword until 2026-09-10. It is a bare adjective —
      // the same class of bug as the bare 'light' removed on 2026-09-08 — and
      // it appears in 32 catalog titles spanning beards, skins, shorts and
      // houses. Because gameplay-mod (15) outranks lot (12), it was stealing
      // house builds from the lot rule.
      expect(detectContentType('Suburban Realistic Houses')).toBe('lot');
      expect(detectContentType('Realistic Brick Walls')).not.toBe('gameplay-mod');
      expect(detectContentType('Sims 4 Realistic Beard CC')).toBe('beard');
    });

    it('does not let a compound keyword and the word it contains count twice', () => {
      // 'social interaction' + 'interaction' both matched one phrase, and
      // >= 2 description matches is promoted to medium confidence — the same
      // hole as 'light' + 'lights'. Both spellings were removed from the rule
      // AND matchedKeywordsIn now collapses the pair generally.
      const r = detectContentTypeWithConfidence(
        'Nettle Bloom',
        'Adds a new social interaction to the game.'
      );
      expect(r.matchedKeywords.length).toBeLessThan(2);
      expect(r.contentType).not.toBe('gameplay-mod');
    });

    it('still resolves a genuine gameplay mod from two independent description nouns', () => {
      expect(
        detectContentType(
          'Second Chances',
          'Adds a new career and a matching aspiration for adult sims.'
        )
      ).toBe('gameplay-mod');
    });
  });
  // ── Jewelry & piercings (Nova, 2026-09-18, E63) ──
  //
  // The rule had no vocabulary for the things a piercing pack is actually
  // named after, so title-only re-tagging would have cleared the two
  // biggest rows in the facet (Grillz Collection, 1,503 downloads; Nose Set
  // No.02, 742) to NULL. Every keyword below was counted against all 16,481
  // catalog titles before it landed.
  describe('jewelry rule — piercing vocabulary', () => {
    it.each([
      ['Grillz Collection', 'grillz'],
      ['Twisted Septum Piercing', 'septum'],
      ['Sinner Back Dermals', 'dermal'],
      ['Eve Navel Piercings Set 1', 'navel'],
      ['Stacked Ear Gauges', 'gauge'],
      ['Chunky Bangle Bracelets', 'bangle'],
      ['S Amulet', 'amulet'],
    ])('%s resolves to jewelry (via "%s")', (title) => {
      expect(detectContentType(title)).toBe('jewelry');
    });

    // ── Negative cases: keywords measured and deliberately REJECTED.
    // Each of these would look like an obvious addition to the jewelry
    // rule. Each was counted first and each fails on the catalog.
    it('does not treat "nose" as a jewelry keyword', () => {
      // 95 catalog titles contain "nose"; 48 of them are nose *presets* and
      // sliders. A bare noun with a dominant second meaning — the same class
      // as 'realistic' (removed 09-10) and 'light' (removed 09-08). The
      // nose-piercing sets are named in hand-audited-content-types.ts instead.
      expect(detectContentType('Button Nose Preset')).not.toBe('jewelry');
      expect(detectContentType('Expanded Nose Sliders')).not.toBe('jewelry');
    });

    it('does not treat "chain", "gem" or "charm" as jewelry keywords', () => {
      // chain: 31 titles, 7 jewelry — the rest belts, jeans, sandals, a fence.
      // gem:   10 titles, 3 jewelry — the rest crowns, nails, tooth gems.
      // charm:  5 titles, 2 jewelry — the rest a bag, a garden set, a build.
      expect(detectContentType('Chain Link Fence & Gate')).not.toBe('jewelry');
      expect(detectContentType('Marcus Chain Jeans')).not.toBe('jewelry');
      expect(detectContentType('4 Carnival Long Stiletto Gem Nails')).toBe('nails');
      expect(detectContentType("Charm'd - Garden Playtime")).not.toBe('jewelry');
    });

    it('does not treat "grill" as a jewelry keyword, only "grillz"', () => {
      // A grill is ordinarily a BBQ, i.e. outdoor furniture. Only 2 catalog
      // titles use the spelling, so the cost of the false positives is not
      // worth paying; "grillz" carries the actual jewelry meaning.
      expect(detectContentType('Outdoor BBQ Grill Set')).not.toBe('jewelry');
    });

    it('keeps the plural spellings working after the duplicates were removed', () => {
      // 'necklaces', 'earrings', 'bracelets', 'rings' and 'piercings' were
      // dropped from the keyword list because keywordToRegex already appends
      // an optional (?:s|es)?. Assert the plurals still match, so nobody
      // "restores" them and re-creates the PR #61 double-count.
      expect(detectContentType('Triple Pearl Necklaces')).toBe('jewelry');
      expect(detectContentType('Thick Wavy Hoop Earrings')).toBe('jewelry');
      expect(detectContentType('Stacked Bracelets')).toBe('jewelry');
      expect(detectContentType('Left Stacked Rings')).toBe('jewelry');
      expect(detectContentType('Mega Piercings Set')).toBe('jewelry');
    });

    it('no jewelry keyword is a redundant singular/plural pair of another', () => {
      // The PR #61 / #79 hygiene rule, asserted against the live rule rather
      // than a copy of it: two keywords that differ only by a trailing s/es
      // are one piece of evidence, not two.
      const jewelry = CONTENT_TYPE_RULES.filter((r) => r.contentType === 'jewelry');
      expect(jewelry.length).toBe(1);
      const kws = jewelry[0].keywords;
      for (const a of kws) {
        for (const b of kws) {
          if (a === b) continue;
          expect(
            b === `${a}s` || b === `${a}es`,
            `jewelry rule lists both "${a}" and "${b}"`,
          ).toBe(false);
        }
      }
    });
  });
});
