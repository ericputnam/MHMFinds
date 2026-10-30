/**
 * E292 (Sage, 2026-10-30): /creator/[slug]/ links to the /games/sims-4/*
 * collection hubs that list the creator's mods.
 *
 * Run red first against pre-fix origin/main: sections 2 and 3 fail there —
 * lib/creatorHubLinks.ts does not exist, the page passes no `hubs`, and the
 * client renders no `creator-collections` nav.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { MAX_CREATOR_HUBS, creatorHubLinks } from '../../lib/creatorHubLinks';
import { SIMS4_COLLECTIONS, collectionHref } from '../../lib/collections';

const ROOT = join(__dirname, '..', '..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const hair = (title = 'Hair') => ({
  gameVersion: 'Sims 4',
  isNSFW: false,
  contentType: 'hair',
  themes: [] as string[],
  title,
});
const goth = { ...hair('Goth top'), contentType: 'tops', themes: ['goth'] };

describe('creatorHubLinks (pure)', () => {
  it('returns the hubs the mods are listed in, most-populated first, with counts', () => {
    const links = creatorHubLinks([hair('a'), hair('b'), goth]);
    expect(links[0]).toMatchObject({ href: '/games/sims-4/hair-cc/', title: 'Hair CC', count: 2 });
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain('/games/sims-4/goth-cc/');
    // Every href is a registry collection with a trailing slash (trailingSlash: true).
    const registry = new Set(SIMS4_COLLECTIONS.map((c) => collectionHref(c)));
    for (const h of hrefs) {
      expect(registry.has(h)).toBe(true);
      expect(h.endsWith('/')).toBe(true);
    }
  });

  it('caps the row and honours a custom max', () => {
    const many = SIMS4_COLLECTIONS.filter((c) => !c.hub && c.filter.contentType && !c.filter.contentType.startsWith('__'))
      .slice(0, 8)
      .map((c) => ({ ...hair(c.slug), contentType: c.filter.contentType as string }));
    expect(creatorHubLinks(many).length).toBe(MAX_CREATOR_HUBS);
    expect(creatorHubLinks(many, 2).length).toBe(2);
    expect(creatorHubLinks(many, 0)).toEqual([]);
  });

  it('skips NSFW mods, other games, and mods with no collection', () => {
    expect(creatorHubLinks([{ ...hair(), isNSFW: true }])).toEqual([]);
    expect(creatorHubLinks([{ ...hair(), gameVersion: 'Stardew Valley' }])).toEqual([]);
    expect(creatorHubLinks([{ ...hair(), contentType: 'unmapped-type-xyz' }])).toEqual([]);
    expect(creatorHubLinks([])).toEqual([]);
  });

  it('never links to a hub-only registry entry (hubs are parents, not memberships)', () => {
    const hubHrefs = new Set(SIMS4_COLLECTIONS.filter((c) => c.hub).map((c) => collectionHref(c)));
    expect(hubHrefs.size).toBeGreaterThan(0); // vacuity guard
    const all = SIMS4_COLLECTIONS.filter((c) => c.filter.contentType && !c.filter.contentType.startsWith('__'))
      .map((c) => ({ ...hair(c.slug), contentType: c.filter.contentType as string }));
    for (const l of creatorHubLinks(all, 1000)) expect(hubHrefs.has(l.href)).toBe(false);
  });
});

describe('wiring: the page resolves hubs on the server and the client renders them outside the ad anchor', () => {
  it('page.tsx computes creatorHubLinks(data.mods) and passes hubs=', () => {
    const src = stripComments(read('app/creator/[slug]/page.tsx'));
    expect(src).toMatch(/creatorHubLinks\(data\.mods\)/);
    expect(src).toMatch(/<CreatorPageClient[^>]*hubs=\{hubs\}/);
  });

  it('CreatorPageClient renders the creator-collections nav before the <aside id="secondary">', () => {
    const src = stripComments(read('app/creator/[slug]/CreatorPageClient.tsx'));
    const nav = src.indexOf('data-testid="creator-collections"');
    const aside = src.indexOf('id="secondary"');
    expect(nav).toBeGreaterThan(-1);
    expect(aside).toBeGreaterThan(-1);
    expect(nav).toBeLessThan(aside);
    // Plain anchors from server data — crawlable without hydration.
    expect(src).toMatch(/href=\{h\.href\}/);
  });
});
