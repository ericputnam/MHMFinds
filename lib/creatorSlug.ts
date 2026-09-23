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

export function creatorHref(slug: string): string {
  // Trailing slash: next.config.js sets trailingSlash: true, so a bare
  // path 308s (the canonical-trailing-slash guard scans for slashless hrefs).
  return `/creator/${slug}/`;
}
