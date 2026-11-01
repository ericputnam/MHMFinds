import type { Metadata } from 'next';

import type { CollectionDefinition } from '../collections';
import { collectionCovers } from '../collectionCovers';
import { buildBreadcrumbListJsonLd, SITE_ORIGIN, type BreadcrumbCrumb } from './modBreadcrumb';

/**
 * <head> metadata for a collection page (app/games/[game]/[topic]/page.tsx).
 *
 * Lives in lib so a test can call it for every registry entry without
 * importing the page module (which pulls prisma).
 *
 * og:image / twitter:image (E298, Pip, 2026-10-30): until this helper, every
 * collection page shipped og:title, og:description and
 * twitter:card=summary_large_image with NO image, so a collection URL shared
 * on Tumblr, Reddit, Discord, X or saved to Pinterest from its URL rendered
 * as a text-only card. The first cover from lib/collectionCovers.ts (one https
 * cover per registry slug is enforced by __tests__/unit/collection-covers.test.ts)
 * is the preview image. Shared-link sessions landing on /games/sims-4/*
 * (referral + organic social, excluding our own `Pinterest` pins) were 330
 * in the 14 d before this shipped (GA4 2026-10-15 → 10-28).
 */
export function collectionCanonical(collection: Pick<CollectionDefinition, 'gameSlug' | 'slug'>): string {
  // Trailing slash required: next.config.js sets trailingSlash: true,
  // so the non-slash variant 308-redirects. A canonical pointing at a
  // redirect splits indexing signals (caused "Crawled - currently not
  // indexed" on /games/sims-4/pregnancy-mods/, found Jul 2026).
  return `https://musthavemods.com/games/${collection.gameSlug}/${collection.slug}/`;
}

export function collectionOgImage(collection: Pick<CollectionDefinition, 'slug'>): string | null {
  const first = collectionCovers(collection.slug)[0];
  return first && first.startsWith('https://') ? first : null;
}

/**
 * The visible crumb trail of a collection page, in order
 * (CollectionPageClient: Home → {collection.game} → {collection.title}).
 *
 * E312 (Sage, 2026-11-01): every /mods/[id] page has emitted a BreadcrumbList
 * since E171, but the 35 hubs only emitted CollectionPage + ItemList, so the
 * trail Google shows under a hub result was whatever it inferred from the
 * URL. The JSON-LD must mirror the rendered <nav class="crumbs"> exactly —
 * __tests__/unit/collection-breadcrumb-jsonld.test.ts checks every registry
 * entry against the client markup.
 */
export function collectionBreadcrumbs(
  collection: Pick<CollectionDefinition, 'game' | 'gameSlug' | 'slug' | 'title'>,
): BreadcrumbCrumb[] {
  const gamePath = `/games/${collection.gameSlug}/`;
  return [
    { name: 'Home', href: '/', item: `${SITE_ORIGIN}/` },
    { name: collection.game, href: gamePath, item: `${SITE_ORIGIN}${gamePath}` },
    {
      name: collection.title,
      href: `${gamePath}${collection.slug}/`,
      item: collectionCanonical(collection),
    },
  ];
}

/** BreadcrumbList node for a collection page's JSON-LD @graph. */
export function collectionBreadcrumbJsonLd(
  collection: Pick<CollectionDefinition, 'game' | 'gameSlug' | 'slug' | 'title'>,
) {
  // Drop the per-node @context: this node is embedded in the page's @graph,
  // which already carries it.
  const { '@type': type, itemListElement } = buildBreadcrumbListJsonLd(collectionBreadcrumbs(collection));
  return { '@type': type, itemListElement };
}

export function collectionMetadata(collection: CollectionDefinition): Metadata {
  const canonical = collectionCanonical(collection);
  const image = collectionOgImage(collection);

  return {
    title: collection.metaTitle,
    description: collection.metaDescription,
    alternates: {
      canonical,
      // Per-collection RSS of the newest mods (E42) — feed readers and answer
      // engines discover it from this <link rel="alternate">.
      types: {
        'application/rss+xml': `https://musthavemods.com/feeds/${collection.gameSlug}/${collection.slug}/`,
      },
    },
    openGraph: {
      title: collection.metaTitle,
      description: collection.metaDescription,
      url: canonical,
      type: 'website',
      images: image ? [{ url: image, alt: collection.heading }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: collection.metaTitle,
      description: collection.metaDescription,
      images: image ? [image] : [],
    },
  };
}
