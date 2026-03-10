'use client';

import { Mod } from '@/lib/api';

interface ModJsonLdProps {
  mod: Mod;
}

/**
 * Renders SoftwareApplication + BreadcrumbList JSON-LD structured data
 * for mod detail pages. Improves Google search appearance with rich snippets.
 */
export function ModJsonLd({ mod }: ModJsonLdProps) {
  const modUrl = `https://musthavemods.com/mods/${mod.id}`;
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

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://musthavemods.com',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: mod.category,
        item: `https://musthavemods.com/?category=${encodeURIComponent(mod.category)}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: mod.title,
        item: modUrl,
      },
    ],
  };

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
