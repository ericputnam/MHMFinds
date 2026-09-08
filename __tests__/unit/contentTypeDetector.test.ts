import { describe, it, expect } from 'vitest';
import {
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
});
