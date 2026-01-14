'use client';

import React from 'react';
import { ArrowUpDown, RotateCcw } from 'lucide-react';

interface FilterBarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  resultCount: number;
  facets: any;
  searchQuery?: string;
  onClearAllFilters?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  sortBy,
  onSortChange,
  searchQuery = '',
  onClearAllFilters
}) => {
  // Sort options
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'downloads', label: 'Most Downloads' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest Finds' }
  ];

  // Check if any filters are active
  const hasActiveFilters = selectedCategory !== 'All' || sortBy !== 'relevance' || searchQuery.trim() !== '';

  return (
    <div className="w-full sticky top-20 z-40 py-2 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="bg-mhm-card/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">

            {/* Left: Active Filters & Clear All Button */}
            {hasActiveFilters ? (
              <div className="flex items-center flex-wrap gap-3">
                {/* Active filter pills */}
                <div className="flex items-center flex-wrap gap-2">
                  {searchQuery && (
                    <span className="flex items-center gap-1 bg-sims-blue/20 text-sims-blue px-3 py-1.5 rounded-full border border-sims-blue/30 text-sm font-medium">
                      Search: "{searchQuery.length > 20 ? searchQuery.substring(0, 20) + '...' : searchQuery}"
                    </span>
                  )}
                  {selectedCategory !== 'All' && (
                    <span className="flex items-center gap-1 bg-sims-pink/20 text-sims-pink px-3 py-1.5 rounded-full border border-sims-pink/30 text-sm font-medium">
                      {selectedCategory}
                    </span>
                  )}
                  {sortBy !== 'relevance' && (
                    <span className="flex items-center gap-1 bg-blue-600/20 text-blue-300 px-3 py-1.5 rounded-full border border-blue-500/30 text-sm font-medium">
                      {sortOptions.find(opt => opt.value === sortBy)?.label}
                    </span>
                  )}
                </div>

                {/* Clear All Button */}
                {onClearAllFilters && (
                  <button
                    onClick={onClearAllFilters}
                    className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 px-4 py-2 rounded-full border border-red-500/30 hover:border-red-500/50 transition-all text-sm font-semibold group"
                    title="Clear all filters and show all mods"
                  >
                    <RotateCcw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                    Clear All
                  </button>
                )}
              </div>
            ) : (
              <div className="text-slate-400 text-sm">Use sidebar filters to refine results</div>
            )}

            {/* Right: Sort Dropdown */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              {/* Sort Dropdown */}
              <div className="relative group min-w-[160px]">
                <div className="flex items-center space-x-2 bg-black/20 hover:bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2.5 cursor-pointer transition-all">
                  <ArrowUpDown className="w-4 h-4 text-sims-purple" />
                  <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="bg-transparent text-base font-medium text-slate-300 outline-none appearance-none cursor-pointer w-full"
                  >
                    {sortOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-mhm-card text-slate-200 py-2">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
