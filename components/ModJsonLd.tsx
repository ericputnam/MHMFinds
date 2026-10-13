'use client';

import { Mod } from '@/lib/api';
import type { CollectionLink } from '@/lib/collections';
import {
  buildBreadcrumbListJsonLd,
  buildModBreadcrumb,
  modCanonicalUrl,
} from '@/lib/seo/modBreadcrumb';
import { modLastmod } from '@/lib/seo/modLastmod';

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
 * `dateModified` for the SoftwareApplication node: exactly the page's sitemap
 * `<lastmod>` (one function, lib/seo/modLastmod.ts — E196 moved the
 * `publishedAt` floor there so the two surfaces cannot drift). Never fed by
 * `updatedAt`; omitted rather than thrown if createdAt is unparseable; never
 * earlier than `datePublished` because `publishedAt` is one of its inputs.
 */
function contentDateModified(mod: Mod): { dateModified?: string } {
  try {
    return {
      dateModified: modLastmod({
        createdAt: mod.createdAt,
        lastScraped: mod.lastScraped,
        publishedAt: mod.publishedAt,
      }),
    };
  } catch {
    return {};
  }
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
    // E143 (2026-09-30): the same honest date as this page's sitemap
    // <lastmod> — max(createdAt, lastScraped), never the Prisma @updatedAt
    // column, which every download-counter write and retag pass bumps.
    ...contentDateModified(mod),
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
