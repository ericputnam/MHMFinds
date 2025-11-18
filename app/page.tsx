'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SearchBar, SearchFilters } from '../components/SearchBar';
import { ModGrid } from '../components/ModGrid';
import { CategoryTree, CategoryNode } from '../components/CategoryTree';
import { Mod } from '../lib/api';
import { Search, Crown, TrendingUp, Clock, Star, Filter as FilterIcon, X, ChevronDown, Grid3x3, LayoutGrid, List, Sparkles, Tag, Zap, SlidersHorizontal } from 'lucide-react';

export default function HomePage() {
  console.log('HomePage component rendering...');

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string | undefined>();
  const [selectedGameVersions, setSelectedGameVersions] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [gridColumns, setGridColumns] = useState(4);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Enhanced search features
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [filterCounts, setFilterCounts] = useState<Record<string, number>>({});

  // Refs for sticky behavior
  const searchRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Direct state management instead of hooks
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [facets, setFacets] = useState<any>(null);

  // Set mounted state after hydration and load recent searches
  useEffect(() => {
    console.log('Setting mounted state...');
    setMounted(true);

    // Load recent searches from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        try {
          setRecentSearches(JSON.parse(stored));
        } catch (e) {
          console.error('Failed to parse recent searches:', e);
        }
      }
    }
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
        setFacets(data.facets);
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
    setShowSearchSuggestions(false);

    // Add to recent searches
    if (query.trim() && !recentSearches.includes(query.trim())) {
      const updated = [query.trim(), ...recentSearches.slice(0, 4)];
      setRecentSearches(updated);
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentSearches', JSON.stringify(updated));
      }
    }

    if (query.trim()) {
      try {
        setLoading(true);
        const response = await fetch(`/api/mods?search=${encodeURIComponent(query)}`);
        const data = await response.json();
        console.log('Search - First mod rating type:', typeof data.mods[0]?.rating, 'value:', data.mods[0]?.rating);
        setMods(data.mods);
        setPagination(data.pagination);
        setFacets(data.facets);
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
      setFacets(data.facets);
    }
  };

  const handleCategoryToggle = async (category: string) => {
    const newCategories = selectedCategories.includes(category)
      ? selectedCategories.filter(c => c !== category)
      : [...selectedCategories, category];

    setSelectedCategories(newCategories);
    await applyFilters(newCategories, selectedGameVersions, filters);
  };

  const handleCategorySelect = async (categoryId: string, categoryPath: string) => {
    // If clicking the same category, deselect it
    if (selectedCategoryPath === categoryPath) {
      setSelectedCategoryPath(undefined);
      await applyFiltersWithCategoryPath(undefined, selectedGameVersions, filters);
    } else {
      setSelectedCategoryPath(categoryPath);
      await applyFiltersWithCategoryPath(categoryPath, selectedGameVersions, filters);
    }
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

      // Add category from otherFilters if present (takes precedence)
      if (otherFilters.category) {
        params.append('category', otherFilters.category);
      } else {
        // Otherwise add from categories array
        categories.forEach(cat => params.append('category', cat));
      }

      // Add gameVersion from otherFilters if present (takes precedence)
      if (otherFilters.gameVersion) {
        params.append('gameVersion', otherFilters.gameVersion);
      } else {
        // Otherwise add from gameVersions array
        gameVersions.forEach(ver => params.append('gameVersion', ver));
      }

      // Add other filters (excluding category and gameVersion as they're handled above)
      Object.entries(otherFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'category' && key !== 'gameVersion') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/mods?${params.toString()}`);
      const data = await response.json();
      setMods(data.mods);
      setPagination(data.pagination);
      setFacets(data.facets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersWithCategoryPath = async (
    categoryPath: string | undefined,
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

      // Add hierarchical category path
      if (categoryPath) {
        params.append('categoryPath', categoryPath);
      }

      // Add gameVersion from otherFilters if present (takes precedence)
      if (otherFilters.gameVersion) {
        params.append('gameVersion', otherFilters.gameVersion);
      } else {
        // Otherwise add from gameVersions array
        gameVersions.forEach(ver => params.append('gameVersion', ver));
      }

      // Add other filters (excluding category and gameVersion as they're handled above)
      Object.entries(otherFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && key !== 'category' && key !== 'gameVersion') {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/mods?${params.toString()}`);
      const data = await response.json();
      setMods(data.mods);
      setPagination(data.pagination);
      setFacets(data.facets);
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

  const clearAllFilters = async () => {
    setSelectedCategories([]);
    setSelectedGameVersions([]);
    setFilters({});
    setSearchQuery('');

    const response = await fetch('/api/mods');
    const data = await response.json();
    setMods(data.mods);
    setPagination(data.pagination);
    setFacets(data.facets);
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

    // Add category filter
    if (filters.category) {
      params.append('category', filters.category);
    } else {
      selectedCategories.forEach(cat => params.append('category', cat));
    }

    // Add gameVersion filter
    if (filters.gameVersion) {
      params.append('gameVersion', filters.gameVersion);
    } else {
      selectedGameVersions.forEach(ver => params.append('gameVersion', ver));
    }

    // Add other filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== 'category' && key !== 'gameVersion') {
        params.append(key, value.toString());
      }
    });

    return `/api/mods?${params.toString()}`;
  };

  // Quick filter handlers
  const handleQuickFilter = async (filterType: string) => {
    let newFilters = { ...filters };

    switch (filterType) {
      case 'trending':
        newFilters = { ...newFilters, sortBy: 'downloadCount', sortOrder: 'desc' as const };
        break;
      case 'newest':
        newFilters = { ...newFilters, sortBy: 'createdAt', sortOrder: 'desc' as const };
        break;
      case 'topRated':
        newFilters = { ...newFilters, sortBy: 'rating', sortOrder: 'desc' as const };
        break;
      case 'free':
        newFilters = { ...newFilters, isFree: true };
        break;
    }

    await handleFilterChange(newFilters);
  };

  // Quick filter tags data
  const quickFilters = [
    { id: 'trending', label: 'Trending', icon: TrendingUp, color: 'from-orange-500 to-red-500' },
    { id: 'newest', label: 'New Releases', icon: Clock, color: 'from-blue-500 to-cyan-500' },
    { id: 'topRated', label: 'Top Rated', icon: Star, color: 'from-yellow-500 to-amber-500' },
    { id: 'free', label: 'Free Mods', icon: Sparkles, color: 'from-emerald-500 to-green-500' },
  ];

  // Search suggestions
  const searchSuggestions = [
    { text: 'CAS Lighting', icon: Sparkles, type: 'trending' },
    { text: 'Lighting Overlay', icon: TrendingUp, type: 'trending' },
    { text: 'Custom CAS', icon: Tag, type: 'category' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Compact Header */}
      <div ref={headerRef} className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white shadow-2xl">
        <div className="max-w-[2000px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
          {/* Brand and Main Title */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <Crown className="w-6 h-6 text-yellow-400 animate-pulse" />
                <span className="text-sm font-semibold bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  MustHaveMods Premium
                </span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight mb-4">
                Discover Amazing{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 animate-gradient">
                  Sims 4 Mods
                </span>
              </h1>

              <div className="flex flex-wrap gap-4 text-sm text-white/90">
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">{pagination?.total || '10,000+'}+ Premium Mods</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">AI-Powered Discovery</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Curated Collections</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Integrated Search Section - Directly below header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-lg">
        <div className="max-w-[2000px] mx-auto px-6 sm:px-8 lg:px-12 py-6">
          {/* Enhanced Search Bar with Autocomplete */}
          <div ref={searchRef} className="relative max-w-4xl mx-auto">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 w-6 h-6 transition-colors duration-200" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchSuggestions(e.target.value.length > 0);
                }}
                onFocus={() => setShowSearchSuggestions(searchQuery.length > 0 || recentSearches.length > 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(searchQuery);
                  } else if (e.key === 'Escape') {
                    setShowSearchSuggestions(false);
                  }
                }}
                placeholder="Search mods, creators, and collections..."
                className="w-full pl-14 pr-32 py-5 text-base bg-white border-2 border-gray-200 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-400/30 focus:border-emerald-500 transition-all duration-300 shadow-sm hover:shadow-md"
              />
              <button
                onClick={() => handleSearch(searchQuery)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 px-8 py-3 rounded-xl text-base font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Search
              </button>
            </div>

            {/* Smart Search Suggestions Dropdown */}
            {showSearchSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 backdrop-blur-xl animate-fade-in max-w-4xl mx-auto">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="border-b border-gray-100">
                    <div className="px-5 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Recent Searches
                    </div>
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(search);
                          handleSearch(search);
                        }}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors group"
                      >
                        <Clock size={18} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-base text-gray-700 group-hover:text-gray-900">{search}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = recentSearches.filter((_, i) => i !== idx);
                            setRecentSearches(updated);
                            localStorage.setItem('recentSearches', JSON.stringify(updated));
                          }}
                          className="ml-auto p-1.5 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} className="text-gray-500" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}

                {/* Trending/Suggested Searches */}
                <div>
                  <div className="px-5 py-3 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    {searchQuery ? 'Suggestions' : 'Trending Searches'}
                  </div>
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(suggestion.text);
                        handleSearch(suggestion.text);
                      }}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <suggestion.icon size={18} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-base text-gray-700 group-hover:text-gray-900">{suggestion.text}</span>
                      <span className="ml-auto text-sm text-gray-400 px-3 py-1.5 bg-gray-100 rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                        {suggestion.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Filter Tags */}
          <div className="mt-6 flex flex-wrap gap-3 max-w-4xl mx-auto">
            {quickFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.id}
                  onClick={() => handleQuickFilter(filter.id)}
                  className={`group flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 active:scale-95 ${
                    (filter.id === 'free' && filters.isFree) ||
                    (filter.id === 'trending' && filters.sortBy === 'downloadCount') ||
                    (filter.id === 'newest' && filters.sortBy === 'createdAt') ||
                    (filter.id === 'topRated' && filters.sortBy === 'rating')
                      ? `bg-gradient-to-r ${filter.color} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon size={16} className={`${
                    (filter.id === 'free' && filters.isFree) ||
                    (filter.id === 'trending' && filters.sortBy === 'downloadCount') ||
                    (filter.id === 'newest' && filters.sortBy === 'createdAt') ||
                    (filter.id === 'topRated' && filters.sortBy === 'rating')
                      ? 'animate-pulse'
                      : ''
                  }`} />
                  {filter.label}
                </button>
              );
            })}
            {Object.keys(filters).length > 0 && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-xl text-sm font-semibold transition-all duration-200 border border-red-200"
              >
                <X size={16} />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>


      {/* Main Content Section */}
      <div className="py-10 px-6 sm:px-8 lg:px-12">
        <div className="max-w-[2000px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Enhanced Sticky Left Sidebar */}
            <div className="lg:w-96 flex-shrink-0">
              <div className="lg:sticky lg:top-24">
                <div className="bg-white border border-gray-200/50 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
                  {/* Sidebar Header */}
                  <div className="p-7 bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <FilterIcon size={18} className="text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Filters</h2>
                      </div>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="lg:hidden p-2 hover:bg-white/50 rounded-lg transition-colors"
                      >
                        <ChevronDown size={22} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      Refine your search results
                    </p>
                  </div>

                  {/* Filter Content */}
                  <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
                    <div className="p-7 space-y-8">
                      {/* Categories Section - Hierarchical Tree or Flat Fallback */}
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="font-bold text-base text-gray-900 uppercase tracking-wide">Categories</h3>
                          {(selectedCategoryPath || filters.category) && (
                            <button
                              onClick={() => {
                                setSelectedCategoryPath(undefined);
                                handleFilterChange({ ...filters, category: undefined });
                              }}
                              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="max-h-96 overflow-y-auto pr-2">
                          {/* Show hierarchical tree if available, otherwise fallback to flat list */}
                          {facets?.categoryTree && facets.categoryTree.length > 0 ? (
                            <CategoryTree
                              nodes={facets.categoryTree}
                              selectedPath={selectedCategoryPath}
                              onSelect={handleCategorySelect}
                            />
                          ) : (
                            // Fallback to flat category list
                            <div className="space-y-3">
                              {facets?.categories?.map((cat: any) => {
                                const isSelected = filters.category === cat.value;
                                return (
                                  <label
                                    key={cat.value}
                                    className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 group ${
                                      isSelected
                                        ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200'
                                        : 'hover:bg-gray-50 border-2 border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                        isSelected
                                          ? 'border-indigo-600 bg-indigo-600'
                                          : 'border-gray-300 group-hover:border-indigo-400'
                                      }`}>
                                        {isSelected && (
                                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleFilterChange({ ...filters, category: isSelected ? undefined : cat.value })}
                                        className="sr-only"
                                      />
                                      <span className={`text-base font-medium transition-colors ${
                                        isSelected ? 'text-indigo-900' : 'text-gray-700 group-hover:text-gray-900'
                                      }`}>
                                        {cat.value}
                                      </span>
                                    </div>
                                    <span className={`text-sm font-semibold px-3 py-1.5 rounded-full transition-colors ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                    }`}>
                                      {cat.count}
                                    </span>
                                  </label>
                                );
                              })}
                              {(!facets?.categories || facets.categories.length === 0) && (
                                <p className="text-sm text-gray-500 italic">Loading categories...</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Game Version Section */}
                      <div>
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="font-bold text-base text-gray-900 uppercase tracking-wide">Game Version</h3>
                          {filters.gameVersion && (
                            <button
                              onClick={() => handleFilterChange({ ...filters, gameVersion: undefined })}
                              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="space-y-3">
                          {facets?.gameVersions?.map((ver: any) => {
                            const isSelected = filters.gameVersion === ver.value;
                            return (
                              <label
                                key={ver.value}
                                className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 group ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200'
                                    : 'hover:bg-gray-50 border-2 border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-4">
                                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-600'
                                      : 'border-gray-300 group-hover:border-indigo-400'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleFilterChange({ ...filters, gameVersion: isSelected ? undefined : ver.value })}
                                    className="sr-only"
                                  />
                                  <span className={`text-base font-medium transition-colors ${
                                    isSelected ? 'text-indigo-900' : 'text-gray-700 group-hover:text-gray-900'
                                  }`}>
                                    {ver.value}
                                  </span>
                                </div>
                                <span className={`text-sm font-semibold px-3 py-1.5 rounded-full transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                }`}>
                                  {ver.count}
                                </span>
                              </label>
                            );
                          })}
                          {(!facets?.gameVersions || facets.gameVersions.length === 0) && (
                            <p className="text-sm text-gray-500 italic">Loading game versions...</p>
                          )}
                        </div>
                      </div>

                      {/* Price Section */}
                      <div>
                        <h3 className="font-bold text-base text-gray-900 uppercase tracking-wide mb-5">Price</h3>
                        <div className="space-y-3">
                          <label className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all duration-200 group ${
                            filters.isFree
                              ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}>
                            <div className="flex items-center gap-4">
                              <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                filters.isFree
                                  ? 'border-emerald-600 bg-emerald-600'
                                  : 'border-gray-300 group-hover:border-emerald-400'
                              }`}>
                                {filters.isFree && (
                                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <input
                                type="checkbox"
                                checked={filters.isFree === true}
                                onChange={(e) => handleFilterChange({ ...filters, isFree: e.target.checked ? true : undefined })}
                                className="sr-only"
                              />
                              <span className={`text-base font-medium transition-colors ${
                                filters.isFree ? 'text-emerald-900' : 'text-gray-700 group-hover:text-gray-900'
                              }`}>
                                Free Only
                              </span>
                            </div>
                            <span className={`text-sm font-semibold px-3 py-1.5 rounded-full transition-colors ${
                              filters.isFree
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                            }`}>
                              {facets?.priceRanges?.free || 0}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Clear All Filters Button */}
                      {Object.keys(filters).some(key => filters[key as keyof SearchFilters] !== undefined) && (
                        <button
                          onClick={clearAllFilters}
                          className="w-full mt-8 py-4 px-5 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-xl transition-all duration-200 text-base font-bold shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                        >
                          <X size={18} />
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Main Content */}
            <div className="flex-1 min-w-0">
              {/* Enhanced Results Header */}
              <div className="bg-white border border-gray-200/50 rounded-2xl shadow-xl p-8 mb-8 backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Results Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <h2 className="text-3xl font-bold text-gray-900">
                        {searchQuery ? (
                          <>
                            Results for <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">"{searchQuery}"</span>
                          </>
                        ) : (
                          'Featured Mods'
                        )}
                      </h2>
                    </div>
                    {pagination && (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2.5 text-base text-gray-600">
                          <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="font-semibold text-gray-900">{pagination.total}</span>
                          <span>mods found</span>
                        </div>
                        {Object.keys(filters).length > 0 && (
                          <span className="text-sm text-gray-500">• {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''} active</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                      <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Sort:</span>
                      <select
                        value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
                        onChange={async (e) => {
                          const [sortBy, sortOrder] = e.target.value.split('-');
                          await handleFilterChange({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                        }}
                        className="bg-transparent border-0 focus:ring-0 text-base font-medium text-gray-900 cursor-pointer pr-8"
                      >
                        <option value="createdAt-desc">Newest</option>
                        <option value="createdAt-asc">Oldest</option>
                        <option value="downloadCount-desc">Most Downloaded</option>
                        <option value="rating-desc">Top Rated</option>
                        <option value="title-asc">A-Z</option>
                        <option value="title-desc">Z-A</option>
                      </select>
                    </div>

                    {/* View Mode Toggle */}
                    <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
                      <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          viewMode === 'grid'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid size={20} />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          viewMode === 'list'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="List View"
                      >
                        <List size={20} />
                      </button>
                    </div>

                    {/* Grid Density (only show in grid view) */}
                    {viewMode === 'grid' && (
                      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
                        {[3, 4, 5].map((cols) => (
                          <button
                            key={cols}
                            onClick={() => setGridColumns(cols)}
                            className={`p-2.5 rounded-lg transition-all duration-200 ${
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
                    )}
                  </div>
                </div>

                {/* Active Filters Pills */}
                {(filters.category || filters.gameVersion || filters.isFree) && (
                  <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-gray-100">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Filters:</span>
                    {filters.category && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium border border-indigo-200">
                        <Tag size={14} />
                        {filters.category}
                        <button
                          onClick={() => handleFilterChange({ ...filters, category: undefined })}
                          className="hover:bg-indigo-200 rounded-full p-1 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )}
                    {filters.gameVersion && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium border border-blue-200">
                        <Tag size={14} />
                        {filters.gameVersion}
                        <button
                          onClick={() => handleFilterChange({ ...filters, gameVersion: undefined })}
                          className="hover:bg-blue-200 rounded-full p-1 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )}
                    {filters.isFree && (
                      <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
                        <Sparkles size={14} />
                        Free Only
                        <button
                          onClick={() => handleFilterChange({ ...filters, isFree: undefined })}
                          className="hover:bg-emerald-200 rounded-full p-1 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>

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
                <div className="flex justify-center mt-10">
                  <nav className="flex items-center space-x-3">
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
                      className="px-5 py-3 text-base font-medium text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md"
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
                          className={`px-5 py-3 text-base font-medium rounded-xl transition-all duration-200 ${
                                   page === pagination.page
                              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg transform scale-105'
                                     : 'text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm hover:shadow-md'
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
                      className="px-5 py-3 text-base font-medium rounded-xl bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-gray-600 shadow-sm hover:shadow-md"
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
