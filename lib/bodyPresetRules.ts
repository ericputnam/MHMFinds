/**
 * Title rules for the `body-preset` content type (Rowan, E256, 2026-10-21).
 *
 * Pure data + functions, no I/O, so a test can import the real constants.
 * The only writer of `body-preset` outside the URL map is the one-off
 * `scripts/backfill-body-preset-content-type.ts`; it imports these.
 *
 * WHY: that backfill's "CAS hint" regex was
 *   /\b(face|nose|eye|lip|chin|jaw|cheek|sim|cas)\s*presets?\b/i
 * so every preset-typed nose or eye preset became `body-preset`. On 2026-10-21
 * 57 of the facet's 150 rows were nose/eye presets, and two of them sat in the
 * /games/sims-4/body-presets/ top 24 ("Female Eye Presets for Sims 4" #18,
 * "Babydoll Nose Preset Mod" #23). Policy since E186/E207: a face preset is
 * `preset`; `body-preset` is bodies.
 *
 * Measured on the whole catalog before writing (titles containing "preset"):
 * FACE_PRESET_TITLE_RE matched 98 titles — 57 body-preset, 36 preset (incl.
 * "Ears Preset 6 HQ", "Butterfly Ears Preset"), 1 NULL (pinned "Female Lips
 * Preset And Makeup"), 4 wrong (tops/skin/skin/decor, all on
 * /sims-4-nose-presets/). 0 of the 98 is a body preset. 11 legacy body-preset
 * rows fail isBodyPresetTitle ("THOR with Veins", "Ivy Preset", "Bodies") —
 * real body presets with no rule word; the rule is a writer gate, not a retag.
 * Rejected: dropping `sim|cas` from the body hint — "100+ Sims 4 CAS Presets"
 * (Zerbu) is a body-shape preset pack and is the only body-preset row that
 * relies on it.
 */

/** Visual (GShade/ReShade) presets are never CAS presets. */
export const VISUAL_PRESET_RE = /\b(gshade|g-shade|reshade|re-shade|shader|lighting mod)\b/i;

/** The title literally says "body preset(s)". */
export const BODY_PRESET_TITLE_RE = /\bbody\s*presets?\b/i;

/** Weaker body hint: "CAS preset(s)" / "Sim preset(s)". Never a face part. */
export const CAS_BODY_PRESET_HINT_RE = /\b(sim|cas)\s*presets?\b/i;

/**
 * A face-part preset (nose, eyes, lips, …). The part word is listed singular
 * and plural because creators write both ("Male Noses Presets", "Lips Preset").
 */
export const FACE_PRESET_TITLE_RE =
  /\b(face|nose|noses|eye|eyes|lip|lips|chin|jaw|cheek|cheeks|ear|ears|brow|brows|eyebrow|eyebrows)\s*presets?\b/i;

/**
 * Should a preset-ish title be typed `body-preset`? `true` only when the title
 * says "body preset", or carries the CAS/Sim hint without naming a face part.
 * A title that says "body preset" wins over a face word ("Body Preset + Nose").
 */
export function isBodyPresetTitle(title: string): boolean {
  if (VISUAL_PRESET_RE.test(title)) return false;
  if (BODY_PRESET_TITLE_RE.test(title)) return true;
  if (FACE_PRESET_TITLE_RE.test(title)) return false;
  return CAS_BODY_PRESET_HINT_RE.test(title);
}
