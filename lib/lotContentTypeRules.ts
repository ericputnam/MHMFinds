/**
 * The `lot` content type, decided from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-10-03, E168)
 * ----------------------------------------------
 * The `lot` rule in `lib/services/contentTypeDetector.ts` was the last
 * build/buy rule still reading the description. A blog post's description is
 * shared by every mod scraped from it, so one roundup's prose ("porches,
 * orchards, and farmhouse builds") typed a basket `lot` (E161), and
 * "A cozy house for your family home" typed a male clothing dump `lot`. On
 * 2026-10-03 the `lot` facet held 362 rows of which 152 (42.0%) carried a lot
 * word in the title; `residential` (571 rows, no live writer) is the same
 * class and is left for its own pass.
 *
 * Rule: the lot keywords are matched against the TITLE only (`titleOnly` on
 * the `KeywordRule`); the description pass never considers them. A row whose
 * title names nothing is decided by the blog post's URL category at ingest
 * (`detectContentTypeFromUrl`, e.g. /sims-4-houses/) or is NULL — never by
 * prose. Pattern: `lib/bedroomThemeRules.ts`, `lib/kitchenThemeRules.ts`,
 * `lib/bathroomThemeRules.ts`, `lib/holidaysContentTypeRules.ts`.
 *
 * Keywords measured against all 16,692 titles on 2026-10-03 as "titles
 * matching / typed lot / typed residential" — the two lot facets together are
 * the support; anything else is a loser the lower lot priority (12) already
 * concedes to a higher rule, or a mistyped lot.
 *
 * Because a confident title answer now beats the blog post's URL category at
 * ingest (E168 part a), each word was also checked on the rows that HAVE a
 * URL category: a lot word there must not relabel a furniture/decor/clothes
 * roundup's item as a lot. Only 'home' failed that check (below).
 *
 * KEPT (inherited): lot 32/9/8 (5 gameplay-mod "Lot Trait" — gameplay-mod at
 *   priority 15 wins the title pass, no negative needed; KNOWN MISS "Lots Of
 *   Gym Equipment" via the plural, 1 row), house 215/56/130 (150 rows carry a
 *   URL category, 149 of them /houses/), apartment 17/6/9 (misses: "Apartment
 *   Therapy CC Stuff Pack", "Korea Apartment Windows Set"), mansion 20/8/10,
 *   cottage 68/36/13 (45 with a URL category, 42 of them lot roundups; misses
 *   "Cozy Cottage" furniture set [11 dl], "A La Ferme Cottage Gardening";
 *   "Country Cottage Refrigerator"/"Cottage Kitchen Furniture" are caught by
 *   the E147 room guard), residential 1/0/0, venue 8/2/1 (the rest are
 *   untyped lots), starter 27/3/18, estate 9/6/0, villa 38/8/12 (12 typed
 *   accessories are mistyped lots — see ideas-inbox), colonial 2/1/1,
 *   townhouse 1/0/0, farmhouse 24/2/18 (23 of 24 on lot roundups), manor
 *   13/5/4, chateau 1/1/0, bungalow 2/0/1.
 * KEPT (added): castle 24/18/2 (losers are a loading screen, a CAS
 *   background and a room-titled bedroom set — all taken by higher rules or
 *   the room guard), penthouse 4/1/2, palace 9/4/2 (KNOWN MISS "Palace Dining
 *   Set" [3 dl] — the furniture rule has no 'dining set' keyword, filed in
 *   ideas-inbox, not widened here), duplex 2/2/0, 'no cc' 4/0/3 (+1 mistyped).
 *
 * REJECTED — do not re-propose without new numbers:
 *   - 'home'         76/18/38 — REMOVED from the inherited list. It is a
 *                    modifier noun as often as a building: "Home Office CC
 *                    Pack" ×4, "Home Fitness/Gym/Workout" ×5 (incl. the
 *                    facet's top row by downloads, "1 Home Gym Set" [72 dl]),
 *                    "Home Decor", "Work From Home Mod", "Funeral Home",
 *                    "Nursing Homes", "Home Video Autumn Clothes". Of the 39
 *                    hits with a URL category, 27 are on /houses/ roundups
 *                    (the URL fallback keeps them lot) and the other 12 are
 *                    furniture/decor/clutter/clothes posts — 0 of 12 are lots,
 *                    and under title-beats-URL every one would become `lot`.
 *                    The real houses ("Starter Home", "Dream Beach Home Lot",
 *                    "Cordelia's Cottage – … Home") carry another lot word or
 *                    a /houses/ URL; "Modern Mountain Home" [5 dl] has only the
 *                    /sims-4-houses/ URL, which the URL fallback keeps as lot.
 *   - 'build'        31/3/5: "Build & Buy Set", "Build A Shower Kit", "Vibe
 *                    Build Set" — 26% lots. Removed from the inherited list.
 *   - 'renovation'   0 hits, 'community lot' 0 hits — dead words, dropped.
 *   - 'cabin'        25/3/7: furniture sets ("Cozy Cabin Collection").
 *   - 'hotel'        25/9/0: 5 furniture, 4 hats ("Hotel Bellhop Hat").
 *   - 'ranch'        44/20/2: Horse Ranch EP recolours and decor.
 *   - 'tower'        7/2/0: water tower, balloon tower (decor).
 *   - 'hospital' 16/2, 'school' 59/1, 'university' 25/2, 'gym' 61/10,
 *     'restaurant' 45/0, 'police station' 12/5, 'office' 68/0, bar, club,
 *     shop, store, cafe, cemetery, church: venue words name the gameplay or
 *     decor FOR the venue far more often than a lot.
 *   - 'library', 'museum' 0 hits.
 *   - 'houseboat'    2/1: too few; pin by id if it matters.
 *   - adjectives — 'modern' 155/16, 'cozy' 129/11, 'family' 146/17,
 *     'victorian' 42/2, 'mid-century', 'suburban' 7/7 (every hit is already a
 *     lot via another word): an adjective is evidence of nothing on its own.
 *   - 'room' 237/2, 'bedroom' 196/1: room words are themes (E147).
 *   NEGATIVES rejected as a class: `hasNegative` reads the description too,
 *   so a negative would re-import the exact pollution this rule removes.
 *   'cottage living' (4 hits, 2 lots) and 'lot trait' (5 hits, gameplay-mod
 *   already wins) were the only candidates and neither is worth that.
 *   No singular+plural pairs: `keywordToRegex` appends `(?:s|es)?`, so a pair
 *   would count one word's evidence twice and reach 'high' on its own.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (the `lot` rule),
 * `scripts/retag-junk-build-facets.ts --lot-untitled`, and
 * `__tests__/unit/lot-content-type-rules.test.ts`.
 */

export const LOT_CONTENT_TYPE = 'lot' as const;

/** Whole-word title evidence for a whole lot/building. Order is irrelevant. */
export const LOT_TITLE_KEYWORDS: string[] = [
  'lot', 'house', 'apartment', 'mansion', 'cottage', 'residential',
  'venue', 'starter', 'estate', 'villa', 'colonial', 'townhouse', 'farmhouse',
  'manor', 'chateau', 'bungalow',
  'castle', 'penthouse', 'palace', 'duplex', 'no cc',
];

/** Measured and rejected (see header). Tested so none can creep back in. */
export const LOT_REJECTED_TITLE_KEYWORDS: readonly string[] = [
  'home', 'build', 'renovation', 'community lot', 'cabin', 'hotel', 'ranch', 'tower',
  'hospital', 'school', 'university', 'gym', 'restaurant', 'police station',
  'office', 'bar', 'club', 'shop', 'store', 'cafe', 'cemetery', 'church',
  'library', 'museum', 'houseboat', 'modern', 'cozy', 'family', 'victorian',
  'mid-century', 'suburban', 'room', 'bedroom',
];

const LOT_TITLE_PATTERN = new RegExp(
  `\\b(?:${LOT_TITLE_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:s|es)?\\b`,
  'i',
);

/** True iff the title alone carries a lot word (the same words the detector's lot rule uses). */
export function isLotTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return LOT_TITLE_PATTERN.test(title);
}
