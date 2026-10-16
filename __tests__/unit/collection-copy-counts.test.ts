/**
 * E221 (Rowan, 2026-10-16): a collection's user-visible count claims must not
 * outrun its registry count, and makeup-cc must actually show the lashes its
 * copy promises.
 *
 * Why: `expectedCount` is baked into copy ("900+", "over 900"), and catalog
 * repairs move rows out of facets. E214 took makeup-cc from 938 to 828 while
 * the copy still said "900+"; skin-details carried `expectedCount: 276` under
 * copy that said "340+". Both were found by hand. This scans every entry.
 *
 * Against pre-fix origin/main (ac51cc6): the copy scan fails on skin-details
 * (340 > 276) and both lashes cases fail (`lashes` not in makeup-cc).
 */
import { describe, it, expect } from 'vitest';
import {
  SIMS4_COLLECTIONS,
  getCollection,
  getCollectionsForMod,
  modMatchesFilter,
} from '@/lib/collections';
import { HAND_AUDITED_CONTENT_TYPES } from '@/scripts/lib/hand-audited-content-types';

/** "900+", "13,600+", "over 900", "more than 2,000". "nearly N" is an upper bound, so skipped. */
const CLAIM = /(\d[\d,]*)\+|\b(?:over|more than) (\d[\d,]*)/g;

function claims(text: string): number[] {
  return Array.from(text.matchAll(CLAIM)).map((m) => Number((m[1] ?? m[2]).replace(/,/g, '')));
}

describe('collection copy counts vs expectedCount', () => {
  const rows = SIMS4_COLLECTIONS.map((c) => ({
    slug: c.slug,
    expectedCount: c.expectedCount,
    claimed: claims([c.metaTitle, c.metaDescription, c.tagline, c.intro].join('\n')),
  }));

  it('finds enough claims to mean something (vacuity guard)', () => {
    const withClaims = rows.filter((r) => r.claimed.length > 0);
    expect(withClaims.length).toBeGreaterThanOrEqual(15);
    expect(withClaims.flatMap((r) => r.claimed).length).toBeGreaterThanOrEqual(30);
  });

  it('no "N+" / "over N" claim exceeds the registry count', () => {
    const bad = rows
      .filter((r) => r.claimed.some((n) => n > r.expectedCount))
      .map((r) => `${r.slug}: claims ${r.claimed.join('/')} > expectedCount ${r.expectedCount}`);
    expect(bad).toEqual([]);
  });
});

describe('makeup-cc shows lashes (E221)', () => {
  const makeup = getCollection('sims-4', 'makeup-cc');

  it('includes `lashes` in its composite filter', () => {
    expect(makeup).toBeDefined();
    expect(makeup!.filter.contentTypeIn).toContain('lashes');
  });

  it('every E221 lashes keep lands on makeup-cc, and makeup-cc is its primary crumb', () => {
    const keeps = Object.values(HAND_AUDITED_CONTENT_TYPES).filter(
      (v) => v.why.startsWith('E221') && v.contentType === 'lashes',
    );
    expect(keeps.length).toBeGreaterThanOrEqual(3);
    const mod = { gameVersion: 'Sims 4', isNSFW: false, contentType: 'lashes', title: '3D Mink Lashes' };
    expect(modMatchesFilter(mod, makeup!.filter)).toBe(true);
    expect(getCollectionsForMod(mod)[0]?.slug).toBe('makeup-cc');
  });

  it('no E221 pin writes a row back into the composite it was pulled out of', () => {
    const moved = Object.entries(HAND_AUDITED_CONTENT_TYPES).filter(
      ([, v]) => v.why.startsWith('E221') && v.contentType !== 'lashes',
    );
    expect(moved.length).toBeGreaterThanOrEqual(15);
    const inside = moved.filter(
      ([, v]) => v.contentType && makeup!.filter.contentTypeIn!.includes(v.contentType),
    );
    expect(inside.map(([id]) => id)).toEqual([]);
  });
});
