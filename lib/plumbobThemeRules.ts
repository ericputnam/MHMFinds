/**
 * The `plumbob` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-11-05, E343)
 * ----------------------------------------------
 * `/games/sims-4/plumbob-overrides/` is the collection page for plumbob
 * overrides and recolors: replacements for the diamond over a Sim's head
 * (and the spinning one on the loading screen). GSC 10-06 → 11-02 shows the
 * "plumbob override / replacement" family (35 queries: "plumbob override sims
 * 4" 70 impr, "sims 4 plumbob override" 63, "plumbob replacement sims 4" 46,
 * "sims 4 plumbob replacement" 26, "star plumbob" 11, "2d plumbob" 11 …) at
 * ≈310 impressions / 15 clicks. 295 of those impressions land on the legacy
 * article `/sims-4-plumbob-replacements/` at position 9.1 (5.4% CTR); the rest
 * land on single mod pages. No browse page existed and 0 rows carried a
 * plumbob tag (most of these rows are contentType NULL).
 *
 * No writer emitted `plumbob` before this file, so there is no description
 * pollution to strip. It follows the title-only theme pattern
 * (`lib/galleryPoseThemeRules.ts`, `lib/piercingThemeRules.ts`) anyway, so it
 * never acquires one: the source article's description says "plumbob" and is
 * shared by every mod scraped from it — which includes "Paint Palette" and
 * "Melody #1", whose titles do not say plumbob and are therefore left off
 * (NULL beats a guess). `aiFacetExtractor.ts` cannot emit it either —
 * `plumbob` is not in `FACET_VALUES.themes`, and the guard test asserts that.
 *
 * Candidate words measured against the whole catalog (17,225 rows) on
 * 2026-11-05, whole-word title hits, then what they turned out to be:
 *   ACCEPTED
 *   - 'plumbob(s)'            31 — 26 overrides / recolors / replacements
 *                            (including two loading screens that ship a
 *                            plumbob override, "Cozy Winter Pt.2" and "Cozy
 *                            Empty Room"), and 5 that are not — see below.
 *   REJECTED (excluded when they appear with 'plumbob')
 *   - 't-shirt' / 'shirt'      2: "Ripple Junction Official Sims Plumbob
 *                            T-shirt", "Sims Plumbob T-Shirt" — real-world
 *                            merch from gift guides.
 *   - 'notebook', 'acrylic', 'desk' 2: "Sims Plumbob Notebook", "The Sims
 *                            Plumbob Acrylic Block for Desk" — gift-guide merch.
 *   - 'counter'                1: "Hungry Plumbobs Fast Food Counter" — a
 *                            restaurant counter named after plumbobs.
 *   - 'overhead'               1 (already 'plumbob'): adds nothing.
 *   - 'plumb bob' / 'plumbbob' / 'diamond … override' 0 each.
 *   Merch words not seen today but obviously the same class (mug, hoodie,
 *   plush, keychain, sticker, poster, lamp) are excluded pre-emptively; each
 *   matches 0 plumbob titles on 2026-11-05.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest tags
 * it from the title), `scripts/retag-plumbob-theme.ts`, and
 * `__tests__/unit/plumbob-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const PLUMBOB_THEME = 'plumbob' as const;

/** Whole-word title evidence. `s?` covers the plural. */
export const PLUMBOB_TITLE_PATTERN = /\bplumbobs?\b/i;

/** Real-world merch and furniture that is merely named after the plumbob. */
export const PLUMBOB_TITLE_EXCLUDE_PATTERN =
  /\b(?:t-?shirts?|shirts?|notebooks?|acrylic|desk|counters?|mugs?|hoodies?|plush(?:ies?)?|keychains?|stickers?|posters?|lamps?)\b/i;

export function isPlumbobTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return PLUMBOB_TITLE_PATTERN.test(title) && !PLUMBOB_TITLE_EXCLUDE_PATTERN.test(title);
}

/**
 * Return `themes` with the plumbob element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyPlumbobTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== PLUMBOB_THEME);
  return isPlumbobTitle(title) ? [...without, PLUMBOB_THEME] : without;
}
