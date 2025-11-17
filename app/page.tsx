'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SearchBar, SearchFilters } from '../components/SearchBar';
import { ModGrid } from '../components/ModGrid';
import { Mod } from '../lib/api';
import { Search, Crown, TrendingUp, Clock, Star, Filter as FilterIcon, X, ChevronDown, Grid3x3, LayoutGrid, List, Sparkles, Tag, Zap, SlidersHorizontal } from 'lucide-react';

export default function HomePage() {
  console.log('HomePage component rendering...');

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [gridColumns, setGridColumns] = useState(4);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Enhanced search features
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filterCounts, setFilterCounts] = useState<Record<string, number>>({});

  // Refs for sticky behavior
  const searchRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Direct state management instead of hooks
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

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

  // Test function to manually trigger API call
  const testApiCall = async () => {
    console.log('Manual API test triggered...');
    try {
      const response = await fetch('/api/mods');
      const data = await response.json();
      console.log('Manual API test success:', data);
      console.log('Manual test - First mod rating type:', typeof data.mods[0]?.rating, 'value:', data.mods[0]?.rating);
      setMods(data.mods);
      setPagination(data.pagination);
      setLoading(false);
    } catch (err) {
      console.error('Manual API test error:', err);
      setError(err instanceof Error ? err.message : 'Manual test failed');
    }
  };

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

  const handleFilterChange = async (newFilters: SearchFilters) => {
    setFilters(newFilters);
    try {
      setLoading(true);
      const params = new URLSearchParams();
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      
      const response = await fetch(`/api/mods?${params.toString()}`);
      const data = await response.json();
      console.log('Filter - First mod rating type:', typeof data.mods[0]?.rating, 'value:', data.mods[0]?.rating);
      setMods(data.mods);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Filter failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFavorite = (modId: string) => {
    setFavorites(prev => 
      prev.includes(modId) 
        ? prev.filter(id => id !== modId)
        : [...prev, modId]
    );
  };

  const handleCategoryClick = async (category: string) => {
    const newFilters = { ...filters, category };
    setFilters(newFilters);
    await handleFilterChange(newFilters);
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

  // Clear all filters
  const clearAllFilters = async () => {
    setFilters({});
    setSelectedCategories([]);
    setSearchQuery('');
    const response = await fetch('/api/mods');
    const data = await response.json();
    setMods(data.mods);
    setPagination(data.pagination);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50">
      {/* Sticky Enhanced Header */}
      <div ref={headerRef} className="sticky top-0 z-50 bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 text-white shadow-2xl">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Brand and Main Title */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex-1 max-w-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-xs font-semibold bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/20">
                  MustHaveMods Premium
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight">
                Discover Amazing{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-emerald-400 animate-gradient">
                  Sims 4 Mods
                </span>
              </h1>

              <div className="hidden sm:flex flex-wrap gap-3 mt-4 text-xs text-white/80">
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">{pagination?.total || '10,000+'}+ Premium Mods</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">AI-Powered Discovery</span>
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="font-medium">Curated Collections</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search Bar with Autocomplete */}
          <div ref={searchRef} className="relative max-w-3xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 w-5 h-5 transition-colors duration-200" />
              <input
                type="text"
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
                placeholder="Search 10,000+ mods, creators, and collections..."
                className="w-full pl-12 pr-24 py-4 text-sm bg-white/95 backdrop-blur-md border-0 rounded-2xl text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-emerald-400/50 focus:bg-white transition-all duration-300 shadow-xl"
              />
              <button
                onClick={() => handleSearch(searchQuery)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 px-6 py-2 rounded-xl text-sm font-semibold transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95"
              >
                Search
              </button>
            </div>

            {/* Smart Search Suggestions Dropdown */}
            {showSearchSuggestions && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 backdrop-blur-xl animate-fade-in">
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="border-b border-gray-100">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Recent Searches
                    </div>
                    {recentSearches.map((search, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSearchQuery(search);
                          handleSearch(search);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                      >
                        <Clock size={16} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">{search}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const updated = recentSearches.filter((_, i) => i !== idx);
                            setRecentSearches(updated);
                            localStorage.setItem('recentSearches', JSON.stringify(updated));
                          }}
                          className="ml-auto p-1 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} className="text-gray-500" />
                        </button>
                      </button>
                    ))}
                  </div>
                )}

                {/* Trending/Suggested Searches */}
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {searchQuery ? 'Suggestions' : 'Trending Searches'}
                  </div>
                  {searchSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSearchQuery(suggestion.text);
                        handleSearch(suggestion.text);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors group"
                    >
                      <suggestion.icon size={16} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                      <span className="text-sm text-gray-700 group-hover:text-gray-900">{suggestion.text}</span>
                      <span className="ml-auto text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded-full group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                        {suggestion.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Filter Tags */}
          <div className="mt-6 flex flex-wrap gap-2">
            {quickFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.id}
                  onClick={() => handleQuickFilter(filter.id)}
                  className={`group flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-300 hover:scale-105 active:scale-95 ${
                    (filter.id === 'free' && filters.isFree) ||
                    (filter.id === 'trending' && filters.sortBy === 'downloadCount') ||
                    (filter.id === 'newest' && filters.sortBy === 'createdAt') ||
                    (filter.id === 'topRated' && filters.sortBy === 'rating')
                      ? `bg-gradient-to-r ${filter.color} text-white shadow-lg`
                      : 'bg-white/10 text-white/90 hover:bg-white/20 backdrop-blur-sm'
                  }`}
                >
                  <Icon size={14} className={`${
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
                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-red-200 rounded-xl text-xs font-semibold transition-all duration-200 backdrop-blur-sm border border-red-500/20"
              >
                <X size={14} />
                Clear All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Debug Section - Enhanced */}
      <div className="py-1 px-6 bg-amber-50/50 border-b border-amber-200/50">
        <div className="max-w-7xl mx-auto">
          <details className="bg-amber-100/50 border border-amber-300/50 rounded-lg p-2">
            <summary className="text-xs font-medium text-amber-800 cursor-pointer">
              Debug Information (Click to expand)
            </summary>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-amber-700">
                     <div>
                       <p><strong>Mounted:</strong> {mounted ? 'Yes' : 'No'}</p>
                       <p><strong>Main Mods:</strong> {mods.length} items</p>
                       <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
                       <p><strong>Error:</strong> {error || 'None'}</p>
                     </div>
                     <div>
                       {mods.length > 0 && (
                         <div>
                           <p><strong>First Mod Title:</strong> {mods[0]?.title}</p>
                           <p><strong>First Mod Category:</strong> {mods[0]?.category}</p>
                           <p><strong>Total Mods:</strong> {pagination?.total || 'Unknown'}</p>
                         </div>
                       )}
                     </div>
                   </div>
            
                               {/* Test API Button */}
            <div className="mt-2 pt-2 border-t border-amber-300/50">
                     <button
                       onClick={async () => {
                         try {
                           console.log('Testing direct API call...');
                           const response = await fetch('/api/mods');
                           const data = await response.json();
                           console.log('Direct API response:', data);
                           alert(`API Test: Found ${data.mods.length} mods`);
                         } catch (err) {
                           console.error('Direct API test error:', err);
                           alert('API Test Failed: ' + err);
                         }
                       }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                     >
                       Test API Directly
                     </button>
                     
                     {/* Manual Test Button */}
                     <button
                       onClick={testApiCall}
                className="ml-2 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                     >
                       Manual Test
                     </button>
                   </div>
          </details>
        </div>
      </div>

      {/* Main Content Section */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Enhanced Sticky Left Sidebar */}
            <div className="lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-32">
                <div className="bg-white border border-gray-200/50 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm">
                  {/* Sidebar Header */}
                  <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                          <FilterIcon size={16} className="text-white" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Filters</h2>
                      </div>
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="lg:hidden p-2 hover:bg-white/50 rounded-lg transition-colors"
                      >
                        <ChevronDown size={20} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Refine your search results
                    </p>
                  </div>

                  {/* Filter Content */}
                  <div className={`${showFilters ? 'block' : 'hidden'} lg:block`}>
                    <div className="p-6 space-y-6">
                      {/* Categories Section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">Categories</h3>
                          {filters.category && (
                            <button
                              onClick={() => handleFilterChange({ ...filters, category: undefined })}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {['Build/Buy', 'CAS', 'Gameplay', 'Hair', 'Clothing', 'Furniture', 'Scripts'].map((category) => {
                            const count = Math.floor(Math.random() * 500) + 50; // Mock count
                            const isSelected = filters.category === category;
                            return (
                              <label
                                key={category}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200'
                                    : 'hover:bg-gray-50 border-2 border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-600'
                                      : 'border-gray-300 group-hover:border-indigo-400'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleCategoryClick(category)}
                                    className="sr-only"
                                  />
                                  <span className={`text-sm font-medium transition-colors ${
                                    isSelected ? 'text-indigo-900' : 'text-gray-700 group-hover:text-gray-900'
                                  }`}>
                                    {category}
                                  </span>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                }`}>
                                  {count}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Game Version Section */}
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">Game Version</h3>
                          {filters.gameVersion && (
                            <button
                              onClick={() => handleFilterChange({ ...filters, gameVersion: undefined })}
                              className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="space-y-2">
                          {['Sims 4', 'Sims 3', 'Sims 2'].map((version) => {
                            const count = version === 'Sims 4' ? 1850 : version === 'Sims 3' ? 450 : 120;
                            const isSelected = filters.gameVersion === version;
                            return (
                              <label
                                key={version}
                                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                                  isSelected
                                    ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200'
                                    : 'hover:bg-gray-50 border-2 border-transparent'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'border-indigo-600 bg-indigo-600'
                                      : 'border-gray-300 group-hover:border-indigo-400'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleFilterChange({ ...filters, gameVersion: version })}
                                    className="sr-only"
                                  />
                                  <span className={`text-sm font-medium transition-colors ${
                                    isSelected ? 'text-indigo-900' : 'text-gray-700 group-hover:text-gray-900'
                                  }`}>
                                    {version}
                                  </span>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
                                  isSelected
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                                }`}>
                                  {count}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Price Section */}
                      <div>
                        <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide mb-4">Price</h3>
                        <div className="space-y-2">
                          <label className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 group ${
                            filters.isFree
                              ? 'bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200'
                              : 'hover:bg-gray-50 border-2 border-transparent'
                          }`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                                filters.isFree
                                  ? 'border-emerald-600 bg-emerald-600'
                                  : 'border-gray-300 group-hover:border-emerald-400'
                              }`}>
                                {filters.isFree && (
                                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                              <span className={`text-sm font-medium transition-colors ${
                                filters.isFree ? 'text-emerald-900' : 'text-gray-700 group-hover:text-gray-900'
                              }`}>
                                Free Only
                              </span>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full transition-colors ${
                              filters.isFree
                                ? 'bg-emerald-600 text-white'
                                : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
                            }`}>
                              {mods.filter(m => m.isFree).length || 1200}
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Clear All Filters Button */}
                      {Object.keys(filters).some(key => filters[key as keyof SearchFilters] !== undefined) && (
                        <button
                          onClick={clearAllFilters}
                          className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-xl transition-all duration-200 text-sm font-bold shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                        >
                          <X size={16} />
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
              <div className="bg-white border border-gray-200/50 rounded-2xl shadow-xl p-6 mb-6 backdrop-blur-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Results Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-2xl font-bold text-gray-900">
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
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="font-semibold text-gray-900">{pagination.total}</span>
                          <span>mods found</span>
                        </div>
                        {Object.keys(filters).length > 0 && (
                          <span className="text-xs text-gray-500">• {Object.keys(filters).length} filter{Object.keys(filters).length > 1 ? 's' : ''} active</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Sort:</span>
                      <select
                        value={`${filters.sortBy || 'createdAt'}-${filters.sortOrder || 'desc'}`}
                        onChange={async (e) => {
                          const [sortBy, sortOrder] = e.target.value.split('-');
                          await handleFilterChange({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                        }}
                        className="bg-transparent border-0 focus:ring-0 text-sm font-medium text-gray-900 cursor-pointer pr-8"
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
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          viewMode === 'grid'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid size={18} />
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          viewMode === 'list'
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                        title="List View"
                      >
                        <List size={18} />
                      </button>
                    </div>

                    {/* Grid Density (only show in grid view) */}
                    {viewMode === 'grid' && (
                      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 border border-gray-200">
                        {[3, 4, 5].map((cols) => (
                          <button
                            key={cols}
                            onClick={() => setGridColumns(cols)}
                            className={`p-2 rounded-lg transition-all duration-200 ${
                              gridColumns === cols
                                ? 'bg-white text-indigo-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                            title={`${cols} columns`}
                          >
                            <div className={`grid gap-0.5 ${cols === 3 ? 'grid-cols-3' : cols === 4 ? 'grid-cols-4' : 'grid-cols-5'}`}>
                              {Array.from({ length: cols }, (_, i) => (
                                <div key={i} className="w-1 h-1 bg-current rounded-sm"></div>
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
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Filters:</span>
                    {filters.category && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium border border-indigo-200">
                        <Tag size={12} />
                        {filters.category}
                        <button
                          onClick={() => handleFilterChange({ ...filters, category: undefined })}
                          className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )}
                    {filters.gameVersion && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-200">
                        <Tag size={12} />
                        {filters.gameVersion}
                        <button
                          onClick={() => handleFilterChange({ ...filters, gameVersion: undefined })}
                          className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )}
                    {filters.isFree && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-200">
                        <Sparkles size={12} />
                        Free Only
                        <button
                          onClick={() => handleFilterChange({ ...filters, isFree: undefined })}
                          className="hover:bg-emerald-200 rounded-full p-0.5 transition-colors"
                        >
                          <X size={12} />
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
