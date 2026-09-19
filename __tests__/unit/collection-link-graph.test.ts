/**
 * Collection internal-link graph invariants (Sage, 2026-09-19).
 *
 * The `related` array on each collection in `lib/collections.ts` is the only
 * *topical* internal link between collection pages: the homepage block and the
 * `/games/[game]/` hub link to all of them equally, and the ~16K `/mods/[id]`
 * breadcrumbs (E32) link by facet membership, so `related` is the only place a
 * sibling page passes topic-relevant equity.
 *
 * It is written by hand, one collection at a time, and only in the *outbound*
 * direction — nothing in the codebase ever looked at the inbound side. By
 * 2026-09-19 that had produced a badly skewed graph across 21 collections and
 * 63 edges: `female-clothes` received 12 inbound links while **four pages
 * received zero** (`body-presets`, `witch-cc`, `loading-screens` shipped 09-15,
 * `jewelry-cc` shipped 09-18) and four more received exactly one — three of
 * which came from a page that was itself an orphan, so the tail hung off
 * nothing. A new collection is born with 3 outbound links and 0 inbound ones,
 * and nothing failed.
 *
 * These tests are the missing direction. They scan the registry rather than a
 * hand-maintained list, so a collection added tomorrow either gets wired in
 * both directions or turns this suite red.
 *
 * Dangling slugs and self-links are already guarded in
 * `__tests__/unit/canonical-trailing-slash.test.ts` ("every related slug
 * resolves to a real collection"); this file deliberately does not repeat them.
 */

import { describe, expect, it } from 'vitest';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { homeCollectionLinks } from '@/app/HomeCollections';

/** Every collection must receive at least this many sibling `related` links. */
const MIN_INBOUND = 2;
/**
 * And no more than this many, so equity does not re-concentrate on one page the
 * way it did on `female-clothes` (12 of 63 edges before 2026-09-19). The two
 * legitimate hubs, `hair-cc` and `skin-details`, sit at 7.
 */
const MAX_INBOUND = 8;
/** The related strip renders `md:grid-cols-3`; 3 fills exactly one row. */
const OUTBOUND = 3;

type Graph = {
  slugs: string[];
  inbound: Map<string, string[]>;
};

function buildGraph(): Graph {
  const slugs = SIMS4_COLLECTIONS.map((c) => c.slug);
  const inbound = new Map<string, string[]>(slugs.map((s) => [s, []]));
  for (const c of SIMS4_COLLECTIONS) {
    for (const rel of c.related) {
      inbound.get(rel)?.push(c.slug);
    }
  }
  return { slugs, inbound };
}

describe('collection internal-link graph', () => {
  // Vacuity guard: every assertion below iterates the registry, so a registry
  // that failed to import would make the whole suite pass by finding nothing.
  it('scans a registry of a plausible size', () => {
    expect(SIMS4_COLLECTIONS.length).toBeGreaterThanOrEqual(21);
    const edges = SIMS4_COLLECTIONS.reduce((n, c) => n + c.related.length, 0);
    expect(edges).toBeGreaterThanOrEqual(60);
  });

  it('gives every collection exactly three outbound related links', () => {
    for (const c of SIMS4_COLLECTIONS) {
      expect(
        c.related.length,
        `${c.slug} has ${c.related.length} related links, expected ${OUTBOUND}`,
      ).toBe(OUTBOUND);
    }
  });

  it('lists no collection twice in one related array', () => {
    for (const c of SIMS4_COLLECTIONS) {
      expect(
        new Set(c.related).size,
        `${c.slug} repeats a slug in related: ${JSON.stringify(c.related)}`,
      ).toBe(c.related.length);
    }
  });

  it(`links to every collection from at least ${MIN_INBOUND} sibling collections`, () => {
    const { slugs, inbound } = buildGraph();
    const orphans = slugs
      .filter((s) => (inbound.get(s) ?? []).length < MIN_INBOUND)
      .map((s) => `${s} (${(inbound.get(s) ?? []).length})`);
    expect(
      orphans,
      `these collections receive fewer than ${MIN_INBOUND} related links, so no ` +
        'sibling page passes them topical equity — add each one to the `related` ' +
        'array of a topically adjacent collection in lib/collections.ts',
    ).toEqual([]);
  });

  it(`sends no collection more than ${MAX_INBOUND} inbound links`, () => {
    const { slugs, inbound } = buildGraph();
    const hogs = slugs
      .filter((s) => (inbound.get(s) ?? []).length > MAX_INBOUND)
      .map((s) => `${s} (${(inbound.get(s) ?? []).length})`);
    expect(
      hogs,
      'these collections absorb too large a share of the related graph; ' +
        'repoint one of their inbound links at an under-linked sibling',
    ).toEqual([]);
  });

  it('never leaves a collection dependent only on under-linked sources', () => {
    // The observed failure mode was a chain: y2k-cc / vampire-cc / makeup-cc
    // each had exactly one inbound link, and that link came from a page with
    // zero inbound links of its own. Require at least one source that is
    // itself linked, so the tail is attached to the graph and not to a leaf.
    const { slugs, inbound } = buildGraph();
    const weak: string[] = [];
    for (const slug of slugs) {
      const sources = inbound.get(slug) ?? [];
      const anchored = sources.some(
        (src) => (inbound.get(src) ?? []).length >= MIN_INBOUND,
      );
      if (!anchored) weak.push(`${slug} (sources: ${sources.join(', ') || 'none'})`);
    }
    expect(weak, 'collections whose every inbound source is itself under-linked').toEqual([]);
  });

  it('keeps the homepage collection block driven by the registry', () => {
    // The homepage block is the other inbound surface. If it ever goes back to
    // a hardcoded list, a new collection silently loses its homepage link —
    // which is how `related` drifted in the first place.
    const links = homeCollectionLinks();
    expect(links.length).toBe(SIMS4_COLLECTIONS.length);
    const hrefs = new Set(links.map((l) => l.href));
    for (const c of SIMS4_COLLECTIONS) {
      expect(
        hrefs.has(`/games/${c.gameSlug}/${c.slug}/`),
        `${c.slug} is missing from the homepage "Browse by collection" block`,
      ).toBe(true);
    }
    // trailingSlash: true is global — a bare path 308s and the internal link
    // stops pointing at the canonical URL.
    for (const l of links) {
      expect(l.href.endsWith('/'), `${l.slug} homepage href lacks a trailing slash`).toBe(true);
      expect(
        l.url,
        `${l.slug} homepage absolute URL is not the canonical apex URL`,
      ).toBe(`https://musthavemods.com${l.href}`);
    }
  });
});
