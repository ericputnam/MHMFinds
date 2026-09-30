'use client';

/**
 * Client half of /account/favorites/ (Rowan, E140). Renders the user's saved
 * mods with the shared ModGrid. Un-hearting a card here removes the save on
 * the server but keeps the card on screen (heart off) until the next visit,
 * so an accidental click can be undone with a second click.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ModGrid } from '@/components/ModGrid';
import type { Mod } from '@/lib/api';

interface FavoritesClientProps {
  initialMods: Mod[];
  total: number;
}

export default function FavoritesClient({ initialMods, total }: FavoritesClientProps) {
  const [favorites, setFavorites] = useState<string[]>(() => initialMods.map((m) => m.id));

  const handleFavorite = async (modId: string) => {
    const isFavorited = favorites.includes(modId);
    setFavorites((prev) => (isFavorited ? prev.filter((id) => id !== modId) : [...prev, modId]));
    try {
      const response = await fetch(`/api/mods/${modId}/favorite/`, {
        method: isFavorited ? 'DELETE' : 'POST',
      });
      if (!response.ok) throw new Error(String(response.status));
    } catch {
      // Roll the optimistic toggle back.
      setFavorites((prev) => (isFavorited ? [...prev, modId] : prev.filter((id) => id !== modId)));
    }
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow container mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Heart className="h-6 w-6 text-sims-pink" fill="currentColor" />
          <h1 className="text-3xl font-bold text-white">Your favorites</h1>
        </div>

        {initialMods.length === 0 ? (
          <div className="mt-8 bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
            <p className="text-slate-300 mb-4">
              You have not saved any mods yet. Tap the heart on any mod to keep it here.
            </p>
            <Link
              href="/mods/"
              className="inline-block bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold px-6 py-3 rounded-full transition-colors"
            >
              Browse mods
            </Link>
          </div>
        ) : (
          <>
            <p className="text-slate-400 text-sm mb-6">
              {total > initialMods.length
                ? `Your ${initialMods.length} most recent saves of ${total.toLocaleString()}, newest first.`
                : `${total.toLocaleString()} saved ${total === 1 ? 'mod' : 'mods'}, newest first.`}
            </p>
            <ModGrid
              mods={initialMods}
              loading={false}
              error={null}
              onFavorite={handleFavorite}
              favorites={favorites}
              gridColumns={4}
            />
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
