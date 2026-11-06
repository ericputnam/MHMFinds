import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { CATALOG_FINDS } from '@/lib/seo/catalogCount';
import { SIMS4_COLLECTIONS, type CollectionDefinition } from '@/lib/collections';
import { importsName, stripComments } from '../helpers/namedImports';

/**
 * The catalogue size ("17,000+") lives in one constant, lib/seo/catalogCount.ts.
 * On 2026-10-26 the homepage served three different numbers at once: the
 * <title> said 17,000+ (hard-coded), the hero said 15,000+ in the SSR HTML and
 * 16,000+ after its client-side count resolved. This scans the source tree for
 * any other "NN,000+" literal so the next bump cannot miss a copy.
 *
 * 2026-11-06 (E364, Ops): this went red on main for two different reasons and
 * only one of them was a real copy of the catalogue count.
 *  - lib/seo/shareCard.ts (#467) hard-coded 'MustHaveMods: 17,000+ …' — a real
 *    copy. It now reads CATALOG_FINDS. So does the homepage FAQ JSON-LD, which
 *    said "over 17,000" with no "+" and slipped past the old literal.
 *  - lib/collections.ts hair-cc (E311, #435) says "2,000+" — a *collection*
 *    count, a different claim with its own constant (expectedCount). The old
 *    scan could not tell the two apart. Now: a literal is a catalogue claim if
 *    it is at least half of CATALOG_FINDS (derived, so it moves with a bump);
 *    a collection's own "N,000+" must not exceed that collection's
 *    expectedCount.
 */
const ROOT = path.resolve(__dirname, '../..');
const DIRS = ['app', 'components', 'lib'];
const HOME = path.join(ROOT, 'lib/seo/catalogCount.ts');
// "17,000+" and "over 17,000" alike; thousands only, so "16,985" (a reading
// quoted in code) is not a claim.
const COUNT_LITERAL = /\b\d{1,3},000\b\+?/g;
const toNumber = (lit: string) => Number(lit.replace(/[^\d]/g, ''));
const CATALOG_VALUE = toNumber(CATALOG_FINDS);
// Anything this big is the catalogue, whatever its exact value: a stale copy
// after a bump (17,000+ vs 18,000+) or an old one (15,000+) both land here.
const CATALOG_CLAIM_FLOOR = CATALOG_VALUE / 2;

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

// Comments quote the old numbers on purpose (E259's history); only code counts
// (stripComments from ../helpers/namedImports).

const files = DIRS.flatMap((d) => walk(path.join(ROOT, d)));

describe('catalogue count has one source', () => {
  it('scans a real tree (vacuity guard)', () => {
    expect(files.length).toBeGreaterThan(200);
    expect(files).toContain(HOME);
  });

  it('the constant is a "NN,000+" label', () => {
    expect(CATALOG_FINDS).toMatch(/^\d{1,3},000\+$/);
    expect(CATALOG_VALUE).toBeGreaterThanOrEqual(10_000);
  });

  it('no other source file hard-codes a catalogue-sized "NN,000" count', () => {
    const offenders = files
      .filter((f) => f !== HOME)
      .flatMap((f) =>
        (stripComments(fs.readFileSync(f, 'utf8')).match(COUNT_LITERAL) ?? [])
          .filter((m) => toNumber(m) >= CATALOG_CLAIM_FLOOR)
          .map((m) => `${path.relative(ROOT, f)}: ${m}`),
      );
    expect(offenders).toEqual([]);
  });

  it('the scan sees the copies it was written for (red against the pre-fix strings)', () => {
    const pre = [
      "const SITE_SHARE_IMAGE_ALT = 'MustHaveMods: 17,000+ Sims 4 mods and CC';",
      "text: 'It indexes over 17,000 verified mods',",
      "title: 'Browse 15,000+ mods'",
    ];
    for (const line of pre) {
      const hits = (stripComments(line).match(COUNT_LITERAL) ?? []).filter((m) => toNumber(m) >= CATALOG_CLAIM_FLOOR);
      expect(hits.length, line).toBe(1);
    }
    // ...and lets a collection-sized count through to its own guard below.
    expect(toNumber('2,000+')).toBeLessThan(CATALOG_CLAIM_FLOOR);
  });

  it("a collection's own \"N,000+\" claim never exceeds its expectedCount", () => {
    const textOf = (c: CollectionDefinition) =>
      [c.metaTitle, c.metaDescription, c.heading, c.tagline, c.intro].filter(Boolean).join('\n');
    const claims = SIMS4_COLLECTIONS.flatMap((c) =>
      (textOf(c).match(COUNT_LITERAL) ?? []).map((m) => ({ slug: c.slug, claim: toNumber(m), expected: c.expectedCount })),
    );
    // Vacuity guard: hair-cc's "2,000+" (E311) is in the registry today.
    expect(claims.some((x) => x.slug === 'hair-cc')).toBe(true);
    const over = claims.filter((x) => x.claim > x.expected).map((x) => `${x.slug}: ${x.claim} > ${x.expected}`);
    expect(over).toEqual([]);
  });

  it('every surface that states the count reads the constant', () => {
    const readers = [
      'app/layout.tsx',
      'app/llms.txt/route.ts',
      'app/llms-full.txt/route.ts',
      'components/HomeJsonLd.tsx',
      'components/launcher/LauncherHero.tsx',
      'lib/seo/shareCard.ts',
    ];
    for (const r of readers) {
      const src = stripComments(fs.readFileSync(path.join(ROOT, r), 'utf8'));
      expect(importsName(src, 'CATALOG_FINDS', 'catalogCount'), r).toBe(true);
      expect(src, r).toMatch(/\$\{CATALOG_FINDS\}|\{CATALOG_FINDS\}/);
    }
  });

  it('the hero no longer derives its number from a live count', () => {
    const hero = stripComments(fs.readFileSync(path.join(ROOT, 'components/launcher/LauncherHero.tsx'), 'utf8'));
    expect(hero).not.toMatch(/total/);
  });
});
