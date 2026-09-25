/**
 * The `kitchen` room theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-09-25, E109)
 * ----------------------------------------------
 * `Mod.themes` gets its room themes from `detectRoomThemes()` in
 * `lib/services/contentTypeDetector.ts`, whose `ROOM_THEME_RULES` ran a bare
 * `String.includes(keyword)` over the title and then over the DESCRIPTION.
 * This repo's scraped `description` is shared by every mod lifted from one
 * blog post, so one "for your sims' kitchen" sentence tagged a whole post's
 * worth of rows — the class already cleaned out of `halloween` 09-23
 * (`lib/halloweenThemeRules.ts`) and `bedroom` 09-24 (`lib/bedroomThemeRules.ts`,
 * the same shape as this file).
 *
 * Result on 2026-09-25: 345 SFW Sims 4 rows carried `kitchen`; only 118
 * (34.2%) said kitchen in the title. The grid would have shown "Realistic
 * Cooking Mod" (a gameplay mod, the old 'cooking' keyword) at #2, "Soul food",
 * "Breakfast Foods", "Kellogg's Set" and a freelance-chef career in the top 20,
 * and 47 whole-house lots.
 *
 * The other detector, `THEME_KEYWORDS` in `lib/services/aiFacetExtractor.ts`,
 * cannot emit `kitchen` as a theme: `kitchen` is a *contentType* there, and
 * `validateThemes()` filters AI output to `FACET_VALUES.themes`, which does
 * not contain it. The guard test asserts that stays true.
 *
 * So: titles only, whole words only, prefer *no* tag to a guess.
 *
 * Candidate words measured against the whole SFW Sims 4 catalog (16,451 rows)
 * on 2026-09-25 — title hits, then what they turned out to be. Rejected ones
 * are listed so nobody re-proposes them without new numbers:
 *   KEPT
 *   - 'kitchen'       116 (furniture 28, lot 17, clutter 16, decor 13; the
 *                     lot/tops/makeup rows are kitchen sets with a wrong
 *                     contentType, e.g. "Marie Kitchen" is a fridge typed tops)
 *   - 'kitchenware'     2 ("Soho Kitchenware", "Fleur kitchenware")
 *   - 'fridge'         26, 'refrigerator' 13 — every one a fridge
 *   - 'appliance'      19 — 18 kitchen appliance sets; the exception is vetoed
 *   - 'pantry'          8 (pantry food clutter, pantry shelves, a pantry room)
 *   - 'dishwasher'      1, 'kettle' 1 ("50s CC Tea Kettle")
 *   REJECTED
 *   - 'stove'           4: 2 are heating stoves ("Cottage-Inspired Fireplace
 *                       Stove", "Sims 4 Furniture Stove Set" = a potbelly
 *                       stove); the one real cooker also says "Fridge".
 *   - 'cooking'         8: 3 gameplay mods ("Realistic Cooking Mod" ×2,
 *                       "Srsly's Complete Cooking Overhaul"), a restaurant
 *                       tweak, "Post-Apocalyptic Cooking and Scavenging".
 *                       This was the old rule's worst keyword.
 *   - 'chef'            7: a career, a challenge, a trait, an apron, a shop.
 *   - 'culinary' 1, 'cook' 4 (aprons, restaurants, "Bar Captain Cook").
 *   - 'sink'            3: an outdoor well and bathroom sink clutter.
 *   - 'counter'         2: "Fast Food Counter", "Counter Kissing Animation".
 *   - 'cabinet'         6: curiosities and storage cabinets.
 *   - 'island'         10: "Love Island Challenge", "Island Living".
 *   - 'coffee'         20: a lipstick, a GShade preset, coffee shops, mugs.
 *   - 'blender'         4: a nail set, a scene, two workout blenders.
 *   - 'pot'             8: plant pots. 'spice' 17: pumpkin-spice clothing.
 *   - 'bakery'/'baking' 17: shops, a career, a pose pack.
 *   - 'dish'            2: one of two is food ("9 Homemade Dishes").
 *   - 'oven' 0, 'microwave' 0, 'toaster' 0, 'cupboard' 0, 'countertop' 0,
 *     'cookware' 0, 'range hood' 0.
 *   VETO (beats every word above — kitchen-titled things that are not kitchen
 *   CC). Read off the dry run's ADD list and the kitchen-titled population:
 *   - aprons:     "Apron for Kitchen", "Apron for Kitchen and Bakery",
 *                 "Sims 4 Seasonal and Sayings Kitchen Apron" (CAS clothing)
 *   - toy kitchens: "Sims 4 Toddler Play Kitchen Mod",
 *                 "Petit Chef Kitchen Kid Toddler CC Sims 4"
 *   - "Punk Pitstop Appliances" — a foosball table and a drinks tray for a
 *                 hangout spot, not kitchen appliances.
 *
 *   Rows whose DESCRIPTION says kitchen but whose title does not are stripped
 *   on purpose, including food clutter ("Breakfast Foods", "Soul food") and
 *   cooking gameplay mods. Titles only.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest cannot
 * re-poison the theme), `scripts/retag-kitchen-theme.ts`, and
 * `__tests__/unit/kitchen-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const KITCHEN_THEME = 'kitchen' as const;

/** Whole-word title evidence. One entry per word; `s?` covers the plural. */
export const KITCHEN_TITLE_PATTERN =
  /\b(?:kitchens?|kitchenware|fridges?|refrigerators?|dishwashers?|pantr(?:y|ies)|appliances?|kettles?)\b/i;

/** Title words that mean the kitchen word is not kitchen CC. Beats all evidence. */
export const KITCHEN_VETO_TITLE_PATTERN =
  /\b(?:aprons?|toddlers?|kids?|toys?|play kitchens?|pitstop)\b/i;

export function isKitchenTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return KITCHEN_TITLE_PATTERN.test(title) && !KITCHEN_VETO_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the kitchen element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyKitchenTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== KITCHEN_THEME);
  return isKitchenTitle(title) ? [...without, KITCHEN_THEME] : without;
}
