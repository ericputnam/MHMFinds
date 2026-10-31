/**
 * E302 (Sage, 2026-10-31): /games/[game]/[topic]/ links down to the
 * /creator/[slug]/ pages of the creators with the most mods in it.
 *
 * Run red first against pre-fix origin/main: every case fails there —
 * lib/collectionCreators.ts does not exist, the page passes no `creators`,
 * and the client renders no collection-creators section.
 */
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

vi.mock('@/lib/prisma', () => ({ prisma: {}, default: {} }));

import {
  MAX_COLLECTION_CREATORS,
  MIN_MODS_IN_COLLECTION,
  foldCollectionCreators,
} from '../../lib/collectionCreators';
import { creatorHref } from '../../lib/creatorSlug';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const pages = [
  { slug: 'ravasheen', displayName: 'Ravasheen' },
  { slug: 'sixam-cc', displayName: 'Sixam CC' },
  { slug: 'littlemssam', displayName: 'LittleMsSam' },
  { slug: 'solo', displayName: 'Solo' },
];

describe('foldCollectionCreators (pure)', () => {
  it('folds spellings onto one creator key and links the canonical slug + display name', () => {
    const out = foldCollectionCreators(
      [
        { author: 'Sixam CC', count: 3, downloads: 10 },
        { author: 'SixamCC', count: 2, downloads: 5 },
        { author: 'RAVASHEEN', count: 4, downloads: 1 },
      ],
      pages,
    );
    expect(out).toEqual([
      { slug: 'sixam-cc', displayName: 'Sixam CC', count: 5 },
      { slug: 'ravasheen', displayName: 'Ravasheen', count: 4 },
    ]);
  });

  it('never emits a link the creator route would 404: authors without a page are dropped', () => {
    const out = foldCollectionCreators(
      [
        { author: 'Nobody Here', count: 9, downloads: 99 },
        { author: null, count: 9, downloads: 99 },
        { author: '!!!', count: 9, downloads: 99 },
        { author: 'littlemssam', count: 2, downloads: 0 },
      ],
      pages,
    );
    expect(out.map((c) => c.slug)).toEqual(['littlemssam']);
  });

  it(`requires at least ${MIN_MODS_IN_COLLECTION} mods in the hub (one stray mod is not "a creator in this collection")`, () => {
    expect(MIN_MODS_IN_COLLECTION).toBeGreaterThanOrEqual(2);
    const out = foldCollectionCreators(
      [
        { author: 'Solo', count: 1, downloads: 1000 },
        { author: 'Ravasheen', count: MIN_MODS_IN_COLLECTION, downloads: 0 },
      ],
      pages,
    );
    expect(out.map((c) => c.slug)).toEqual(['ravasheen']);
  });

  it('ranks by mods in the hub, then downloads, then slug; caps at the block size', () => {
    // displayName "C 05" and slug "c05" share the creator key "c05".
    const many = Array.from({ length: MAX_COLLECTION_CREATORS + 4 }, (_, i) => ({
      slug: `c${String(i).padStart(2, '0')}`,
      displayName: `C ${String(i).padStart(2, '0')}`,
    }));
    const rows = many.map((p, i) => ({ author: p.displayName, count: 3, downloads: i === 2 ? 50 : 0 }));
    rows[5].count = 7; // most mods wins outright
    const out = foldCollectionCreators(rows, many);
    expect(out.length).toBe(MAX_COLLECTION_CREATORS);
    expect(out[0]).toMatchObject({ slug: 'c05', count: 7 });
    expect(out[1]).toMatchObject({ slug: 'c02', count: 3 }); // downloads break the tie
    expect(out.slice(2).map((c) => c.slug)).toEqual(['c00', 'c01', 'c03', 'c04']); // then slug asc
    expect(foldCollectionCreators(rows, many, 2).length).toBe(2);
    expect(foldCollectionCreators(rows, many, 0)).toEqual([]);
    expect(foldCollectionCreators([], many)).toEqual([]);
  });

  it('every emitted slug resolves to a trailing-slash creator URL (trailingSlash: true)', () => {
    const out = foldCollectionCreators([{ author: 'Ravasheen', count: 2, downloads: 0 }], pages);
    for (const c of out) expect(creatorHref(c.slug)).toMatch(/^\/creator\/[a-z0-9-]+\/$/);
  });
});

describe('collection page wiring', () => {
  it('page.tsx loads the creators alongside the grid and passes them down', () => {
    const src = stripComments(read('app/games/[game]/[topic]/page.tsx'));
    expect(src).toMatch(/getCollectionCreators\(collection\)/);
    expect(src).toMatch(/creators=\{creators\}/);
  });

  it('the client renders the block in the main column, before the sidebar, via creatorHref', () => {
    const src = stripComments(read('app/games/[game]/[topic]/CollectionPageClient.tsx'));
    const sectionAt = src.indexOf('aria-labelledby="collection-creators-heading"');
    const asideAt = src.indexOf('id="secondary"');
    expect(sectionAt).toBeGreaterThan(-1);
    expect(asideAt).toBeGreaterThan(-1);
    expect(sectionAt).toBeLessThan(asideAt);
    const section = src.slice(sectionAt, src.indexOf('</section>', sectionAt));
    expect(section).toMatch(/creators\.map/);
    expect(section).toMatch(/href=\{creatorHref\(c\.slug\)\}/);
    expect(section).not.toMatch(/mv-ads/);
    expect(section).not.toMatch(/id="secondary"/);
    // Hidden when empty, and the ad anchor is still unconditional.
    expect(src).toMatch(/creators\.length > 0 &&/);
    expect(src).toMatch(/<aside\s+id="secondary"/);
  });

  it('the loader shares the hub where-clause with the grid and degrades to [] (never a 500)', () => {
    const src = stripComments(read('lib/collectionCreators.ts'));
    expect(src).toMatch(/\.\.\.buildWhereClause\(collection\.filter\)/);
    expect(src).toMatch(/gameVersion: collection\.game/);
    expect(src).toMatch(/isNSFW: false/);
    expect(src).toMatch(/listHubCreators\(\)/);
    expect(src).toMatch(/catch \(error\) \{[\s\S]*return \[\];/);
  });
});
