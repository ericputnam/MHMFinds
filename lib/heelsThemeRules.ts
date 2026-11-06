/**
 * The `heels` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-11-06, E362)
 * ----------------------------------------------
 * `/games/sims-4/heels-cc/` is the browse page for heels: stilettos, pumps,
 * platforms, wedges, heeled mules and sandals, and heeled boots. The `shoes`
 * content type cannot back it — it holds 633 rows of every kind of footwear —
 * and no theme said "heel" before this file. The legacy article
 * `/sims-4-heels-cc/` drew 256 impressions / 12 clicks at position 10.8 over
 * GSC 2026-10-07 → 11-03, and the shoes-cc hub's own title already promises
 * heels (E339). The page's inbound links come from `female-clothes` (651
 * landing sessions in GA4 10-23 → 11-05, the busiest collection page) and
 * `shoes-cc`.
 *
 * Title-only, like every theme since #170 (`lib/bedroomThemeRules.ts`,
 * `lib/plumbobThemeRules.ts`): a blog post's description is shared by every
 * mod scraped from it, so "the best heels to pair with this dress" would tag
 * the dress. `aiFacetExtractor.ts` cannot emit it — `heels` is not in
 * `FACET_VALUES.themes` (its `heels → shoes` entry maps a *content type*), and
 * the guard test asserts that.
 *
 * Candidate words measured against the whole catalog (17,250 rows) on
 * 2026-11-06, substring title prefilter `heel|stiletto|pump` = 243 rows, then
 * whole-word and what they turned out to be:
 *   ACCEPTED
 *   - 'heel(s)', 'heeled', 'high-heel' — the bulk: "Playb**ch Heels" (635 dl),
 *                            "Camille Heels", "Denim Heeled Boots", "Wedge
 *                            Heel Slippers", "Block Heel Mary Janes".
 *   - 'stiletto(s)'          7 shoe titles ("Glitter Bow Stilettos S594",
 *                            "Knee High Stiletto Boots") once nails are
 *                            excluded (below).
 *   - 'pumps'                6 ("Amina Muaddi Suede Pumps", "Retro Round-Toe
 *                            Pumps", "Leather Pumps 06"). Whole word only, so
 *                            "Pumped Hips & Thighs Body Preset" and the 120+
 *                            "Pumpkin" rows never match.
 *   REJECTED (excluded when they appear with a heel word)
 *   - 'nail(s)'              11 "… Stiletto Nails" sets — a nail shape, not a
 *                            shoe (they live on nails-cc).
 *   - 'perfume'              1: "My Heel Perfume" is a decor bottle.
 *   - 'flat(s)'              1: "Chanel Stiletto Flat" — a flat shoe.
 *   - 'clothing'             1: "2 Hell In Heel Clothing Set" — a Tumblr
 *                            office-siren outfit collection named after the
 *                            phrase "hell in heels".
 *   - 'top(s)'               1: "Sims 4 50s Halter Top & Heels" — the download
 *                            is the halter top (its description names only
 *                            "a stylish top"); NULL beats a guess.
 *   Result 2026-11-06: 121 rows tagged (118 SFW Sims 4), every title read.
 *   - bare 'pump'            0 shoe titles; only "Pumpkin…" and "Pumped…".
 *   - 'wheel', 'wheeler'     never whole-word "heel" ("Wheelchair", "Pottery
 *                            Wheel", "Wheeler Hair") — listed so nobody
 *                            loosens the word boundary.
 *   - 'platform(s)', 'wedge(s)', 'mules', 'mary jane(s)' — NOT accepted on
 *                            their own: every heeled one already says heel
 *                            ("Kio Platform Heels"), and "Platform Sneakers"
 *                            / flat Mary Janes would be wrong.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest tags
 * it from the title), `scripts/retag-heels-theme.ts`, and
 * `__tests__/unit/heels-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const HEELS_THEME = 'heels' as const;

/** Whole-word title evidence. */
export const HEELS_TITLE_PATTERN = /\b(?:(?:high[- ])?heel(?:s|ed)?|stilettos?|pumps)\b/i;

/** A heel word that names something other than a heeled shoe. */
export const HEELS_TITLE_EXCLUDE_PATTERN = /\b(?:nails?|perfumes?|flats?|clothing|tops?)\b/i;

export function isHeelsTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return HEELS_TITLE_PATTERN.test(title) && !HEELS_TITLE_EXCLUDE_PATTERN.test(title);
}

/**
 * Return `themes` with the heels element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyHeelsTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== HEELS_THEME);
  return isHeelsTitle(title) ? [...without, HEELS_THEME] : without;
}
