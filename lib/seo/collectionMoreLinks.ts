/**
 * "More in this collection" crawl links for /games/[game]/[topic] (E84,
 * 2026-09-23).
 *
 * A collection page server-renders its first INITIAL_PAGE_SIZE mods and
 * has no pagination, so every mod ranked below that on all 23 collection
 * pages reaches Google only through the sitemap (17,164 submitted, 0
 * reported indexed) or a client-fetched RelatedMods block that is not in
 * the HTML. Sage's GSC read for 2026-09-14→09-20 found 1,607 /mods/ URLs
 * with ≥1 impression out of 16,534 in the catalog.
 *
 * This module holds the two sizes and the href builder so the page, the
 * component and the test share one definition (guard the constant, not a
 * copy of its value).
 */

/** Mods rendered as cards on first paint. */
export const INITIAL_PAGE_SIZE = 48;

/**
 * Plain-text links rendered after the grid for the next slice of the same
 * ordering (downloads desc, newest first). 60 keeps the block a short
 * two-column list and the page under ~120 outbound mod links.
 */
export const MORE_LINKS_COUNT = 60;

export interface ModLink {
  id: string;
  title: string;
}

/**
 * Trailing slash matches `trailingSlash: true` in next.config.js — a bare
 * `/mods/<id>` 308s, and an internal link to a redirect wastes the crawl.
 */
export function modHref(id: string): string {
  return `/mods/${id}/`;
}
