/**
 * E168 (Rowan, 2026-10-03): the `lot` content-type rule reads the TITLE only,
 * like every room theme (`lib/bedroomThemeRules.ts` …) and `holidays`.
 *
 * Against the pre-fix tree (a5cc519) this file fails at import —
 * `lib/lotContentTypeRules.ts` does not exist and `KeywordRule` has no
 * `titleOnly`. The pre-fix detector, run on that tree over the same inputs,
 * returned `lot` for "Set 12" + "A cozy house for your family home lot",
 * "KHD Orchard Apple Basket" + its post's prose, "Vibe Build Set",
 * "Porchfully Yours – Build & Buy Set", and `undefined` for "Luxury Penthouse"
 * and "MM Castle On Peak" (see `preFix` in content-type-ingest-precedence.test.ts).
 */
import { describe, it, expect } from 'vitest';
import {
  LOT_CONTENT_TYPE,
  LOT_TITLE_KEYWORDS,
  LOT_REJECTED_TITLE_KEYWORDS,
  isLotTitle,
} from '../../lib/lotContentTypeRules';
import {
  CONTENT_TYPE_RULES,
  detectContentType,
  detectContentTypeWithConfidence,
} from '../../lib/services/contentTypeDetector';
import { HAND_AUDITED_CONTENT_TYPES } from '../../scripts/lib/hand-audited-content-types';

const lotRule = CONTENT_TYPE_RULES.find((r) => r.contentType === LOT_CONTENT_TYPE);

describe('the lot rule is title-only and owns its keyword list (E168)', () => {
  it('exactly one rule emits lot, it is flagged titleOnly, and it uses the shared constant (not a copy)', () => {
    expect(CONTENT_TYPE_RULES.filter((r) => r.contentType === LOT_CONTENT_TYPE)).toHaveLength(1);
    expect(lotRule?.titleOnly).toBe(true);
    expect(lotRule?.keywords).toBe(LOT_TITLE_KEYWORDS);
    expect(lotRule?.negativeKeywords ?? []).toEqual([]); // negatives read the description too (hasNegative) — none, by design
  });

  it('lot is the lowest-priority rule, so any other title match beats a lot word', () => {
    const min = Math.min(...CONTENT_TYPE_RULES.map((r) => r.priority));
    expect(lotRule?.priority).toBe(min);
    expect(CONTENT_TYPE_RULES.filter((r) => r.priority === min)).toHaveLength(1);
  });

  it('no other rule is titleOnly yet (this flag exists for lot; add a case here when a second rule adopts it)', () => {
    expect(CONTENT_TYPE_RULES.filter((r) => r.titleOnly).map((r) => r.contentType)).toEqual([LOT_CONTENT_TYPE]);
  });

  it('keyword list: non-vacuous, no singular+plural pairs, no rejected word, no dead word', () => {
    expect(LOT_TITLE_KEYWORDS.length).toBeGreaterThanOrEqual(18);
    const stems = LOT_TITLE_KEYWORDS.map((k) => k.replace(/(?:es|s)$/, ''));
    expect(new Set(stems).size).toBe(stems.length);
    for (const bad of LOT_REJECTED_TITLE_KEYWORDS) expect(LOT_TITLE_KEYWORDS, bad).not.toContain(bad);
    for (const bad of ['home', 'build', 'renovation', 'community lot', 'cabin', 'hotel', 'ranch', 'tower', 'hospital', 'school', 'gym', 'restaurant', 'modern', 'cozy', 'room']) {
      expect(LOT_REJECTED_TITLE_KEYWORDS, bad).toContain(bad);
    }
  });

  it('every kept keyword, alone in a title, is a confident lot answer', () => {
    for (const kw of LOT_TITLE_KEYWORDS) {
      const r = detectContentTypeWithConfidence(`Willow ${kw}`);
      expect(r.contentType, kw).toBe(LOT_CONTENT_TYPE);
      expect(r.confidence, kw).not.toBe('low');
      expect(isLotTitle(`Willow ${kw}`), kw).toBe(true);
    }
    expect(isLotTitle('')).toBe(false);
    expect(isLotTitle(null)).toBe(false);
  });
});

describe('the description can no longer produce lot', () => {
  it('two lot words in a description used to be medium confidence; now nothing', () => {
    expect(detectContentType('Set 12', 'A cozy house for your family home lot')).toBeUndefined();
    expect(detectContentTypeWithConfidence('', 'house home lot apartment mansion estate villa').confidence).toBe('low');
  });

  it('E161: the basket and the porch set', () => {
    expect(detectContentType('KHD Orchard Apple Basket', 'This set works well for fall gardens, porches, orchards, and farmhouse builds.')).not.toBe('lot');
    expect(detectContentType('Porchfully Yours – Build & Buy Set', 'a 12-piece collection made for decorating porches')).not.toBe('lot');
    expect(detectContentType('Vibe Build Set')).not.toBe('lot');
  });

  it('a lot title still wins, with or without a description', () => {
    for (const t of ['Sunflower Estate', 'MM Modern Villa 20', 'Large Brick Colonial', 'Suburban Realistic Houses', 'Luxury Penthouse', 'MM Castle On Peak', 'Modern Duplex', 'Sims 4 Barbie Camper No CC']) {
      expect(detectContentType(t), t).toBe(LOT_CONTENT_TYPE);
      expect(detectContentType(t, 'A hairstyle with bangs and a ponytail for your sims'), t).toBe(LOT_CONTENT_TYPE);
    }
  });

  it('higher-priority title rules and the E147 room guard still beat a lot word', () => {
    expect(detectContentType('Gothic Aesthetic Castle – Loading Screen')).toBe('loading-screen');
    expect(detectContentType('Pumpkin Patch Lot Trait')).toBe('gameplay-mod');
    expect(detectContentType('Toddler Castle Bedroom Stuff')).not.toBe(LOT_CONTENT_TYPE);
    expect(detectContentType('Country Cottage Refrigerator')).not.toBe(LOT_CONTENT_TYPE);
  });

  it("'home' is rejected: a home office / home gym / home decor set is not a lot (0 of 12 URL-categorised hits were)", () => {
    for (const t of ['Sims 4 Home Office CC Pack', '1 Home Gym Set', 'Home Fitness Collection', 'Sims 4 Gothic Home Decor', 'Sims 4 Work From Home Mod for Base Game Careers']) {
      expect(detectContentType(t), t).not.toBe(LOT_CONTENT_TYPE);
    }
    // a house that says only "home" relies on its /houses/ URL category or a pin
    expect(detectContentType('Modern Mountain Home')).toBeUndefined();
    expect(detectContentType('Modern Modular Starter Home')).toBe(LOT_CONTENT_TYPE); // 'starter'
  });

  it('a title that names nothing stays NULL — the URL category or a pin decides, never the prose', () => {
    for (const t of ['Hirose Yoshimi', 'Yasmin Hill', 'Cozy Autumn Camper Van', 'Everwyn Tower', 'Willow Creek Hospital']) {
      expect(detectContentType(t, 'This residential lot is a tiny house with a cozy home feel'), t).toBeUndefined();
    }
  });
});

describe('E161 lot pins are explicit no-ops for the lot retag', () => {
  it('the three lot pins exist with their audited values', () => {
    const lotPins = Object.values(HAND_AUDITED_CONTENT_TYPES).filter((p) => p.why.startsWith('E161 ') && p.why.includes('was lot'));
    expect(lotPins.map((p) => p.contentType).sort()).toEqual(['clutter', 'decor', 'lot']);
  });
});

describe('E168 pins: the real lots the title-only rule cannot see', () => {
  const pins = Object.entries(HAND_AUDITED_CONTENT_TYPES).filter(([, p]) => p.why.startsWith('E168 lot-untitled '));

  it('exist, are non-vacuous, and every KEEP is lot / every "— NULL" is null / the rest are decor', () => {
    expect(pins.length).toBeGreaterThanOrEqual(60);
    for (const [id, p] of pins) {
      const want = p.why.includes('KEEP lot') ? LOT_CONTENT_TYPE : p.why.includes('— NULL;') ? null : 'decor';
      expect(p.contentType, id).toBe(want);
      expect(p.why, id).toMatch(/\[(\/[a-z0-9-]+\/|no category)\]$/); // quotes its source-post slug
    }
    expect(pins.filter(([, p]) => p.contentType === LOT_CONTENT_TYPE).length).toBeGreaterThanOrEqual(60);
    expect(pins.filter(([, p]) => p.contentType === null).length).toBe(3); // the clothes packs whose URL says tops
  });

  it('each pinned title is one the title-only rule does NOT see (otherwise the pin is dead weight)', () => {
    for (const [id, p] of pins) {
      const title = p.why.match(/"([^"]+)"/)?.[1];
      expect(title, id).toBeTruthy();
      expect(isLotTitle(title), `${id} ${title}`).toBe(false);
      expect(detectContentType(title!), `${id} ${title}`).not.toBe(LOT_CONTENT_TYPE);
    }
  });
});
