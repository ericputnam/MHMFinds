import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import prisma from '@/lib/prisma';
import type { Mod } from '@/lib/api';
import { ModJsonLd } from '@/components/ModJsonLd';
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
    },
  });

  if (!mod) {
    return { title: 'Mod not found | MustHaveMods' };
  }

  const url = `https://musthavemods.com/mods/${mod.id}`;
  const description =
    mod.shortDescription ||
    mod.description?.slice(0, 160) ||
    `${mod.title} - Sims 4 custom content mod on MustHaveMods.`;

  return {
    title: mod.title,
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

  return (
    <>
      <ModJsonLd mod={mod} />
      <ModDetailClient initialMod={mod} />
    </>
  );
}
