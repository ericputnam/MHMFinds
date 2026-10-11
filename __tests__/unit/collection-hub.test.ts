/**
 * E182 (2026-10-11): top-level Sims 4 CC hub, /games/sims-4/cc/.
 *
 * A hub is a parent of the category collections, not a sibling and not a
 * mod-level membership. These cases pin the three properties that make that
 * true, plus the content rule that keeps gameplay out of a "CC" page.
 * Against pre-fix origin/main the hub does not exist, so every case but the
 * membership scan fails.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  SIMS4_COLLECTIONS,
  getCollection,
  getCollectionsForMod,
  modMatchesFilter,
} from '@/lib/collections';

const stripComments = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

const read = (rel: string) => stripComments(readFileSync(join(process.cwd(), rel), 'utf8'));

const hubs = SIMS4_COLLECTIONS.filter((c) => c.hub);

describe('Sims 4 CC hub registry entry', () => {
  it('exists exactly once, at /games/sims-4/cc/, and is last in the registry', () => {
    expect(hubs.map((c) => c.slug)).toEqual(['cc']);
    expect(getCollection('sims-4', 'cc')?.hub).toBe(true);
    expect(SIMS4_COLLECTIONS[SIMS4_COLLECTIONS.length - 1].slug).toBe('cc');
  });

  it('is a union over at least the contentTypes of its three related category pages', () => {
    const hub = hubs[0];
    const types = new Set(hub.filter.contentTypeIn ?? []);
    expect(types.size).toBeGreaterThanOrEqual(30);
    for (const slug of hub.related) {
      const c = getCollection('sims-4', slug);
      expect(c, `${slug} must exist`).not.toBeNull();
      const childTypes = c!.filter.contentTypeIn ?? (c!.filter.contentType ? [c!.filter.contentType] : []);
      for (const t of childTypes) expect(types.has(t), `${t} (from ${slug}) missing from hub`).toBe(true);
    }
    expect(hub.expectedCount).toBeGreaterThanOrEqual(20);
  });

  it('keeps gameplay, lots and the mixed holidays tag out of a "CC" page', () => {
    const types = new Set(hubs[0].filter.contentTypeIn ?? []);
    for (const t of [
      'gameplay-mod',
      'script-mod',
      'career',
      'lot',
      'residential',
      'commercial',
      'community',
      'builds',
      'holidays',
    ]) {
      expect(types.has(t), `${t} must not be in the CC hub`).toBe(false);
    }
  });
});

describe('a hub is never a mod-level membership', () => {
  // Vacuity guard: these mods DO match the hub's filter, so the assertion
  // below is about exclusion, not about a filter that matches nothing.
  const mods = ['hair', 'tops', 'furniture', 'hats', 'eyebrows', 'poses'].map((contentType) => ({
    gameVersion: 'Sims 4',
    isNSFW: false,
    contentType,
    title: `Test ${contentType}`,
    themes: [],
  }));

  it('matches the hub filter (vacuity guard)', () => {
    for (const m of mods) expect(modMatchesFilter(m, hubs[0].filter)).toBe(true);
  });

  it('is skipped by getCollectionsForMod, so no /mods/[id] crumb or "Also in" row changes', () => {
    for (const m of mods) {
      expect(getCollectionsForMod(m).some((c) => c.hub), m.contentType).toBe(false);
    }
  });
});

describe('hub page renders a link to every category collection', () => {
  it('page.tsx builds categoryLinks from the registry only for hubs', () => {
    const src = read('app/games/[game]/[topic]/page.tsx');
    expect(src).toMatch(/collection\.hub\s*\?/);
    expect(src).toMatch(/categoryLinks=\{categoryLinks\}/);
    expect(src).toMatch(/collectionHref\(c\)/);
  });

  it('the client renders them in the header, outside .mv-ads and the sidebar', () => {
    const src = read('app/games/[game]/[topic]/CollectionPageClient.tsx');
    const header = src.slice(src.indexOf('<header'), src.indexOf('</header>'));
    expect(header).toMatch(/categoryLinks\.map/);
    expect(header).not.toMatch(/mv-ads/);
    expect(header).not.toMatch(/id="secondary"/);
    // The ad anchors themselves are still rendered unconditionally.
    expect(src).toMatch(/id="secondary"/);
  });
});
