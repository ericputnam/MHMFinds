/**
 * E200 (Rowan, 2026-10-13): the `accessories` content-type rule reads the
 * TITLE only, and the 891-row facet's untitled rows (713, mostly from the dead
 * legacy `category` backfill) are re-decided title → URL category → NULL by
 * `scripts/retag-junk-build-facets.ts --accessories-untitled`, with 51 hand pins.
 *
 * Against the pre-fix tree this file fails at import
 * (`lib/accessoriesContentTypeRules.ts` does not exist), and the pre-fix
 * detector returned `accessories` for a title naming nothing when the post's
 * prose said "bags, belts and scarves".
 */
import { describe, it, expect } from 'vitest';
import {
  ACCESSORIES_CONTENT_TYPE,
  ACCESSORIES_TITLE_KEYWORDS,
  ACCESSORIES_NOT_ADDED_TITLE_KEYWORDS,
  isAccessoriesTitle,
} from '../../lib/accessoriesContentTypeRules';
import {
  CONTENT_TYPE_RULES,
  detectContentType,
} from '../../lib/services/contentTypeDetector';
import { HAND_AUDITED_CONTENT_TYPES } from '../../scripts/lib/hand-audited-content-types';

const rule = CONTENT_TYPE_RULES.find((r) => r.contentType === ACCESSORIES_CONTENT_TYPE);

describe('the accessories rule is title-only and owns its keyword list (E200)', () => {
  it('exactly one rule emits accessories, flagged titleOnly, using the shared constant (not a copy)', () => {
    expect(CONTENT_TYPE_RULES.filter((r) => r.contentType === ACCESSORIES_CONTENT_TYPE)).toHaveLength(1);
    expect(rule?.titleOnly).toBe(true);
    expect(rule?.keywords).toBe(ACCESSORIES_TITLE_KEYWORDS);
  });

  it('keyword list is non-vacuous and no measured-and-rejected word crept in', () => {
    expect(ACCESSORIES_TITLE_KEYWORDS.length).toBeGreaterThanOrEqual(12);
    for (const bad of ACCESSORIES_NOT_ADDED_TITLE_KEYWORDS) {
      expect(ACCESSORIES_TITLE_KEYWORDS, bad).not.toContain(bad);
    }
  });

  it('isAccessoriesTitle is whole-word and null-safe', () => {
    expect(isAccessoriesTitle('Lucie Purse')).toBe(true);
    expect(isAccessoriesTitle('Mini Pochette Bags')).toBe(true);
    expect(isAccessoriesTitle('Resurrection Gloves')).toBe(true);
    expect(isAccessoriesTitle('Baggy Jeans')).toBe(false); // \b — "bag" inside "Baggy" is not evidence
    expect(isAccessoriesTitle('Stopwatch Clutter')).toBe(false);
    expect(isAccessoriesTitle('')).toBe(false);
    expect(isAccessoriesTitle(null)).toBe(false);
    expect(isAccessoriesTitle(undefined)).toBe(false);
  });
});

describe('the description can no longer produce accessories', () => {
  it('a title naming nothing + accessories prose → not accessories', () => {
    expect(detectContentType('SimDa Dating App', 'Pair it with bags, belts, scarves and gloves for the full look.')).not.toBe(ACCESSORIES_CONTENT_TYPE);
    expect(detectContentType('Set 12', 'accessories accessory bags belts scarves gloves socks tights')).toBeUndefined();
  });

  it('title evidence still wins', () => {
    expect(detectContentType('Lucie Purse')).toBe(ACCESSORIES_CONTENT_TYPE);
    expect(detectContentType('Celestial Accessories')).toBe(ACCESSORIES_CONTENT_TYPE);
    expect(detectContentType('Knit Scarf', 'a cozy winter look')).toBe(ACCESSORIES_CONTENT_TYPE);
  });
});

describe('E200 hand pins', () => {
  const e200 = Object.entries(HAND_AUDITED_CONTENT_TYPES).filter(([, v]) => v.why.startsWith('E200 '));

  it('all 51 are present and well formed', () => {
    expect(e200).toHaveLength(51);
    for (const [id, v] of e200) {
      expect(id, id).toMatch(/^c[a-z0-9]{20,}$/);
      expect(v.why.length, id).toBeGreaterThan(20);
    }
  });

  it('37 keep accessories with no accessories word in the title; 14 retype', () => {
    expect(e200.filter(([, v]) => v.contentType === ACCESSORIES_CONTENT_TYPE)).toHaveLength(37);
    expect(e200.filter(([, v]) => v.contentType !== ACCESSORIES_CONTENT_TYPE)).toHaveLength(14);
  });
});
