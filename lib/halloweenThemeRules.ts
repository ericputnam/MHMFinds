/**
 * The `halloween` theme, derived from the mod TITLE only.
 *
 * Why this file exists (Rowan, 2026-09-23)
 * ----------------------------------------
 * `Mod.themes` is populated by `extractFromKeywords()` in
 * `lib/services/aiFacetExtractor.ts` with a bare `text.includes(keyword)` over
 * `title + description + tags`, and THEME_KEYWORDS mapped nine words to
 * `halloween` — including 'witch' (which matches s**witch**), 'vampire' and
 * 'ghost'. This repo's scraped `description` is shared by every mod lifted
 * from one blog post, so one "spooky season" sentence tagged a whole post's
 * worth of rows (the failure mode already cleaned out of `lighting` 09-08,
 * `gameplay-mod` 09-10, `jewelry` 09-18, `nails` 09-20, `ageGroups` 09-21).
 *
 * Result on 2026-09-23: 547 SFW Sims 4 rows carried `halloween`; the top two
 * by downloads were "Infatuated Pose Pack" and "Cannibalism", and "Nike Air
 * Force 1s", "Summer Denim Shorts Jamie" and "Vince T-shirt" were in the top 25.
 *
 * So: titles only, whole words only, prefer *no* tag to a guess. Witches and
 * vampires have their own collection pages (`witch-cc`, `vampire-cc`) and are
 * not Halloween by themselves.
 *
 * Rejected candidates (measured against the whole catalog 2026-09-23 — do not
 * re-propose without new numbers):
 *   - 'mummy'   British for "mum" ("Mummy and Me" poses), not the monster.
 *   - 'costume' alone: swim costumes, mascot costumes, cosplay sets.
 *   - 'skull', 'bat', 'spider': goth jewelry, baseball, Spider-Man.
 *   - 'witch', 'vampire', 'werewolf': own occult pages; not seasonal.
 *   - 'pumpkin'  alone: ~30 rows, and the added ones were pumpkin pie / soup /
 *                latte recipes, a Pumpkin Patch lot, "Pumpkin Shoes" — autumn,
 *                not Halloween. Carved pumpkins say jack-o-lantern or halloween.
 *   - 'ghost'    COD "Ghost's Mask", "Ghost Train Restaurant", "Mr Ghost Face
 *                Christmas Set", ghost-occult gameplay mods — ghosts are an
 *                occult type in this game, like vampires.
 *   - 'creepy'   1 added row, a belt ("Creepy Yeha Ulyana Belt").
 *   - 'hallow'   "Hallow Glow GShade Preset" is a pun; not worth a rule.
 *   - 'pumpkin spice': kept as a negative context in case 'pumpkin' returns.
 *
 * Imported by `lib/services/aiFacetExtractor.ts` (so a future facet run cannot
 * re-poison the theme), `scripts/retag-halloween-theme.ts`, and
 * `__tests__/unit/halloween-theme-rules.test.ts` — the test imports these
 * constants rather than restating them.
 */

export const HALLOWEEN_THEME = 'halloween' as const;

/** Whole-word title evidence for the halloween theme. */
export const HALLOWEEN_TITLE_PATTERN =
  /\b(?:hallowe'?en|halloweens|spooky|spookiest|simblreen|jack[- ]?o[- ]?lanterns?|trick[- ]or[- ]treat(?:ing|ers?)?|haunted|fright|skeletons?|zombies?|horror|frankenstein|candy[- ]corn|samhain|all[- ]hallows)\b/i;

/** Title contexts that look Halloween-ish but are not. */
export const HALLOWEEN_NEGATIVE_TITLE_PATTERN = /\bpumpkin[- ]spice\b/i;

export function isHalloweenTitle(title: string | null | undefined): boolean {
  if (!title) return false;
  if (!HALLOWEEN_TITLE_PATTERN.test(title)) return false;
  // A negative only vetoes when it is the sole evidence: "Pumpkin Spice
  // Halloween Set" still says halloween.
  if (HALLOWEEN_NEGATIVE_TITLE_PATTERN.test(title)) {
    const stripped = title.replace(new RegExp(HALLOWEEN_NEGATIVE_TITLE_PATTERN.source, 'gi'), ' ');
    return HALLOWEEN_TITLE_PATTERN.test(stripped);
  }
  return true;
}

/**
 * Return `themes` with the halloween element set iff the title supports it.
 * Every other theme on the row is preserved verbatim and in order.
 */
export function applyHalloweenTheme(themes: readonly string[], title: string | null | undefined): string[] {
  const without = themes.filter((t) => t !== HALLOWEEN_THEME);
  return isHalloweenTitle(title) ? [...without, HALLOWEEN_THEME] : without;
}
