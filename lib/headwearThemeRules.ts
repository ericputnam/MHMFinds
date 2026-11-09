/**
 * The `headwear` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-11-09, E382)
 * ----------------------------------------------
 * `/games/sims-4/hats-cc/` is the browse page for hats: caps, beanies, bucket
 * hats, cowboy and witch hats, bonnets, helmets. The `hats` CONTENT TYPE cannot
 * back it: on 2026-11-09 it held 276 rows of which only 178 (64.5%) carried a
 * hat word in the title, and 10 of its top 24 by downloads were not hats
 * ("Vintage Coach Bag" #2, "Late Night Stream" #4, a hairstyle at #6, three
 * Map Replacements, a graduation-photo mod). That is the description-inference
 * class again (#61/#79/#156): `contentTypeDetector`'s `hats` keyword list
 * includes `crown`, `headband`, `hood`, and it reads the shared blog-post
 * description. So the page filters on this title-only theme instead, the same
 * way heels-cc (E362) sits beside the 633-row `shoes` type.
 *
 * Demand: the legacy article `/sims-4-hats-cc/` drew 201 impressions / 4
 * clicks at position 11.7 (GSC 2026-10-09 → 11-05) and 281 GA4 landing
 * sessions 2026-10-26 → 11-08; no browse page existed.
 *
 * The theme is named `headwear`, not `hats`, so it can never be confused with
 * the `hats` content type (a different column, and a value
 * `aiFacetExtractor.ts` does emit). `headwear` is not in
 * `FACET_VALUES.themes`; the guard test asserts that.
 *
 * Candidate words measured against the whole catalog (17,284 rows) on
 * 2026-11-09, whole-word title match, and what they turned out to be:
 *   ACCEPTED
 *   - 'hat(s)'       115 titles: "Ushanka Hat Set", "Backward Strapped
 *                    Baseball Hat", witch, cowboy, bucket, newsboy, Santa
 *                    hats. 82 of them typed `hats`, the rest spread over
 *                    full-body, null, holidays, hair, furniture, royals.
 *   - 'cap(s)'        27: "Nike Skull Cap" (646 dl, the most-downloaded row),
 *                    "Era Caps 2", "Trucker's Cap", "Spiky Leather Flat Cap".
 *   - 'beanie(s)'     13: "Younzoey Beanie Recolor", "Seven Goth Beanies".
 *   - 'bonnet(s)'      6: sleep/silk bonnets ("Bonnet for Infants", "SDX Silk
 *                    Bonnets"), worn on the head.
 *   - 'snapback(s)' 2, 'basecap(s)' 2, 'visor(s)' 1, 'ushanka' 1,
 *     'helmet(s)' 2 ("Equestrian Riding Helmets", "Space Helmet"),
 *     'bandana(s)' 3, 'headwear' 1 ("Noir Headwear").
 *   EXCLUDED when they appear with a hat word (the download is something else,
 *   or the hat is one piece of an outfit — NULL beats a guess):
 *   - 'gown(s)'       2: "Graduation Cap & Gown", "… Graduation Caps & Gowns".
 *   - 'costume', 'outfit(s)', 'uniform', 'dress' — 3: "Policewoman Costume +
 *                    Hat", "TSM Aarbyville Outfits and Hats", "Medieval
 *                    Concert Uniform – Dress and Hat".
 *   - 'swimwear', 'jacket', 'shirt' — 3: "Knit Swimwear and Hat Set",
 *                    "Nike Puffer Jacket and Nike Beanie", "Western Shirt with
 *                    Bandana Detail".
 *   - 'pose(s)'       1: "Hello Darlin' Pose Pack + Cowboy Hat Accessory".
 *   - 'lights'        1: "Santa Hat and Christmas Lights".
 *   - 'pajama(s)'     1: "Peach Pocket Pajama & Hat" — a sleepwear set.
 *   - 'lamp(s)'       1: "Lamp Of Many Hats" — a lamp-shade build set.
 *   - 'snowman'       1: "The Snowman in The Hat" — a yard decoration.
 *   - 'remove'        1: "Remove Hats and More Indoors" — a gameplay mod.
 *   KEPT on purpose: "Colorful Hats" (2 dl) are knit hats for pets — still
 *   hats, and the title cannot say otherwise; "Shower Cap Hat Conversion" is a
 *   worn bonnet-style cap despite its `furniture` type.
 *   Result 2026-11-09: 153 rows tagged, every title read in the dry run.
 *   REJECTED as words (measured, not accepted on their own):
 *   - 'crown(s)'      47, of which "Crown Setting Diamond Studded Earrings"
 *                    (65 dl), "Crown Facial Hair", "2010 Ford Crown Victoria",
 *                    "Crown Neck & Shoulder Tattoos". Crowns are their own
 *                    search (/sims-4-crown-cc/), not hats.
 *   - 'tiara(s)'      10, all princess/royal jewelry.
 *   - 'headband(s)'   15, 6 of them "… Hair with Headband" hairstyles.
 *   - 'hood(s)'        5: "Hood Princess Tattoos" (130 dl), "DR Hood Set".
 *   - 'veil(s)'       18: wedding veils (wedding-cc) and "Celestial Veil Eyes".
 *   - 'headpiece(s)'   3, 'hijab' 2, 'durag' 1 — too few to tell; each is
 *                    typed hair or full-body today.
 *   - 'beret', 'fedora', 'sombrero', 'turban', 'balaclava', 'headscarf' — 0
 *                    titles each.
 *   - bare 'bucket'    "Gaming Bucket List Scratch Off Poster" — every bucket
 *                    hat already says hat.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest tags
 * it from the title), `scripts/retag-headwear-theme.ts`, and
 * `__tests__/unit/headwear-theme-rules.test.ts`, which imports these constants
 * rather than restating them.
 */

export const HEADWEAR_THEME = 'headwear' as const;

/** Whole-word title evidence. `keywordToRegex`-style plurals are written once. */
export const HEADWEAR_TITLE_PATTERN =
  /\b(?:hats?|caps?|beanies?|bonnets?|snapbacks?|base-?caps?|visors?|ushankas?|helmets?|bandanas?|head-?wear)\b/i;

/** A hat word inside a title whose download is something else. */
export const HEADWEAR_TITLE_EXCLUDE_PATTERN =
  /\b(?:gowns?|costumes?|outfits?|uniforms?|dress|swimwear|jackets?|shirts?|pajamas?|poses?|lights|lamps?|snowman|remove)\b/i;

export function isHeadwearTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return HEADWEAR_TITLE_PATTERN.test(title) && !HEADWEAR_TITLE_EXCLUDE_PATTERN.test(title);
}

/**
 * Return `themes` with the headwear element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyHeadwearTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== HEADWEAR_THEME);
  return isHeadwearTitle(title) ? [...without, HEADWEAR_THEME] : without;
}
