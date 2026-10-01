/**
 * The `holidays` content type, kept only where the mod TITLE names a holiday.
 *
 * Why this file exists (Rowan, 2026-10-01, E154)
 * ----------------------------------------------
 * `holidays` is a content type in production (it backs `holidays-cc`), but no
 * live code writes it: all 923 rows on 2026-10-01 came from the Nov-2025 to
 * Feb-2026 imports, where the blog post a mod was lifted from decided its
 * type. Every mod in a "holiday" roundup became `holidays`, so the grid held
 * "Mary Dress", "Sony Wall Mounted TV", "Nike Air Force 1s", a vampire-turning
 * mod and a gaming laptop — 386 rows (41.8%) whose titles name no holiday.
 *
 * Rule: a row may be typed `holidays` only if its title names a holiday (a
 * calendar event: Christmas, Halloween, Valentine's, Easter, Thanksgiving, New
 * Year, Winterfest...). A SEASON is not a holiday. The catalog's own
 * convention already says so: of 108 titles with "winter" only 26 are typed
 * `holidays` (the rest are tops/full-body/loading-screen/shoes), "summer" 1 of
 * 119, "autumn" 9 of 112. A winter coat is a top; a holiday is a theme on it.
 * Rows that fail the rule are re-decided from the title alone by
 * `detectContentTypeWithConfidence` (medium/high) or set to NULL — never left
 * as `holidays` and never guessed.
 *
 * Halloween evidence reuses `isHalloweenTitle()` so the two rules cannot drift.
 *
 * Rejected candidates (measured against all 16,561 titles 2026-10-01 as
 * "titles matching / of which typed holidays" — do not re-propose without new
 * numbers):
 *   - 'winter' 108/26, 'autumn' 112/9, 'fall' 72/4, 'summer' 119/1,
 *     'spring' 18/0, 'snow(y)' 26/6, 'snowflake' 8/2, 'harvest' 4/0,
 *     'seasonal' 4/0 — seasons, not holidays (see above).
 *   - 'pumpkin'   90/32: pumpkin soup/pie, Pumpkin Patch lots, "Pumpkin
 *                 Stereo". Autumn, not a holiday; carved ones say halloween /
 *                 jack-o-lantern (same call as halloweenThemeRules.ts).
 *   - 'costume'   32/12: police, nun, pirate, Android costumes.
 *   - 'stocking'  24/2: hosiery ("Lace Stockings", "Fishnet Stockings").
 *   - 'elf'       18/1: fantasy elves, elf ears, "Elf Bar Vape".
 *   - 'gift'      26/7, 'present' 6/2: gift boxes, "My Birthday Present".
 *   - 'noel'      5/3: names ("Noel Beard N32", "Noel Dress").
 *   - 'ornament'  3/1 ("Ornament Tattoo"), 'cupid' 5/1, 'bunny' 22/1,
 *     'egg' 6/0, 'fireworks' 2/1, 'reindeer' 1/0, 'jolly' 1/1 — too few or
 *     mostly wrong; the odd true row is pinned by id instead.
 *   - 'easter' is its own content type (24 rows typed `easter`); an Easter
 *     title keeps `holidays` if it already has it, nothing is moved in.
 *   - 0 titles today (add only when a row appears): hanukkah, diwali, lunar
 *     new year, st patrick, yule, nutcracker, mardi gras, day of the dead.
 *   Accepted with known misses, pinned by id: 'holiday' 65/57 ("Roman Holiday
 *   50s CC Pack" is the film), 'merry' 14/11 ("62 Merry Modieval" is a pun),
 *   'santa' 28/21 (all Santa Claus), 'nye' 3/3, 'jingle bells' 1/1,
 *   "father's day" 1/1 (curly apostrophe: the first count, with a straight
 *   quote only, read 0 — match both).
 *   Typos and glued words are PINNED, not ruled: "Chistmas Dress",
 *   "Simbrleen", "Helloween25", "Halloween_Eyes", "Halloweeny" (see
 *   scripts/lib/hand-audited-content-types.ts, E154).
 *
 * Imported by `lib/services/contentTypeDetector.ts` (ingest guard),
 * `scripts/retag-junk-build-facets.ts --holidays-untitled`, and
 * `__tests__/unit/holidays-content-type-rules.test.ts`.
 */

import { isHalloweenTitle } from './halloweenThemeRules';

export const HOLIDAYS_CONTENT_TYPE = 'holidays' as const;

/** Whole-word title evidence for a holiday (Halloween is checked separately). */
export const HOLIDAYS_TITLE_PATTERN =
  /\b(?:christmas(?:sy)?|x-?mas|valentine'?s?|easter|thanksgiving|give thanks|holidays?|santa|new[- ]?years?|nye|merry|jingle bells|winterfest|festive|advent|gingerbread|snowm[ae]n|mistletoe|candy[- ]canes?|deck the halls|(?:mother|father)[’']?s day)\b/i;

export function isHolidaysTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return HOLIDAYS_TITLE_PATTERN.test(title) || isHalloweenTitle(title);
}
