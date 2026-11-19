/**
 * E438 (Rowan, 2026-11-19): career mods are `career`, derived from the TITLE
 * only, and the career-mods collection is backed by it.
 *
 * Against pre-fix origin/main (63c3e067): every block but the FACET_VALUES
 * one fails — `lib/careerContentTypeRules.ts` does not exist,
 * `detectContentType("OBGYN Career")` returns `gameplay-mod`,
 * `/sims-4-career-mods/` maps to undefined in the URL map, and there is no
 * `career-mods` registry entry.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CAREER_CONTENT_TYPE,
  CAREER_OFF_TYPE_PATTERN,
  CAREER_TITLE_PATTERN,
  applyCareerContentType,
  isCareerTitle,
} from '@/lib/careerContentTypeRules';
import {
  CONTENT_TYPE_RULES,
  detectContentType,
  detectContentTypeWithConfidence,
  resolveIngestContentType,
} from '@/lib/services/contentTypeDetector';
import { detectContentTypeFromUrl } from '@/lib/services/mhmScraperUtils';
import { FACET_VALUES } from '@/lib/services/aiFacetExtractor';
import { SIMS4_COLLECTIONS } from '@/lib/collections';
import { HAND_AUDITED_CONTENT_TYPES } from '@/scripts/lib/hand-audited-content-types';
import { GAMEPLAY_ADULT_WATCHLIST, HAND_AUDITED_ON_TYPE, OFF_TYPE_RE } from '@/scripts/agents/collection-hub-eligibility-lib';

// Real production titles from the 2026-11-19 measurement (56 title-matched rows).
const ACCEPT = [
  'OBGYN Career', // card #1, 450 downloads, was gameplay-mod
  'Model Career', // was already career
  'Turbo Careers Mod Pack',
  'Midnitetech Career Megapack',
  'Sims 4 Freelance Chef Active Career', // was clutter (bakery post description)
  'Sims 4 Work From Home Mod for Base Game Careers',
  'Bakery Career', // was decor
  'Nurse Career', // was decor
  'Personal Trainer Career', // was workout
  'Boxing Career', // was workout
  'Ultimate Teen Career Set', // was furniture; eight teen careers
  'Teen Job Career Set',
  'Sims 4 Teen Jobs Career Set', // was NULL
  'Custom Career: Pet Sitter', // was script-mod
  'Careers – Funeral Home and Cemetery', // the PR #61 pin
  'Tattoo Artist Career', // the E399 pin; `tattoos?` is an on-type pin in the gameplay family
  'Career Aptitude Test',
  'Career Day Overhaul',
];

describe('isCareerTitle — title evidence it must accept', () => {
  it.each(ACCEPT)('accepts %s', (title) => {
    expect(isCareerTitle(title)).toBe(true);
  });

  it('treats null / empty titles as no evidence', () => {
    expect(isCareerTitle(null)).toBe(false);
    expect(isCareerTitle(undefined)).toBe(false);
    expect(isCareerTitle('')).toBe(false);
  });
});

describe('isCareerTitle — rows it must leave alone', () => {
  // The three vetoed production rows (CC that borrows the word).
  it.each([
    'Careers – Police Uniform Male',
    'Careers – DNA Gold Earrings',
    'Career Lot: Police Department',
    // The detector's own career-themed CC negatives.
    'Doctor Career Outfit',
    'Career Day Dress for Toddlers',
    'Career Wear Collection',
  ])('vetoes %s', (title) => {
    expect(isCareerTitle(title)).toBe(false);
  });

  // Rejected writer words (see the header of lib/careerContentTypeRules.ts).
  it.each([
    'Adult Jobs for Teens', // `job`, a gameplay-mod rule case
    'Drop Out of Highschool and Get A Real Job', // `job`, decor
    'Work From Home Sims 4 CC Pack', // `work`, furniture
    'Sims 4 Work & Office Clutter',
    'Fitness Influencer Side Hustle', // stays with the gameplay-mod rule
    'Careerist Blazer', // substring, no word boundary
    'Social Media Star Aspiration',
  ])('rejects %s', (title) => {
    expect(isCareerTitle(title)).toBe(false);
  });

  it('lists no singular/plural pair and no extra keyword', () => {
    // Guard the constant, not a copy: the writer pattern is exactly one word.
    expect(CAREER_TITLE_PATTERN.source).toBe('\\bcareers?\\b');
    expect(CAREER_OFF_TYPE_PATTERN.source).toBe('\\b(?:uniforms?|earrings?|lots?|outfits?|dress(?:es)?|wear)\\b');
  });

  it('does not veto "set" — all three "Career Set" rows are career packs', () => {
    expect(CAREER_OFF_TYPE_PATTERN.test('Career Set')).toBe(false);
  });
});

describe('applyCareerContentType', () => {
  it('moves a title-supported row to career whatever it was', () => {
    expect(applyCareerContentType('gameplay-mod', 'OBGYN Career')).toBe(CAREER_CONTENT_TYPE);
    expect(applyCareerContentType('decor', 'Bakery Career')).toBe(CAREER_CONTENT_TYPE);
    expect(applyCareerContentType(null, 'Sims 4 Teen Jobs Career Set')).toBe(CAREER_CONTENT_TYPE);
  });
  it('strips career to NULL without title evidence (NULL beats wrong), and leaves other types alone', () => {
    expect(applyCareerContentType(CAREER_CONTENT_TYPE, 'Adult Jobs for Teens')).toBeNull();
    expect(applyCareerContentType('gameplay-mod', 'Adult Jobs for Teens')).toBe('gameplay-mod');
    expect(applyCareerContentType(null, 'Adult Jobs for Teens')).toBeNull();
  });
  it('leaves a vetoed title at its current type (the uniform stays full-body)', () => {
    expect(applyCareerContentType('full-body', 'Careers – Police Uniform Male')).toBe('full-body');
    expect(applyCareerContentType('furniture', 'Career Lot: Police Department')).toBe('furniture');
  });
});

describe('detector — the ingest path uses the same title-only rule', () => {
  it('types a career title career with high confidence, whatever the description says', () => {
    const r = detectContentTypeWithConfidence('Bakery Career', 'Decorate the counter with these cakes and pastries');
    expect(r.contentType).toBe(CAREER_CONTENT_TYPE);
    expect(r.confidence).toBe('high');
    expect(detectContentType('OBGYN Career')).toBe(CAREER_CONTENT_TYPE);
  });

  it('never types career from a description — a shared blog description must not leak', () => {
    expect(
      detectContentType('Pastry Display Counter', 'Everything your Sim needs for the new bakery career from the mod above.'),
    ).not.toBe(CAREER_CONTENT_TYPE);
    expect(
      detectContentType('Boxing Gloves Decor', 'Pairs with the Boxing Career so your sim can train at home.'),
    ).not.toBe(CAREER_CONTENT_TYPE);
  });

  it('keeps the vetoed CC titles with the CAS and build rules', () => {
    expect(detectContentType('Careers – Police Uniform Male')).not.toBe(CAREER_CONTENT_TYPE);
    expect(detectContentType('Career Day Dress for Toddlers')).toBe('dresses');
  });

  it('beats the URL fallback at ingest', () => {
    expect(resolveIngestContentType('Boxing Career', null, 'workout')).toBe(CAREER_CONTENT_TYPE);
  });

  it('has no keyword rule for career (it would match descriptions too)', () => {
    expect(CONTENT_TYPE_RULES.some((r) => r.contentType === CAREER_CONTENT_TYPE)).toBe(false);
  });

  it('derives career through the shared title-only rule (source guard)', () => {
    // Comments in this repo quote the bad patterns they warn about, so strip
    // them before asserting anything about the code.
    const src = readFileSync(join(process.cwd(), 'lib/services/contentTypeDetector.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    expect(src).toContain('isCareerTitle(title)');
    expect(src).toMatch(/from\s+['"]\.\.\/careerContentTypeRules['"]/);
  });
});

describe('blog-post URL map', () => {
  it('reads the two career posts as career and leaves the gameplay posts alone', () => {
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-career-mods/')).toBe(CAREER_CONTENT_TYPE);
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-custom-active-careers/')).toBe(CAREER_CONTENT_TYPE);
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-gameplay-mods/')).toBe('gameplay-mod');
    expect(detectContentTypeFromUrl('https://musthavemods.com/sims-4-trait-mods/')).toBe('gameplay-mod');
  });
});

describe('taxonomy, pins and the career-mods collection', () => {
  it('career is an existing FACET_VALUES content type (no taxonomy change)', () => {
    expect((FACET_VALUES.contentType as readonly string[]).includes(CAREER_CONTENT_TYPE)).toBe(true);
  });

  it('every pinned career title agrees with the rule, and no pin holds a career title at another type', () => {
    const careerPins = Object.entries(HAND_AUDITED_CONTENT_TYPES).filter(([, v]) => v.contentType === CAREER_CONTENT_TYPE);
    expect(careerPins.length).toBeGreaterThanOrEqual(4); // Funeral Home, Doggy Daycare, Tattoo Artist, Lifeguard
    const quoted = (why: string) => why.match(/"([^"]+)"/)?.[1] ?? why;
    for (const [id, v] of careerPins) expect(isCareerTitle(quoted(v.why)), `${id}: ${v.why}`).toBe(true);
    const wrong = Object.entries(HAND_AUDITED_CONTENT_TYPES).filter(
      ([, v]) => v.contentType !== CAREER_CONTENT_TYPE && /^E\d+ "[^"]*\bcareers?\b[^"]*"/i.test(v.why) && isCareerTitle(quoted(v.why)),
    );
    expect(wrong.map(([id]) => id)).toEqual([]);
  });

  it('career-mods filters on the shared constant, links its blog twin, and sits ahead of gameplay-mods for the breadcrumb', () => {
    const i = SIMS4_COLLECTIONS.findIndex((x) => x.slug === 'career-mods');
    const j = SIMS4_COLLECTIONS.findIndex((x) => x.slug === 'gameplay-mods');
    expect(i).toBeGreaterThanOrEqual(0);
    const c = SIMS4_COLLECTIONS[i];
    expect(c.filter).toEqual({ contentType: CAREER_CONTENT_TYPE });
    expect(c.expectedCount).toBeGreaterThanOrEqual(20);
    expect(c.blogUrl).toBe('/sims-4-career-mods/');
    // Both score specificity 0 for a career mod; registry order breaks the tie.
    expect(i).toBeLessThan(j);
    expect(SIMS4_COLLECTIONS[j].filter.contentTypeIn).toContain(CAREER_CONTENT_TYPE);
    expect(SIMS4_COLLECTIONS[j].related).toContain('career-mods');
  });

  it('the hub-eligibility gameplay family flags none of the accepted titles once on-type pins are honoured', () => {
    const re = OFF_TYPE_RE.gameplay;
    const pinned = new Set(Object.values(HAND_AUDITED_ON_TYPE.gameplay).map((why) => why.match(/"([^"]+)"/)?.[1]));
    expect(ACCEPT.filter((t) => re.test(t) && !pinned.has(t))).toEqual([]);
    expect(re.test('Careers – DNA Gold Earrings')).toBe(true);
    expect(re.test('Career Lot: Police Department')).toBe(true);
  });

  it('the two custom-active-careers adult-watch rows are on the gameplay watchlist by id', () => {
    const ids = new Set(GAMEPLAY_ADULT_WATCHLIST.map((w) => w.id));
    expect(ids.has('cmim9kaf60041oxy7kp0oberp')).toBe(true); // Adult Company (flagged NSFW)
    expect(ids.has('cmim9kahb0042oxy702pv7xtv')).toBe(true); // Honey Trapper (flagged NSFW)
  });
});
