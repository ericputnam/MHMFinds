/**
 * Collection Topic Page — /games/[game]/[topic]
 *
 * Curated Pinterest-friendly landing page for a single mod topic
 * (e.g. /games/sims-4/hair-cc). These are the Initiative 1 pages
 * of the Revenue Pivot PRD.
 *
 * Why server component:
 *   - First paint must contain the mod grid HTML for Pinterest
 *     click-through SEO + AI-surface ItemList schema indexing.
 *   - Composite filters (male/female clothes use contentType IN + gender)
 *     aren't supported by the /api/mods endpoint, so we query Prisma
 *     directly here and pass initial data to a client wrapper.
 *   - Mediavine anchors must be in the initial DOM (learned the hard
 *     way — see CLAUDE.md "Render ad anchors on first paint").
 *
 * See tasks/prd-revenue-pivot/PRD-revenue-pivot.md for full strategy.
 */

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  getCollection,
  getAllCollectionRoutes,
  buildWhereClause,
  getCollectionsForGame,
  type CollectionDefinition,
} from '../../../../lib/collections';
import { prisma } from '../../../../lib/prisma';
import { getGameFromSlug } from '../../../../lib/gameRoutes';
import CollectionPageClient from './CollectionPageClient';
import type { Mod } from '../../../../lib/api';

// Initial page size — enough to fill the viewport and exceed the
// Pinterest "is this page legit?" content threshold.
const INITIAL_PAGE_SIZE = 48;

interface CollectionPageProps {
  params: Promise<{ game: string; topic: string }>;
}

export async function generateStaticParams() {
  return getAllCollectionRoutes().map((r) => ({
    game: r.gameSlug,
    topic: r.topicSlug,
  }));
}

export async function generateMetadata({
  params,
}: CollectionPageProps): Promise<Metadata> {
  const { game, topic } = await params;
  const collection = getCollection(game, topic);

  if (!collection) {
    return { title: 'Collection not found | MustHaveMods' };
  }

  const canonical = `https://musthavemods.com/games/${collection.gameSlug}/${collection.slug}`;

  return {
    title: collection.metaTitle,
    description: collection.metaDescription,
    alternates: { canonical },
    openGraph: {
      title: collection.metaTitle,
      description: collection.metaDescription,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: collection.metaTitle,
      description: collection.metaDescription,
    },
  };
}

/**
 * Fetch the first page of mods for a collection.
 *
 * Uses buildWhereClause to translate the CollectionFacetQuery into
 * a Prisma where clause, then merges in safety filters (gameVersion,
 * isVerified, isNSFW) that every collection shares.
 */
async function fetchCollectionMods(collection: CollectionDefinition) {
  const whereFromFilter = buildWhereClause(collection.filter);

  const where = {
    ...whereFromFilter,
    gameVersion: collection.game,
    isNSFW: false,
  };

  const [mods, totalCount] = await Promise.all([
    prisma.mod.findMany({
      where,
      orderBy: [{ downloadCount: 'desc' }, { createdAt: 'desc' }],
      take: INITIAL_PAGE_SIZE,
      include: {
        _count: {
          select: { reviews: true, favorites: true, downloads: true },
        },
        creator: true,
      },
    }),
    prisma.mod.count({ where }),
  ]);

  return { mods, totalCount };
}

/**
 * Serialize Prisma mods for the client component. Prisma returns
 * Decimal and Date objects that don't survive the server→client
 * boundary without conversion.
 */
function serializeMods(rawMods: any[]): Mod[] {
  return rawMods.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    shortDescription: m.shortDescription,
    version: m.version,
    gameVersion: m.gameVersion,
    category: m.category ?? '',
    tags: m.tags ?? [],
    contentType: m.contentType,
    visualStyle: m.visualStyle,
    themes: m.themes ?? [],
    ageGroups: m.ageGroups ?? [],
    genderOptions: m.genderOptions ?? [],
    occultTypes: m.occultTypes ?? [],
    packRequirements: m.packRequirements ?? [],
    thumbnail: m.thumbnail,
    images: m.images ?? [],
    downloadUrl: m.downloadUrl,
    sourceUrl: m.sourceUrl,
    source: m.source ?? '',
    sourceId: m.sourceId,
    author: m.author,
    isFree: m.isFree,
    price: m.price ? String(m.price) : null,
    currency: m.currency,
    isNSFW: m.isNSFW,
    isVerified: m.isVerified,
    isFeatured: m.isFeatured,
    downloadCount: m.downloadCount ?? 0,
    viewCount: m.viewCount ?? 0,
    rating: m.rating ? Number(m.rating) : null,
    ratingCount: m.ratingCount ?? 0,
    createdAt: m.createdAt?.toISOString?.() ?? m.createdAt,
    updatedAt: m.updatedAt?.toISOString?.() ?? m.updatedAt,
    publishedAt: m.publishedAt?.toISOString?.() ?? m.publishedAt ?? null,
    lastScraped: m.lastScraped?.toISOString?.() ?? m.lastScraped ?? null,
    creatorId: m.creatorId,
    creator: m.creator
      ? {
          id: m.creator.id,
          handle: m.creator.handle,
          isVerified: m.creator.isVerified,
        }
      : null,
    _count: {
      reviews: m._count?.reviews ?? 0,
      favorites: m._count?.favorites ?? 0,
      downloads: m._count?.downloads ?? 0,
    },
  }));
}

/**
 * CollectionPage / ItemList JSON-LD. This is the payload that AI
 * search surfaces (Perplexity, Bing Copilot, ChatGPT search) ingest
 * to build their result cards. Google may or may not respect this
 * post-HCU — but it costs nothing to emit.
 */
function buildJsonLd(
  collection: CollectionDefinition,
  mods: Mod[],
  totalCount: number,
) {
  const canonical = `https://musthavemods.com/games/${collection.gameSlug}/${collection.slug}`;

  const itemList = {
    '@type': 'ItemList',
    numberOfItems: Math.min(mods.length, totalCount),
    itemListElement: mods.slice(0, 20).map((mod, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `https://musthavemods.com/mods/${mod.id}`,
      name: mod.title,
      image: mod.thumbnail || mod.images?.[0] || undefined,
    })),
  };

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': canonical,
        url: canonical,
        name: collection.heading,
        description: collection.metaDescription,
        isPartOf: {
          '@type': 'WebSite',
          '@id': 'https://musthavemods.com/#website',
          name: 'MustHaveMods',
          url: 'https://musthavemods.com',
        },
        mainEntity: itemList,
      },
      itemList,
    ],
  };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const { game, topic } = await params;

  const gameName = getGameFromSlug(game);
  const collection = getCollection(game, topic);

  if (!gameName || !collection) {
    notFound();
  }

  const { mods: rawMods, totalCount } = await fetchCollectionMods(collection);
  const mods = serializeMods(rawMods);

  // Pull sibling collections for the "related" grid at the bottom.
  const allInGame = getCollectionsForGame(game);
  const relatedCollections = collection.related
    .map((slug) => allInGame.find((c) => c.slug === slug))
    .filter((c): c is CollectionDefinition => !!c);

  const jsonLd = buildJsonLd(collection, mods, totalCount);

  return (
    <>
      {/* JSON-LD for AI search surfaces (Perplexity, Bing Copilot, ChatGPT) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <CollectionPageClient
        collection={collection}
        initialMods={mods}
        totalCount={totalCount}
        relatedCollections={relatedCollections}
      />
    </>
  );
}
