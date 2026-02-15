import { Suspense } from 'react';
import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getGameFromSlug, GAME_METADATA, getAllGameSlugs } from '../../../lib/gameRoutes';
import GamePageClient from './GamePageClient';

interface GamePageProps {
  params: Promise<{ game: string }>;
}

// Generate static params for all known games
export async function generateStaticParams() {
  return getAllGameSlugs().map((game) => ({ game }));
}

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
      url: `https://musthavemods.com/games/${game}`,
    },
    alternates: {
      canonical: `/games/${game}`,
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

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mhm-dark text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sims-pink mx-auto mb-4"></div>
          <p className="text-slate-400">Loading {gameName} mods...</p>
        </div>
      </div>
    }>
      <GamePageClient gameName={gameName} gameSlug={game} />
    </Suspense>
  );
}
