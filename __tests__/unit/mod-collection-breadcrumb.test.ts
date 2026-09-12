import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

import {
  SIMS4_COLLECTIONS,
  getCollectionsForMod,
  getCollectionLinksForMod,
  modMatchesFilter,
  buildWhereClause,
  collectionHref,
} from '@/lib/collections';
import {
  buildModBreadcrumb,
  buildBreadcrumbListJsonLd,
  modCanonicalUrl,
} from '@/lib/seo/modBreadcrumb';

/**
 * /mods/[id] → collection-page internal links (E32, 2026-09-10).
 *
 * Every mod-detail page should carry a crawlable link to the collection page
 * that lists it, and a BreadcrumbList that matches the visible trail. The
 * reverse lookup is pure and mirrors buildWhereClause; these tests pin the
 * two together and guard the wiring at the source level.
 */

const ROOT = path.resolve(__dirname, '../..');
const readSource = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const sims4 = (extra: Record<string, unknown> = {}) => ({
  gameVersion: 'Sims 4',
  isNSFW: false,
  contentType: null,
  themes: [] as string[],
  genderOptions: [] as string[],
  occultTypes: [] as string[],
  title: 'Some Mod',
  description: null,
  ...extra,
});

describe('getCollectionsForMod — reverse lookup', () => {
  it('hair mod → hair-cc as primary', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'hair' }));
    expect(cols[0]?.slug).toBe('hair-cc');
  });

  it('goth hair → hair-cc primary, goth-cc secondary (contentType outranks theme)', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'hair', themes: ['goth'] })).map((c) => c.slug);
    expect(cols[0]).toBe('hair-cc');
    expect(cols).toContain('goth-cc');
  });

  it('feminine top → female-clothes, not male-clothes', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'tops', genderOptions: ['feminine'] })).map((c) => c.slug);
    expect(cols).toContain('female-clothes');
    expect(cols).not.toContain('male-clothes');
  });

  it('masculine shoes → male-clothes', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'shoes', genderOptions: ['masculine'] })).map((c) => c.slug);
    expect(cols).toContain('male-clothes');
  });

  it('untagged top (no gender) matches neither clothes collection', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'tops' })).map((c) => c.slug);
    expect(cols).not.toContain('female-clothes');
    expect(cols).not.toContain('male-clothes');
  });

  it('composite makeup-cc picks up eyebrows', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'eyebrows' })).map((c) => c.slug);
    expect(cols).toContain('makeup-cc');
  });

  it('pregnancy keyword fallback matches on title', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'full-body', genderOptions: ['feminine'], title: 'Maternity Dress' })).map((c) => c.slug);
    expect(cols).toContain('pregnancy-mods');
    // keyword fallback is the loosest match, so the typed collection leads
    expect(cols[0]).toBe('female-clothes');
  });

  it('witch keyword fallback matches on occultTypes', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'hats', occultTypes: ['spellcaster'] })).map((c) => c.slug);
    expect(cols).toContain('witch-cc');
  });

  it('vampire occult → vampire-cc', () => {
    const cols = getCollectionsForMod(sims4({ contentType: 'skin', occultTypes: ['vampire'] })).map((c) => c.slug);
    expect(cols[0]).toBe('skin-details');
    expect(cols).toContain('vampire-cc');
  });

  it('NSFW mods are never linked to a collection (collection pages exclude them)', () => {
    expect(getCollectionsForMod(sims4({ contentType: 'hair', isNSFW: true }))).toEqual([]);
  });

  it('other games are never linked to Sims 4 collections', () => {
    expect(getCollectionsForMod(sims4({ contentType: 'hair', gameVersion: 'Stardew Valley' }))).toEqual([]);
  });

  it('a mod with no facets resolves to no collection (breadcrumb falls back to the game hub)', () => {
    expect(getCollectionsForMod(sims4())).toEqual([]);
  });

  it('links use the trailing-slash collection path', () => {
    const links = getCollectionLinksForMod(sims4({ contentType: 'furniture' }));
    expect(links[0]).toMatchObject({ slug: 'furniture-cc', href: '/games/sims-4/furniture-cc/', title: 'Furniture CC' });
    for (const l of links) expect(l.href).toMatch(/^\/games\/[a-z0-9-]+\/[a-z0-9-]+\/$/);
  });
});

describe('modMatchesFilter mirrors buildWhereClause for every registry filter', () => {
  // For each collection, construct a mod that satisfies the Prisma where-clause
  // by reading the clause itself, then assert the in-memory matcher agrees.
  for (const c of SIMS4_COLLECTIONS) {
    it(`${c.slug}: a mod built from the where-clause matches in memory`, () => {
      const where = buildWhereClause(c.filter) as any;
      const mod: Record<string, unknown> = sims4();
      if (where.OR) {
        // keyword fallbacks: satisfy the first typed branch
        const first = where.OR[0];
        if (first.contentType) mod.contentType = first.contentType;
        if (first.themes?.hasSome) mod.themes = first.themes.hasSome;
        if (first.occultTypes?.hasSome) mod.occultTypes = first.occultTypes.hasSome;
      } else {
        if (typeof where.contentType === 'string') mod.contentType = where.contentType;
        if (where.contentType?.in) mod.contentType = where.contentType.in[0];
        if (where.visualStyle) mod.visualStyle = where.visualStyle;
        if (where.themes?.hasSome) mod.themes = where.themes.hasSome;
        if (where.themes?.hasEvery) mod.themes = where.themes.hasEvery;
        if (where.genderOptions?.hasSome) mod.genderOptions = where.genderOptions.hasSome;
        if (where.ageGroups?.hasSome) mod.ageGroups = where.ageGroups.hasSome;
        if (where.occultTypes?.hasSome) mod.occultTypes = where.occultTypes.hasSome;
      }
      expect(modMatchesFilter(mod as any, c.filter)).toBe(true);
      expect(getCollectionsForMod(mod as any).map((x) => x.slug)).toContain(c.slug);
    });
  }

  it('every registry collection has a trailing-slash href', () => {
    for (const c of SIMS4_COLLECTIONS) expect(collectionHref(c)).toBe(`/games/${c.gameSlug}/${c.slug}/`);
  });
});

describe('buildModBreadcrumb / BreadcrumbList', () => {
  const mod = { id: 'abc123', title: 'Cool Hair', gameVersion: 'Sims 4' };

  it('Home › Sims 4 › Hair CC › mod, all items absolute with trailing slash', () => {
    const crumbs = buildModBreadcrumb(mod, getCollectionLinksForMod(sims4({ contentType: 'hair' })));
    expect(crumbs.map((c) => c.name)).toEqual(['Home', 'Sims 4', 'Hair CC', 'Cool Hair']);
    expect(crumbs.map((c) => c.item)).toEqual([
      'https://musthavemods.com/',
      'https://musthavemods.com/games/sims-4/',
      'https://musthavemods.com/games/sims-4/hair-cc/',
      'https://musthavemods.com/mods/abc123/',
    ]);
    for (const c of crumbs) expect(c.item.endsWith('/')).toBe(true);
  });

  it('omits the collection crumb when the mod matches none', () => {
    const crumbs = buildModBreadcrumb(mod, []);
    expect(crumbs.map((c) => c.name)).toEqual(['Home', 'Sims 4', 'Cool Hair']);
  });

  it('never emits a `?category=` URL', () => {
    const json = JSON.stringify(buildBreadcrumbListJsonLd(buildModBreadcrumb(mod, [])));
    expect(json).not.toContain('?category=');
  });

  it('BreadcrumbList positions are 1-based and contiguous', () => {
    const ld = buildBreadcrumbListJsonLd(buildModBreadcrumb(mod, getCollectionLinksForMod(sims4({ contentType: 'poses' }))));
    expect(ld['@type']).toBe('BreadcrumbList');
    expect(ld.itemListElement.map((e) => e.position)).toEqual([1, 2, 3, 4]);
    expect(ld.itemListElement[3].item).toBe(modCanonicalUrl('abc123'));
  });
});

describe('source-level wiring on /mods/[id]', () => {
  const page = readSource('app/mods/[id]/page.tsx');
  const client = readSource('app/mods/[id]/ModDetailClient.tsx');
  const jsonLd = readSource('components/ModJsonLd.tsx');

  it('page.tsx resolves collections server-side and passes them to both children', () => {
    expect(page).toContain('getCollectionLinksForMod(mod)');
    expect(page).toMatch(/<ModJsonLd mod=\{mod\} collections=\{collections\}/);
    expect(page).toMatch(/<ModDetailClient initialMod=\{mod\} collections=\{collections\}/);
  });

  it('ModDetailClient breadcrumb is real <Link>s from the shared builder, not router.push buttons', () => {
    expect(client).toContain('buildModBreadcrumb(');
    expect(client).toContain('aria-label="Breadcrumb"');
    expect(client).not.toContain('/?category=');
    expect(client).not.toMatch(/onClick=\{\(\) => router\.push\('\/'\)\}\s*className="flex items-center gap-1/);
  });

  it('ModDetailClient does not import the registry itself (keeps intro copy out of the client bundle)', () => {
    expect(client).not.toMatch(/import\s+\{[^}]*SIMS4_COLLECTIONS[^}]*\}\s+from/);
    expect(client).toMatch(/import type \{ CollectionLink \} from '@\/lib\/collections'/);
  });

  it('ModJsonLd builds BreadcrumbList from the shared builder and uses the trailing-slash mod URL', () => {
    expect(jsonLd).toContain('buildBreadcrumbListJsonLd(');
    expect(jsonLd).toContain('modCanonicalUrl(mod.id)');
    expect(jsonLd).not.toContain('?category=');
    expect(jsonLd).not.toMatch(/`https:\/\/musthavemods\.com\/mods\/\$\{mod\.id\}`/);
  });

  it('ad anchors on the mod page are untouched by the breadcrumb change', () => {
    expect(client).toContain('id="secondary"');
    expect(client).toContain('className="mv-ads space-y-6 mb-6"');
    expect((client.match(/<InContentAd \/>/g) || []).length).toBe(4);
  });
});
