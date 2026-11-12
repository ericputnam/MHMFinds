/**
 * The `victorian` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-11-11, E393)
 * ----------------------------------------------
 * `/games/sims-4/victorian-cc/` is the browse page for Victorian-era CC:
 * gowns and suit jackets, gothic furniture sets, manors and townhouses,
 * paintings, lace gloves. Nothing in the catalog backed it: no content type,
 * no `FACET_VALUES.themes` entry, no `THEME_KEYWORDS` entry. (`mhmScraper`
 * pushes a `victorian` string into `Mod.tags` from title+description — a
 * different column, never read by a collection filter, and description-fed,
 * so it is the one source this page must not use.)
 *
 * Demand: three legacy articles and no browse page. GSC 2026-10-12 → 11-08:
 * /sims-4-victorian-cc/ 232 impr / 4 clk at position 10.9,
 * /sims-4-victorian-furniture-cc/ 83 / 2 at 10.2, /sims-4-victorian-house/
 * 28 / 1 at 12.6 (343 impressions together). GA4 landing sessions
 * 2026-10-28 → 11-10: 102 + 137 + 34 = 273.
 *
 * Candidate words measured against the whole catalog (17,338 rows) on
 * 2026-11-11, whole-word title match:
 *   ACCEPTED
 *   - 'victorian'     44 titles, every one read: "Modern Victorian Gothic:
 *                    Obsidian Bedroom" (30 dl, the most-downloaded row),
 *                    "Cutie Victorian Loveseat", "Victorian Silk Brocade
 *                    Gown", "Victorian Lace Gloves", 16 houses/manors/lots,
 *                    "Victorian Range", "Functional Victorian Washstand".
 *                    Spread over 17 content types (furniture, dresses,
 *                    residential, lot, decor, hats, nails, makeup, pet
 *                    clothing...), which is why a theme, not a type, backs it.
 *                    No exclusion was needed: even "Victorian Police Station
 *                    Lot" (typed gameplay-mod) and "Victorian Doll Hairstyle"
 *                    (typed decor) are Victorian downloads — the type is wrong,
 *                    not the theme.
 *   REJECTED (measured, not accepted):
 *   - 'regency'       16 — Regency is 1811–1837, a different era and its own
 *                    search ("Lady Rose Regency Gown", "Regency Silk Gloves").
 *   - 'bridgerton'    13 — Regency again (Bridgerton is set in 1813), plus a
 *                    romance gameplay mod. Regency + Bridgerton together are
 *                    ~25 distinct rows: a separate page candidate, not this one.
 *   - 'edwardian'      2 ("Edwardian Dressing Gown") — 1901–1910, too few.
 *   - 'steampunk'      2 — a chest tattoo and a Christmas tree; not an era.
 *   - bare 'era'       9 — "Era Caps 2", "Showgirl Era" (Taylor Swift).
 *   - bare 'gothic' / 'goth' — goth-cc owns it (`goth` theme); only the
 *                    titles that also say Victorian belong here.
 *   - '1800s', '19th century', 'gilded age' — 0 titles each.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest tags
 * it from the title), `scripts/retag-victorian-theme.ts`, and
 * `__tests__/unit/victorian-theme-rules.test.ts`, which imports these
 * constants rather than restating them.
 */

export const VICTORIAN_THEME = 'victorian' as const;

/** Whole-word title evidence. */
export const VICTORIAN_TITLE_PATTERN = /\bvictorian\b/i;

export function isVictorianTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return VICTORIAN_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the victorian element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyVictorianTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== VICTORIAN_THEME);
  return isVictorianTitle(title) ? [...without, VICTORIAN_THEME] : without;
}
