import { describe, it, expect } from 'vitest';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { COLLECTION_COVERS } from '@/lib/collectionCovers';

/**
 * lib/collectionCovers.ts is generated, so a collection added to the registry
 * after the last run has no cover until someone regenerates it. gshade-presets
 * (E272) shipped that way and rendered as a bare pill on the homepage
 * (2026-10-26). Fix: npx tsx scripts/generate-collection-covers.ts
 */
describe('collection covers cover the registry', () => {
  it('scans a real registry (vacuity guard)', () => {
    expect(SIMS4_COLLECTIONS.length).toBeGreaterThan(20);
  });

  it('every Sims 4 collection has at least one https cover', () => {
    const missing = SIMS4_COLLECTIONS.map((c) => c.slug).filter(
      (slug) => !(COLLECTION_COVERS[slug] ?? []).some((u) => u.startsWith('https://')),
    );
    expect(missing, 'run: npx tsx scripts/generate-collection-covers.ts').toEqual([]);
  });

  it('has no covers for collections that no longer exist', () => {
    const slugs = new Set(SIMS4_COLLECTIONS.map((c) => c.slug));
    expect(Object.keys(COLLECTION_COVERS).filter((s) => !slugs.has(s))).toEqual([]);
  });
});
