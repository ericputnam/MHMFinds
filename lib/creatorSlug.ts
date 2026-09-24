/**
 * Pure slug helpers for creator pages (/creator/[slug]/, Nova E85).
 *
 * Kept free of any server import so client components (ModDetailClient)
 * can link to a creator page without pulling Prisma into the bundle. The
 * data loader lives in lib/creators.ts and re-exports these.
 */

/**
 * Normalise an author string to a URL slug. Must stay in lock-step with
 * the SQL expression in lib/creators.ts `findAuthorVariants` (both fold
 * case and collapse every non-alphanumeric run to one dash).
 */
export function authorSlug(author: string): string {
  return author
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * The scraper's author fallback produces strings like
 * "Kobe Sweats 135179830" (a title plus a Patreon post id), "75940181"
 * (a bare id) or "" — none of them is a creator. Reject those slugs so
 * they can never become a page or a link.
 */
export function isJunkAuthorSlug(slug: string): boolean {
  if (slug.length < 3) return true;
  if (/^\d+$/.test(slug)) return true;
  if (/-\d{6,}$/.test(slug)) return true;
  return false;
}

/**
 * Author strings that are platforms, stores or aggregators — not creators —
 * yet clear MIN_MODS_FOR_PAGE on row count alone. Spot-check of the 542
 * hub-eligible slugs on 2026-09-24 (mods / download clicks):
 *   simsfinds 81/747 (simsfinds.com, an aggregator) · amazon 70/168 ·
 *   simfileshare 42/329 (a file host) · curseforge-creator 38/216 (the
 *   scraper's CurseForge fallback) · sims4downloads 5/110 · google 9/8 ·
 *   unknown 9/10.
 * The rest are the same class, listed pre-emptively so the next ingest
 * cannot promote one onto the hub. The /creator/ hub (E97) never lists
 * these. They still get a leaf page and a mod-page author link today —
 * folding this set into isJunkAuthorSlug is a queued E85 follow-up, not
 * part of the hub PR (it would change E85's measured population).
 */
export const NON_CREATOR_SLUGS: ReadonlySet<string> = new Set([
  'simsfinds',
  'amazon',
  'simfileshare',
  'curseforge-creator',
  'curseforge',
  'sims4downloads',
  'google',
  'unknown',
  'patreon',
  'tumblr',
  'the-sims-resource',
  'sims-resource',
  'tsr',
  'mod-the-sims',
  'modthesims',
  'loverslab',
  'lovers-lab',
  'nexusmods',
  'nexus-mods',
  'simsdom',
  'sims-4-studio',
  'mediafire',
  'admin',
]);

export function isNonCreatorSlug(slug: string): boolean {
  return NON_CREATOR_SLUGS.has(slug);
}

export function creatorHref(slug: string): string {
  // Trailing slash: next.config.js sets trailingSlash: true, so a bare
  // path 308s (the canonical-trailing-slash guard scans for slashless hrefs).
  return `/creator/${slug}/`;
}
