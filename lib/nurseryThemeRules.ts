/**
 * The `nursery` room theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-11-13, E404)
 * ----------------------------------------------
 * `nursery` was the last room theme still in `ROOM_THEME_RULES`
 * (`lib/services/contentTypeDetector.ts`), i.e. a keyword substring match over
 * title + the shared blog-post description ('nursery', 'baby room',
 * 'infant room', 'newborn', 'toddler room'). On 2026-11-13 it tagged 100 rows
 * and only 45 of them (45.0%) said nursery in the title. Card #5 by downloads
 * was "LittleMsSam's Pregnancy Overhaul Mod"; "Slow Infant Needs", "Candy
 * Covered", "Call a Babysitter", "Dressy Vest Suit with Bow Tie and Shirt",
 * "EKG Leads", "Hospital Regional" and two cottage lots were in it too: every
 * mod scraped from a pregnancy or infant post inherited the room. Same class as
 * bedroom (#170), kitchen (#179) and bathroom (#187). Every room theme is now
 * title-only.
 *
 * Demand: the legacy article /sims-4-nursery-cc/ had 1,125 landing sessions in
 * 14 days (GA4 2026-10-30 → 11-12: 976 Pinterest, 127 organic search) and no
 * browse page behind it. GSC 10-14 → 11-10: 45 impr / 1 clk at position 33.8.
 *
 * Candidate words measured against the whole catalog (17,396 rows) on
 * 2026-11-13, whole-word title match, every hit read:
 *   ACCEPTED
 *   - 'nursery' / 'nurseries'  46 titles, all nursery sets or nursery pieces:
 *                    "Jenny Sims 4 Nursery Furniture CC – Severinka" (519 dl),
 *                    "Little Critters Nursery CC", "Vampire Nursery Set",
 *                    "Nursery Walls", "Animals Nursery Rugs". A few carry the
 *                    wrong content type ("Nautical Ocean Nursery Art" is typed
 *                    hair, "Candy Nursery Part 3" plants) — the type is wrong,
 *                    not the theme.
 *   - 'crib' / 'cribs'  5 titles, 4 kept: "Functional Infant Cribs" (783 dl),
 *                    "Sims 4 Crib CC – Pink Baddie", "Pandasama Toddler Crib
 *                    Recolor", "Old Age Nursery – infant crib" (already in via
 *                    nursery). Excluded: "Invisible Baby Crib Default Object" —
 *                    see the 'invisible' exclusion below.
 *   - 'changing table(s)'  2 titles, both nursery furniture: "Changing Tables
 *                    and Baby Decor" (237 dl), "Contemporary Changing Table".
 *   EXCLUDED
 *   - any title containing 'invisible'  2 rows in this population ("Invisible
 *                    Baby Crib Default Object", "Sims 4 Invisible Bassinet
 *                    Mod"). They are object overrides that hide the crib for
 *                    posing and gameplay, not something you put in a room.
 *   REJECTED (measured, not accepted):
 *   - 'bassinet'      1 — the only hit is the invisible bassinet mod above.
 *   - 'toddler room'  6 ("Sims 4 Toddler Room CC Set", "Naturalis Toddler
 *                    Room", "Lilly Toddler Room") — a toddler's room, which is
 *                    `kids-room` territory; the old rule put them here.
 *   - 'newborn'       3 — a headband and two pose packs, not a room.
 *   - 'playmat'       3 — functional infant toys (2 typed `infant`); kids-cc
 *                    and infant CC cover them.
 *   - bare 'baby' / 'babies'  79 — infant clothes, pregnancy mods, poses.
 *   - 'mobile'        2 — both are phones.
 *   - 'baby room', 'infant room', 'cot'  0 titles each.
 *
 * Writers: the ingest detector (`detectRoomThemes`) and the unscheduled
 * WeWantMods scraper (`detectThemes`, which also maps URL slugs 'nursery' and
 * 'baby' to this theme) both pass their result through `applyNurseryTheme`, so
 * neither a description nor a URL can add it. Imported by
 * `scripts/retag-nursery-theme.ts` and
 * `__tests__/unit/nursery-theme-rules.test.ts`, which imports these constants
 * rather than restating them.
 */

export const NURSERY_THEME = 'nursery' as const;

/** Whole-word title evidence. */
export const NURSERY_TITLE_PATTERN = /\bnurser(?:y|ies)\b|\bcribs?\b|\bchanging[\s-]tables?\b/i;

/** Object overrides that hide a crib or bassinet: not room content. */
export const NURSERY_TITLE_EXCLUSION = /\binvisible\b/i;

export function isNurseryTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return NURSERY_TITLE_PATTERN.test(title) && !NURSERY_TITLE_EXCLUSION.test(title);
}

/**
 * Return `themes` with the nursery element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyNurseryTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== NURSERY_THEME);
  return isNurseryTitle(title) ? [...without, NURSERY_THEME] : without;
}
