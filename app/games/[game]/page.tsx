import { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getGameFromSlug, GAME_METADATA } from '../../../lib/gameRoutes';
import HomePageClient from '../../HomePageClient';
import { HomeCollections, HomeCollectionStrip } from '../../HomeCollections';

interface GamePageProps {
  params: Promise<{ game: string }>;
}

// Render per-request instead of SSG: the client tree calls
// useSearchParams(), which makes statically-generated pages emit only
// the Suspense fallback (a spinner) as their prerendered HTML — no
// collection-nav links, no page shell for crawlers. Dynamic rendering
// puts the full shell in the served HTML. The page's mod data is
// client-fetched either way, so SSG was only ever caching the spinner.
export const dynamic = 'force-dynamic';

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: GamePageProps): Promise<Metadata> {
  const { game } = await params;
  const gameName = getGameFromSlug(game);

  if (!gameName) {
    return {
      title: 'MustHaveMods - The Search Engine for Game Mods',
    };
  }

  const meta = GAME_METADATA[game];

  return {
    title: meta?.title || `Best ${gameName} Mods | MustHaveMods`,
    description: meta?.description || `Discover the best ${gameName} mods and custom content on MustHaveMods.`,
    openGraph: {
      title: meta?.title || `Best ${gameName} Mods | MustHaveMods`,
      description: meta?.description || `Discover the best ${gameName} mods and custom content on MustHaveMods.`,
      url: `https://musthavemods.com/games/${game}/`,
    },
    alternates: {
      // Trailing slash matches trailingSlash: true in next.config.js
      canonical: `/games/${game}/`,
    },
  };
}

/**
 * /games/<slug>/ — the launcher (app/HomePageClient.tsx) with the game fixed
 * by the route. Replaced GamePageClient, the pre-launcher UI, on 2026-10-28:
 * the homepage's "Explore" game cards linked here and landed visitors on the
 * old design.
 *
 * The collection blocks are the Sims 4 registry, so they are passed only on
 * the Sims 4 page (the launcher also hides them for any other game).
 */
export default async function GamePage({ params }: GamePageProps) {
  const { game } = await params;
  const gameName = getGameFromSlug(game);

  // Invalid game slug - redirect to homepage
  if (!gameName) {
    redirect('/');
  }

  const isSims4 = game === 'sims-4';

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mhm-dark text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sims-pink mx-auto mb-4"></div>
          <p className="text-slate-400">Loading {gameName} mods...</p>
        </div>
      </div>
    }>
      <HomePageClient
        routeGame={{ slug: game, value: gameName }}
        collectionsSlot={isSims4 ? <HomeCollections /> : undefined}
        collectionStripSlot={isSims4 ? <HomeCollectionStrip /> : undefined}
      />
    </Suspense>
  );
}
