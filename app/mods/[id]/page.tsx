import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import type { Mod } from '@/lib/api';
import { ModJsonLd } from '@/components/ModJsonLd';
import { getCollectionLinksForMod } from '@/lib/collections';
import { modMetaDescription, modPageTitle } from '@/lib/seo/modMeta';
import ModDetailClient from './ModDetailClient';

export const revalidate = 3600;

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const mod = await prisma.mod.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      title: true,
      description: true,
      shortDescription: true,
      thumbnail: true,
      gameVersion: true,
      contentType: true,
      category: true,
    },
  });

  if (!mod) {
    return { title: 'Mod not found | MustHaveMods' };
  }

  // Trailing slash matches trailingSlash: true in next.config.js —
  // without it the canonical points at a 308 redirect.
  const url = `https://musthavemods.com/mods/${mod.id}/`;
  // Word-boundary cut inside Google's snippet window; `shortDescription`
  // is a hard 200-char slice on 16,533 of 16,534 rows (E83, 2026-09-23).
  const description = modMetaDescription(mod);

  // Exact-match long-tail title. CC: "<name> - Sims 4 CC | MustHaveMods";
  // gameplay / script mods: "<name> for Sims 4 | MustHaveMods" (their
  // queries are phrased "<name> mod sims 4"). Skipped when the mod title
  // already names the game. Rule lives in lib/seo/modMeta.ts (E83).
  return {
    title: modPageTitle(mod),
    description,
    alternates: { canonical: url },
    openGraph: {
      title: mod.title,
      description,
      url,
      type: 'website',
      images: mod.thumbnail ? [{ url: mod.thumbnail }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: mod.title,
      description,
      images: mod.thumbnail ? [mod.thumbnail] : [],
    },
  };
}

function serializeMod(m: any): Mod {
  return {
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
      ? { id: m.creator.id, handle: m.creator.handle, isVerified: m.creator.isVerified }
      : null,
    _count: {
      reviews: m._count?.reviews ?? 0,
      favorites: m._count?.favorites ?? 0,
      downloads: m._count?.downloads ?? 0,
    },
  };
}

export default async function ModDetailPage({ params }: PageProps) {
  const rawMod = await prisma.mod.findUnique({
    where: { id: params.id },
    include: {
      creator: { select: { id: true, handle: true, isVerified: true } },
      _count: { select: { reviews: true, favorites: true, downloads: true } },
    },
  });

  if (!rawMod) notFound();

  const mod = serializeMod(rawMod);

  // Which /games/sims-4/* collection page(s) list this mod. Resolved here
  // (server) from the static registry so the breadcrumb links and the
  // BreadcrumbList JSON-LD point at the collection page instead of the
  // uncrawlable `/?category=` filter URL, and so the registry's intro
  // copy never enters the client bundle. (E32, 2026-09-10)
  const collections = getCollectionLinksForMod(mod);

  return (
    <>
      <ModJsonLd mod={mod} collections={collections} />
      <ModDetailClient initialMod={mod} collections={collections} />
    </>
  );
}
