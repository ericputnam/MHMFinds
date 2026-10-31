/**
 * The `christmas` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-10-31, E307)
 * ----------------------------------------------
 * `/games/sims-4/christmas-cc/` is the collection page for the December
 * crowd: trees, lights, Winterfest decor, Santa outfits, Christmas sweaters
 * and pyjamas, loading screens, CAS backgrounds, pose packs and holiday
 * lots. The legacy articles already pull the traffic (GA4 Oct 2026 landing
 * sessions: /sims-4-christmas-clothes-cc/ 188 social + 28 search,
 * /sims-4-christmas-cc/ 134 social + 130 search, before the season) and
 * GSC 10-03 → 10-30 shows 18 Christmas queries with no browse page at all
 * ("christmas tree sims 4 cc" pos 11.8, "sims 4 christmas clothes cc" 23.8,
 * "sims 4 christmas cc" 14.5, "sims 4 christmas poses" 17.5).
 *
 * Before this file the theme was the same class of pollution as `halloween`
 * (#156): 312 rows, 186 title-supported (59.6%). `THEME_KEYWORDS` in
 * `aiFacetExtractor.ts` mapped christmas / xmas / holiday / santa / festive /
 * "winter holiday" to it over title + description, and a blog post's
 * description is shared by every mod scraped from it — so "Beard N3" and
 * "FSP Family Portrait" were cards #3 and #4, with "Sims 4 Vampire Couple
 * Poses", "Wall Decals 5", "Crystal Wallow Mansion" (a gym) and "25 Vacation
 * Days" in the top 30. Fixed at the source: the extractor no longer maps any
 * keyword to `christmas`, applies `isChristmasTitle()` in its keyword pass,
 * and drops an AI-only `christmas` the same way it drops an AI-only
 * `halloween`. The ingest detector tags it from the title too.
 *
 * Candidate words measured against the whole catalog (17,132 rows; every
 * hit below is SFW Sims 4) on 2026-10-31, whole-word title hits, then what
 * they turned out to be. Rejected ones are listed so nobody re-proposes
 * them without new numbers:
 *   ACCEPTED
 *   - 'christmas'   193 — trees, decor sets, sweaters, PJs, loading screens,
 *                   CAS backgrounds, pose packs, lots. Also covers every
 *                   "Merry Christmas …" and "Christmas Elf Costume".
 *   - 'christmassy'   2 — "Christmassy Fireplace", "Sharing A Christmassy
 *                   Drink Together Pose Pack" (both were in the first dry
 *                   run's STRIP list; the ADD list was clean, 46/46).
 *   - 'xmas' 27 / 'x-mas' 1 — "Xmas Loading Screen", "Rustic Xmas Part 1:
 *                   Furniture", "X-Mas Industry Fireplace". 28/28.
 *   - 'winterfest'    8 — the in-game holiday: "Winterfest Dream House",
 *                   "6 Winterfest CC Hairs", "Winterfest Loading Screens".
 *   - 'santa'        28 — outfits, beards, "Santa Time Pose Pack", "Father
 *                   Winter As Santa"; `\bsanta\b` also matches "Santa’s".
 *                   Covers 8 of the 9 'claus' rows (the ninth, "Claus Set",
 *                   is a single ambiguous row — not worth a rule).
 *   - 'mistletoe'     3 — "Under The Mistletoe", "Mistletoe Collection",
 *                   "4 Mistletoe Set". 3/3.
 *   - 'gingerbread'   2 — "Gingerbread PJ Set", "Gingerbread Villa". 2/2.
 *   - 'candy cane'    2 — lipstick and nails. 2/2.
 *   - 'jingle bells'  1 — "Jingle Bells Set".
 *   REJECTED
 *   - 'holiday' 68 / 'holidays' 21 / 'winter holiday' 7: generic — a holiday
 *     set is `holidays-cc` territory (that page is contentType `holidays`,
 *     title-only since E154). 232 of the 252 core rows carry that
 *     contentType anyway, so nothing is lost.
 *   - 'festive' 11: "Festive Big Bow Heels", "Festive Lounge 2", "94 Festive
 *     Glam Set", "Festive Appetizers" (23 dl) — any-holiday party wear and
 *     food. NULL beats a guess; 9 of 11 stay on holidays-cc.
 *   - bare 'merry' 14: 11 say "Merry Christmas" (covered); the rest are
 *     "62 Merry Modieval", "Merry Nails", "Merry Collection – Tree & Decor".
 *   - 'advent' 5 ("Advent Calendar Car Poses", "Day 9. Advent Calendar 2025:
 *     Kolyada" — a hair): a creator's December countdown releases whatever
 *     the creator makes; the item is not Christmas CC.
 *   - 'elf' 17: "Elf Bar Vape" (1,089 dl, the catalog's busiest elf), "Elf
 *     Eyes", "Human Ears and Elf Ears", "Blood Elf Village" — fantasy elves.
 *     The two Christmas ones ("Christmas Elf Costume", "Infant Elf Sleeper")
 *     are covered or not evidence.
 *   - 'stocking' 24: "Aura Stockings" (369 dl), "Lace Stockings" — hosiery,
 *     not fireplace stockings. 0 of 24 are Christmas.
 *   - 'holly' 10: a name ("Holly Hair V2", "Holly Boots", "Holly Farmhouse").
 *   - 'snowflake' 8 / 'frost' 2 / 'snow' (winter theme, 278 rows): winter,
 *     not Christmas — "Snowflake Hospital Center".
 *   - 'new year' 22: a different holiday; holidays-cc.
 *   - 'noel' 5: beard/hair names ("Noel Beard N32"). 'reindeer' 1 and
 *     'snowman' 1: single rows, left NULL rather than carried by a rule.
 *   - "Evergreen Holiday Tree" (6 dl), "Deck The Halls Pose Pack", "Small Fir
 *     Tree", "Firtree in Basket", "Slay Belles", "Chistmas Dress" (typo):
 *     almost certainly Christmas, but the title does not say so and each
 *     would be a one-row rule. NULL beats a guess; the 'holidays' ones stay
 *     on holidays-cc.
 *   - 'ornament' 3 (a tattoo, a table), 'wreath' 2 (wedding/flower),
 *     'tinsel' 1 (skin overlay), 'claus' bare 1 (see santa).
 *   - 'nutcracker', 'yule', 'sleigh', 'garland', 'grinch', 'krampus',
 *     'eggnog', 'north pole', 'poinsettia', 'nativity', 'ugly sweater': 0.
 *
 * Imported by `lib/services/aiFacetExtractor.ts` (the only writer that used
 * to map keywords to it), `lib/services/contentTypeDetector.ts` (ingest),
 * `scripts/retag-christmas-theme.ts`, and
 * `__tests__/unit/christmas-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const CHRISTMAS_THEME = 'christmas' as const;

/** Whole-word title evidence. One entry per word; `s?` covers the plural. */
export const CHRISTMAS_TITLE_PATTERN =
  /\b(?:christmas(?:sy)?|x-?mas|winterfest|santa|mistletoe|gingerbread|candy[- ]canes?|jingle bells)\b/i;

export function isChristmasTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return CHRISTMAS_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the christmas element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyChristmasTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== CHRISTMAS_THEME);
  return isChristmasTitle(title) ? [...without, CHRISTMAS_THEME] : without;
}
