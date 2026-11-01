/**
 * The `piercing` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-11-01, E316)
 * ----------------------------------------------
 * `/games/sims-4/piercings-cc/` is the collection page for CAS piercings:
 * septums, nostril and bridge piercings, lip studs and snake bites, belly
 * bars, ear piercing sets. GSC 10-02 → 10-29 shows a 41-query piercing
 * family ("sims 4 cc piercings" 6 impr, "sims 4 belly piercing" 5, "sims 4
 * navel piercing" 4, "sims 4 lip piercing cc" 3, "sims 4 eyebrow piercing
 * cc" 3 …) at 81 impressions / 0 clicks, position 8–31, and every landing
 * is one of four legacy articles (`/sims-4-piercings/` holds the head terms
 * at position 24–50 with 0 clicks; `/sims-4-belly-piercing/`,
 * `/sims-4-lip-piercings-cc/`, `/sims-4-nose-piercings/` the narrow ones at
 * 8–22). The only browse page in the family is `/games/sims-4/jewelry-cc/`
 * with 1 impression at position 52 — the 439-row jewelry grid buries the
 * 80-odd piercing rows under necklaces and earrings. Those four articles
 * also carry 982 landing sessions / 7d (GA4 10-24 → 10-30: belly 624,
 * piercings 215, nose 86, lip 57), which is the audience this page is for.
 *
 * No writer emitted `piercing` before this file (0 rows on 2026-11-01), so
 * there is no description pollution to strip. It follows the title-only
 * theme pattern (`lib/galleryPoseThemeRules.ts`, `lib/weddingThemeRules.ts`)
 * anyway, so it never acquires one: a blog post's description is shared by
 * every mod scraped from it, and `/sims-4-jewelry-cc/` says "piercing" in
 * its copy. `aiFacetExtractor.ts` cannot emit it either — `piercing` is not
 * in `FACET_VALUES.themes`, and the guard test asserts that stays true.
 *
 * Candidate words measured against the whole catalog (17,132 rows; every
 * hit below is SFW Sims 4) on 2026-11-01, whole-word title hits, then what
 * they turned out to be. Rejected ones are listed so nobody re-proposes
 * them without new numbers:
 *   ACCEPTED
 *   - 'piercing(s)'    80 — 74 `jewelry`, 4 `preset` (lip-piercing presets),
 *                      "Mermaid Piercings" (typed hair), "Lip Piercings"
 *                      (typed tops). 80/80 piercing sets; every row read.
 *   - 'septum'         14 — "Stretched Septum Piercings", "Y2K Flame Septum",
 *                      "Septum N001", "Rana Expanded Septum". 14/14; 9 are
 *                      already 'piercing'.
 *   - 'nose ring(s)'   10 — "November Khaii Nose Ring", "Winx Nose Ring –
 *                      Right", "Toni Nose Rings Set". 10/10, all `jewelry`.
 *   - 'nose stud(s)'    1 — "Spidey Nose Stud".
 *   - 'nose chain(s)'   2 — "Nihil Nose Chains" (one typed, one untyped
 *                      duplicate).
 *   - 'belly ring(s)'   1 — "Body Gems Belly Rings" (620 dl, the single most
 *                      downloaded piercing in the catalog, and it never says
 *                      "piercing").
 *   - 'lip ring(s)'     1 — "New World Statement Lip Ring".
 *   - 'lip stud(s)'     1 — "Lip Stud Piercing Collection" (already covered).
 *   REJECTED
 *   - 'belly button' 5 / 'navel' 1: every row also says "piercing" — no
 *     independent evidence, so no rule.
 *   - 'plug(s)' 10: three `preset` ear presets ("Thinner Ear Plug (EL)
 *     Override"), "Tempo Plug Collection" (gameplay-mod), four untyped rows.
 *     Ear plugs are stretched-lobe jewelry but the word is too mixed.
 *   - 'gauge(s)' 4: "Stacked Ear Gauges" twice (one typed full-body), two
 *     untyped. NULL beats a guess on a 4-row word.
 *   - 'hoop(s)' 34: hoop earrings, plus "Spalding Basketball Hoop & Ball".
 *     Earrings are jewelry-cc, not piercings.
 *   - 'pierced' 3: "Pierced Bikini" (85 dl), "Pierced Nails", one jewelry set.
 *   - 'stud(s)' 2: "Studs Accessory Belt Set", "Emerald Rectangular Studs"
 *     (earrings).
 *   - 'ear cuff(s)' 1: an ear cuff needs no piercing.
 *   - 'labret', 'helix', 'eyebrow ring', 'nipple': 0 rows each.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest tags
 * it from the title), `scripts/retag-piercing-theme.ts`, and
 * `__tests__/unit/piercing-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const PIERCING_THEME = 'piercing' as const;

/** Whole-word title evidence. `s?` covers the plural. */
export const PIERCING_TITLE_PATTERN =
  /\b(?:piercings?|septum|nose (?:rings?|studs?|chains?)|belly rings?|lip (?:rings?|studs?))\b/i;

export function isPiercingTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return PIERCING_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the piercing element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyPiercingTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== PIERCING_THEME);
  return isPiercingTitle(title) ? [...without, PIERCING_THEME] : without;
}
