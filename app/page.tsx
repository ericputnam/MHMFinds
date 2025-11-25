'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { Hero } from '../components/Hero';
import { ModGrid } from '../components/ModGrid';
import { FilterBar } from '../components/FilterBar';
import { Footer } from '../components/Footer';
import { ModDetailsModal } from '../components/ModDetailsModal';
import { Mod } from '../lib/api';

interface SearchFilters {
  category?: string;
  gameVersion?: string;
  [key: string]: any;
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const creatorParam = searchParams.get('creator');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('relevance');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [gridColumns, setGridColumns] = useState(4);
  const [selectedMod, setSelectedMod] = useState<Mod | null>(null);

  // Direct state management instead of hooks
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [facets, setFacets] = useState<any>(null);

  const fetchMods = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();

      // Add search query if exists
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      // Add category filter (if not 'All')
      if (selectedCategory && selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }

      // Add creator filter if exists
      if (creatorParam) {
        params.append('creator', creatorParam);
      }

      // Add sort parameter
      if (sortBy && sortBy !== 'relevance') {
        // Map our sort options to API parameters
        switch (sortBy) {
          case 'downloads':
            params.append('sortBy', 'downloadCount');
            params.append('sortOrder', 'desc');
            break;
          case 'rating':
            params.append('sortBy', 'rating');
            params.append('sortOrder', 'desc');
            break;
          case 'newest':
            params.append('sortBy', 'createdAt');
            params.append('sortOrder', 'desc');
            break;
        }
      }

      const response = await fetch(`/api/mods?${params.toString()}`);
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
  };

  // Fetch mods on mount and when filters change
  useEffect(() => {
    fetchMods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, sortBy, searchQuery, creatorParam]);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
  };

  const handleClearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortBy('relevance');
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
        // Refresh the mod data to get updated rating
        const modsResponse = await fetch('/api/mods');
        const data = await modsResponse.json();
        setMods(data.mods);
        setPagination(data.pagination);
        setFacets(data.facets);
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


  // Helper function to build URL with current filters
  const buildFilteredUrl = (page?: number) => {
    const params = new URLSearchParams();

    // Add page if specified
    if (page) {
      params.append('page', page.toString());
    }

    // Add search query if exists
    if (searchQuery) {
      params.append('search', searchQuery);
    }

    // Add category filter (if not 'All')
    if (selectedCategory && selectedCategory !== 'All') {
      params.append('category', selectedCategory);
    }

    // Add creator filter if exists
    if (creatorParam) {
      params.append('creator', creatorParam);
    }

    // Add sort parameter
    if (sortBy && sortBy !== 'relevance') {
      switch (sortBy) {
        case 'downloads':
          params.append('sortBy', 'downloadCount');
          params.append('sortOrder', 'desc');
          break;
        case 'rating':
          params.append('sortBy', 'rating');
          params.append('sortOrder', 'desc');
          break;
        case 'newest':
          params.append('sortBy', 'createdAt');
          params.append('sortOrder', 'desc');
          break;
      }
    }

    return `/api/mods?${params.toString()}`;
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
            <div className="bg-gradient-to-r from-sims-pink/10 to-purple-600/10 border border-sims-pink/20 rounded-lg px-6 py-4 flex items-center justify-between">
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
            onModClick={(mod) => setSelectedMod(mod)}
            favorites={favorites}
            gridColumns={gridColumns}
          />
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="container mx-auto px-4 pb-20">
            <div className="flex justify-center mt-12">
              <nav className="flex items-center space-x-2">
                <button
                  onClick={async () => {
                    const newPage = pagination.page - 1;
                    const response = await fetch(buildFilteredUrl(newPage));
                    const data = await response.json();
                    setMods(data.mods);
                    setPagination(data.pagination);
                    setFacets(data.facets);
                  }}
                  disabled={!pagination.hasPrevPage}
                  className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 border border-white/5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(pagination.totalPages - 4, pagination.page - 2)) + i;
                  return (
                    <button
                      key={page}
                      onClick={async () => {
                        const response = await fetch(buildFilteredUrl(page));
                        const data = await response.json();
                        setMods(data.mods);
                        setPagination(data.pagination);
                        setFacets(data.facets);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                        page === pagination.page
                          ? 'bg-gradient-to-r from-sims-pink to-purple-600 text-white'
                          : 'text-slate-400 hover:text-white bg-white/5 border border-white/5'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={async () => {
                    const newPage = pagination.page + 1;
                    const response = await fetch(buildFilteredUrl(newPage));
                    const data = await response.json();
                    setMods(data.mods);
                    setPagination(data.pagination);
                    setFacets(data.facets);
                  }}
                  disabled={!pagination.hasNextPage}
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
