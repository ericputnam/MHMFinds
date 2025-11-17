'use client';

import React, { useState, useEffect } from 'react';
import { SearchBar, SearchFilters } from '../components/SearchBar';
import { ModGrid } from '../components/ModGrid';
import { Mod } from '../lib/api';
import { Search, Crown, SlidersHorizontal, X } from 'lucide-react';

export default function HomePage() {
  console.log('HomePage component rendering...');

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedGameVersions, setSelectedGameVersions] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [gridColumns, setGridColumns] = useState(4);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Direct state management instead of hooks
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  // Set mounted state after hydration
  useEffect(() => {
    console.log('Setting mounted state...');
    setMounted(true);
  }, []);

  // Direct API call
  useEffect(() => {
    if (!mounted) return;
    
    console.log('useEffect running...');
    const fetchMods = async () => {
      try {
        console.log('Direct fetch attempt...');
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/mods');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Direct fetch success:', data);
        console.log('First mod rating type:', typeof data.mods[0]?.rating, 'value:', data.mods[0]?.rating);
        
        setMods(data.mods);
        setPagination(data.pagination);
      } catch (err) {
        console.error('Direct fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch mods');
      } finally {
        setLoading(false);
      }
    };

    fetchMods();
  }, [mounted]);

  // Debug logging
  useEffect(() => {
    if (!mounted) return;

    console.log('Main page - mods:', mods);
    console.log('Main page - loading:', loading);
    console.log('Main page - error:', error);
    console.log('Main page - pagination:', pagination);
  }, [mods, loading, error, pagination, mounted]);

  // Auto-submit debounced search
  useEffect(() => {
    if (!mounted) return;

    const delayDebounce = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else if (searchQuery === '' && mods.length > 0) {
        // If search is cleared, reload all mods
        applyFilters(selectedCategories, selectedGameVersions, filters);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);


  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      try {
        setLoading(true);
        const response = await fetch(`/api/mods?search=${encodeURIComponent(query)}`);
        const data = await response.json();
        console.log('Search - First mod rating type:', typeof data.mods[0]?.rating, 'value:', data.mods[0]?.rating);
        setMods(data.mods);
        setPagination(data.pagination);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Search failed');
      } finally {
        setLoading(false);
      }
    } else {
      // Refetch all mods
      const response = await fetch('/api/mods');
      const data = await response.json();
      console.log('Search refetch - First mod rating type:', typeof data.mods[0]?.rating, 'value:', data.mods[0]?.rating);
      setMods(data.mods);
      setPagination(data.pagination);
    }
  };

  const handleCategoryToggle = async (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];

    setSelectedCategories(newCategories);
    await applyFilters(newCategories, selectedGameVersions, filters);
  };

  const handleGameVersionToggle = async (version: string) => {
    const newVersions = selectedGameVersions.includes(version)
      ? selectedGameVersions.filter(v => v !== version)
      : [...selectedGameVersions, version];

    setSelectedGameVersions(newVersions);
    await applyFilters(selectedCategories, newVersions, filters);
  };

  const applyFilters = async (
    categories: string[],
    gameVersions: string[],
    otherFilters: SearchFilters
  ) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Add search query if exists
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      // Add multiple categories
      categories.forEach(cat => params.append('category', cat));

      // Add multiple game versions
      gameVersions.forEach(ver => params.append('gameVersion', ver));

      // Add other filters
      Object.entries(otherFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'category' && key !== 'gameVersion') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/mods?${params.toString()}`);
      const data = await response.json();
      setMods(data.mods);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = async (newFilters: SearchFilters) => {
    setFilters(newFilters);
    await applyFilters(selectedCategories, selectedGameVersions, newFilters);
  };

  const handleFavorite = (modId: string) => {
    setFavorites(prev =>
      prev.includes(modId)
        ? prev.filter(id => id !== modId)
        : [...prev, modId]
    );
  };

  const clearAllFilters = async () => {
    setSelectedCategories([]);
    setSelectedGameVersions([]);
    setFilters({});
    setSearchQuery('');

    const response = await fetch('/api/mods');
    const data = await response.json();
    setMods(data.mods);
    setPagination(data.pagination);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Filter Drawer Overlay */}
      {mobileFiltersOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileFiltersOpen(false)}
        />
      )}

      {/* Mobile Filter Drawer */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
          mobileFiltersOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Drawer Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Filters</h2>
            <button
              onClick={() => setMobileFiltersOpen(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Filter Content (same as sidebar) */}
          <div>
            {/* Categories Section */}
            <div className="border-b border-gray-100 pb-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">CATEGORIES</h3>
              <div className="space-y-3">
                {['Build/Buy', 'CAS', 'Gameplay', 'Hair', 'Clothing', 'Furniture', 'Scripts'].map((category) => (
                  <label key={category} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors duration-200"
                    />
                    <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                      {category}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Game Version Section */}
            <div className="border-b border-gray-100 pb-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">GAME VERSION</h3>
              <div className="space-y-3">
                {['Sims 4', 'Sims 3', 'Sims 2'].map((version) => (
                  <label key={version} className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedGameVersions.includes(version)}
                      onChange={() => handleGameVersionToggle(version)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors duration-200"
                    />
                    <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                      {version}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Section */}
            <div className="border-b border-gray-100 pb-4 mb-4">
              <h3 className="font-semibold text-gray-900 mb-3">PRICE</h3>
              <div className="space-y-3">
                <label className="flex items-center group cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.isFree === true}
                    onChange={(e) => handleFilterChange({ ...filters, isFree: e.target.checked ? true : undefined })}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors duration-200"
                  />
                  <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                    Free Only
                  </span>
                </label>
              </div>
            </div>

            {/* Clear Filters Button */}
            <button
              onClick={() => {
                clearAllFilters();
                setMobileFiltersOpen(false);
              }}
              className="w-full mt-6 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
            >
              Clear All Filters
              {(selectedCategories.length > 0 || selectedGameVersions.length > 0 || filters.isFree) && (
                <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {selectedCategories.length + selectedGameVersions.length + (filters.isFree ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Header - Incorporating Competitor's Design */}
      <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex-1 max-w-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-medium bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full">
                  MustHaveMods Premium
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Discover Amazing{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                  Sims 4 Mods
                </span>
          </h1>

              <div className="flex flex-wrap gap-4 text-sm text-white/90 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                  <span>10,000+ Premium Mods</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>AI-Powered Discovery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                  <span>Curated Collections</span>
                </div>
              </div>
            </div>

            {/* Enhanced Search Bar - Right Side */}
            <div className="hidden lg:block flex-1 max-w-md">
              <div className="relative" role="search">
                <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-all duration-300 ${loading && searchQuery ? 'animate-pulse text-emerald-400' : 'text-gray-400'}`} aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for mods, creators, or content..."
                  aria-label="Search for mods, creators, or content"
                  className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200"
                    aria-label="Clear search"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Search */}
          <div className="lg:hidden mt-6">
            <div className="relative" role="search">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-all duration-300 ${loading && searchQuery ? 'animate-pulse text-emerald-400' : 'text-gray-400'}`} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for mods, creators, or content..."
                aria-label="Search for mods, creators, or content"
                className="w-full pl-12 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all duration-300"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white transition-colors duration-200 text-2xl"
                  aria-label="Clear search"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        </div>


      {/* Main Content Section - Enhanced Layout */}
      <div className="py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Enhanced Left Sidebar - Incorporating Competitor's Design */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="bg-white border border-gray-200 rounded-xl shadow-lg h-full">
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-5 h-5 bg-gradient-to-r from-indigo-600 to-purple-600 rounded flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Discover</h2>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-6">
                    Find exactly what you're looking for
                  </p>

                  {/* Categories Section */}
                  <div className="border-b border-gray-100 pb-4 mb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">CATEGORIES</h3>
                    <div className="space-y-3">
                      {['Build/Buy', 'CAS', 'Gameplay', 'Hair', 'Clothing', 'Furniture', 'Scripts'].map((category) => (
                        <label key={category} className="flex items-center group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={() => handleCategoryToggle(category)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors duration-200"
                          />
                          <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                            {category}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Game Version Section */}
                  <div className="border-b border-gray-100 pb-4 mb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">GAME VERSION</h3>
                    <div className="space-y-3">
                      {['Sims 4', 'Sims 3', 'Sims 2'].map((version) => (
                        <label key={version} className="flex items-center group cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedGameVersions.includes(version)}
                            onChange={() => handleGameVersionToggle(version)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors duration-200"
                          />
                          <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                            {version}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="border-b border-gray-100 pb-4 mb-4">
                    <h3 className="font-semibold text-gray-900 mb-3">PRICE</h3>
                <div className="space-y-3">
                      <label className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.isFree === true}
                      onChange={(e) => handleFilterChange({ ...filters, isFree: e.target.checked ? true : undefined })}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 transition-colors duration-200"
                    />
                        <span className="ml-3 text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-200">
                          Free Only
                        </span>
                  </label>
                    </div>
                  </div>

                  {/* Clear Filters Button */}
                  <button
                    onClick={clearAllFilters}
                    className="w-full mt-6 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm font-medium flex items-center justify-center gap-2"
                  >
                    Clear All Filters
                    {(selectedCategories.length > 0 || selectedGameVersions.length > 0 || filters.isFree) && (
                      <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {selectedCategories.length + selectedGameVersions.length + (filters.isFree ? 1 : 0)}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Main Content - Enhanced */}
            <div className="flex-1 min-w-0">
              {/* Enhanced Results Header */}
              <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {/* Mobile Filter Button */}
                      <button
                        onClick={() => setMobileFiltersOpen(true)}
                        className="lg:hidden flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                      >
                        <SlidersHorizontal size={18} />
                        Filters
                        {(selectedCategories.length > 0 || selectedGameVersions.length > 0 || filters.isFree) && (
                          <span className="bg-white text-indigo-600 text-xs px-2 py-0.5 rounded-full font-bold">
                            {selectedCategories.length + selectedGameVersions.length + (filters.isFree ? 1 : 0)}
                          </span>
                        )}
                      </button>

                      <div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">
                          {searchQuery ? `Search Results for "${searchQuery}"` : 'Featured Mods'}
                        </h2>
                        {pagination && (
                          <p className="text-gray-600 text-sm">
                            {pagination.total} results found
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Enhanced Controls */}
                  <div className="flex items-center space-x-3">
                  {/* Sort Options */}
                    <div className="flex items-center space-x-2">
                      <label className="text-xs font-medium text-gray-700">
                        Sort by:
                      </label>
                    <select 
                        className="px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 bg-white shadow-sm text-sm"
                      onChange={async (e) => {
                        const [sortBy, sortOrder] = e.target.value.split('-');
                        await handleFilterChange({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                      }}
                    >
                      <option value="createdAt-desc">Newest First</option>
                      <option value="createdAt-asc">Oldest First</option>
                      <option value="downloadCount-desc">Most Downloaded</option>
                      <option value="rating-desc">Highest Rated</option>
                      <option value="title-asc">A-Z</option>
                    </select>
                    </div>

                    {/* Grid View Options */}
                    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                      {[3, 4, 5].map((cols) => (
                        <button
                          key={cols}
                          onClick={() => setGridColumns(cols)}
                          className={`p-1.5 rounded transition-all duration-200 ${
                            gridColumns === cols
                              ? 'bg-white text-indigo-600 shadow-sm'
                              : 'text-gray-500 hover:text-gray-700'
                          }`}
                          title={`${cols} columns`}
                        >
                          <div className={`grid gap-0.5 ${cols === 3 ? 'grid-cols-3' : cols === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                            {Array.from({ length: cols }, (_, i) => (
                              <div key={i} className="w-1.5 h-1.5 bg-current rounded-sm"></div>
                            ))}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Filters Chips */}
              {(selectedCategories.length > 0 || selectedGameVersions.length > 0 || filters.isFree) && (
                <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="text-sm font-medium text-gray-700">Active Filters:</span>

                    {selectedCategories.map((category) => (
                      <button
                        key={category}
                        onClick={() => handleCategoryToggle(category)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium hover:bg-indigo-200 transition-colors duration-200 group"
                      >
                        {category}
                        <span className="text-indigo-500 group-hover:text-indigo-700">×</span>
                      </button>
                    ))}

                    {selectedGameVersions.map((version) => (
                      <button
                        key={version}
                        onClick={() => handleGameVersionToggle(version)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm font-medium hover:bg-purple-200 transition-colors duration-200 group"
                      >
                        {version}
                        <span className="text-purple-500 group-hover:text-purple-700">×</span>
                      </button>
                    ))}

                    {filters.isFree && (
                      <button
                        onClick={() => handleFilterChange({ ...filters, isFree: undefined })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium hover:bg-emerald-200 transition-colors duration-200 group"
                      >
                        Free Only
                        <span className="text-emerald-500 group-hover:text-emerald-700">×</span>
                      </button>
                    )}

                    <button
                      onClick={clearAllFilters}
                      className="ml-auto text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
              )}

              {/* Enhanced Mods Grid */}
              <ModGrid
                mods={mods}
                loading={loading}
                error={error}
                onFavorite={handleFavorite}
                favorites={favorites}
                gridColumns={gridColumns}
              />

              {/* Enhanced Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <nav className="flex items-center space-x-2">
                    <button
                      onClick={async () => {
                        const newPage = pagination.page - 1;
                        const response = await fetch(`/api/mods?page=${newPage}`);
                        const data = await response.json();
                        setMods(data.mods);
                        setPagination(data.pagination);
                      }}
                      disabled={!pagination.hasPrevPage}
                      className="px-3 py-1.5 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                      const page = Math.max(1, Math.min(pagination.totalPages - 4, pagination.page - 2)) + i;
                      return (
                        <button
                          key={page}
                          onClick={async () => {
                            const response = await fetch(`/api/mods?page=${page}`);
                            const data = await response.json();
                            setMods(data.mods);
                            setPagination(data.pagination);
                          }}
                          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                                   page === pagination.page
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                                     : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                 }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={async () => {
                        const newPage = pagination.page + 1;
                        const response = await fetch(`/api/mods?page=${newPage}`);
                        const data = await response.json();
                        setMods(data.mods);
                        setPagination(data.pagination);
                      }}
                      disabled={!pagination.hasNextPage}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
    </div>
  );
}
