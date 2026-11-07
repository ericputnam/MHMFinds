/**
 * The `sanrio` theme (Hello Kitty and the other Sanrio characters), derived
 * from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-11-07, E373)
 * ----------------------------------------------
 * `/games/sims-4/hello-kitty-cc/` is the collection page for Hello Kitty /
 * Sanrio CC. GSC 10-07 → 11-04: the legacy article `/sims-4-hello-kitty-cc/`
 * drew 1,230 impressions / 18 clicks at position 7.9 (1.5% CTR — the lowest
 * of any legacy article above 1,000 impressions that window), on queries like
 * "hello kitty sims 4 cc", "sims 4 cc hello kitty", "sims 4 hello kitty cc",
 * "hello kitty cc", "sims 4 sanrio cc". No browse page existed and 0 rows
 * carried a Sanrio tag; the 29 rows are spread over 13 content types (nails,
 * decor, cas-background, full-body, plumbob NULLs …), so no type facet could
 * ever back the page.
 *
 * No writer emitted `sanrio` before this file, so there is no description
 * pollution to strip. It is title-only anyway (CLAUDE.md: every room/theme
 * rule is title-only): 57 rows mention Hello Kitty or Sanrio in a description,
 * mostly the shared description of the blog post they were scraped from; only
 * the titles that name a Sanrio character are evidence. `aiFacetExtractor.ts`
 * cannot emit it either — `sanrio` is not in `FACET_VALUES.themes`, and the
 * guard test asserts that.
 *
 * Candidate words measured against the whole catalog (17,279 rows) on
 * 2026-11-07, title hits, then what they turned out to be:
 *   ACCEPTED (29 rows total, every one read; 0 NSFW, all Sims 4)
 *   - 'hello kitty'   11 — nails, a vanity, a work-desk set, fridge, swimsuit,
 *                     tops, a bag, a mouth accessory, a plumbob.
 *   - 'sanrio'         9 — CAS backgrounds, posters, nails, plushies, jeans,
 *                     bucket hats, "Sanrio Klaws" (nails), a plumbob override.
 *   - 'my melody'      4 — wallpaper, a bag, a plumbob, a phone override.
 *   - 'cinnamoroll'    3 — a CAS mirror background, leg warmers, pajamas.
 *   - 'pompompurin'    1, 'pochacco' 1.
 *   - 'kuromi', 'keroppi', 'badtz-maru', 'hangyodon', 'little twin stars',
 *     'gudetama', 'aggretsuko', 'charmmy kitty' — 0 each today; listed because
 *     they are Sanrio character names with no other meaning.
 *   REJECTED
 *   - bare 'kitty'    19 hits, 8 not Sanrio: "Aggressivekitty Seaside Home
 *                     Collection" (a creator name), "The Gothic Kitty", "Kitty
 *                     Sato", "Kitty Hair", "Toddler Kitty Nails", "Kitty Cat
 *                     Leg Warmers", "Kitty Leg Warmers", "Kitty Kat Dress" —
 *                     cat motifs, not the character.
 *   - bare 'melody'    7 hits, 3 not "My Melody": "Moonlight Melody Tights",
 *                     "Melody Poses", and "Melody #1" (a My Melody plumbob per
 *                     E343, but the title does not say so — NULL beats a guess).
 *   - 'kawaii'        18 hits: an aesthetic, not the brand (Kawaii Space Buns,
 *                     Kawaii Neko Gaming Station, Kawaii Pose Pack …) — 0 of 18
 *                     name a Sanrio character.
 *   No merch exclusion is needed: all 29 are in-game CC (checked source and
 *   download URLs), unlike the plumbob T-shirts in E343.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest tags
 * it from the title), `scripts/retag-sanrio-theme.ts`, and
 * `__tests__/unit/sanrio-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const SANRIO_THEME = 'sanrio' as const;

/** Whole-word title evidence: the brand, or a Sanrio character name. */
export const SANRIO_TITLE_PATTERN =
  /\b(?:hello[\s-]*kitty|sanrio|my[\s-]*melody|kuromi|cinnamoroll|pompompurin|pochacco|keroppi|badtz[\s-]*maru|hangyodon|little[\s-]+twin[\s-]+stars|gudetama|aggretsuko|charmmy[\s-]*kitty)\b/i;

export function isSanrioTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return SANRIO_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the sanrio element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applySanrioTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== SANRIO_THEME);
  return isSanrioTitle(title) ? [...without, SANRIO_THEME] : without;
}
