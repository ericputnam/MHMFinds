/**
 * The `living-room` room theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-11-17, E425)
 * ---------------------------------------------
 * `living-room` was a keyword rule in `ROOM_THEME_RULES`
 * (`lib/services/contentTypeDetector.ts`): a plain SUBSTRING match over title
 * + the shared blog-post description for 'living room', 'livingroom',
 * 'living-room', 'lounge', 'family room', 'sitting room' and 'den'. 'den' as a
 * substring matches "garden", "golden", "hidden", "Denim", "Eden", so almost
 * any description qualified. On 2026-11-17 the theme tagged 1,459 rows and
 * only 112 of them (7.7%) said living room in the title. Card #1 by downloads
 * was "Tus & Lus Slippers" (4,338 dl), then "Functional Skincare Mod",
 * "Healthcare Redux Mod", "BBL Body Preset", "Adidas Outfit" and "Denim Ripped
 * Jeans". Same class as bedroom (#170), kitchen (#179), bathroom (#187) and
 * nursery (#540), and the worst of them.
 *
 * Demand: the legacy article /sims-4-living-room-cc/ had 384 landing sessions
 * in 28 days and /sims-4-cozy-living-room-cc/ 53 more (GA4 2026-10-20 →
 * 11-16), with no browse page behind either.
 *
 * Candidate words measured against the whole catalog on 2026-11-17,
 * whole-word title match, every hit read:
 *   ACCEPTED
 *   - 'living room' / 'livingroom' / 'living-room'  112 titles, all living
 *                    room sets or pieces: "January 2024 Living Room" (2,004
 *                    dl), "Apollo Living Room Part 2", "Arden Living Room
 *                    Part 1", "Elite Living Room", "Agota Livingroom".
 *   - 'sofa(s)'      35 titles, sofas and sofa sets ("Cozy Cushion Sofa", 518
 *                    dl; "Nuage Sectional Sofa"; "Sumbae Sofa Set"), plus a
 *                    sofa blanket and two sofa pillows — living-room clutter.
 *                    Excluded: "Sofa Romance Pose Pack" (pose exclusion).
 *   - 'loveseat(s)'  4 titles, all loveseats ("Cutie Victorian Loveseat").
 *   - 'couch(es)'    4 titles; the 2 that are not furniture ("Couch Kissing
 *                    Animation", "Couch Kissing 2", typed poses) are caught
 *                    by the exclusion below.
 *   - 'sitting room' 2 titles ("Old Skool Sitting Room Part 1/2").
 *   EXCLUDED
 *   - any title containing pose(s), animation(s) or kiss/kissing  3 rows:
 *                    "Sofa Romance Pose Pack", "Couch Kissing Animation",
 *                    "Couch Kissing 2". Pose packs staged on a sofa are
 *                    animations, not furniture.
 *   REJECTED (measured, not accepted):
 *   - bare 'living'  171 titles: pack names ("Cottage Living", "City Living",
 *                    "Island Living", "Tiny Living ... Bathroom Clutter"),
 *                    "Healthy Living Mod", "Outdoor Living", "Living Water
 *                    Hair Kids", "Realistic Living Refrigerators". Many
 *                    "<Name> Living" furniture sets are living rooms, but the
 *                    word alone cannot tell them apart. NULL beats wrong.
 *   - 'lounge'       15 titles: 6 are loungewear, plus "Poolside Lounge Pack",
 *                    "Garden Lounge", "Lover Girls Lounge Mod", a vampire night
 *                    lounge and lounge chairs that are outdoor furniture.
 *   - 'sectional'    5 titles, 1 of them "Sectional Library" (bookshelves);
 *                    the 4 sectional sofas already match 'sofa'.
 *   - 'den', 'family room'  0 whole-word titles each.
 *
 * Writers: the ingest detector (`detectRoomThemes`) and the unscheduled
 * WeWantMods scraper (`detectThemes`, which also maps URL slugs 'living-room',
 * 'livingroom' and 'living' to this theme) both pass their result through
 * `applyLivingRoomTheme`, so neither a description nor a URL can add it.
 * Imported by `scripts/retag-living-room-theme.ts` and
 * `__tests__/unit/living-room-theme-rules.test.ts`, which imports these
 * constants rather than restating them.
 */

export const LIVING_ROOM_THEME = 'living-room' as const;

/** Whole-word title evidence. */
export const LIVING_ROOM_TITLE_PATTERN =
  /\bliving[\s-]?rooms?\b|\bsitting[\s-]rooms?\b|\bsofas?\b|\bloveseats?\b|\bcouch(?:es)?\b/i;

/** Pose packs and animations staged on a sofa: not room content. */
export const LIVING_ROOM_TITLE_EXCLUSION = /\bposes?\b|\banimations?\b|\bkiss(?:es|ing)?\b/i;

export function isLivingRoomTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return LIVING_ROOM_TITLE_PATTERN.test(title) && !LIVING_ROOM_TITLE_EXCLUSION.test(title);
}

/**
 * Return `themes` with the living-room element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyLivingRoomTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== LIVING_ROOM_THEME);
  return isLivingRoomTitle(title) ? [...without, LIVING_ROOM_THEME] : without;
}
