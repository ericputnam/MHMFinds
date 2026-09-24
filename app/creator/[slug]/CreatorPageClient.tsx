'use client';

/**
 * CreatorPageClient — interactive shell for /creator/[slug]/.
 *
 * Layout mirrors the collection page (and therefore /mods/[id]) so the
 * Mediavine sidebar shape is identical: container, 3+1 grid, an empty
 * <aside id="secondary"> that Mediavine fills itself. Registered in
 * __tests__/unit/sidebar-sticky-health.test.ts PAGES_WITH_SIDEBAR.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Home, ExternalLink, BadgeCheck } from 'lucide-react';
import { Navbar } from '../../../components/Navbar';
import { Footer } from '../../../components/Footer';
import { ModGrid } from '../../../components/ModGrid';
import { NewsletterSignup } from '../../../components/NewsletterSignup';
import type { Mod } from '../../../lib/api';
import type { CreatorPageData } from '../../../lib/creators';

interface CreatorPageClientProps {
  data: CreatorPageData;
}

export default function CreatorPageClient({ data }: CreatorPageClientProps) {
  const [mods] = useState<Mod[]>(data.mods);
  const [favorites, setFavorites] = useState<string[]>([]);

  const handleFavorite = async (modId: string) => {
    const isFavorited = favorites.includes(modId);
    setFavorites((prev) =>
      isFavorited ? prev.filter((id) => id !== modId) : [...prev, modId],
    );
    try {
      const response = await fetch(`/api/mods/${modId}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setFavorites((prev) =>
          isFavorited ? [...prev, modId] : prev.filter((id) => id !== modId),
        );
        if (response.status === 401) alert('Please sign in to favorite mods');
      }
    } catch {
      setFavorites((prev) =>
        isFavorited ? [...prev, modId] : prev.filter((id) => id !== modId),
      );
    }
  };

  const website = data.profile?.website ?? null;
  let websiteHost: string | null = null;
  if (website) {
    try {
      websiteHost = new URL(website).hostname.replace(/^www\./, '');
    } catch {
      websiteHost = null;
    }
  }

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans selection:bg-sims-pink/30 selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* Breadcrumbs */}
        <div className="container mx-auto px-4 pt-6">
          <nav className="flex items-center gap-2 text-sm text-slate-400" aria-label="Breadcrumb">
            <Link href="/" className="flex items-center gap-1 hover:text-sims-pink transition-colors">
              <Home size={14} />
              <span>Home</span>
            </Link>
            <ChevronRight size={14} className="text-slate-600" />
            <Link href="/creator/" className="hover:text-sims-pink transition-colors">
              Creators
            </Link>
            <ChevronRight size={14} className="text-slate-600" />
            <span className="text-white font-medium truncate">{data.displayName}</span>
          </nav>
        </div>

        {/* Hero */}
        <header className="container mx-auto px-4 pt-6 pb-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-sims-pink mb-2">
              Creator
            </p>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight flex items-center gap-3">
              {data.displayName}
              {data.profile?.isVerified && (
                <BadgeCheck size={28} className="text-sims-blue" aria-label="Verified creator" />
              )}
            </h1>
            <p className="text-lg text-slate-400 mb-4">
              {data.totalMods.toLocaleString()} Sims 4 {data.totalMods === 1 ? 'mod' : 'mods'} ·{' '}
              {data.totalDownloads.toLocaleString()} downloads on MustHaveMods
            </p>
            {data.profile?.bio && (
              <p className="text-slate-300 leading-relaxed mb-4">{data.profile.bio}</p>
            )}
            {website && websiteHost && (
              <p className="text-sm text-slate-400">
                Find {data.displayName} at{' '}
                <a
                  href={website}
                  className="text-sims-pink hover:underline inline-flex items-center gap-1"
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                >
                  {websiteHost}
                  <ExternalLink size={12} />
                </a>
              </p>
            )}
            <p className="mt-4 text-sm text-slate-500">
              Are you {data.displayName}?{' '}
              <Link href="/submit-mod/" className="text-sims-pink hover:underline">
                Claim this page and submit new mods →
              </Link>
            </p>
          </div>
        </header>

        {/* Main + Sidebar layout — mirrors /games/[game]/[topic] and /mods/[id] */}
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 min-w-0">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="text-slate-400 text-sm">
                  Showing{' '}
                  <span className="text-white font-medium">{mods.length}</span> of{' '}
                  <span className="text-white font-medium">{data.totalMods.toLocaleString()}</span>{' '}
                  mods by {data.displayName}, most downloaded first
                </div>
              </div>

              <ModGrid
                mods={mods}
                loading={false}
                error={null}
                onFavorite={handleFavorite}
                favorites={favorites}
                gridColumns={3}
              />

              {/* Email capture — sibling of the grid, never inside or adjacent
                  to the <aside id="secondary"> ad anchor. source="creator-page"
                  so the scoreboard can attribute adds to this surface. */}
              <div className="mt-12 pt-8 border-t border-white/10">
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-widest text-sims-pink mb-2">
                    Weekly finds
                  </p>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">
                    New mods from creators like {data.displayName}, every week
                  </h2>
                  <p className="text-sm text-slate-400 mb-5">
                    The best new Sims 4 CC drops delivered to your inbox — no spam, unsubscribe anytime.
                  </p>
                  <NewsletterSignup source="creator-page" />
                </div>
              </div>
            </div>

            {/* Sidebar column: Mediavine ad anchor.
                MUST NOT add position:sticky/fixed — Mediavine Script
                Wrapper handles stickiness itself. Keep overflow:visible
                and use <aside id="secondary"> so Mediavine auto-detects. */}
            <aside
              id="secondary"
              className="widget-area primary-sidebar hidden lg:block overflow-visible"
              role="complementary"
              aria-label="Sidebar ads"
            >
              {/* Empty — Mediavine auto-fills with its own stacked ad containers. */}
            </aside>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
