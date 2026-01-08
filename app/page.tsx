'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { ModGrid } from '../components/ModGrid';
import { FilterBar } from '../components/FilterBar';
import { Footer } from '../components/Footer';
import { ModDetailsModal } from '../components/ModDetailsModal';
import { Mod } from '../lib/api';
import { useSearchTracking } from '../lib/hooks/useAnalytics';

interface SearchFilters {
  category?: string;
  gameVersion?: string;
  [key: string]: any;
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();

  // Read initial state from URL parameters
  const creatorParam = searchParams.get('creator');
  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All';
  const initialGameVersion = searchParams.get('gameVersion') || 'Sims 4';
  const initialSort = searchParams.get('sort') || 'relevance';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedGameVersion, setSelectedGameVersion] = useState(initialGameVersion);
  const [sortBy, setSortBy] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [gridColumns, setGridColumns] = useState(4);
  const [selectedMod, setSelectedMod] = useState<Mod | null>(null);

  // Direct state management instead of hooks
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [facets, setFacets] = useState<any>(null);

  // Analytics tracking hooks (usePageTracking is now global in providers.tsx)
  const { trackSearch } = useSearchTracking();

  /**
   * Build URL with current filter state
   * Used for both browser URL updates and API calls
   */
  const buildUrlParams = useCallback((overrides: Record<string, any> = {}) => {
    const params = new URLSearchParams();

    const page = overrides.page !== undefined ? overrides.page : currentPage;
    const search = overrides.search !== undefined ? overrides.search : searchQuery;
    const category = overrides.category !== undefined ? overrides.category : selectedCategory;
    const gameVersion = overrides.gameVersion !== undefined ? overrides.gameVersion : selectedGameVersion;
    const sort = overrides.sort !== undefined ? overrides.sort : sortBy;
    const creator = overrides.creator !== undefined ? overrides.creator : creatorParam;

    // Only add non-default values to URL
    if (page > 1) params.set('page', page.toString());
    if (search) params.set('search', search);
    if (category && category !== 'All') params.set('category', category);
    if (gameVersion && gameVersion !== 'Sims 4') params.set('gameVersion', gameVersion);
    if (sort && sort !== 'relevance') params.set('sort', sort);
    if (creator) params.set('creator', creator);

    return params;
  }, [currentPage, searchQuery, selectedCategory, selectedGameVersion, sortBy, creatorParam]);

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
  const fetchMods = useCallback(async (pageOverride?: number) => {
    try {
      setLoading(true);
      setError(null);

      const page = pageOverride !== undefined ? pageOverride : currentPage;
      const apiParams = new URLSearchParams();

      // Add page
      apiParams.set('page', page.toString());

      // Add search query if exists
      if (searchQuery) {
        apiParams.set('search', searchQuery);
      }

      // Add category filter (if not 'All')
      if (selectedCategory && selectedCategory !== 'All') {
        apiParams.set('category', selectedCategory);
      }

      // Add game version filter if exists
      if (selectedGameVersion) {
        apiParams.set('gameVersion', selectedGameVersion);
      }

      // Add creator filter if exists
      if (creatorParam) {
        apiParams.set('creator', creatorParam);
      }

      // Add sort parameter
      if (sortBy && sortBy !== 'relevance') {
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
        }
      }

      const response = await fetch(`/api/mods?${apiParams.toString()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMods(data.mods);
      setPagination(data.pagination);
      setFacets(data.facets);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mods');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedGameVersion, sortBy, creatorParam, currentPage]);

  // Fetch mods on mount and when filters change
  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  // Update URL when filter state changes (except on initial load)
  useEffect(() => {
    const params = buildUrlParams();
    updateBrowserUrl(params);
  }, [searchQuery, selectedCategory, selectedGameVersion, sortBy, currentPage, buildUrlParams, updateBrowserUrl]);

  // Handle mod card click - show details immediately (no paywall)
  const handleModClick = (mod: Mod) => {
    setSelectedMod(mod);
  };

  const handleSearch = async (query: string, category?: string, gameVersion?: string) => {
    // Reset to page 1 when search changes
    setCurrentPage(1);
    setSearchQuery(query);
    setSelectedCategory(category || 'All');
    if (gameVersion) {
      setSelectedGameVersion(gameVersion);
    }

    // Track search event
    if (query) {
      trackSearch(query);
    }
  };

  const handleCategoryChange = (category: string) => {
    setCurrentPage(1); // Reset to page 1
    setSelectedCategory(category);
  };

  const handleSortChange = (newSortBy: string) => {
    setCurrentPage(1); // Reset to page 1
    setSortBy(newSortBy);
  };

  const handleClearAllFilters = () => {
    setCurrentPage(1);
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('relevance');
  };

  /**
   * Handle page change - updates both state and URL
   */
  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    // Scroll to top of grid
    window.scrollTo({ top: 300, behavior: 'smooth' });
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

      // Call API
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

        const error = await response.json();
        console.error('Failed to toggle favorite:', error);

        // Show error to user (you could add a toast notification here)
        if (response.status === 401) {
          alert('Please sign in to favorite mods');
        }
      } else {
        // Refresh the mod data to get updated rating, preserving current filters
        await fetchMods();
      }
    } catch (error) {
      // Revert optimistic update on error
      setFavorites(prev =>
        isFavorited
          ? [...prev, modId]
          : prev.filter(id => id !== modId)
      );
      console.error('Error toggling favorite:', error);
    }
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans selection:bg-sims-pink/30 selection:text-white">
      <Navbar />

      <main className="flex-grow">
        <Hero onSearch={handleSearch} isLoading={loading} />

        {/* FilterBar */}
        <FilterBar
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          resultCount={mods.length}
          facets={facets}
          searchQuery={searchQuery}
          onClearAllFilters={handleClearAllFilters}
        />

        {/* Creator Filter Banner */}
        {creatorParam && (
          <div className="container mx-auto px-4 py-4">
            <div className="bg-sims-pink/10 border border-sims-pink/20 rounded-lg px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-sims-pink/20 rounded-full p-2">
                  <svg className="h-5 w-5 text-sims-pink" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Viewing mods by creator</p>
                  <p className="text-lg font-semibold text-white">@{creatorParam}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  // Navigate to home page without creator parameter
                  window.location.href = '/';
                }}
                className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium"
              >
                Clear Filter
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="container mx-auto px-4">
          <ModGrid
            mods={mods}
            loading={loading}
            error={error}
            onFavorite={handleFavorite}
            onModClick={handleModClick}
            favorites={favorites}
            gridColumns={gridColumns}
          />
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="container mx-auto px-4 pb-20">
            <div className="flex justify-center mt-12">
              <nav className="flex items-center space-x-2" aria-label="Pagination">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 border border-white/5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(pagination.totalPages - 4, currentPage - 2)) + i;
                  if (page < 1 || page > pagination.totalPages) return null;
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      aria-current={page === currentPage ? 'page' : undefined}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${page === currentPage
                        ? 'bg-sims-pink text-white'
                        : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= pagination.totalPages}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 border border-white/5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </nav>
            </div>
          </div>
        )}
      </main>

      <Footer />

      {/* Mod Details Modal */}
      {selectedMod && (
        <ModDetailsModal
          mod={selectedMod}
          onClose={() => setSelectedMod(null)}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-mhm-dark text-slate-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sims-pink mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}
