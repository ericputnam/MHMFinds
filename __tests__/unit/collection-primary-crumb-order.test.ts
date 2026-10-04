/**
 * Union collections must never steal the primary breadcrumb (Sage, E171, 2026-10-04).
 *
 * `getCollectionsForMod()` picks a mod's primary collection by
 * `filterSpecificity()` and then by **registry order**. Every collection whose
 * filter is a `contentType` / `contentTypeIn` scores 0, so when one such
 * collection is a union over another — `clothes-cc` over the clothing facets
 * (E157), `build-cc` over `furniture-cc` / `decor-cc` / `clutter` (E171) — the
 * only thing that keeps the narrower page as the crumb on its own mods is that
 * the union sits *later* in `SIMS4_COLLECTIONS`. Until this file that rule
 * lived in two code comments. Insert a union one slot too early and ~1,100
 * furniture mod pages silently re-point their primary crumb and their
 * BreadcrumbList JSON-LD at the broad hub.
 *
 * The scan walks the registry, so a union added tomorrow is covered without
 * editing this file.
 */

import { describe, expect, it } from 'vitest';
import {
  SIMS4_COLLECTIONS,
  getCollectionsForMod,
  type CollectionDefinition,
} from '@/lib/collections';

const KEYWORD_FALLBACKS = new Set(['__pregnancy_keyword__', '__witch_keyword__']);

/** The contentType set of a collection whose filter is *only* a contentType facet, else null. */
function pureContentTypeSet(c: CollectionDefinition): Set<string> | null {
  const keys = Object.keys(c.filter).filter(
    (k) => (c.filter as Record<string, unknown>)[k] !== undefined,
  );
  if (keys.some((k) => k !== 'contentType' && k !== 'contentTypeIn')) return null;
  // buildWhereClause: contentTypeIn overwrites contentType.
  if (c.filter.contentTypeIn?.length) return new Set(c.filter.contentTypeIn);
  if (c.filter.contentType && !KEYWORD_FALLBACKS.has(c.filter.contentType)) {
    return new Set([c.filter.contentType]);
  }
  return null;
}

function isStrictSubset(a: Set<string>, b: Set<string>): boolean {
  if (a.size >= b.size) return false;
  for (const x of Array.from(a)) if (!b.has(x)) return false;
  return true;
}

const pure = SIMS4_COLLECTIONS.map((c, index) => ({ c, index, set: pureContentTypeSet(c) }))
  .filter((x): x is { c: CollectionDefinition; index: number; set: Set<string> } => x.set !== null);

const nestedPairs: Array<{ narrow: (typeof pure)[number]; broad: (typeof pure)[number] }> = [];
for (const a of pure) {
  for (const b of pure) {
    if (a !== b && isStrictSubset(a.set, b.set)) nestedPairs.push({ narrow: a, broad: b });
  }
}

function syntheticMod(contentType: string) {
  return {
    gameVersion: 'Sims 4',
    isNSFW: false,
    contentType,
    visualStyle: null,
    themes: [],
    genderOptions: [],
    ageGroups: [],
    occultTypes: [],
    title: '',
    description: '',
  };
}

describe('union collections sit after the collections they contain', () => {
  it('finds pure contentType collections and at least one nested pair (vacuity guard)', () => {
    expect(pure.length).toBeGreaterThanOrEqual(10);
    expect(
      nestedPairs.length,
      'no collection is a union over another — this suite would pass by finding nothing',
    ).toBeGreaterThanOrEqual(1);
  });

  it('places every narrower contentType collection before any union that contains it', () => {
    const misordered = nestedPairs
      .filter(({ narrow, broad }) => broad.index < narrow.index)
      .map(({ narrow, broad }) => `${broad.c.slug} (#${broad.index}) precedes ${narrow.c.slug} (#${narrow.index})`);
    expect(
      misordered,
      'a union collection earlier in SIMS4_COLLECTIONS takes the primary breadcrumb from ' +
        'the narrower page — move the union after it',
    ).toEqual([]);
  });

  it('gives an untagged mod of every facet type the narrowest matching collection as its crumb', () => {
    const types = new Set<string>();
    for (const p of pure) for (const t of Array.from(p.set)) types.add(t);
    expect(types.size).toBeGreaterThanOrEqual(20);
    const wrong: string[] = [];
    for (const t of Array.from(types)) {
      const primary = getCollectionsForMod(syntheticMod(t))[0];
      const candidates = pure.filter((p) => p.set.has(t));
      const narrowest = Math.min(...candidates.map((p) => p.set.size));
      const primarySet = pure.find((p) => p.c.slug === primary?.slug)?.set;
      if (!primarySet || primarySet.size !== narrowest) {
        wrong.push(`${t} → ${primary?.slug ?? 'none'} (narrowest has ${narrowest} types)`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('routes build/buy facets to their own page and the uncovered ones to build-cc', () => {
    const crumb = (t: string) => getCollectionsForMod(syntheticMod(t))[0]?.slug;
    expect(crumb('furniture')).toBe('furniture-cc');
    expect(crumb('decor')).toBe('decor-cc');
    expect(crumb('plants')).toBe('decor-cc');
    expect(crumb('clutter')).toBe('clutter');
    expect(crumb('lighting')).toBe('build-cc');
    expect(crumb('pet-furniture')).toBe('build-cc');
    // and build-cc is still listed (second) on a furniture mod
    expect(getCollectionsForMod(syntheticMod('furniture')).map((c) => c.slug)).toContain('build-cc');
  });
});
