/**
 * E168 (Rowan, 2026-10-03): at ingest, a confident TITLE answer beats the blog
 * post's URL category; the URL category is the fallback only when the title
 * detector returns nothing / low confidence; the shared description is the
 * last resort. "Confident" is the detector's own threshold — medium or high,
 * the same one every retag script and guard already uses — not a new heuristic.
 *
 * Why: on 2026-10-02 the first `--refreshed` ingest wrote 117 rows and 17
 * (14.5%) were wrong, all from two rules. `/sims-4-fall-cc-clothes/` typed
 * 20/20 rows `tops` (5 title-supported) because
 * `detectContentTypeFromUrl(url) || detectContentType(title, description)` let
 * the URL win outright; and the `lot` rule read the description, so a basket
 * became `lot` via "porches … farmhouse builds" in the post's prose.
 *
 * Whole-catalog replay (16,692 rows, 5,412 with a URL category): the new
 * composition differs on 861 (15.9%), never to NULL; where it differs, the
 * stored value agrees with the NEW answer 468 times and with the OLD 224.
 *
 * `preFix` below is FROZEN from running the pre-fix composition — verbatim from
 * `mhmScraper.saveModsToDatabase` on origin/main a5cc519 — on that tree, not
 * recomputed here. Against a5cc519 this file fails at import
 * (`resolveIngestContentType` does not exist); the rows where `preFix !==
 * expect` are the cases the fix changes.
 */
import { describe, it, expect } from 'vitest';
import {
  detectContentTypeWithConfidence,
  resolveIngestContentType,
} from '../../lib/services/contentTypeDetector';
import { detectContentTypeFromUrl } from '../../lib/services/mhmScraperUtils';
import { HAND_AUDITED_CONTENT_TYPES } from '../../scripts/lib/hand-audited-content-types';

const FALL = 'https://musthavemods.com/sims-4-fall-cc-clothes/';
const OUTDOOR = 'https://musthavemods.com/sims-4-fall-outdoor-cc/';
const PATREON = 'https://www.patreon.com/posts/123';

type Fixture = {
  title: string;
  url: string;
  description?: string;
  /** Frozen pre-fix answer (origin/main a5cc519). */
  preFix: string | undefined;
  /** Exact post-fix answer, or a predicate when only "not X" is the rule. */
  expect: string | undefined | ((out: string | undefined) => boolean);
  why: string;
};

const FIXTURES: Fixture[] = [
  // ── /sims-4-fall-cc-clothes/ → URL says `tops` for all 20 rows (E161 day 1)
  { title: 'Autumn Overalls', url: FALL, preFix: 'tops', expect: 'full-body', why: "detector's own 'overalls' keyword (full-body)" },
  { title: 'Cozy Long Scarf', url: FALL, preFix: 'tops', expect: 'accessories', why: "'scarf' is an accessories keyword" },
  { title: 'Knitted Overknee Socks', url: FALL, preFix: 'tops', expect: 'accessories', why: "'socks' is an accessories keyword" },
  { title: 'Little Fall Adventures Collection – Overall Dress', url: FALL, preFix: 'tops', expect: 'dresses', why: 'title says dress' },
  { title: 'Toddler Aspen Fall Jumpsuit', url: FALL, preFix: 'tops', expect: 'full-body', why: "'jumpsuit' is a full-body keyword" },
  { title: 'Tus & Lus Slippers', url: FALL, preFix: 'tops', expect: 'shoes', why: "'slippers' is a shoes keyword (3,266 downloads, stored shoes by hand)" },
  { title: 'Autumn Girlish Outfit', url: FALL, preFix: 'tops', expect: 'full-body', why: "'outfit' is a full-body keyword" },
  // The URL category is still the fallback when the title says nothing — these
  // two stay `tops` by design and are hand-pinned (NULL / bottoms) by id in E161.
  { title: 'The Moss Collection', url: FALL, preFix: 'tops', expect: 'tops', why: 'title names no type → URL category stands (pinned NULL by hand)' },
  { title: 'Autumn Denim Collection – Harvest Threads', url: FALL, preFix: 'tops', expect: 'tops', why: 'title names no type → URL category stands (pinned bottoms from its description)' },
  // ── other categories
  { title: 'Lashes V4', url: 'https://musthavemods.com/sims-4-urban-makeup-cc/', preFix: 'makeup', expect: 'lashes', why: 'granular face type in the title beats the generic makeup category' },
  { title: 'Bob with Bangs', url: 'https://musthavemods.com/sims-4-hair-cc/', preFix: 'hair', expect: 'hair', why: 'title and URL agree' },
  { title: 'Mix It Bathroom Set', url: 'https://musthavemods.com/sims-4-glasses-cc/', preFix: 'furniture', expect: 'furniture', why: 'E132 room-titled guard still applies after the precedence change' },
  // ── lot roundups: the URL category keeps a house named after a person
  { title: 'Hirose Yoshimi', url: 'https://musthavemods.com/sims-4-houses/', preFix: 'lot', expect: 'lot', why: 'title alone says nothing; /houses/ roundup' },
  { title: 'MM Castle On Peak', url: 'https://musthavemods.com/sims-4-castles/', preFix: undefined, expect: 'lot', why: "'castle' is now a lot title word (24 title hits, 20 lots); /sims-4-castles/ is not a URL category" },
  { title: 'Gothic Aesthetic Castle – Loading Screen', url: 'https://musthavemods.com/sims-4-castles/', preFix: 'loading-screen', expect: 'loading-screen', why: 'a higher-priority title rule still beats the lot word' },
  // These two are real lots the URL mapping does not know (`/-lots/`, `/-lot/`
  // are NOT categories: the 92 rows under `-lots/` slugs include hospital and
  // gym gameplay mods). NULL beats a guess; pin by id if they matter. The slug
  // candidates are filed in ideas-inbox, not widened into this PR.
  { title: 'Willow Creek Hospital', url: 'https://musthavemods.com/sims-4-hospital-lots/', preFix: undefined, expect: undefined, why: 'title names nothing, no URL category → NULL (unchanged)' },
  { title: 'Sims 4 Stranger Things Hawkins Police Station', url: 'https://musthavemods.com/sims-4-police-station-lot/', preFix: undefined, expect: undefined, why: "'police station' rejected 12/5; no URL category → NULL (unchanged)" },
  // ── the description can no longer make something a lot
  { title: 'Male Clothing CC Dump', url: 'https://www.patreon.com/posts/happy-holidays-143345745', description: 'A cozy house full of clothes for your home and family lot', preFix: 'lot', expect: undefined, why: 'the stored row (47 downloads) is typed lot from prose; NULL beats a guess' },
  { title: 'Set 12', url: PATREON, description: 'A cozy house for your family home lot', preFix: 'lot', expect: undefined, why: 'two lot words in a description used to be medium confidence' },
  { title: 'KHD Orchard Apple Basket', url: OUTDOOR, description: 'If you’re looking for simple autumn clutter for your outdoor spaces, KHD Orchard Apple Basket is a cute addition. This set works well for fall gardens, porches, orchards, and farmhouse builds.', preFix: 'lot', expect: (o) => o !== 'lot', why: 'E161: a basket typed lot via "farmhouse builds"' },
  { title: 'Porchfully Yours – Build & Buy Set', url: OUTDOOR, description: 'Porchfully Yours – Build & Buy Set is a 12-piece collection made for decorating porches. Seating, string lights, a welcome mat, wooden furniture.', preFix: 'lot', expect: (o) => o !== 'lot', why: "E161: 'build' was a lot keyword (31 title hits, 8 lots) — rejected" },
  { title: 'Vibe Build Set', url: PATREON, preFix: 'lot', expect: (o) => o !== 'lot', why: "'build' rejected (Nova pinned this NULL on 2026-09-08)" },
  // ── lot title words still work without a URL
  { title: 'Sunflower Estate', url: PATREON, preFix: 'lot', expect: 'lot', why: 'estate' },
  { title: 'Luxury Penthouse', url: PATREON, preFix: undefined, expect: 'lot', why: "'penthouse' added (4 title hits, 3 lots, 1 mistyped accessories)" },
  { title: 'Modern Modular Starter Home', url: PATREON, preFix: 'lot', expect: 'lot', why: "'starter' ('home' is rejected)" },
  // ── a lot word must not relabel a furniture/decor roundup's item (why 'home' was rejected)
  { title: 'Sims 4 Home Office CC Pack', url: 'https://musthavemods.com/sims-4-furniture-cc/', preFix: 'furniture', expect: 'furniture', why: "'home' rejected as a lot word: 0 of 12 URL-categorised 'home' titles were lots" },
  { title: 'Home Fitness Set', url: 'https://musthavemods.com/sims-4-fitness-clutter-cc/', preFix: 'decor', expect: 'decor', why: "'home' rejected; URL category stands" },
  { title: 'Modern Mountain Home', url: 'https://musthavemods.com/sims-4-houses/', preFix: 'lot', expect: 'lot', why: "'home' says nothing now; the /houses/ URL category keeps it" },
  { title: 'Pumpkin Patch Lot Trait', url: PATREON, preFix: 'gameplay-mod', expect: 'gameplay-mod', why: "gameplay-mod (15) outranks lot (12) in the title pass — no 'lot trait' negative needed" },
  { title: 'Toddler Castle Bedroom Stuff', url: PATREON, preFix: 'furniture', expect: 'furniture', why: 'room-titled: E147 lot suppression still applies to the new castle word' },
];

const ingest = (f: Fixture) => resolveIngestContentType(f.title, f.description, detectContentTypeFromUrl(f.url));

describe('resolveIngestContentType — confident title beats URL category (E168)', () => {
  it('fixture table is not vacuous and changes something', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(30);
    const changed = FIXTURES.filter((f) => typeof f.expect === 'function' ? true : f.expect !== f.preFix);
    expect(changed.length).toBeGreaterThanOrEqual(12);
    // and never to NULL where the pre-fix answer was a real type the title or URL supports
    const toNull = FIXTURES.filter((f) => f.expect === undefined && f.preFix !== undefined);
    for (const f of toNull) expect(f.description, f.title).toBeDefined(); // only description-typed rows lose their type
  });

  for (const f of FIXTURES) {
    it(`${f.title} via ${f.url.replace(/^https?:\/\/[^/]+/, '')} → ${typeof f.expect === 'function' ? 'not lot' : String(f.expect)} (pre-fix ${String(f.preFix)}) — ${f.why}`, () => {
      const out = ingest(f);
      if (typeof f.expect === 'function') expect(f.expect(out), `got ${out}`).toBe(true);
      else expect(out).toBe(f.expect);
    });
  }

  it('"confident" is the detector\'s own medium/high threshold: every title the fixtures expect to win is medium or high on the title alone', () => {
    for (const f of FIXTURES) {
      if (typeof f.expect === 'function' || f.expect === undefined) continue;
      const url = detectContentTypeFromUrl(f.url);
      if (!url || url === f.expect) continue;
      const t = detectContentTypeWithConfidence(f.title);
      expect(t.confidence, f.title).not.toBe('low');
      expect(t.contentType, f.title).toBe(f.expect);
    }
  });

  it('a low-confidence title never beats the URL category (URL remains the fallback)', () => {
    const t = detectContentTypeWithConfidence('The Moss Collection');
    expect(t.confidence).toBe('low');
    expect(resolveIngestContentType('The Moss Collection', undefined, 'tops')).toBe('tops');
    expect(resolveIngestContentType('The Moss Collection', undefined, undefined)).toBeUndefined();
  });

  it('with no URL category and no title answer, the description is still the last resort (unchanged behaviour)', () => {
    // Two independent hair nouns in a description — the pre-E168 path for category-less posts.
    expect(resolveIngestContentType('Set 3', 'A long wavy hairstyle with bangs and a ponytail', undefined)).toBe('hair');
  });

  it('everything still passes through the room/holidays guards', () => {
    expect(resolveIngestContentType('Zone Bathroom', undefined, 'bathroom')).toBeUndefined();
    expect(resolveIngestContentType('Mary Dress', undefined, 'holidays')).toBe('dresses');
    expect(resolveIngestContentType('Kitchen Time Set', 'Everything your house needs for a cozy home', 'lot')).toBeUndefined();
  });

  it('the E161 pins this rule was derived from are untouched (explicit no-ops for the retag)', () => {
    const e161 = Object.values(HAND_AUDITED_CONTENT_TYPES).filter((p) => p.why.startsWith('E161 '));
    expect(e161.length).toBe(18);
    const keep = e161.find((p) => p.why.includes('Cozy Autumn Camper Van'));
    expect(keep?.contentType).toBe('lot');
  });
});
