'use client';

/**
 * CollectionPageClient — interactive shell for a collection topic.
 *
 * Receives pre-fetched mods from the server component so the first
 * paint already has the grid + schema. Handles:
 *   - Favorites toggle (optimistic, with rollback)
 *   - Mod detail modal
 *   - Breadcrumb nav
 *   - Mediavine sidebar + in-content ad anchors
 *   - Related collections grid
 *
 * Layout mirrors /mods/[id] for Mediavine re-targeting parity:
 * container width, main + aside split, sticky sidebar placeholders.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { Navbar } from '../../../../components/Navbar';
import { Footer } from '../../../../components/Footer';
import { ModGrid } from '../../../../components/ModGrid';
import { ModDetailsModal } from '../../../../components/ModDetailsModal';
import { Mod } from '../../../../lib/api';
import type { CollectionDefinition } from '../../../../lib/collections';

interface CollectionPageClientProps {
  collection: CollectionDefinition;
  initialMods: Mod[];
  totalCount: number;
  relatedCollections: CollectionDefinition[];
}

export default function CollectionPageClient({
  collection,
  initialMods,
  totalCount,
  relatedCollections,
}: CollectionPageClientProps) {
  const [mods] = useState<Mod[]>(initialMods);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [selectedMod, setSelectedMod] = useState<Mod | null>(null);

  const handleModClick = (mod: Mod) => setSelectedMod(mod);

  const handleFavorite = async (modId: string) => {
    const isFavorited = favorites.includes(modId);

    // Optimistic toggle
    setFavorites((prev) =>
      isFavorited ? prev.filter((id) => id !== modId) : [...prev, modId],
    );

    try {
      const response = await fetch(`/api/mods/${modId}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        // Rollback
        setFavorites((prev) =>
          isFavorited ? [...prev, modId] : prev.filter((id) => id !== modId),
        );
        if (response.status === 401) {
          alert('Please sign in to favorite mods');
        }
      }
    } catch {
      setFavorites((prev) =>
        isFavorited ? [...prev, modId] : prev.filter((id) => id !== modId),
      );
    }
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans selection:bg-sims-pink/30 selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 pt-6">
          <nav
            className="flex items-center gap-2 text-sm text-slate-400"
            aria-label="Breadcrumb"
          >
            <Link
              href="/"
              className="flex items-center gap-1 hover:text-sims-pink transition-colors"
            >
              <Home size={14} />
              <span>Home</span>
            </Link>
            <ChevronRight size={14} className="text-slate-600" />
            <Link
              href={`/games/${collection.gameSlug}`}
              className="hover:text-sims-pink transition-colors"
            >
              {collection.game}
            </Link>
            <ChevronRight size={14} className="text-slate-600" />
            <span className="text-white font-medium truncate">
              {collection.title}
            </span>
          </nav>
        </div>

        {/* Hero / intro */}
        <header className="container mx-auto px-4 pt-6 pb-8">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
              {collection.heading}
            </h1>
            <p className="text-lg text-slate-400 mb-6">{collection.tagline}</p>

            <div className="prose prose-invert prose-slate max-w-none text-slate-300 leading-relaxed">
              {/* Split the intro into paragraphs so humanizer-generated
                  copy renders cleanly in Phase 2 */}
              {collection.intro.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>

            {collection.blogUrl && (
              <p className="mt-4 text-sm text-slate-500">
                Related reading:{' '}
                <a
                  href={collection.blogUrl}
                  className="text-sims-pink hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Full article on the blog →
                </a>
              </p>
            )}
          </div>
        </header>

        {/* Main + Sidebar layout — mirrors /mods/[id] so Mediavine
            re-targeting reuses the same sidebar shape */}
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main column: grid + results header */}
            <div className="lg:col-span-3 min-w-0">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="text-slate-400 text-sm">
                  <span className="text-white font-medium">
                    {totalCount.toLocaleString()}
                  </span>{' '}
                  {totalCount === 1 ? 'mod' : 'mods'} in this collection
                </div>
              </div>

              <ModGrid
                mods={mods}
                loading={false}
                error={null}
                onFavorite={handleFavorite}
                onModClick={handleModClick}
                favorites={favorites}
                gridColumns={3}
              />

              {/* Related collections — internal linking for SEO +
                  scroll depth */}
              {relatedCollections.length > 0 && (
                <section className="mt-16 pt-8 border-t border-white/10">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    Related Collections
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {relatedCollections.map((rel) => (
                      <Link
                        key={rel.slug}
                        href={`/games/${rel.gameSlug}/${rel.slug}`}
                        className="group block p-5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sims-pink/40 rounded-2xl transition-all"
                      >
                        <h3 className="text-lg font-semibold text-white group-hover:text-sims-pink transition-colors mb-1">
                          {rel.title}
                        </h3>
                        <p className="text-sm text-slate-400">{rel.tagline}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* Sidebar column: Mediavine ad anchors.
                MUST NOT add position:sticky/fixed — Mediavine Script
                Wrapper handles stickiness itself. Keep overflow:visible
                and use <aside id="secondary"> so Mediavine auto-detects.
                See CLAUDE.md "Mediavine Sidebar Sticky Rules". */}
            <aside
              id="secondary"
              className="widget-area primary-sidebar hidden lg:block overflow-visible"
              role="complementary"
              aria-label="Sidebar ads"
            >
              {/* Empty — Mediavine auto-fills with its own stacked ad containers.
                  Matches WordPress blog sidebar pattern for better Mediavine detection. */}
            </aside>
          </div>
        </div>
      </main>

      <Footer />

      {selectedMod && (
        <ModDetailsModal
          mod={selectedMod}
          onClose={() => setSelectedMod(null)}
        />
      )}
    </div>
  );
}
