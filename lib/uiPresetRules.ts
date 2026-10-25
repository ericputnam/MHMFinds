/**
 * Title rules for the `ui-preset` content type — GShade / ReShade visual
 * presets (Rowan, E272, 2026-10-25).
 *
 * Pure data + functions, no I/O, so a test can import the real constants.
 * Same shape as the title-only room themes (lib/kitchenThemeRules.ts) and
 * `lib/bodyPresetRules.ts`: the detector derives the type from the TITLE
 * alone and never from a description. A blog post's description is shared
 * by every mod scraped from it ("screenshots taken with Nekoswirl's GShade"),
 * so a description rule would tag hair and clothes as presets.
 *
 * WHY a new value: `ui-preset` has been in FACET_VALUES.contentType since the
 * taxonomy was written and had 0 rows on 2026-10-25. The 95 GShade/ReShade
 * presets in the catalog sat in `preset` (90) — the CAS nose/lip/eye preset
 * facet, where "Nekoswirl Gshade Preset" (1,145 downloads) was the #1 row —
 * or had no type at all (5). The keyword detector could never type them:
 * its `preset` rule lists gshade/reshade as *negative* keywords, so a GShade
 * title fell through to `undefined` and the stored value came from the AI
 * facet extractor or the blog-post URL map (`/presets/` → preset).
 *
 * Measured against every SFW Sims 4 title (16,933 rows) on 2026-10-25:
 *   KEPT
 *   - gshade | g-shade | reshade | re-shade   95 titles: 90 preset, 5 NULL,
 *     0 anything else. 95/95 are visual presets by title.
 *   REJECTED (hits / hits that are a visual preset)
 *   - 'shader(s)'       0 Sims 4 titles (the 10 "Shaders" rows are Minecraft,
 *                       typed `shaders`, a different game).
 *   - 'preset(s)'       218 non-GShade titles: 123 CAS presets, 86 body
 *                       presets, 5 skin, 2 NULL, 1 shoes, 1 hair — 0 visual.
 *   - 'lighting mod'    7: 4 gameplay-mod, 2 lighting, 1 hair — in-game /
 *                       CAS lighting overrides, a different class of mod.
 *   - 'cas lighting'    8, same class as above.
 *   - 'lighting'        18, same plus holiday lights and a jewelry set.
 *   - 'overlay'         81, 70 of them skin overlays.
 *   - 'bloom'           15, all clothing / CAS backgrounds.
 *   - 'graphics'        16, 11 are graphic tees.
 *   - 'shade' (bare)    1, "Summer Shade" (a gym set); "Palmshade Villa",
 *                       "Nightshade Anklet", "Slip Shady" are substrings the
 *                       word boundary already excludes.
 *   - 'filter', 'lut', 'cinematic', 'dof', 'no blur'   0–1, nothing visual.
 *
 * `lib/bodyPresetRules.ts` keeps its broader VISUAL_PRESET_RE (adds shader,
 * lighting mod) — that one is a *veto* on the body-preset side, where broad
 * is safe. This file is a *writer* and stays narrow.
 */

export const UI_PRESET_CONTENT_TYPE = 'ui-preset';

/**
 * Whole-word GShade / ReShade, with or without the hyphen creators sometimes
 * write. No plural form is needed and none is listed — `keywordToRegex` is not
 * involved here, and "gshades" (1 GSC query, 0 titles) is not a title form.
 */
export const UI_PRESET_TITLE_PATTERN = /\b(?:g-?shade|re-?shade)\b/i;

/** True iff the title alone names a GShade / ReShade preset. */
export function isUiPresetTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return UI_PRESET_TITLE_PATTERN.test(title);
}

/**
 * The content type a row should carry given its title and current type.
 * - title says GShade/ReShade → `ui-preset`
 * - typed `ui-preset` but the title does not say so → `null` (NULL beats a
 *   wrong tag; a row we cannot place drops out of every facet)
 * - otherwise → unchanged
 */
export function applyUiPresetContentType(current: string | null, title: string | null | undefined): string | null {
  if (isUiPresetTitle(title)) return UI_PRESET_CONTENT_TYPE;
  if (current === UI_PRESET_CONTENT_TYPE) return null;
  return current;
}
