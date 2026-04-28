/**
 * Unit tests for the Phase 2 multi-strategy author extractor.
 *
 * Each strategy is tested in isolation (pure fn, easy) and then the orchestrator
 * is exercised with realistic HTML fixtures + a stubbed PrismaClient.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as cheerio from 'cheerio';
import axios from 'axios';

import {
  extractAuthor,
  fromJsonLd,
  fromOpenGraph,
  fromUrl,
  fromTitlePattern,
  fromHtmlHeuristics,
  fromCreatorProfileMatch,
  fromPatreonApi,
  fetchDestinationHtml,
  levenshtein,
  cleanAuthorString,
} from '@/lib/services/scraperExtraction/authorExtractor';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);
import {
  isValidAuthor,
  BAD_AUTHOR_PATTERNS,
} from '@/lib/services/scraperExtraction/badAuthorPatterns';

// ------------- helpers -------------
const FIXTURE_DIR = path.join(
  process.cwd(),
  '__tests__',
  'fixtures',
  'mod-pages',
);

function load(fixture: string): cheerio.CheerioAPI {
  const html = fs.readFileSync(path.join(FIXTURE_DIR, fixture), 'utf-8');
  return cheerio.load(html);
}

/** Minimal Prisma stub with configurable creatorProfile.findMany result. */
function makeStubPrisma(handles: string[] = []) {
  return {
    creatorProfile: {
      findMany: async () => handles.map(h => ({ handle: h })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

// ============================================
// isValidAuthor & BAD_AUTHOR_PATTERNS
// ============================================

describe('isValidAuthor', () => {
  it('rejects null/undefined/empty', () => {
    expect(isValidAuthor(null)).toBe(false);
    expect(isValidAuthor(undefined)).toBe(false);
    expect(isValidAuthor('')).toBe(false);
    expect(isValidAuthor('  ')).toBe(false);
  });

  it('rejects strings shorter than 2 chars', () => {
    expect(isValidAuthor('a')).toBe(false);
    expect(isValidAuthor(' a ')).toBe(false);
  });

  it('rejects purely numeric strings', () => {
    expect(isValidAuthor('143566306')).toBe(false);
    expect(isValidAuthor('0')).toBe(false);
    expect(isValidAuthor('1234567890')).toBe(false);
  });

  it('rejects "Name 123456" Patreon-post-ID pattern', () => {
    expect(isValidAuthor('Maia Hair 143566306')).toBe(false);
  });

  it('rejects case-insensitive bad tokens', () => {
    expect(isValidAuthor('Title')).toBe(false);
    expect(isValidAuthor('title')).toBe(false);
    expect(isValidAuthor('TITLE')).toBe(false);
    expect(isValidAuthor('ShRef')).toBe(false);
    expect(isValidAuthor('Id')).toBe(false);
    expect(isValidAuthor('Post')).toBe(false);
    expect(isValidAuthor('Download')).toBe(false);
    expect(isValidAuthor('Free')).toBe(false);
    expect(isValidAuthor('CC')).toBe(false);
    expect(isValidAuthor('Mod')).toBe(false);
    expect(isValidAuthor('Mods')).toBe(false);
    expect(isValidAuthor('Unknown')).toBe(false);
    expect(isValidAuthor('Admin')).toBe(false);
    expect(isValidAuthor('User')).toBe(false);
    expect(isValidAuthor('Author')).toBe(false);
    expect(isValidAuthor('Creator')).toBe(false);
  });

  it('accepts real-looking author names', () => {
    expect(isValidAuthor('AlphaCreator')).toBe(true);
    expect(isValidAuthor('Maia')).toBe(true);
    expect(isValidAuthor('simcelebrity00')).toBe(true);
    expect(isValidAuthor('Ms Blue')).toBe(true);
  });

  it('BAD_AUTHOR_PATTERNS contains numeric regex', () => {
    expect(BAD_AUTHOR_PATTERNS.some(r => r.test('123'))).toBe(true);
  });
});

// ============================================
// levenshtein
// ============================================

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('abc', 'abc')).toBe(0);
  });

  it('returns 1 for single substitution', () => {
    expect(levenshtein('abc', 'abd')).toBe(1);
  });

  it('returns 1 for single insertion', () => {
    expect(levenshtein('abc', 'abcd')).toBe(1);
  });

  it('returns 1 for single deletion', () => {
    expect(levenshtein('abcd', 'abc')).toBe(1);
  });

  it('returns full length when one string is empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('handles longer strings', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
  });
});

// ============================================
// fromJsonLd
// ============================================

describe('fromJsonLd', () => {
  it('pulls author.name from json-ld-author fixture', () => {
    const $ = load('json-ld-author.html');
    const result = fromJsonLd($);
    expect(result).not.toBeNull();
    expect(result?.value).toBe('AlphaCreator');
    expect(result?.confidence).toBe('high');
    expect(result?.strategy).toBe('jsonld');
  });

  it('returns null when no JSON-LD is present', () => {
    const $ = cheerio.load('<html><head></head><body></body></html>');
    expect(fromJsonLd($)).toBeNull();
  });

  it('handles creator.name as well as author.name', () => {
    const $ = cheerio.load(`
      <html><head>
      <script type="application/ld+json">
      {"@type":"CreativeWork","creator":{"@type":"Person","name":"CreatorField"}}
      </script>
      </head></html>
    `);
    expect(fromJsonLd($)?.value).toBe('CreatorField');
  });

  it('handles author as a string', () => {
    const $ = cheerio.load(`
      <html><head>
      <script type="application/ld+json">
      {"@type":"CreativeWork","author":"StringAuthor"}
      </script>
      </head></html>
    `);
    expect(fromJsonLd($)?.value).toBe('StringAuthor');
  });

  it('walks @graph payloads', () => {
    const $ = cheerio.load(`
      <html><head>
      <script type="application/ld+json">
      {"@graph":[{"@type":"WebPage"},{"@type":"Article","author":{"name":"GraphAuthor"}}]}
      </script>
      </head></html>
    `);
    expect(fromJsonLd($)?.value).toBe('GraphAuthor');
  });

  it('ignores invalid JSON-LD blocks', () => {
    const $ = cheerio.load(`
      <html><head>
      <script type="application/ld+json">{ not valid json</script>
      </head></html>
    `);
    expect(fromJsonLd($)).toBeNull();
  });
});

// ============================================
// fromOpenGraph
// ============================================

describe('fromOpenGraph', () => {
  it('returns article:author at high confidence', () => {
    const $ = cheerio.load(
      '<html><head><meta property="article:author" content="AuthorX"></head></html>',
    );
    const result = fromOpenGraph($);
    expect(result?.value).toBe('AuthorX');
    expect(result?.confidence).toBe('high');
  });

  it('falls back to og:article:author at medium confidence', () => {
    const $ = cheerio.load(
      '<html><head><meta property="og:article:author" content="AuthorY"></head></html>',
    );
    const result = fromOpenGraph($);
    expect(result?.value).toBe('AuthorY');
    expect(result?.confidence).toBe('medium');
  });

  it('EXPLICITLY IGNORES meta[name="author"] (blog editor, not mod creator)', () => {
    const $ = cheerio.load(
      '<html><head><meta name="author" content="BlogEditor"></head></html>',
    );
    expect(fromOpenGraph($)).toBeNull();
  });
});

// ============================================
// fromUrl
// ============================================

describe('fromUrl', () => {
  it('extracts Patreon /c/{creator} at high confidence', () => {
    const r = fromUrl('https://www.patreon.com/c/simcelebrity00');
    expect(r?.value).toBe('Simcelebrity00');
    expect(r?.confidence).toBe('high');
    expect(r?.strategy).toBe('url-patreon-c');
  });

  it('returns null for Patreon /posts/{numeric}', () => {
    expect(fromUrl('https://www.patreon.com/posts/143566306')).toBeNull();
  });

  it('extracts Patreon /posts/{creator-slug-id} leading segment with requiresValidation flag', () => {
    // Real-world cases from the neck-tattoo blog scrape: leading slug-segment
    // is the creator handle (Hoodlem, Morallee, Aprilhush, Ruki). The strategy
    // returns the candidate at LOW confidence with requiresValidation=true so
    // the orchestrator can gate it on a CreatorProfile match.
    const r1 = fromUrl('https://www.patreon.com/posts/hoodlem-makiage-71276188');
    expect(r1?.value).toBe('Hoodlem');
    expect(r1?.confidence).toBe('low');
    expect(r1?.strategy).toBe('url-patreon-post-slug');
    expect(r1?.requiresValidation).toBe(true);

    const r2 = fromUrl('https://www.patreon.com/posts/morallee-lute-x-120073619');
    expect(r2?.value).toBe('Morallee');
    expect(r2?.strategy).toBe('url-patreon-post-slug');
    expect(r2?.requiresValidation).toBe(true);

    const r3 = fromUrl('https://www.patreon.com/posts/aprilhush-neck-115279413');
    expect(r3?.value).toBe('Aprilhush');
    expect(r3?.requiresValidation).toBe(true);

    const r4 = fromUrl('https://www.patreon.com/posts/ruki-neck-tattoo-76124974');
    expect(r4?.value).toBe('Ruki');
    expect(r4?.requiresValidation).toBe(true);
  });

  it('Patreon /posts/ slug returns candidate even when leading segment is a topic word — denylist filters it later', () => {
    // fromUrl is structural; it doesn't know "crown" is a topic word. The
    // orchestrator's denylist gate is what rejects it. We assert here that
    // fromUrl produces the candidate, and the orchestrator-level test below
    // asserts the denylist filters it.
    const r = fromUrl('https://www.patreon.com/posts/crown-neck-151960341');
    expect(r?.value).toBe('Crown');
    expect(r?.strategy).toBe('url-patreon-post-slug');

    const r2 = fromUrl('https://www.patreon.com/posts/butterfly-tattoo-72111226');
    expect(r2?.value).toBe('Butterfly');
  });

  it('Patreon /posts/ with numeric-only slug returns null', () => {
    expect(fromUrl('https://www.patreon.com/posts/47369875')).toBeNull();
  });

  it('Patreon /posts/ with very short leading segment returns null', () => {
    // "m-jewelry-x-135264869" — leading "m" is too short to plausibly be a handle.
    expect(fromUrl('https://www.patreon.com/posts/m-jewelry-x-135264869')).toBeNull();
  });

  it('extracts TSR /members/{name}/', () => {
    const r = fromUrl('https://www.thesimsresource.com/members/simcelebrity00/');
    expect(r?.value).toBe('Simcelebrity00');
    expect(r?.confidence).toBe('high');
    expect(r?.strategy).toBe('url-tsr-members');
  });

  it('extracts Tumblr subdomain', () => {
    const r = fromUrl('https://maiahair.tumblr.com/post/12345');
    expect(r?.value).toBe('Maiahair');
    expect(r?.confidence).toBe('medium');
    expect(r?.strategy).toBe('url-tumblr-subdomain');
  });

  it('extracts Tumblr canonical URL (www.tumblr.com/{creator}/{postId})', () => {
    const r = fromUrl('https://www.tumblr.com/bloodmooncc/643671626039296000/nihil-nose-chains');
    expect(r?.value).toBe('Bloodmooncc');
    expect(r?.strategy).toBe('url-tumblr-path');
  });

  it('skips Tumblr reserved paths (dashboard, explore, tagged, etc.)', () => {
    expect(fromUrl('https://www.tumblr.com/dashboard/1234')).toBeNull();
    expect(fromUrl('https://www.tumblr.com/explore/5678')).toBeNull();
    expect(fromUrl('https://www.tumblr.com/tagged/1234')).toBeNull();
  });

  it('skips bare tumblr.com with no /{creator}/{id} path', () => {
    expect(fromUrl('https://tumblr.com/')).toBeNull();
    expect(fromUrl('https://www.tumblr.com/username')).toBeNull();
  });

  it('extracts TSR /staff/{Name}/', () => {
    const r = fromUrl(
      'https://www.thesimsresource.com/staff/Glitterberryfly/downloads/details/category/x/id/1/',
    );
    expect(r?.value).toBe('Glitterberryfly');
    expect(r?.confidence).toBe('high');
    expect(r?.strategy).toBe('url-tsr-staff');
  });

  it('extracts itch.io subdomain', () => {
    const r = fromUrl('https://creator.itch.io/my-mod');
    expect(r?.value).toBe('Creator');
    expect(r?.confidence).toBe('medium');
    expect(r?.strategy).toBe('url-itch-subdomain');
  });

  // CurseForge: HTML and the /v1/mods/search API are both blocked for our
  // tier, so URL slug extraction is the only automated path. Strategy must
  // require validation — bare brand words must NOT be accepted as creators.
  it('extracts CurseForge slug head with requiresValidation', () => {
    const r = fromUrl('https://www.curseforge.com/sims4/create-a-sim/eggsims-bracelet11');
    expect(r?.value).toBe('Eggsims');
    expect(r?.confidence).toBe('low');
    expect(r?.strategy).toBe('url-curseforge-slug');
    expect(r?.requiresValidation).toBe(true);
  });

  it('CurseForge: works for /mods/{slug} path too', () => {
    const r = fromUrl(
      'https://www.curseforge.com/sims4/mods/playerswonderland-tuning-mod',
    );
    expect(r?.value).toBe('Playerswonderland');
    expect(r?.strategy).toBe('url-curseforge-slug');
  });

  it('CurseForge: rejects sub-3-char slug head', () => {
    expect(
      fromUrl('https://www.curseforge.com/sims4/create-a-sim/ll-tiny-mod'),
    ).toBeNull();
  });

  it('CurseForge: rejects pure-numeric slug', () => {
    expect(
      fromUrl('https://www.curseforge.com/sims4/create-a-sim/12345'),
    ).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(fromUrl('not a url')).toBeNull();
  });
});

// ============================================
// fromTitlePattern
// ============================================

describe('fromTitlePattern', () => {
  it('handles "Title by Author"', () => {
    expect(fromTitlePattern('Shiny Hair by RealCreator')?.value).toBe('RealCreator');
  });

  it('handles "Title - Author"', () => {
    expect(fromTitlePattern('Shiny Hair - RealCreator')?.value).toBe('RealCreator');
  });

  it('handles em-dash separator: "Title – Author"', () => {
    expect(fromTitlePattern('Shiny Hair – RealCreator')?.value).toBe('RealCreator');
  });

  it('handles em-dash separator: "Title — Author"', () => {
    expect(fromTitlePattern('Shiny Hair — RealCreator')?.value).toBe('RealCreator');
  });

  it('handles creator-first form: "AuthorName – Mod Name" (single-word author left, multi-word right)', () => {
    // Real-world: "Hoodlem – Makiage Tattoo" from the neck-tattoo MHM scrape.
    const r = fromTitlePattern('Hoodlem – Makiage Tattoo');
    expect(r?.value).toBe('Hoodlem');
    expect(r?.strategy).toBe('title-dash-creator-first');
  });

  it('does NOT use creator-first form when both sides are multi-word (likely Mod - SubMod pattern)', () => {
    // "Maxis Match Hair – Long Bob" — both sides multi-word, ambiguous.
    // Should NOT extract "Maxis" as author.
    const r = fromTitlePattern('Maxis Match Hair – Long Bob');
    expect(r?.value).not.toBe('Maxis');
  });

  it('handles "Title (Author)"', () => {
    expect(fromTitlePattern('Shiny Hair (RealCreator)')?.value).toBe('RealCreator');
  });

  it('rejects paren variant markers: "(5 Types)", "(Left)", "(V2)", "(Male)", "(Set of 3)"', () => {
    expect(fromTitlePattern('Nose Piercing Set (5 Types)')).toBeNull();
    expect(fromTitlePattern('Metal Nose Piercing (Left)')).toBeNull();
    expect(fromTitlePattern('Shiny Hair (V2)')).toBeNull();
    expect(fromTitlePattern('Cool Outfit (Male)')).toBeNull();
    expect(fromTitlePattern('Earring Set (Set of 3)')).toBeNull();
    expect(fromTitlePattern('Hair (Recolor)')).toBeNull();
  });

  it('handles "Title | Author"', () => {
    expect(fromTitlePattern('Shiny Hair | RealCreator')?.value).toBe('RealCreator');
  });

  it('returns null when no pattern matches', () => {
    expect(fromTitlePattern('Just A Mod Name')).toBeNull();
  });

  it('is medium confidence (demoted from legacy top-of-chain position)', () => {
    expect(fromTitlePattern('Some Mod by Someone')?.confidence).toBe('medium');
  });
});

// ============================================
// fromHtmlHeuristics
// ============================================

describe('fromHtmlHeuristics', () => {
  it('parses TSR og:title "{author}\'s {title}" at high confidence', () => {
    const $ = cheerio.load(
      '<html><head><meta property="og:title" content="Glitterberryfly\'s Classic Golden Watch"/></head></html>',
    );
    const r = fromHtmlHeuristics(
      $,
      'https://www.thesimsresource.com/downloads/details/id/1234/',
    );
    expect(r?.value).toBe('Glitterberryfly');
    expect(r?.confidence).toBe('high');
    expect(r?.strategy).toBe('tsr-og-title');
  });

  it('ignores TSR og:title without possessive pattern', () => {
    const $ = cheerio.load(
      '<html><head><meta property="og:title" content="Some Plain Title"/></head></html>',
    );
    const r = fromHtmlHeuristics(
      $,
      'https://www.thesimsresource.com/downloads/details/id/1234/',
    );
    expect(r).toBeNull();
  });

  it('only activates on thesimsresource.com hostnames', () => {
    const $ = cheerio.load(
      '<html><head><meta property="og:title" content="Someone\'s Mod"/></head></html>',
    );
    expect(fromHtmlHeuristics($, 'https://example.com/mod')).toBeNull();
  });

  // Regression: og:title for authors whose names end in 's' uses just an
  // apostrophe ("Arltos' Bracelet 1"), not "Arltos's". Earlier the regex
  // required `'s\s+`, which silently dropped ~15% of TSR mods.
  it('parses TSR og:title with trailing-only apostrophe ("Arltos\' …")', () => {
    const $ = cheerio.load(
      '<html><head><meta property="og:title" content="Arltos\' Bracelet 1"/></head></html>',
    );
    const r = fromHtmlHeuristics(
      $,
      'https://www.thesimsresource.com/downloads/details/id/1534571/',
    );
    expect(r?.value).toBe('Arltos');
    expect(r?.confidence).toBe('high');
    expect(r?.strategy).toBe('tsr-og-title');
  });

  // Regression: some TSR pages don't include any possessive form on og:title
  // (e.g. "S-Club LL ts4 bracelet 201905"). The data-item JSON on the main
  // .item-wrapper is the authoritative fallback. Strategy must select the
  // wrapper whose embedded `ID` matches the URL's `/id/{N}/` segment, not
  // the first wrapper found (which on TSR is often a featured-creator
  // carousel item with a DIFFERENT creator).
  it('reads TSR data-item JSON when og:title has no possessive', () => {
    const html =
      '<html><body>' +
      // Carousel wrapper FIRST (would mislead first-match strategies)
      '<div class="item-wrapper" data-item=\'{"ID":"9999","creator":"WrongCreator","title":"Carousel Item"}\'></div>' +
      // Main product wrapper second
      '<div class="item-wrapper" data-item=\'{"ID":"1448515","creator":"S-Club","title":"S-Club LL ts4 bracelet 201905"}\'></div>' +
      '<meta property="og:title" content="S-Club LL ts4 bracelet 201905"/>' +
      '</body></html>';
    const $ = cheerio.load(html);
    const r = fromHtmlHeuristics(
      $,
      'https://www.thesimsresource.com/downloads/details/category/x/title/y/id/1448515/',
    );
    expect(r?.value).toBe('S-Club');
    expect(r?.confidence).toBe('high');
    expect(r?.strategy).toBe('tsr-data-item');
  });

  it('TSR data-item: falls back to first wrapper when URL lacks /id/', () => {
    const html =
      '<html><body>' +
      '<div class="item-wrapper" data-item=\'{"creator":"OnlyOne","title":"X"}\'></div>' +
      '</body></html>';
    const $ = cheerio.load(html);
    const r = fromHtmlHeuristics(
      $,
      'https://www.thesimsresource.com/some/path-without-numeric-id/',
    );
    expect(r?.value).toBe('OnlyOne');
    expect(r?.strategy).toBe('tsr-data-item');
  });

  it('TSR data-item: ignores wrappers whose ID does not match URL', () => {
    // No wrapper matches the URL's /id/, so we fall through to og:title.
    const html =
      '<html><body>' +
      '<div class="item-wrapper" data-item=\'{"ID":"9999","creator":"WrongCreator"}\'></div>' +
      '<meta property="og:title" content="Glitterberryfly\'s Classic Golden Watch"/>' +
      '</body></html>';
    const $ = cheerio.load(html);
    const r = fromHtmlHeuristics(
      $,
      'https://www.thesimsresource.com/downloads/details/id/1234/',
    );
    expect(r?.value).toBe('Glitterberryfly');
    expect(r?.strategy).toBe('tsr-og-title');
  });
});

// ============================================
// extractAuthor orchestrator (fixtures)
// ============================================

describe('extractAuthor orchestrator', () => {
  const prisma = makeStubPrisma(); // no matches

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('JSON-LD wins when URL + title strategies have nothing', async () => {
    const $ = load('json-ld-author.html');
    const result = await extractAuthor({
      url: 'https://example.com/mod',
      title: 'Cool Hair Mod',
      $,
      prisma,
    });
    expect(result.value).toBe('AlphaCreator');
    expect(result.strategy).toBe('jsonld');
    expect(result.confidence).toBe('high');
  });

  it('URL beats JSON-LD when both yield valid candidates (aggregator-context bug fix)', async () => {
    // Regression: aggregator pages like MHM roundups embed JSON-LD with the
    // BLOG author (e.g. "Felister Moraa"). If JSON-LD ran first, every mod on
    // that page would inherit the blog author. URL must win.
    const $ = cheerio.load(`
      <html><head>
      <script type="application/ld+json">
      {"@type":"Article","author":{"name":"Felister Moraa"}}
      </script>
      </head></html>
    `);
    const result = await extractAuthor({
      url: 'https://www.patreon.com/c/simcelebrity00',
      title: 'Hair mod roundup post',
      $,
      prisma,
    });
    expect(result.value).toBe('Simcelebrity00');
    expect(result.strategy).toBe('url-patreon-c');
  });

  it('title beats JSON-LD when both yield valid candidates', async () => {
    const $ = cheerio.load(`
      <html><head>
      <script type="application/ld+json">
      {"@type":"Article","author":{"name":"Felister Moraa"}}
      </script>
      </head></html>
    `);
    const result = await extractAuthor({
      url: 'https://example.com/some-post',
      title: 'Shiny Hair by RealCreator',
      $,
      prisma,
    });
    expect(result.value).toBe('RealCreator');
    expect(result.strategy).toBe('title-by');
  });

  it('URL strategy fires on Patreon /c/{slug}', async () => {
    const $ = load('patreon-c-slug.html');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/c/simcelebrity00',
      title: 'Some Mod',
      $,
      prisma,
    });
    expect(result.value).toBe('Simcelebrity00');
    expect(result.strategy).toBe('url-patreon-c');
  });

  it('URL strategy returns null gracefully for /posts/{numeric}', async () => {
    const $ = load('patreon-posts-numeric.html');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/143566306',
      title: 'Patreon post with numeric ID only',
      $,
      prisma,
    });
    // No strategy has a usable candidate -> null, no crash
    expect(result.value).toBeNull();
  });

  it('Patreon /posts/ creator-slug recovers handle when CreatorProfile validates: Hoodlem', async () => {
    // requiresValidation gate: the booster must find a matching profile.
    const validatingPrisma = makeStubPrisma(['Hoodlem']);
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/hoodlem-makiage-71276188',
      title: 'Hoodlem – Makiage Tattoo',
      $,
      prisma: validatingPrisma,
    });
    expect(result.value).toBe('Hoodlem');
    expect(result.confidence).toBe('high'); // booster lifts low → high
    // url-patreon-post-slug fired first; the booster appended its strategy id.
    expect(result.strategy).toBe('url-patreon-post-slug+creator-profile-match');
  });

  it('Patreon /posts/ creator-slug recovers handle when CreatorProfile validates: Aprilhush', async () => {
    const validatingPrisma = makeStubPrisma(['Aprilhush']);
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/aprilhush-neck-115279413',
      title: 'Neck Tatts',
      $,
      prisma: validatingPrisma,
    });
    expect(result.value).toBe('Aprilhush');
  });

  it('Patreon /posts/ creator-slug REJECTED when no CreatorProfile match (avoids Sim-name false positives)', async () => {
    // Real-world risk: "margot-hair-..." → "Margot" is a Sim character name,
    // not a creator handle. Without validation we'd write garbage.
    const noMatchPrisma = makeStubPrisma([]); // no profiles at all
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/margot-hair-12345678',
      title: 'Margot Hair',
      $,
      prisma: noMatchPrisma,
    });
    expect(result.value).toBeNull();
    expect(result.strategy).toBe('unvalidated-rejected');
  });

  it('Patreon /posts/ topic-word slug is denylist-rejected: "crown" topic word', async () => {
    // /posts/crown-neck-... starts with "crown", which is in BAD_AUTHOR_TOKENS.
    // The orchestrator should reject it, return null + denylist-rejected.
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/crown-neck-151960341',
      title: 'Crown Neck & Shoulder Tattoos',
      $,
      prisma,
    });
    expect(result.value).toBeNull();
    expect(result.strategy).toBe('denylist-rejected');
  });

  it('Patreon /posts/ topic-word slug is denylist-rejected: "butterfly" topic word', async () => {
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/butterfly-tattoo-72111226',
      title: 'Butterfly Tattoo',
      $,
      prisma,
    });
    expect(result.value).toBeNull();
    expect(result.strategy).toBe('denylist-rejected');
  });

  it('title-dash-creator-first recovers when URL has no creator: "Hoodlem – Makiage Tattoo"', async () => {
    // Edge case: imagine URL is unparseable. Title pattern alone should still
    // recover the handle from the em-dash separator. title-dash-creator-first
    // does NOT have requiresValidation (the em-dash format itself is a
    // strong signal), so no CreatorProfile match is needed.
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://example.com/some-page',
      title: 'Hoodlem – Makiage Tattoo',
      $,
      prisma,
    });
    expect(result.value).toBe('Hoodlem');
    expect(result.strategy).toBe('title-dash-creator-first');
  });

  it('URL strategy fires on TSR /members/', async () => {
    const $ = load('tsr-members.html');
    const result = await extractAuthor({
      url: 'https://www.thesimsresource.com/members/simcelebrity00/',
      title: 'TSR member-page fixture',
      $,
      prisma,
    });
    expect(result.value).toBe('Simcelebrity00');
    expect(result.strategy).toBe('url-tsr-members');
  });

  it('URL strategy fires on Tumblr subdomain', async () => {
    const $ = load('tumblr-subdomain.html');
    const result = await extractAuthor({
      url: 'https://maiahair.tumblr.com/post/12345',
      title: 'Tumblr subdomain fixture',
      $,
      prisma,
    });
    expect(result.value).toBe('Maiahair');
    expect(result.strategy).toBe('url-tumblr-subdomain');
  });

  it('title strategy wins after OG meta is rejected by denylist', async () => {
    // garbage-meta-good-title.html sets article:author="Id" (denylisted)
    // and title "Shiny Hair by RealCreator" — title heuristic should win.
    const $ = load('garbage-meta-good-title.html');
    const result = await extractAuthor({
      url: 'https://example.com/mod',
      title: 'Shiny Hair by RealCreator',
      $,
      prisma,
    });
    expect(result.value).toBe('RealCreator');
    expect(result.strategy).toBe('title-by');
  });

  it('returns null with strategy="denylist-rejected" when only garbage candidates exist', async () => {
    const $ = load('denylist-title.html');
    const result = await extractAuthor({
      url: 'https://example.com/page',
      title: 'Some Download Page',
      $,
      prisma,
    });
    expect(result.value).toBeNull();
    expect(result.strategy).toBe('denylist-rejected');
    expect(result.confidence).toBeNull();
  });

  it('fetchDestination: true ignores passed-in $ for HTML strategies (blog meta not leaked)', async () => {
    // Aggregator $ has a BLOG author in JSON-LD. Destination fetch returns
    // a mod page with no author metadata. URL + title also yield nothing.
    // Result: null (we refuse to leak blog meta through passed-in $).
    const aggregator$ = cheerio.load(`
      <html><head>
      <script type="application/ld+json">
      {"@type":"Article","author":{"name":"Felister Moraa"}}
      </script>
      </head></html>
    `);
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: '<html><head></head><body></body></html>',
    });
    const result = await extractAuthor({
      url: 'https://example.com/mod-page',
      title: 'Plain mod',
      $: aggregator$,
      prisma,
      fetchDestination: true,
    });
    expect(result.value).toBeNull();
  });

  it('fetchDestination: true pulls JSON-LD from the fetched destination', async () => {
    const aggregator$ = cheerio.load('<html></html>');
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: `<html><head>
        <script type="application/ld+json">
        {"@type":"CreativeWork","author":{"name":"RealModCreator"}}
        </script>
      </head></html>`,
    });
    const result = await extractAuthor({
      url: 'https://example.com/mod-page',
      title: 'Plain mod',
      $: aggregator$,
      prisma,
      fetchDestination: true,
    });
    expect(result.value).toBe('RealModCreator');
    expect(result.strategy).toBe('jsonld');
  });

  it('fetchDestination: true skips unfetchable Patreon domain (URL strategy still works)', async () => {
    const aggregator$ = cheerio.load('<html></html>');
    const spy = vi.fn();
    mockedAxios.get = spy;
    const result = await extractAuthor({
      url: 'https://www.patreon.com/c/someone',
      title: 'Mod',
      $: aggregator$,
      prisma,
      fetchDestination: true,
    });
    expect(spy).not.toHaveBeenCalled();
    expect(result.value).toBe('Someone');
    expect(result.strategy).toBe('url-patreon-c');
  });

  it('fetchDestination: true silently handles fetch failure', async () => {
    const aggregator$ = cheerio.load('<html></html>');
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('network down'));
    const result = await extractAuthor({
      url: 'https://example.com/mod-page',
      title: 'Cool Mod by RealCreator',
      $: aggregator$,
      prisma,
      fetchDestination: true,
    });
    // Fetch failed, but title strategy still produces a candidate.
    expect(result.value).toBe('RealCreator');
    expect(result.strategy).toBe('title-by');
  });

  it('fetchDestination: true silently handles Cloudflare challenge page', async () => {
    const aggregator$ = cheerio.load('<html></html>');
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: '<html><body>Just a moment...<div class="cf-chl-opt"></div></body></html>',
    });
    const result = await extractAuthor({
      url: 'https://example.com/mod-page',
      title: 'Plain mod',
      $: aggregator$,
      prisma,
      fetchDestination: true,
    });
    expect(result.value).toBeNull();
  });

  it('never writes a denylisted value even if a strategy returns one', async () => {
    // Craft a synthetic JSON-LD with a bad author.
    const $ = cheerio.load(`
      <html><head>
      <script type="application/ld+json">
      {"@type":"CreativeWork","author":{"name":"Title"}}
      </script>
      </head></html>
    `);
    const result = await extractAuthor({
      url: 'https://example.com/unknown',
      title: 'Plain mod title',
      $,
      prisma,
    });
    expect(result.value).toBeNull();
  });
});

// ============================================
// fromCreatorProfileMatch (Strategy 5 booster)
// ============================================

describe('fromCreatorProfileMatch', () => {
  it('returns null for candidates shorter than 4 chars', async () => {
    const prisma = makeStubPrisma(['abc', 'abcd']);
    expect(await fromCreatorProfileMatch('abc', prisma)).toBeNull();
  });

  it('matches an exact handle', async () => {
    const prisma = makeStubPrisma(['simcelebrity00']);
    const r = await fromCreatorProfileMatch('simcelebrity00', prisma);
    expect(r?.value).toBe('simcelebrity00');
    expect(r?.confidence).toBe('high');
    expect(r?.strategy).toBe('creator-profile-match');
  });

  it('matches a handle within Levenshtein distance 1', async () => {
    const prisma = makeStubPrisma(['simcelebrity00']);
    // One substitution away: simcelebritY00 -> simcelebrity00 (case-insensitive same)
    // Try a real 1-edit case: add one char
    const r = await fromCreatorProfileMatch('simcelebrity01', prisma);
    expect(r?.value).toBe('simcelebrity00');
  });

  it('returns null when no handle is within distance 1', async () => {
    const prisma = makeStubPrisma(['simcelebrity00']);
    expect(await fromCreatorProfileMatch('totallyDifferent', prisma)).toBeNull();
  });

  it('boosts orchestrator confidence to "high" on profile match', async () => {
    const prisma = makeStubPrisma(['Maiahair']);
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://maiahair.tumblr.com/post/1',
      title: 'some title',
      $,
      prisma,
    });
    expect(result.value).toBe('Maiahair');
    expect(result.confidence).toBe('high');
    expect(result.strategy.includes('creator-profile-match')).toBe(true);
  });

  it('survives Prisma failure gracefully', async () => {
    const prisma = {
      creatorProfile: {
        findMany: async () => {
          throw new Error('DB unreachable');
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const r = await fromCreatorProfileMatch('AnyCandidate', prisma);
    expect(r).toBeNull();
  });
});

// ============================================
// fromPatreonApi (Patreon public posts API)
// ============================================

describe('fromPatreonApi', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns null for non-Patreon URLs', async () => {
    mockedAxios.get = vi.fn(); // should never be called
    const r = await fromPatreonApi('https://example.com/posts/12345');
    expect(r).toBeNull();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('returns null for Patreon /c/ URLs (no post ID to look up)', async () => {
    mockedAxios.get = vi.fn();
    const r = await fromPatreonApi('https://www.patreon.com/c/somecreator');
    expect(r).toBeNull();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('extracts full_name from /posts/{slug}-{id} response', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        data: { id: '72111226', type: 'post' },
        included: [
          { type: 'user', attributes: { full_name: 'IndiSim', vanity: 'Indisim' } },
        ],
      },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/butterfly-tattoo-72111226',
    );
    expect(r?.candidate?.value).toBe('IndiSim');
    expect(r?.candidate?.confidence).toBe('high');
    expect(r?.candidate?.strategy).toBe('patreon-api');
    expect(r?.isPaywalled).toBe(false);
    // Confirm we hit the right endpoint with the right post ID.
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/posts/72111226'),
      expect.any(Object),
    );
  });

  it('extracts post ID from numeric-only /posts/{id} URL', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [{ type: 'user', attributes: { full_name: 'SoloCreator' } }],
      },
    });
    const r = await fromPatreonApi('https://www.patreon.com/posts/47369875');
    expect(r?.candidate?.value).toBe('SoloCreator');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/posts/47369875'),
      expect.any(Object),
    );
  });

  it('falls back to vanity when full_name is missing', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [
          { type: 'user', attributes: { full_name: '', vanity: 'fallbackvanity' } },
        ],
      },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/some-slug-12345',
    );
    expect(r?.candidate?.value).toBe('fallbackvanity');
    expect(r?.candidate?.strategy).toBe('patreon-api-vanity');
  });

  it('trims whitespace in full_name (real-world Patreon data is messy)', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [{ type: 'user', attributes: { full_name: 'Miu  ' } }],
      },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/ghibli-tattoos-147409166',
    );
    expect(r?.candidate?.value).toBe('Miu');
  });

  it('returns no candidate when API returns 404 (deleted post)', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 404,
      data: { errors: [{ title: 'Not Found' }] },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/deleted-99999999',
    );
    expect(r?.candidate).toBeNull();
    expect(r?.isPaywalled).toBe(false);
  });

  it('returns no candidate when included[] has no usable record', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: { data: {}, included: [{ type: 'reward', attributes: {} }] },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/orphan-123456',
    );
    expect(r?.candidate).toBeNull();
    expect(r?.isPaywalled).toBe(false);
  });

  it('returns no candidate on network error (throws)', async () => {
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('ECONNRESET'));
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/anything-123456',
    );
    expect(r?.candidate).toBeNull();
    expect(r?.isPaywalled).toBe(false);
  });

  // ----- 403 ViewForbidden / paywall detection -----

  it('flags isPaywalled=true on 403 ViewForbidden', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 403,
      data: { errors: [{ code_name: 'ViewForbidden', title: 'Forbidden' }] },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/paywalled-12345678',
    );
    expect(r?.candidate).toBeNull();
    expect(r?.isPaywalled).toBe(true);
  });

  it('does NOT flag paywall for non-ViewForbidden 403 responses', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 403,
      data: { errors: [{ code_name: 'SomeOtherError' }] },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/other-403-12345',
    );
    expect(r?.candidate).toBeNull();
    expect(r?.isPaywalled).toBe(false);
  });

  // ----- Fallback chain: full_name → campaign.name → vanity -----

  it('falls back to campaign.name when full_name is denylisted', async () => {
    // "Dress" is denylisted (clothing word). Campaign name is the
    // distinctive creator brand.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [
          { type: 'user', attributes: { full_name: 'Dress', vanity: '' } },
          { type: 'campaign', attributes: { name: 'DressCC Studio' } },
        ],
      },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/some-mod-77777777',
    );
    expect(r?.candidate?.value).toBe('DressCC Studio');
    expect(r?.candidate?.strategy).toBe('patreon-api-campaign');
  });

  it('falls back to vanity when full_name AND campaign.name are denylisted', async () => {
    // Real-world: full_name="Dress", campaign.name="Dress", vanity="Dresss".
    // Both denylisted forms collapse to the vanity fallback.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [
          { type: 'user', attributes: { full_name: 'Dress', vanity: 'Dresss' } },
          { type: 'campaign', attributes: { name: 'Dress' } },
        ],
      },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/some-mod-88888888',
    );
    expect(r?.candidate?.value).toBe('Dresss');
    expect(r?.candidate?.strategy).toBe('patreon-api-vanity');
  });

  it('returns no candidate when full_name + campaign + vanity are all denylisted', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [
          { type: 'user', attributes: { full_name: 'Dress', vanity: 'Crown' } },
          { type: 'campaign', attributes: { name: 'Tattoo' } },
        ],
      },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/all-denied-99999999',
    );
    expect(r?.candidate).toBeNull();
    expect(r?.isPaywalled).toBe(false);
  });

  it('skips empty/whitespace candidates and continues the chain', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [
          { type: 'user', attributes: { full_name: '   ', vanity: 'november4sims' } },
          { type: 'campaign', attributes: { name: '' } },
        ],
      },
    });
    const r = await fromPatreonApi(
      'https://www.patreon.com/posts/november-mod-55555555',
    );
    expect(r?.candidate?.value).toBe('november4sims');
    expect(r?.candidate?.strategy).toBe('patreon-api-vanity');
  });
});

// ============================================
// extractAuthor: Patreon API integration
// ============================================

describe('extractAuthor + Patreon API', () => {
  const prisma = makeStubPrisma();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Patreon API wins over url-patreon-post-slug when fetchDestination=true', async () => {
    // The URL slug "butterfly" is a denylisted topic word — without the API,
    // this URL is unrecoverable. The API knows the real creator is "IndiSim".
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [{ type: 'user', attributes: { full_name: 'IndiSim' } }],
      },
    });
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/butterfly-tattoo-72111226',
      title: 'Butterfly Tattoo',
      $,
      prisma,
      fetchDestination: true,
    });
    expect(result.value).toBe('IndiSim');
    expect(result.strategy).toBe('patreon-api');
    expect(result.confidence).toBe('high');
  });

  it('Patreon API NOT called when fetchDestination=false (preserves sync-only behavior)', async () => {
    const spy = vi.fn();
    mockedAxios.get = spy;
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/butterfly-tattoo-72111226',
      title: 'Butterfly Tattoo',
      $,
      prisma,
      // fetchDestination omitted — defaults to false
    });
    expect(spy).not.toHaveBeenCalled();
    // Without API, "butterfly" is a denylisted topic word → null
    expect(result.value).toBeNull();
  });

  it('Patreon API recovers a URL the slug strategy would denylist-reject ("crown")', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [
          { type: 'user', attributes: { full_name: 'Annett Herrler' } },
        ],
      },
    });
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/crown-neck-151960341',
      title: 'Crown Neck & Shoulder Tattoos',
      $,
      prisma,
      fetchDestination: true,
    });
    expect(result.value).toBe('Annett Herrler');
    expect(result.strategy).toBe('patreon-api');
  });

  it('still respects denylist on Patreon API output', async () => {
    // Defense-in-depth: if Patreon ever returned a denylisted name, refuse it.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [{ type: 'user', attributes: { full_name: 'Unknown' } }],
      },
    });
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/some-slug-99999999',
      title: 'Some Mod',
      $,
      prisma,
      fetchDestination: true,
    });
    // 'Unknown' is denylisted → falls through to other strategies. Slug is
    // 'some-slug' which would extract "Some" — also denylisted. Title has
    // no recognizable pattern → final null.
    expect(result.value).toBeNull();
  });

  it('Patreon API failure falls through to URL strategy (with validation)', async () => {
    // API errors out, but the slug "hoodlem-..." validates against a known
    // creator profile. The orchestrator should still recover via the legacy
    // url-patreon-post-slug + creator-profile-match path.
    mockedAxios.get = vi.fn().mockRejectedValue(new Error('timeout'));
    const validatingPrisma = makeStubPrisma(['Hoodlem']);
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/hoodlem-makiage-71276188',
      title: 'Hoodlem – Makiage Tattoo',
      $,
      prisma: validatingPrisma,
      fetchDestination: true,
    });
    expect(result.value).toBe('Hoodlem');
    expect(result.strategy).toBe('url-patreon-post-slug+creator-profile-match');
  });

  // ----- Paywall signal propagation -----

  it('surfaces isPaywalled=true on the orchestrator result when API says ViewForbidden', async () => {
    // Paid post: API says 403 ViewForbidden. No author recoverable, but the
    // mod should be flagged as paid by the caller.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 403,
      data: { errors: [{ code_name: 'ViewForbidden' }] },
    });
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/early-access-99887766',
      title: 'Some Paywalled Mod',
      $,
      prisma,
      fetchDestination: true,
    });
    expect(result.value).toBeNull();
    expect(result.isPaywalled).toBe(true);
  });

  it('isPaywalled stays undefined when API succeeds (no false positives)', async () => {
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 200,
      data: {
        included: [{ type: 'user', attributes: { full_name: 'IndiSim' } }],
      },
    });
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/butterfly-tattoo-72111226',
      title: 'Butterfly Tattoo',
      $,
      prisma,
      fetchDestination: true,
    });
    expect(result.value).toBe('IndiSim');
    expect(result.isPaywalled).toBeUndefined();
  });

  it('paywall signal flows through even when fallback chain recovers an author', async () => {
    // Hypothetical: a paywalled post that ALSO returned a public preview
    // (most don't, but if it did, we'd want both signals). In practice 403
    // and 200 are mutually exclusive — this test guards against the
    // orchestrator dropping the paywall flag on its way out.
    mockedAxios.get = vi.fn().mockResolvedValue({
      status: 403,
      data: { errors: [{ code_name: 'ViewForbidden' }] },
    });
    const $ = cheerio.load('<html></html>');
    const result = await extractAuthor({
      url: 'https://www.patreon.com/posts/no-pickup-12345678',
      title: 'Untitled Mod',
      $,
      prisma,
      fetchDestination: true,
    });
    // Fall-through chain has no signal — value is null but paywall flag is set.
    expect(result.value).toBeNull();
    expect(result.isPaywalled).toBe(true);
  });
});

// ============================================================
// HTML entity decoding (regression: Maxi Moons &#9790;)
// ============================================================
describe('cleanAuthorString', () => {
  it('decodes numeric HTML entity for moon symbol', () => {
    expect(cleanAuthorString('Maxi Moons &#9790;')).toBe('Maxi Moons ☾');
  });

  it('decodes named HTML entities (&amp;, &quot;)', () => {
    expect(cleanAuthorString('Salt &amp; Pepper')).toBe('Salt & Pepper');
    expect(cleanAuthorString('&quot;Heart&quot;Sims')).toBe('"Heart"Sims');
  });

  it('decodes hex numeric entities (&#x2614;)', () => {
    // ☔ U+2614 = Umbrella with rain drops
    expect(cleanAuthorString('Rainy &#x2614; Sims')).toBe('Rainy ☔ Sims');
  });

  it('strips zero-width characters that sneak in from copy-paste', () => {
    // U+200B between every letter
    const zwsp = 'A​B‌C‍D﻿E';
    expect(cleanAuthorString(zwsp)).toBe('ABCDE');
  });

  it('strips ASCII control characters', () => {
    expect(cleanAuthorString('Foo\x00Bar\x07Baz\x1F')).toBe('FooBarBaz');
  });

  it('collapses internal whitespace to single spaces', () => {
    expect(cleanAuthorString('Maxi   Moons    ☾')).toBe('Maxi Moons ☾');
  });

  it('trims leading and trailing whitespace', () => {
    expect(cleanAuthorString('   PralineSims   ')).toBe('PralineSims');
  });

  it('returns empty string unchanged', () => {
    expect(cleanAuthorString('')).toBe('');
  });

  it('passes plain ASCII through unchanged', () => {
    expect(cleanAuthorString('PralineSims')).toBe('PralineSims');
  });
});

describe('extractAuthor + HTML entity cleaning (regression)', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    vi.unstubAllGlobals();
  });

  it('strips HTML entities from HTML-strategy author values', async () => {
    // Repro of the Maxi Moons / Holly Piercing bug: blogspot meta tag returns
    // a moon entity verbatim. Without cleanAuthorString, "Maxi Moons &#9790;"
    // would land in the DB as the literal entity text. fromOpenGraph reads
    // `meta[property="article:author"]` — exactly what blogspot serves.
    const html = `
      <html>
        <head>
          <meta property="article:author" content="Maxi Moons &#9790;" />
        </head>
        <body></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const prisma = makeStubPrisma([]);
    const result = await extractAuthor({
      url: 'https://maximoons.blogspot.com/2025/12/holly-piercing.html',
      title: 'Holly Piercing',
      $,
      prisma,
      fetchDestination: false, // use the $ we passed in
    });
    expect(result.value).not.toBeNull();
    // Decoded moon char (U+263E), not raw entity
    expect(result.value).toContain('☾');
    expect(result.value).not.toContain('&#');
    expect(result.value).not.toContain('&amp;');
  });

  it('rejects candidates that decode to <2 chars (e.g. just an entity)', async () => {
    const html = `
      <html>
        <head>
          <meta property="article:author" content="&#9790;" />
        </head>
        <body></body>
      </html>
    `;
    const $ = cheerio.load(html);
    const prisma = makeStubPrisma([]);
    const result = await extractAuthor({
      url: 'https://example.com/foo',
      title: 'Some Mod',
      $,
      prisma,
      fetchDestination: false,
    });
    // Decoded value is just "☾" (1 char) — too short to be a real name.
    expect(result.value).toBeNull();
  });
});
