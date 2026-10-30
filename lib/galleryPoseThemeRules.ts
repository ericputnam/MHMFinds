/**
 * The `gallery-pose` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-10-30, E296)
 * ----------------------------------------------
 * `/games/sims-4/gallery-poses/` is the collection page for CAS / Gallery
 * poses: the pose packs a Sim strikes in Create-A-Sim and on their Gallery
 * card, as opposed to in-game Pose Player packs. GSC 10-02 → 10-29 shows the
 * "gallery poses sims 4" family (≈20 queries: "gallery poses sims 4" 48 impr,
 * "ts4 gallery poses" 26, "sims 4 cas poses for gallery" 25, "the sims 4
 * gallery poses" 20, "gallery pose pack sims 4" 18 …) at ≈227 impressions /
 * 12 clicks, every one landing on the 900-row `/games/sims-4/poses/` page at
 * position 6–9 with a 2–5 % CTR. The legacy article `/sims-4-gallery-poses/`
 * 301s to that page (vercel.json, 2026-07-03); nothing on the site answers
 * the narrower intent.
 *
 * No writer emitted `gallery-pose` before this file (0 rows on 2026-10-30),
 * so there is no description pollution to strip. It follows the title-only
 * theme pattern (`lib/weddingThemeRules.ts`, `lib/bathroomThemeRules.ts`)
 * anyway, so it never acquires one: a blog post's description is shared by
 * every mod scraped from it, and the two source posts (`/sims-4-gallery-poses/`
 * 50 rows, `/sims-4-cas-poses/` 29 rows) both say "gallery" in their copy.
 * `aiFacetExtractor.ts` cannot emit it either — `gallery-pose` is not in
 * `FACET_VALUES.themes`, and the guard test asserts that stays true.
 *
 * Candidate phrases measured against the whole catalog (17,132 rows) on
 * 2026-10-30, whole-word title hits, then what they turned out to be.
 * Rejected ones are listed so nobody re-proposes them without new numbers:
 *   ACCEPTED
 *   - 'gallery pose(s)'       57 — 56 `poses` rows + "Holiday Sims 4 Family
 *                            Gallery Pose" (typed `holidays`, still a gallery
 *                            pose). 57/57 gallery poses.
 *   - 'cas <word>? pose(s)'   ≈28 — "CAS Poses #11", "Sims 4 Male CAS Poses",
 *                            "Sims 4 CAS Smiling Pose", "CAS Horse Poses",
 *                            "Sims 4 CAS Pregnancy Poses". Every one a pose
 *                            set shown in CAS, which is what the Gallery card
 *                            renders.
 *   - 'pose(s) (pack)? for cas' 3 — "Sims 4 Hand Poses for CAS", "Expressive
 *                            Pose Pack for CAS", "Gallery Pose Pack for Female
 *                            Sims" (already 'gallery pose').
 *   - 'create-a-sim pose(s)'  1 — "Female Create-A-Sim Poses".
 *   REJECTED
 *   - bare 'gallery'          58: the 58th is "Autumn Famhouse Gallery" (a lot).
 *   - bare 'cas'             207: CAS backgrounds (107 rows, their own
 *     contentType), 3D CAS rooms, "More Traits in CAS", "More Columns in
 *     CAS", GShade-for-CAS presets, "CAS Handclose Mod" (a hand tweak, not a
 *     pose set). Only the pose phrases are accepted.
 *   - 'in-game pose(s)'        1: "In-Game Poses #2" — the opposite of a
 *     gallery pose.
 *   - 'pose for infants in cas' 1: "No CAS Pillow, Default Stand Still Pose
 *     For Infants In CAS" is a default replacement, not a pose pack. Left on
 *     `poses` only.
 *   - bare 'pose player', 'pose pack' — the whole `poses` facet (902 rows);
 *     that is the parent page, not this one.
 *
 * Imported by `lib/services/contentTypeDetector.ts` (so a future ingest tags
 * it from the title), `scripts/retag-gallery-pose-theme.ts`, and
 * `__tests__/unit/gallery-pose-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const GALLERY_POSE_THEME = 'gallery-pose' as const;

/** Whole-word title evidence. `s?` covers the plural; one optional word may sit between CAS and pose. */
export const GALLERY_POSE_TITLE_PATTERN =
  /\b(?:gallery poses?|cas (?:[a-z0-9]+ )?poses?|poses? (?:packs? )?for cas|create-a-sim poses?)\b/i;

export function isGalleryPoseTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  return GALLERY_POSE_TITLE_PATTERN.test(title);
}

/**
 * Return `themes` with the gallery-pose element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyGalleryPoseTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== GALLERY_POSE_THEME);
  return isGalleryPoseTitle(title) ? [...without, GALLERY_POSE_THEME] : without;
}
