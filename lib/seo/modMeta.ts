/**
 * Title + meta description for /mods/[id] (E83, 2026-09-23).
 *
 * Two class defects this fixes, both measured on GSC 2026-08-24→09-20:
 *
 * 1. Every mod got the same " - Sims 4 CC" qualifier, including the ~700
 *    gameplay / script mods, whose queries are phrased "<name> mod sims 4"
 *    ("teens stories and activities mod sims 4" 57 impr @ 8.8, 1 click;
 *    "messy relationships mod" 33 @ 9.4, 1 click; "sims 4 love triangle
 *    mod" 18 @ 8.4, 1 click). A gameplay mod is not "CC"; those pages now
 *    read "<name> for Sims 4", matching how the writer titles them herself
 *    ("Messy Relationships Mod for Sims 4").
 * 2. `shortDescription` is a hard 200-character cut on 16,533 of 16,534
 *    mods (p10 = p50 = p90 = 200 chars), so the meta description of every
 *    mod page ended mid-word ("…before going out to avoid ge"). It is now
 *    cut at a word boundary inside Google's ~155-char snippet window.
 *
 * Pure functions, no I/O — `__tests__/unit/mod-meta.test.ts` imports them
 * and `app/mods/[id]/page.tsx` is the only production caller.
 */

export const SITE_NAME = 'MustHaveMods';
export const META_DESCRIPTION_MAX = 155;

/** contentType values the detector assigns to gameplay / script mods. */
export const GAMEPLAY_CONTENT_TYPES: ReadonlySet<string> = new Set([
  'gameplay-mod',
  'script-mod',
]);

/** Legacy `category` values that mean "this is a mod, not CC". */
export const GAMEPLAY_CATEGORIES: ReadonlySet<string> = new Set([
  'Gameplay',
  'Gameplay Mods',
  'Scripts',
  'Script Mod',
  'UI/UX',
]);

export interface ModTitleInput {
  title: string;
  gameVersion?: string | null;
  contentType?: string | null;
  category?: string | null;
}

export interface ModDescriptionInput {
  title: string;
  shortDescription?: string | null;
  description?: string | null;
}

/**
 * A mod is "gameplay" when the detector, the legacy category, or the title
 * itself says so. The title check catches mis-tagged rows such as
 * "Love Triangle Mod for Sims 4" (contentType `accessories`).
 */
export function isGameplayMod(mod: ModTitleInput): boolean {
  if (mod.contentType && GAMEPLAY_CONTENT_TYPES.has(mod.contentType)) return true;
  if (mod.category && GAMEPLAY_CATEGORIES.has(mod.category)) return true;
  return /\bmods?\b/i.test(mod.title);
}

/**
 * "<name> - Sims 4 CC | MustHaveMods" for custom content,
 * "<name> for Sims 4 | MustHaveMods" for gameplay mods,
 * "<name> | MustHaveMods" when the title already names the game.
 */
export function modPageTitle(mod: ModTitleInput): string {
  const game = mod.gameVersion || 'Sims 4';
  const title = mod.title.trim();
  let qualifier: string;
  if (title.toLowerCase().includes(game.toLowerCase())) {
    qualifier = '';
  } else if (isGameplayMod(mod)) {
    qualifier = ` for ${game}`;
  } else if (game === 'Sims 4') {
    qualifier = ' - Sims 4 CC';
  } else {
    qualifier = ` - ${game} Mod`;
  }
  return `${title}${qualifier} | ${SITE_NAME}`;
}

/**
 * Cut `text` to at most `max` characters on a word boundary. Trailing
 * punctuation that would be left dangling ("…, " / "… -") is dropped and
 * an ellipsis is appended only when something was actually removed.
 */
export function truncateAtWord(text: string, max: number = META_DESCRIPTION_MAX): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  // Leave room for the ellipsis so the result never exceeds `max`.
  const budget = max - 1;
  let cut = clean.slice(0, budget);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > budget * 0.5) cut = cut.slice(0, lastSpace);
  cut = cut.replace(/[\s,;:\-–—(]+$/g, '');
  return `${cut}…`;
}

export function modMetaDescription(mod: ModDescriptionInput): string {
  const source = (mod.shortDescription || mod.description || '').trim();
  if (!source) return `${mod.title.trim()} - Sims 4 custom content mod on ${SITE_NAME}.`;
  return truncateAtWord(source, META_DESCRIPTION_MAX);
}
