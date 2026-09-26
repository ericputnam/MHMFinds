/**
 * Creator page — /creator/[slug]/  (Nova, E85, 2026-09-23)
 *
 * One public landing page per creator whose mods are already in the
 * catalog, keyed by a normalised author slug (see lib/creators.ts for why
 * the slug and not the raw author string). Server component so the first
 * paint carries the grid + JSON-LD + the Mediavine anchors.
 *
 * Not a collection page (those are lib/collections.ts registry pages,
 * Rowan's): this surface is the creator-hosting lever — a hosted profile
 * with the creator's mods, download totals and their real off-site link.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCreatorPageData, creatorHref, type CreatorPageData } from '../../../lib/creators';
import { getRelatedCreators } from '../../../lib/creatorHubRelated';
import CreatorPageClient from './CreatorPageClient';

// Author strings change with every ingest and there are ~540 eligible
// creators; render per request rather than pre-building the set.
export const dynamic = 'force-dynamic';

interface CreatorPageProps {
  params: Promise<{ slug: string }>;
}

const SITE = 'https://musthavemods.com';

function canonicalFor(slug: string): string {
  return `${SITE}${creatorHref(slug)}`;
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCreatorPageData(slug);
  if (!data) return { title: 'Creator not found | MustHaveMods', robots: { index: false } };

  const title = `${data.displayName} Sims 4 CC & Mods (${data.totalMods}) | MustHaveMods`;
  const description = `${data.totalMods} Sims 4 mods and custom content by ${data.displayName}, ranked by downloads — hair, clothes, furniture, gameplay and more, with download links.`;
  const canonical = canonicalFor(slug);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

function buildJsonLd(data: CreatorPageData) {
  const canonical = canonicalFor(data.slug);
  const itemList = {
    '@type': 'ItemList',
    numberOfItems: Math.min(data.mods.length, data.totalMods),
    itemListElement: data.mods.slice(0, 20).map((mod, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      url: `${SITE}/mods/${mod.id}/`,
      name: mod.title,
      image: mod.thumbnail || mod.images?.[0] || undefined,
    })),
  };
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ProfilePage',
        '@id': canonical,
        url: canonical,
        name: `${data.displayName} — Sims 4 CC & Mods`,
        isPartOf: { '@type': 'WebSite', '@id': `${SITE}/#website`, name: 'MustHaveMods', url: SITE },
        mainEntity: {
          '@type': 'Person',
          name: data.displayName,
          ...(data.profile?.website ? { url: data.profile.website } : {}),
        },
        hasPart: itemList,
      },
      itemList,
    ],
  };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { slug } = await params;
  const data = await getCreatorPageData(slug);
  if (!data) notFound();

  // Peer links (E113): resolved here so they are in the first-paint HTML.
  const related = await getRelatedCreators(data.slug);
  const jsonLd = buildJsonLd(data);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CreatorPageClient data={data} related={related} />
    </>
  );
}
