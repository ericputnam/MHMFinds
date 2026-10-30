/**
 * The `wedding` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-10-30, E289)
 * ----------------------------------------------
 * `/games/sims-4/wedding-cc/` is the collection page for the My Wedding
 * Stories game pack crowd: wedding dresses, veils, suits, rings, venues,
 * arches, cakes and wedding pose packs. GSC 09-29 → 10-27 shows ~170
 * impressions/28d on wedding queries ("sims 4 wedding dress cc", "sims 4
 * wedding cc maxis match", "wedding mods sims 4", ...) at positions 10–40
 * with no page that matches the intent.
 *
 * No writer emitted `wedding` before this file (0 rows on 2026-10-30), so
 * there is no description pollution to strip. It follows the title-only
 * room-theme pattern (`lib/bathroomThemeRules.ts`) anyway, so it never
 * acquires one: a blog post's description is shared by every mod scraped
 * from it, and one "perfect for your sims' wedding day" sentence would tag
 * a whole post. `aiFacetExtractor.ts` cannot emit it either — `wedding` is
 * not in `FACET_VALUES.themes`, and the guard test asserts that stays true.
 *
 * Candidate words measured against the whole SFW Sims 4 catalog (16,997
 * rows) on 2026-10-30, whole-word title hits, then what they turned out to
 * be. Rejected ones are listed so nobody re-proposes them without new numbers:
 *   ACCEPTED
 *   - 'wedding'      92 — every one wedding CC: dresses, veils, suits, rings,
 *                    shoes, arches, cakes, venues, pose packs, plus three
 *                    wedding gameplay mods ("Wedding Disasters Mod",
 *                    "Meaningful Wedding Stories"). 92/92.
 *   - 'bridal'       18 — 17 bridal gowns/sets/jewelry/hair and "Sims 4
 *                    Bridal Shower Event Mod" (a pre-wedding event: kept).
 *   - 'bride'         1 — "Bride Collection Part 1" (shoes, 92 downloads).
 *   - 'bridesmaid'    3 — dresses, shoes, a recolor collection.
 *   - 'engagement ring' 4 of 5 'engagement' hits (see REJECTED).
 *   - 'just married'  1 — "Just Married Mega Pose".
 *   REJECTED
 *   - bare 'engagement' 5: the fifth is "Sims 4 Romantic Engagement" (decor,
 *     unclear what it is). Only the ring phrase is accepted.
 *   - 'veil'        15: "Bias Face Veil" (accessory, 37 dl), "Witch Hat with
 *     Veil & Rose", "Celestial Veil Eyes", "Halloween 2025 – Nocturne Veil
 *     Eye Makeup", "Medieval Veil & Circlet". Every wedding veil already
 *     says wedding.
 *   - 'tuxedo'       3: "KK Tuxedo", "King Formal Tuxedo" are formalwear; the
 *     third already says wedding.
 *   - 'bouquet'      3: 2 already say wedding, "Pose Pack: Grand Bouquet of
 *     Roses" is not a wedding pose.
 *   - 'marriage'     1: "Love and Marriage" (109 dl) is a romance gameplay
 *     overhaul, not wedding CC — NULL beats a guess.
 *   - 'proposal' 1 / 'propose' 1: proposal poses/animations. Adjacent, not
 *     a wedding; left for a future romance page.
 *   - 'honeymoon' 1 ("Honeymoon Yacht", a lot), 'ceremony' 1 (already says
 *     wedding), 'married' bare 1 (= the 'just married' row).
 *   - 'groom' 0, 'brides' 0, 'newlywed' 0, 'elope' 0, 'vow(s)' 0, 'altar' 0
 *     whole-word ('groom' substrings are grooming/"Groomed Brows").
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest tags
 * it from the title), `scripts/retag-wedding-theme.ts`, and
 * `__tests__/unit/wedding-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const WEDDING_THEME = 'wedding' as const;

/** Whole-word title evidence. One entry per word; `s?` covers the plural. */
export const WEDDING_TITLE_PATTERN =
  /\b(?:weddings?|bridal|brides?|bridesmaids?|engagement[- ]rings?|just married)\b/i;

export function isWeddingTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return WEDDING_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the wedding element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyWeddingTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== WEDDING_THEME);
  return isWeddingTitle(title) ? [...without, WEDDING_THEME] : without;
}
