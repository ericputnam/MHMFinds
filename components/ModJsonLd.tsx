'use client';

import { Mod } from '@/lib/api';
import type { CollectionLink } from '@/lib/collections';
import {
  buildBreadcrumbListJsonLd,
  buildModBreadcrumb,
  modCanonicalUrl,
} from '@/lib/seo/modBreadcrumb';

interface ModJsonLdProps {
  mod: Mod;
  /**
   * Collections this mod belongs to (primary first), resolved server-side
   * by `getCollectionLinksForMod`. Drives the BreadcrumbList so it matches
   * the visible trail in ModDetailClient.
   */
  collections?: CollectionLink[];
}

/**
 * Renders SoftwareApplication + BreadcrumbList JSON-LD structured data
 * for mod detail pages. Improves Google search appearance with rich snippets.
 */
export function ModJsonLd({ mod, collections = [] }: ModJsonLdProps) {
  // Trailing slash: matches the canonical in app/mods/[id]/page.tsx.
  const modUrl = modCanonicalUrl(mod.id);
  const image = mod.thumbnail || mod.images?.[0] || 'https://musthavemods.com/og-image.png';

  const softwareSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: mod.title,
    description: mod.shortDescription || mod.description?.slice(0, 200) || `${mod.title} - ${mod.category} mod for ${mod.gameVersion || 'Sims 4'}`,
    url: modUrl,
    image,
    applicationCategory: 'GameApplication',
    operatingSystem: mod.gameVersion || 'Sims 4',
    author: {
      '@type': 'Person',
      name: mod.creator?.handle || mod.author || 'Unknown Creator',
    },
    offers: {
      '@type': 'Offer',
      price: mod.isFree ? '0' : String(mod.price || '0'),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    ...(typeof mod.rating === 'number' && mod.ratingCount && mod.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: mod.rating.toFixed(1),
            ratingCount: mod.ratingCount,
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
    ...(mod.publishedAt
      ? { datePublished: new Date(mod.publishedAt).toISOString().split('T')[0] }
      : {}),
    ...(mod.updatedAt
      ? { dateModified: new Date(mod.updatedAt).toISOString().split('T')[0] }
      : {}),
  };

  // Home › Sims 4 › <Collection> › <Mod> — same builder as the visible nav.
  const breadcrumbSchema = buildBreadcrumbListJsonLd(
    buildModBreadcrumb({ id: mod.id, title: mod.title, gameVersion: mod.gameVersion }, collections),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
