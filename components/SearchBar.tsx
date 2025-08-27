'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, Sparkles, TrendingUp, Clock, Star, Download, Command } from 'lucide-react';

export interface SearchFilters {
  category?: string;
  gameVersion?: string;
  isFree?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  onFilterChange: (filters: SearchFilters) => void;
  className?: string;
}

export function SearchBar({ onSearch, onFilterChange, className = '' }: SearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Mock search suggestions
  const searchSuggestions = [
    { icon: TrendingUp, text: 'Trending Mods', query: 'trending' },
    { icon: Clock, text: 'Latest Releases', query: 'latest' },
    { icon: Star, text: 'Top Rated', query: 'top rated' },
    { icon: Download, text: 'Most Downloaded', query: 'popular' },
    { icon: Sparkles, text: 'AI Recommendations', query: 'ai' },
  ];

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      setShowSuggestions(false);
    }
  };

  const handleFilterChange = (key: keyof SearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== false);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Compact Single-Line Search */}
      <div className="relative" ref={searchRef}>
        <form onSubmit={handleSearch} className="relative group">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 group-focus-within:text-[#1e1b4b] transition-colors" size={18} />
            <input
              id="search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowSuggestions(e.target.value.length > 0); }}
              onFocus={() => { setIsSearchFocused(true); setShowSuggestions(searchQuery.length > 0); }}
              placeholder="Search for mods, creators, or content..."
              className="w-full pl-10 pr-20 py-2.5 text-sm bg-white/95 backdrop-blur-sm border-0 rounded-lg shadow-sm focus:ring-2 focus:ring-[#1e1b4b] focus:ring-offset-2 transition-all duration-200 font-['Poppins'] placeholder-gray-500 focus:outline-none"
            />
            <button type="submit" className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-[#1e1b4b] hover:bg-[#2d2852] text-white px-3 py-1 rounded-md font-medium transition-all duration-200 text-xs">
              Search
            </button>
          </div>
          <div className="absolute -bottom-5 left-0 text-xs text-white/70 font-['Poppins'] flex items-center gap-1">
            <Command size={10} />
            <span>⌘K</span>
          </div>
        </form>

        {/* Smart Search Suggestions */}
        {showSuggestions && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-100 overflow-hidden z-50">
            {searchSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => {
                  setSearchQuery(suggestion.query);
                  onSearch(suggestion.query);
                  setShowSuggestions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors text-sm"
              >
                <suggestion.icon size={16} className="text-gray-400" />
                <span className="text-gray-700">{suggestion.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Compact Quick Filters Row */}
      <div className="flex flex-wrap gap-2 justify-center">
        {['Trending', 'Newest', 'Top Rated', 'Most Downloaded'].map((filter) => (
          <button
            key={filter}
            onClick={() => onSearch(filter.toLowerCase())}
            className="px-3 py-1.5 bg-white/80 hover:bg-white text-gray-700 hover:text-gray-900 rounded-lg text-xs font-medium transition-all duration-200 hover:shadow-md backdrop-blur-sm"
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Compact Filter Toggle */}
      <div className="flex items-center justify-center">
        <button 
          onClick={() => setShowFilters(!showFilters)} 
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-medium transition-all duration-200 text-xs ${
            showFilters 
              ? 'bg-[#1e1b4b] text-white shadow-md' 
              : 'bg-white/20 text-white hover:bg-white/30 hover:shadow-sm'
          }`}
        >
          <Filter size={14} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {hasActiveFilters && (
            <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {Object.values(filters).filter(v => v !== undefined && v !== false).length}
            </span>
          )}
        </button>
        {hasActiveFilters && (
          <button 
            onClick={clearFilters} 
            className="ml-2 flex items-center gap-1 px-2 py-1.5 text-white/90 hover:text-white transition-colors text-xs bg-white/10 backdrop-blur-sm rounded-lg hover:bg-white/20"
          >
            <X size={12} />
            Clear
          </button>
        )}
      </div>

      {/* Collapsible Advanced Filters */}
      {showFilters && (
        <div className="bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg border border-white/20 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 font-['Poppins']">
                Category
              </label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1e1b4b] focus:border-[#1e1b4b] text-xs font-['Poppins']"
              >
                <option value="">All Categories</option>
                <option value="Build/Buy">Build/Buy</option>
                <option value="CAS">CAS</option>
                <option value="Gameplay">Gameplay</option>
                <option value="Hair">Hair</option>
                <option value="Clothing">Clothing</option>
                <option value="Furniture">Furniture</option>
                <option value="Scripts">Scripts</option>
              </select>
            </div>

            {/* Game Version Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 font-['Poppins']">
                Game Version
              </label>
              <select
                value={filters.gameVersion || ''}
                onChange={(e) => handleFilterChange('gameVersion', e.target.value || undefined)}
                className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#1e1b4b] focus:border-[#1e1b4b] text-xs font-['Poppins']"
              >
                <option value="">All Versions</option>
                <option value="Sims 4">Sims 4</option>
                <option value="Sims 3">Sims 3</option>
                <option value="Sims 2">Sims 2</option>
              </select>
            </div>

            {/* Price Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1 font-['Poppins']">
                Price
              </label>
              <label className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-50 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.isFree === true}
                  onChange={(e) => handleFilterChange('isFree', e.target.checked ? true : undefined)}
                  className="w-3 h-3 rounded border-gray-300 text-[#1e1b4b] focus:ring-[#1e1b4b] focus:ring-1"
                />
                <span className="text-xs text-gray-700 font-['Poppins']">Free Only</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
