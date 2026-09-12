/**
 * Breadcrumb trail for /mods/[id] — one source of truth for the visible
 * `<nav aria-label="Breadcrumb">` and the BreadcrumbList JSON-LD, so the
 * two can never drift apart (Google requires the markup to reflect the
 * visible trail).
 *
 * Shape: Home › <Game> › <Primary collection> › <Mod title>
 * The collection crumb is omitted when the mod matches no collection.
 *
 * Every `item` URL is absolute with a trailing slash — next.config.js
 * sets `trailingSlash: true`, so a slash-less URL is a 308 and a
 * BreadcrumbList pointing at redirects is worthless. (E32, 2026-09-10)
 */

import type { CollectionLink } from '../collections';
import { getSlugFromGame } from '../gameRoutes';

export const SITE_ORIGIN = 'https://musthavemods.com';

export type BreadcrumbCrumb = {
  name: string;
  /** Absolute URL with trailing slash. */
  item: string;
  /** Relative href for <Link>. */
  href: string;
};

export type ModBreadcrumbInput = {
  id: string;
  title: string;
  gameVersion?: string | null;
};

export function modCanonicalUrl(id: string): string {
  return `${SITE_ORIGIN}/mods/${id}/`;
}

export function buildModBreadcrumb(
  mod: ModBreadcrumbInput,
  collections: CollectionLink[] = [],
): BreadcrumbCrumb[] {
  const crumbs: BreadcrumbCrumb[] = [{ name: 'Home', item: `${SITE_ORIGIN}/`, href: '/' }];

  const game = mod.gameVersion || 'Sims 4';
  const gameSlug = getSlugFromGame(game);
  if (gameSlug) {
    crumbs.push({
      name: game,
      item: `${SITE_ORIGIN}/games/${gameSlug}/`,
      href: `/games/${gameSlug}/`,
    });
  }

  const primary = collections[0];
  if (primary) {
    crumbs.push({
      name: primary.title,
      item: `${SITE_ORIGIN}${primary.href}`,
      href: primary.href,
    });
  }

  crumbs.push({ name: mod.title, item: modCanonicalUrl(mod.id), href: `/mods/${mod.id}/` });
  return crumbs;
}

export function buildBreadcrumbListJsonLd(crumbs: BreadcrumbCrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: c.name,
      item: c.item,
    })),
  };
}
