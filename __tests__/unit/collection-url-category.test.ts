/**
 * E228 (Rowan, 2026-10-17): the blog-post URL map (`detectContentTypeFromUrl`)
 * must agree with the collection registry about what a collection's own blog
 * post holds.
 *
 * Why: the URL category is the ingest fallback when a title is not confident
 * (E168), and it is the yardstick of `catalog-post-disagreement.ts`. Until E228
 * `/jewelry/` mapped to `accessories` while the jewelry-cc collection filters on
 * `jewelry` + `watches` — so a jewelry post's untitled row landed OUTSIDE the
 * jewelry page, and the disagreement tool could not see it. Nothing failed;
 * it was found in review (inbox, 10-13).
 *
 * Rule: for every registry collection with a `blogUrl` and a content-type
 * filter, the URL map's answer for that blogUrl is either undefined (no
 * opinion) or one of the collection's own content types. Walks the registry,
 * not a hand list, so a new collection is covered the day it is added.
 *
 * Against origin/main 2ea53aa this fails on jewelry-cc (`accessories`).
 */
import { describe, it, expect } from 'vitest';
import { SIMS4_COLLECTIONS } from '../../lib/collections';
import { detectContentTypeFromUrl } from '../../lib/services/mhmScraperUtils';

/**
 * Known, still-open mismatches. Each must STILL be a mismatch (a stale entry
 * fails), so fixing the map forces the entry out. Not fixed in E228 because
 * each changes the ingest fallback for a whole family of posts and needs its
 * own whole-catalog replay first.
 */
const KNOWN_GAPS: Record<string, { urlType: string; why: string }> = {
  clutter: { urlType: 'decor', why: '`/clutter/` shares the `decor` rule; decor-family agrees in the disagreement tool, but the clutter page filters on `clutter` only' },
  'body-presets': { urlType: 'preset', why: '`/body-preset/` shares the `preset` rule; the body-presets page filters on `body-preset` only' },
};

function typesOf(filter: { contentType?: string; contentTypeIn?: string[] }): string[] {
  const t = filter.contentTypeIn?.length ? filter.contentTypeIn : filter.contentType ? [filter.contentType] : [];
  // `__x_keyword__` values are sentinels for keyword collections, not facet values.
  return t.filter((v) => !/^__.*__$/.test(v));
}

const checked = SIMS4_COLLECTIONS.filter((c) => c.blogUrl && typesOf(c.filter).length > 0).map((c) => ({
  slug: c.slug,
  types: typesOf(c.filter),
  urlType: detectContentTypeFromUrl(`https://musthavemods.com${c.blogUrl}`),
}));

describe('blog-post URL map agrees with the collection registry (E228)', () => {
  it('vacuity guard: walks the whole registry', () => {
    expect(SIMS4_COLLECTIONS.length).toBeGreaterThanOrEqual(21);
    expect(checked.length).toBeGreaterThanOrEqual(15);
    expect(checked.filter((c) => c.urlType).length).toBeGreaterThanOrEqual(10);
  });

  it.each(checked.filter((c) => !KNOWN_GAPS[c.slug]))('$slug: URL category is one of the page\'s own types', ({ urlType, types }) => {
    if (urlType !== undefined) expect(types).toContain(urlType);
  });

  it.each(Object.entries(KNOWN_GAPS))('known gap %s is still a gap (remove it when fixed)', (slug, gap) => {
    const c = checked.find((x) => x.slug === slug);
    expect(c, `${slug} is no longer a checked collection`).toBeDefined();
    expect(c!.urlType).toBe(gap.urlType);
    expect(c!.types).not.toContain(gap.urlType);
  });

  it('jewelry-cc is the case that motivated it', () => {
    expect(checked.find((c) => c.slug === 'jewelry-cc')?.urlType).toBe('jewelry');
  });
});
