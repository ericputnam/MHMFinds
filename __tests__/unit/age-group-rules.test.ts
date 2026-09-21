/**
 * E72 — ageGroups kid axis (Nova, 2026-09-21).
 *
 * Guards the rules that back `/games/sims-4/kids-cc/`. Two halves, in the style
 * of affiliate-placements.test.ts:
 *
 *   1. Behavioural tests on `lib/ageGroupRules.ts`, using the REAL exported
 *      constants (never a restated copy) and real catalog titles.
 *   2. A source-level guard on `lib/services/aiFacetExtractor.ts` so the
 *      description-fed substring extractor cannot come back the next time
 *      `scripts/deploy-facets-safely.ts` is run.
 *
 * Verified red against pre-fix origin/main (e07008f) by running the old
 * `AGE_KEYWORDS` + `text.includes()` extractor over the cases below:
 * **10 of 11 fail**. The one that passes pre-fix ("Realistic Birth Control")
 * passes by accident — the old map simply had no keyword for it — which is
 * why the other three negative contexts are asserted individually rather
 * than as one regex test. The three source guards fail pre-fix as well: the
 * file declared `AGE_KEYWORDS`, imported nothing from `ageGroupRules`, and
 * matched ages against the description-bearing `text` blob.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  AGE_GROUPS,
  AGE_TITLE_PATTERNS,
  AGE_NEGATIVE_TITLE_CONTEXTS,
  KID_AGE_GROUPS,
  ageGroupsFromTitle,
  kidAgeGroupsFromTitle,
  applyKidAxis,
  kidAxisChanges,
} from '@/lib/ageGroupRules';
import { AIFacetExtractor } from '@/lib/services/aiFacetExtractor';

const ROOT = process.cwd();
const readSource = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('age rules — shape', () => {
  it('covers every age group exactly once, and the kid axis is a subset', () => {
    // Vacuity guard: a pattern list that lost its entries would pass every
    // "does not match" test below while matching nothing at all.
    expect(AGE_TITLE_PATTERNS.length).toBe(AGE_GROUPS.length);
    expect(AGE_TITLE_PATTERNS.map(([age]) => age).sort()).toEqual([...AGE_GROUPS].sort());
    for (const kid of KID_AGE_GROUPS) expect(AGE_GROUPS).toContain(kid);
    expect(KID_AGE_GROUPS).toEqual(['infant', 'toddler', 'child']);
  });

  it('never lists a singular and its plural as two separate patterns', () => {
    // Two patterns for one word double-count a single piece of evidence
    // (the 09-08 light/lights finding).
    const sources = AGE_TITLE_PATTERNS.map(([, re]) => re.source);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe('age rules — the substring bugs that poisoned the column', () => {
  // Every title here is a real catalog row on 2026-09-21.
  const cases: ReadonlyArray<readonly [string, string]> = [
    ['Rayan Hairstyle', 'young-adult'], //  'ya' inside Ra-ya-n
    ['Tonya Hair Recolor', 'young-adult'],
    ['Royal Vampire Set', 'young-adult'], //  ro-ya-l
    ['Total Makeover Kit', 'toddler'], //     -tot-al
  ];

  it.each(cases)('%s no longer yields %s', (title, age) => {
    expect(ageGroupsFromTitle(title)).not.toContain(age);
  });

  it('treats "baby" as an aesthetic word, not an age', () => {
    // 71 titles carry it; "Baby Face Kit" (2,878 downloads) is an ADULT lips
    // preset and would have been card #1 of the kids page.
    expect(kidAgeGroupsFromTitle('Baby Face Kit')).toEqual([]);
    expect(kidAgeGroupsFromTitle('Baby Hairs N02')).toEqual([]);
  });

  it('requires whole words, so "adults" scores adult but "young adult" does not', () => {
    expect(ageGroupsFromTitle('Young Adult Poses')).toContain('young-adult');
    expect(ageGroupsFromTitle('Young Adult Poses')).not.toContain('adult');
    expect(ageGroupsFromTitle('Adult Dress Pack')).toContain('adult');
  });
});

describe('age rules — negative contexts', () => {
  it('drops "Child Birth Mod" and its siblings entirely', () => {
    expect(AGE_NEGATIVE_TITLE_CONTEXTS.test('Child Birth Mod')).toBe(true);
    expect(ageGroupsFromTitle('Child Birth Mod')).toEqual([]);
    expect(ageGroupsFromTitle('Realistic Birth Control')).toEqual([]);
    expect(ageGroupsFromTitle('Less Success for Try for Baby')).toEqual([]);
  });
});

describe('age rules — the rows the old extractor missed', () => {
  const genuine: ReadonlyArray<readonly [string, string]> = [
    ['Functional Infant Cribs', 'infant'],
    ['Toddler Traits Pack', 'toddler'],
    ['Aravels Kids Bedroom', 'child'],
    ['Skin CC for Toddlers & Infants', 'toddler'],
    ['Children of the Moon Outfit', 'child'],
  ];

  it.each(genuine)('%s yields %s', (title, age) => {
    expect(kidAgeGroupsFromTitle(title)).toContain(age);
  });

  it('picks up both ages when the title names both', () => {
    expect(kidAgeGroupsFromTitle('Skin CC for Toddlers & Infants').sort()).toEqual([
      'infant',
      'toddler',
    ]);
  });
});

describe('applyKidAxis — narrow by construction', () => {
  it('preserves every non-kid value untouched', () => {
    // The same bug left 4,897 rows carrying the identical blanket combo. That
    // is a separate population with a separate blast radius; this repair must
    // not sweep it up.
    const before = ['adult', 'elder', 'teen', 'young-adult', 'child'];
    expect(applyKidAxis(before, 'Nike Af1 Sneakers')).toEqual([
      'adult',
      'elder',
      'teen',
      'young-adult',
    ]);
  });

  it('adds from the title without disturbing the rest', () => {
    expect(applyKidAxis(['adult'], 'Functional Infant Cribs')).toEqual(['adult', 'infant']);
  });

  it('reports a no-op as a no-op regardless of stored order', () => {
    expect(kidAxisChanges(['toddler', 'infant'], 'Skin CC for Toddlers & Infants')).toBe(false);
    expect(kidAxisChanges(['infant', 'toddler'], 'Skin CC for Toddlers & Infants')).toBe(false);
    expect(kidAxisChanges(['child'], 'Skin CC for Toddlers & Infants')).toBe(true);
  });

  it('strips a kid tag the title does not support', () => {
    expect(kidAxisChanges(['child'], 'MC Command Center')).toBe(true);
    expect(applyKidAxis(['child'], 'MC Command Center')).toEqual([]);
  });
});

describe('aiFacetExtractor — the class bug, not just the instance', () => {
  const src = readSource('lib/services/aiFacetExtractor.ts');
  const stripped = stripComments(src);

  it('declares no age keyword map of its own', () => {
    // Comments in this file deliberately quote the old map, so strip them
    // first or the guard matches its own documentation.
    expect(stripped).not.toMatch(/AGE_KEYWORDS/);
  });

  it('imports the shared rules instead', () => {
    expect(stripped).toMatch(/from '\.\.\/ageGroupRules'/);
    expect(stripped).toMatch(/AGE_TITLE_PATTERNS/);
  });

  it('never matches an age against the description-bearing `text` blob', () => {
    const start = stripped.indexOf('result.ageGroups.push');
    expect(start).toBeGreaterThan(-1);
    const block = stripped.slice(Math.max(0, start - 400), start);
    expect(block).not.toMatch(/text\.includes/);
    expect(block).toMatch(/\.test\(title\)/);
  });

  // `extractFromKeywords` is private; the source guards above prove the wiring
  // statically, and these two prove it at runtime. The cast is deliberate —
  // widening the method's visibility for a test would change the public API.
  const keywordExtract = (title: string, description: string, tags: string[]) =>
    (
      new AIFacetExtractor() as unknown as {
        extractFromKeywords: (t: string, d: string, g: string[]) => { ageGroups: string[] };
      }
    ).extractFromKeywords(title, description, tags);

  it('does not tag an adult mod from a kid-heavy shared description', () => {
    // This repo's scraped description is copied onto every mod lifted from one
    // blog post; before the fix this returned infant + toddler + child.
    const facets = keywordExtract(
      'Baby Face Kit',
      'The best Sims 4 toddler and infant CC for your children — kids clothes, child hair and more.',
      ['cc'],
    );
    expect(
      facets.ageGroups.filter((a) => (KID_AGE_GROUPS as readonly string[]).includes(a)),
    ).toEqual([]);
  });

  it('still tags a genuine title', () => {
    expect(keywordExtract('Functional Infant Cribs', '', []).ageGroups).toContain('infant');
  });
});
