'use client';

/**
 * Homepage client shell. Was app/page.tsx until 2026-09-07 (Sage, homepage
 * SSR shell): the route entry is now the server component app/page.tsx,
 * which renders per-request so this tree — h1, collection links, the ad
 * sidebar, the .mv-ads grid — is in the served HTML instead of the
 * useSearchParams() Suspense fallback (a spinner). Mods are client-fetched
 * from /api/mods.
 *
 * 2026-10-20: "Launcher" layout (components/launcher/). Slim sticky header
 * with search + a sliding game switcher, an email strip, then one row of
 * [toolbar + grid + below-grid discovery] beside the ad sidebar. The game
 * accent colour follows the selected game via data-game on the root.
 *
 * Ad-anchor rules (see __tests__/unit/sidebar-sticky-health.test.ts): the
 * Mediavine sidebar aside stays empty, in normal flow, visible at lg:, and
 * is never wrapped in a loading guard. The grid's .mv-ads container lives in
 * components/launcher/LauncherGrid.tsx and renders in every state.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { HomeCapture } from '../components/HomeCapture';
import { Mod } from '../lib/api';
import { useSearchTracking } from '../lib/hooks/useAnalytics';
import { useAffiliateOffers } from '../lib/hooks/useAffiliateOffers';
import '../components/launcher/launcher.css';
import { lxFontVars } from '../components/launcher/fonts';
import { gameFor } from '../components/launcher/games';
import { GameSwitch } from '../components/launcher/GameSwitch';
import { LauncherHeader } from '../components/launcher/LauncherHeader';
import { LauncherHero } from '../components/launcher/LauncherHero';
import { LauncherFooter } from '../components/launcher/LauncherFooter';
import { LauncherToolbar } from '../components/launcher/LauncherToolbar';
import { LauncherGrid } from '../components/launcher/LauncherGrid';
import { LauncherPager } from '../components/launcher/LauncherPager';
import { LauncherBelow } from '../components/launcher/LauncherBelow';
import { useFacetOptions, useGameCounts } from '../components/launcher/useLauncherData';

interface HomePageClientProps {
  /**
   * Server-rendered "browse by collection" block (app/HomeCollections.tsx).
   * Passed in as a node so the registry copy in lib/collections.ts stays out
   * of the client bundle and the links are in the HTML on first byte.
   */
  collectionsSlot?: React.ReactNode;
  /** Server-rendered collection shortcuts for the hero (same file, same reason). */
  collectionStripSlot?: React.ReactNode;
}

// Default 16 (was 20): the whole grid is one .mv-ads container, and a 5-row
// default pushed several Content-unit ad injections below the fold — see
// reports/viewability-investigation-2026-08-16.md before changing this.
const MODS_PER_PAGE = 16;

function scrollToResults() {
  document.getElementById('lx-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function HomePageClient({ collectionsSlot, collectionStripSlot }: HomePageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Read initial state from URL parameters
  const creatorParam = searchParams.get('creator');
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All';
  const initialGameVersion = searchParams.get('gameVersion') || '';
  const initialSort = searchParams.get('sort') || 'downloads';
  const initialContentType = searchParams.get('contentType') || '';
  const initialVisualStyle = searchParams.get('visualStyle') || '';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedGameVersion, setSelectedGameVersion] = useState(initialGameVersion);
  const [sortBy, setSortBy] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(Number.isFinite(initialPage) && initialPage > 0 ? initialPage : 1);
  const [contentType, setContentType] = useState(initialContentType);
  const [visualStyle, setVisualStyle] = useState(initialVisualStyle);
  const [favorites, setFavorites] = useState<string[]>([]);

  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{ total: number; totalPages: number } | null>(null);

  const { types, styles } = useFacetOptions();
  const gameCounts = useGameCounts();

  // Analytics tracking hooks (usePageTracking is now global in providers.tsx)
  const { trackSearch } = useSearchTracking();

  // Affiliate offers for grid injection - refreshKey triggers refetch on page/filter changes
  const { offers: affiliateOffers } = useAffiliateOffers({
    limit: 4,
    source: 'grid',
    refreshKey: `${currentPage}-${searchQuery}-${selectedCategory}-${selectedGameVersion}-${contentType}-${visualStyle}`,
  });

  /**
   * Build URL with current filter state. Only non-default values are kept.
   */
  const buildUrlParams = useCallback(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
    if (selectedGameVersion) params.set('gameVersion', selectedGameVersion);
    if (sortBy && sortBy !== 'downloads') params.set('sort', sortBy);
    if (contentType) params.set('contentType', contentType);
    if (visualStyle) params.set('visualStyle', visualStyle);
    if (creatorParam) params.set('creator', creatorParam);
    return params;
  }, [currentPage, searchQuery, selectedCategory, selectedGameVersion, sortBy, contentType, visualStyle, creatorParam]);

  /**
   * Update browser URL without navigation
   * Uses replace to avoid cluttering browser history
   */
  const updateBrowserUrl = useCallback((params: URLSearchParams) => {
    const queryString = params.toString();
    const newUrl = queryString ? `/?${queryString}` : '/';
    router.replace(newUrl, { scroll: false });
  }, [router]);

  /**
   * Fetch mods from API with current filter state
   */
  const fetchMods = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const apiParams = new URLSearchParams();
      apiParams.set('page', currentPage.toString());
      apiParams.set('limit', MODS_PER_PAGE.toString());
      if (searchQuery) apiParams.set('search', searchQuery);
      if (selectedCategory && selectedCategory !== 'All') apiParams.set('category', selectedCategory);
      if (selectedGameVersion) apiParams.set('gameVersion', selectedGameVersion);
      if (creatorParam) apiParams.set('creator', creatorParam);
      if (contentType) apiParams.set('contentType', contentType);
      if (visualStyle) apiParams.set('visualStyle', visualStyle);

      switch (sortBy) {
        case 'downloads':
          apiParams.set('sortBy', 'downloadCount');
          apiParams.set('sortOrder', 'desc');
          break;
        case 'rating':
          apiParams.set('sortBy', 'rating');
          apiParams.set('sortOrder', 'desc');
          break;
        case 'newest':
          apiParams.set('sortBy', 'createdAt');
          apiParams.set('sortOrder', 'desc');
          break;
        case 'relevance':
          // No sort params - let API use its default
          break;
      }

      const response = await fetch(`/api/mods?${apiParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMods(data.mods);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mods');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedGameVersion, sortBy, creatorParam, currentPage, contentType, visualStyle]);

  // Fetch mods on mount and when filters change
  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  // Keep the URL in sync with filter state
  useEffect(() => {
    updateBrowserUrl(buildUrlParams());
  }, [buildUrlParams, updateBrowserUrl]);

  const handleSearch = useCallback((query: string) => {
    setCurrentPage(1);
    setSearchQuery(query);
    setSelectedCategory('All');
    if (query) {
      trackSearch(query);
    }
  }, [trackSearch]);

  const handleGame = useCallback((value: string) => {
    setCurrentPage(1);
    setSelectedGameVersion(value);
  }, []);

  const handleSortChange = (newSortBy: string) => {
    setCurrentPage(1);
    setSortBy(newSortBy);
  };

  // Chips narrow the current results; they keep the search query.
  const handleContentType = (value: string) => {
    setCurrentPage(1);
    setContentType(value);
  };

  const handleVisualStyle = (value: string) => {
    setCurrentPage(1);
    setVisualStyle(value);
  };

  const handleClearAll = () => {
    setCurrentPage(1);
    setSearchQuery('');
    setSelectedCategory('All');
    setContentType('');
    setVisualStyle('');
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    scrollToResults();
  };

  const handleFavorite = async (modId: string) => {
    const isFavorited = favorites.includes(modId);

    try {
      // Optimistically update UI
      setFavorites(prev =>
        isFavorited
          ? prev.filter(id => id !== modId)
          : [...prev, modId]
      );

      const response = await fetch(`/api/mods/${modId}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // Revert optimistic update on error
        setFavorites(prev =>
          isFavorited
            ? [...prev, modId]
            : prev.filter(id => id !== modId)
        );

        const body = await response.json().catch(() => null);
        console.error('Failed to toggle favorite:', body);

        if (response.status === 401) {
          alert('Please sign in to favorite mods');
        }
      } else {
        // Refresh the mod data to get updated counts, preserving current filters
        await fetchMods();
      }
    } catch (err) {
      setFavorites(prev =>
        isFavorited
          ? [...prev, modId]
          : prev.filter(id => id !== modId)
      );
      console.error('Error toggling favorite:', err);
    }
  };

  const game = gameFor(selectedGameVersion);
  const rankFrom = sortBy === 'downloads' && !searchQuery ? (currentPage - 1) * MODS_PER_PAGE + 1 : null;
  const showFacetCounts = !searchQuery && !selectedGameVersion && !creatorParam;

  return (
    <div className={`lx ${lxFontVars}`} data-game={game.id}>
      <LauncherHeader
        search={searchQuery}
        onSearch={handleSearch}
        game={selectedGameVersion}
        gameCounts={gameCounts}
        onGame={handleGame}
      />

      {/* Game switcher band — the same control as the header copy, shown
          under 1280px where the header has no room for it. */}
      <div className="gameband">
        <div className="wrap">
          <GameSwitch value={selectedGameVersion} counts={gameCounts} onChange={handleGame} label="Choose a game" />
        </div>
      </div>

      <main>
        {/* Hero: h1 + catalogue size, with the capture block (E73 — email +
            free-account CTA) beside it. Sibling of the grid/sidebar row below
            and of aside#secondary; never inside a .mv-ads container. */}
        <LauncherHero total={gameCounts['']} game={game.id} collections={collectionStripSlot}>
          <HomeCapture />
        </LauncherHero>

        {/* Main content row: results column + right ad sidebar. */}
        <div className="wrap row">
          <div className="main">
            {creatorParam && (
              <div className="creator-banner">
                <span>
                  Viewing mods by <strong>@{creatorParam}</strong>
                </span>
                <a href="/">Clear</a>
              </div>
            )}

            <LauncherToolbar
              total={pagination?.total ?? null}
              loading={loading}
              search={searchQuery}
              sort={sortBy}
              onSort={handleSortChange}
              types={types}
              styles={styles}
              contentType={contentType}
              visualStyle={visualStyle}
              onContentType={handleContentType}
              onVisualStyle={handleVisualStyle}
              showCounts={showFacetCounts}
              onClearAll={handleClearAll}
            />

            <LauncherGrid
              mods={mods}
              loading={loading}
              error={error}
              pageSize={MODS_PER_PAGE}
              rankFrom={rankFrom}
              favorites={favorites}
              onFavorite={handleFavorite}
              affiliateOffers={affiliateOffers}
              affiliateInterval={8}
              onRetry={fetchMods}
              onClear={handleClearAll}
            />

            {pagination && (
              <LauncherPager page={currentPage} totalPages={pagination.totalPages} onPage={handlePageChange} />
            )}

            <LauncherBelow
              game={selectedGameVersion}
              gameCounts={gameCounts}
              collectionsSlot={collectionsSlot}
              types={types}
              contentType={contentType}
              onContentType={handleContentType}
            />
          </div>

          {/* Right Ad Sidebar — in normal document flow so Mediavine Script Wrapper
              can apply sticky scroll behavior and auto-refresh ads as user scrolls.
              Mediavine auto-detects <aside id="secondary"> for Sidebar Sticky.
              IMPORTANT: Do NOT add position:sticky/fixed — Mediavine handles stickiness.
              overflow must be visible on this element and all ancestors. */}
          <aside
            id="secondary"
            className="widget-area primary-sidebar hidden lg:block flex-shrink-0 w-[300px] overflow-visible"
            role="complementary"
            aria-label="Sidebar"
          >
            {/* Empty — Mediavine auto-fills with its own stacked ad containers.
                Placeholder divs removed: WordPress blog sidebar uses empty aside and
                Mediavine fills it better than when constrained by min-h placeholders. */}
          </aside>
        </div>
      </main>

      <LauncherFooter />
    </div>
  );
}
