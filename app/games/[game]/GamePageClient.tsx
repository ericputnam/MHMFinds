'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Navbar } from '../../../components/Navbar';
import { Hero } from '../../../components/Hero';
import { ModGrid } from '../../../components/ModGrid';
import { Footer } from '../../../components/Footer';
import { ModDetailsModal } from '../../../components/ModDetailsModal';
import { FacetedSidebar } from '../../../components/FacetedSidebar';
import { Mod } from '../../../lib/api';
import { useSearchTracking } from '../../../lib/hooks/useAnalytics';
import { useAffiliateOffers } from '../../../lib/hooks/useAffiliateOffers';
import { ArrowUpDown } from 'lucide-react';

interface GamePageClientProps {
  gameName: string;
  gameSlug: string;
}

export default function GamePageClient({ gameName, gameSlug }: GamePageClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialPage = parseInt(searchParams.get('page') || '1', 10);
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || 'All';
  const initialSort = searchParams.get('sort') || 'downloads';

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [selectedGameVersion] = useState(gameName);
  const [sortBy, setSortBy] = useState(initialSort);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [gridColumns] = useState(4);
  const [selectedMod, setSelectedMod] = useState<Mod | null>(null);
  const [modsPerPage, setModsPerPage] = useState(20);

  const [selectedFacets, setSelectedFacets] = useState<{
    contentType?: string[];
    visualStyle?: string[];
    themes?: string[];
    ageGroups?: string[];
    genderOptions?: string[];
  }>({});

  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const { trackSearch } = useSearchTracking();

  const { offers: affiliateOffers } = useAffiliateOffers({
    limit: 4,
    source: 'grid',
    refreshKey: `${currentPage}-${searchQuery}-${selectedCategory}-${selectedGameVersion}`,
  });

  const fetchMods = useCallback(async (pageOverride?: number) => {
    try {
      setLoading(true);
      setError(null);

      const page = pageOverride !== undefined ? pageOverride : currentPage;
      const apiParams = new URLSearchParams();

      apiParams.set('page', page.toString());
      apiParams.set('limit', modsPerPage.toString());

      if (searchQuery) apiParams.set('search', searchQuery);
      if (selectedCategory && selectedCategory !== 'All') apiParams.set('category', selectedCategory);
      if (selectedGameVersion) apiParams.set('gameVersion', selectedGameVersion);

      if (selectedFacets.contentType?.length) apiParams.set('contentType', selectedFacets.contentType[0]);
      if (selectedFacets.visualStyle?.length) apiParams.set('visualStyle', selectedFacets.visualStyle[0]);
      if (selectedFacets.themes?.length) apiParams.set('themes', selectedFacets.themes.join(','));
      if (selectedFacets.ageGroups?.length) apiParams.set('ageGroups', selectedFacets.ageGroups.join(','));
      if (selectedFacets.genderOptions?.length) apiParams.set('genderOptions', selectedFacets.genderOptions.join(','));

      if (sortBy) {
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
            break;
        }
      }

      const response = await fetch(`/api/mods?${apiParams.toString()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      setMods(data.mods);
      setPagination(data.pagination);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch mods');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedGameVersion, sortBy, currentPage, selectedFacets, modsPerPage]);

  useEffect(() => {
    fetchMods();
  }, [fetchMods]);

  // Update URL when filter state changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (currentPage > 1) params.set('page', currentPage.toString());
    if (searchQuery) params.set('search', searchQuery);
    if (selectedCategory && selectedCategory !== 'All') params.set('category', selectedCategory);
    if (sortBy && sortBy !== 'downloads') params.set('sort', sortBy);

    const queryString = params.toString();
    const newUrl = queryString ? `/games/${gameSlug}?${queryString}` : `/games/${gameSlug}`;
    router.replace(newUrl, { scroll: false });
  }, [searchQuery, selectedCategory, sortBy, currentPage, gameSlug, router]);

  const handleModClick = (mod: Mod) => setSelectedMod(mod);

  const handleSearch = async (query: string, category?: string, gameVersion?: string) => {
    setCurrentPage(1);
    setSearchQuery(query);
    setSelectedCategory(category || 'All');
    if (query) trackSearch(query);
  };

  const handleSortChange = (newSortBy: string) => {
    setCurrentPage(1);
    setSortBy(newSortBy);
  };

  const handlePerPageChange = (newPerPage: number) => {
    setCurrentPage(1);
    setModsPerPage(newPerPage);
  };

  const handleFacetChange = (facetType: string, values: string[]) => {
    setCurrentPage(1);
    setSearchQuery('');
    setSelectedFacets(prev => ({
      ...prev,
      [facetType]: values.length > 0 ? values : undefined,
    }));
  };

  const handleClearFacets = () => {
    setCurrentPage(1);
    setSelectedFacets({});
  };

  const handlePageChange = async (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleFavorite = async (modId: string) => {
    const isFavorited = favorites.includes(modId);
    try {
      setFavorites(prev => isFavorited ? prev.filter(id => id !== modId) : [...prev, modId]);
      const response = await fetch(`/api/mods/${modId}/favorite`, {
        method: isFavorited ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        setFavorites(prev => isFavorited ? [...prev, modId] : prev.filter(id => id !== modId));
        if (response.status === 401) alert('Please sign in to favorite mods');
      } else {
        await fetchMods();
      }
    } catch {
      setFavorites(prev => isFavorited ? [...prev, modId] : prev.filter(id => id !== modId));
    }
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans selection:bg-sims-pink/30 selection:text-white">
      <Navbar />

      <main className="flex-grow">
        {/* Reuse the homepage Hero component with game pre-selected */}
        <Hero
          onSearch={handleSearch}
          isLoading={loading}
          initialSearch={searchQuery}
          defaultGame={gameName}
        />

        {/* Main Content with Sidebar */}
        <div className="container mx-auto px-4">
          <div className="flex gap-6">
            <div className="hidden lg:block flex-shrink-0">
              <div className="sticky top-24">
                <FacetedSidebar
                  selectedFacets={selectedFacets}
                  onFacetChange={handleFacetChange}
                  onClearAll={handleClearFacets}
                />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {/* Results Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <div className="text-slate-400 text-sm">
                  {loading ? (
                    <span className="animate-pulse">Loading...</span>
                  ) : (
                    <span>
                      <span className="text-white font-medium">{pagination?.total?.toLocaleString() || mods.length}</span> mods
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="hidden sm:inline">Show</span>
                    <div className="flex items-center bg-black/20 border border-white/10 rounded-lg overflow-hidden">
                      {[20, 50, 100].map((num) => (
                        <button
                          key={num}
                          onClick={() => handlePerPageChange(num)}
                          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                            modsPerPage === num
                              ? 'bg-sims-purple text-white'
                              : 'text-slate-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-center space-x-2 bg-black/20 hover:bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 cursor-pointer transition-all">
                      <ArrowUpDown className="w-4 h-4 text-sims-purple" />
                      <select
                        value={sortBy}
                        onChange={(e) => handleSortChange(e.target.value)}
                        className="bg-transparent text-sm font-medium text-slate-300 outline-none appearance-none cursor-pointer"
                      >
                        <option value="relevance" className="bg-mhm-card text-slate-200">Relevance</option>
                        <option value="downloads" className="bg-mhm-card text-slate-200">Most Downloads</option>
                        <option value="rating" className="bg-mhm-card text-slate-200">Highest Rated</option>
                        <option value="newest" className="bg-mhm-card text-slate-200">Newest Finds</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <ModGrid
                mods={mods}
                loading={loading}
                error={error}
                onFavorite={handleFavorite}
                onModClick={handleModClick}
                favorites={favorites}
                gridColumns={gridColumns}
                affiliateOffers={affiliateOffers}
                affiliateInterval={5}
              />
            </div>
          </div>
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

      {selectedMod && (
        <ModDetailsModal
          mod={selectedMod}
          onClose={() => setSelectedMod(null)}
        />
      )}
    </div>
  );
}
