import { Suspense } from 'react';
import HomePageClient from './HomePageClient';
import { HomeCollections, homeCollectionLinks } from './HomeCollections';

/**
 * Homepage route entry — a server shell around the client search page.
 *
 * Why this exists (Sage, 2026-09-07, reports/growth/google-collapse-diagnosis.md
 * Fix 1): the homepage was a 'use client' page calling useSearchParams(), so
 * static prerendering emitted only the Suspense fallback — a 20 KB spinner
 * with no <h1>, no links, no sidebar anchor. Googlebot and LLM fetchers
 * scored an empty page; the homepage sat at position ~42 for its own brand.
 *
 * Rendering per-request (same as app/games/[game]/page.tsx) puts the real
 * tree in the served HTML: h1, the collection links below, the empty
 * <aside id="secondary">, and the grid shell. Mod data is still fetched on
 * the client from /api/mods, so this shell costs no DB query and changes
 * nothing about how the page behaves after hydration. Ad anchors are
 * untouched — see __tests__/unit/sidebar-sticky-health.test.ts.
 */
export const dynamic = 'force-dynamic';

function CollectionsJsonLd() {
  const links = homeCollectionLinks();
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    '@id': 'https://musthavemods.com/#collections',
    name: 'Sims 4 CC collections on MustHaveMods',
    description:
      'Curated, filterable Sims 4 custom content collections on MustHaveMods, each a grid of verified mods sorted by downloads.',
    numberOfItems: links.length,
    itemListOrder: 'https://schema.org/ItemListUnordered',
    itemListElement: links.map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: l.heading,
      url: l.url,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <CollectionsJsonLd />
      <Suspense
        fallback={
          <div className="min-h-screen bg-mhm-dark text-slate-200 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sims-pink mx-auto mb-4"></div>
              <p className="text-slate-400">Loading...</p>
            </div>
          </div>
        }
      >
        <HomePageClient collectionsSlot={<HomeCollections />} />
      </Suspense>
    </>
  );
}
