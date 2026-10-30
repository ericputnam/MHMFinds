import type { Metadata } from 'next';

import type { CollectionDefinition } from '../collections';
import { collectionCovers } from '../collectionCovers';

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
