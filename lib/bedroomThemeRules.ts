/**
 * The `bedroom` room theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-09-24)
 * ----------------------------------------
 * `Mod.themes` gets its room themes from `detectRoomThemes()` in
 * `lib/services/contentTypeDetector.ts`, which ran a bare
 * `String.includes(keyword)` over the title and then over the DESCRIPTION.
 * This repo's scraped `description` is shared by every mod lifted from one
 * blog post, so one "for your sims' bedroom" sentence tagged a whole post's
 * worth of rows — the failure mode already cleaned out of `lighting` 09-08,
 * `gameplay-mod` 09-10, `jewelry` 09-18, `nails` 09-20, `ageGroups` 09-21 and
 * `halloween` 09-23 (`lib/halloweenThemeRules.ts`, same shape as this file).
 *
 * Result on 2026-09-24: 523 SFW Sims 4 rows carried `bedroom`; only 195
 * (37.3%) said bedroom in the title. 133 were whole house builds
 * (`lot` 91 + `residential` 31 + `builds` 11), 26 were pose packs, and the
 * old `'sleeping'` keyword had tagged "Sleeping Animation Pack" and "Wake Up
 * Animation". "Victoria's Secret Sleepwear Collection" was card #3.
 *
 * So: titles only, whole words only, prefer *no* tag to a guess. Nurseries and
 * kids' rooms keep their own room themes (`nursery`, `kids-room`) and are not
 * folded in here.
 *
 * Candidate words measured against the whole SFW Sims 4 catalog (16,451 rows)
 * on 2026-09-24 — title hits, then what they turned out to be. Rejected ones
 * are listed so nobody re-proposes them without new numbers:
 *   KEPT
 *   - 'bedroom'    195 (furniture 163, decor 12, clutter 5)
 *   - 'bed'         66 (furniture 47; the rest are handled by the veto list below)
 *   - 'bed frame'    7 (6 furniture + "Allie Bedframe", a mis-typed furniture row)
 *   - 'dresser'      3 (all furniture)
 *   - 'bedding'      1, 'nightstand' 1, 'bedside' 1, 'mattress' 1, 'headboard' 0
 *   REJECTED
 *   - 'sleeping'    16 'sleep*' titles: 9 pose packs, a bonnet, pyjamas, "No
 *                   Sleep After Woohoo". This was the old rule's worst keyword.
 *   - 'closet'      25: 11 are clothing packs ("Barbie's Closet Collection",
 *                   "Stylish Closet" bottoms) and 2 CAS backgrounds.
 *   - 'wardrobe'     3: 2 of 3 are clothing ("Wardrobe Essentials CC Pack").
 *   - 'vanity'      12: 6 furniture, but "Vanity Locs", "Vanity Hair" wigs,
 *                   "Hello Kitty Vanity" full-body — half are beauty/hair.
 *   - 'pillow'      15: sofa pillows, a Boppy, Christmas pillows, "Pillow Talk".
 *   - 'blanket'      5: horse saddle blanket, picnic blanket, throw blankets.
 *   - 'crib' 5 / 'nursery' 44: `nursery` is its own room theme.
 *   - 'canopy'       1 ("Fairy Canopy", untyped), 'duvet' 0, 'oven' 0.
 *   WEAK EVIDENCE: a bare "bed"/"beds" is enough on its own ONLY when the
 *   title has no veto word. The first dry run's ADD list (52 rows) is where
 *   these came from — read it as hard as the STRIP list:
 *   - pets:       "Cat Window Hanging Bed" (a pet bed; the word is not adjacent),
 *                 "Natural Horse Beds – No Border" (horse skin)
 *   - activities: "Bed Cuddle" ×2 (a woohoo/cozy gameplay mod), "Read in Bed",
 *                 "Nap with Baby in Bed", "Make the Bed Mod", "Sims 4 Couple Bed
 *                 Poses", "Bed Conversations – Single Pose Pack", "Sims Bed
 *                 Smoking (Model) Poses 2", "Romantic Breakfast In Bed Set" ×2,
 *                 "Sims 4 Bed & Breakfast Build" (a lot)
 *   - not beds:   tanning / flower / garden / raised / hospital / sun / truck bed
 *   A strong word ("Bedroom", "Bedframe", "Nightstand"…) is never vetoed:
 *   "Pet Bed & Bedroom Set" still says bedroom.
 *
 *   Rows whose DESCRIPTION says bedroom but whose title does not ("Teen Space",
 *   "Set Shaggy" — 7,998 and 413 downloads, the old #1 and #4 cards) are
 *   stripped on purpose. Titles only; a hand-audit allowlist for themes is a
 *   separate, later tool.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest cannot
 * re-poison the theme), `scripts/retag-bedroom-theme.ts`, and
 * `__tests__/unit/bedroom-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const BEDROOM_THEME = 'bedroom' as const;

/** Strong whole-word title evidence: never vetoed. */
export const BEDROOM_STRONG_TITLE_PATTERN =
  /\b(?:bed[- ]?rooms?|bed[- ]?frames?|beddings?|head[- ]?boards?|night[- ]?stands?|bedside|mattress(?:es)?|dressers?)\b/i;

/** Weak evidence: a bare "bed" / "beds". Enough only without a veto word. */
export const BEDROOM_WEAK_TITLE_PATTERN = /\bbeds?\b/i;

/** Title words that make a bare "bed" mean something other than bedroom furniture. */
export const BEDROOM_VETO_TITLE_PATTERN =
  /\b(?:pets?|cats?|dogs?|pupp(?:y|ies)|kittens?|horses?|tanning|flower|garden|raised|hospital|sun|truck|cuddle|poses?|pose pack|animations?|smoking|conversations?|read in|nap with|make the bed|breakfast|woohoo)\b/i;

export function isBedroomTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  if (BEDROOM_STRONG_TITLE_PATTERN.test(title)) return true;
  return BEDROOM_WEAK_TITLE_PATTERN.test(title) && !BEDROOM_VETO_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the bedroom element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyBedroomTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== BEDROOM_THEME);
  return isBedroomTitle(title) ? [...without, BEDROOM_THEME] : without;
}
