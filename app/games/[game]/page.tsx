import { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getGameFromSlug, GAME_METADATA } from '../../../lib/gameRoutes';
import { getCollectionsForGame } from '../../../lib/collections';
import GamePageClient from './GamePageClient';

interface GamePageProps {
  params: Promise<{ game: string }>;
}

// Render per-request instead of SSG: GamePageClient calls
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

export default async function GamePage({ params }: GamePageProps) {
  const { game } = await params;
  const gameName = getGameFromSlug(game);

  // Invalid game slug - redirect to homepage
  if (!gameName) {
    redirect('/');
  }

  // Collection nav chips — pass only what the strip renders so the
  // editorial intros in lib/collections.ts stay out of the client
  // bundle. Empty for games without collections (section hidden).
  const collections = getCollectionsForGame(game).map((c) => ({
    slug: c.slug,
    heading: c.heading,
  }));

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mhm-dark text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sims-pink mx-auto mb-4"></div>
          <p className="text-slate-400">Loading {gameName} mods...</p>
        </div>
      </div>
    }>
      <GamePageClient gameName={gameName} gameSlug={game} collections={collections} />
    </Suspense>
  );
}
