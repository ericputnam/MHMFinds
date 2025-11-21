'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Filter, ArrowUpDown, ChevronDown, LayoutGrid, Check } from 'lucide-react';

interface FilterBarProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  sortBy: string;
  onSortChange: (sortBy: string) => void;
  resultCount: number;
  facets: any;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  resultCount,
  facets
}) => {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get category counts from facets
  const categoryCounts: Record<string, number> = {};

  // Add "All" category with total count
  categoryCounts['All'] = resultCount;

  if (facets?.categories) {
    facets.categories.forEach((cat: any) => {
      categoryCounts[cat.value] = cat.count || 0;
    });
  }

  // Available categories - use 'value' instead of 'name'
  const categories = ['All', ...(facets?.categories?.map((c: any) => c.value) || [])];

  // Sort options
  const sortOptions = [
    { value: 'relevance', label: 'Relevance' },
    { value: 'downloads', label: 'Most Downloads' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'newest', label: 'Newest Finds' }
  ];

  return (
    <div className="w-full sticky top-20 z-40 py-2 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="bg-mhm-card/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">

            {/* Left: Category Dropdown */}
            <div className="relative w-full lg:w-auto z-50" ref={dropdownRef}>
              <button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                className={`
                  w-full lg:w-64 flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all duration-200
                  ${isCategoryOpen
                    ? 'bg-white/10 border-sims-pink/50 text-white shadow-lg'
                    : 'bg-black/20 border-white/10 text-slate-300 hover:bg-white/5 hover:border-white/20'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg ${selectedCategory === 'All' ? 'bg-sims-pink' : 'bg-slate-700'}`}>
                    <LayoutGrid className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-sm">
                    {selectedCategory === 'All' ? 'All Categories' : selectedCategory}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   {selectedCategory !== 'All' && (
                     <span className="bg-sims-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                       {categoryCounts[selectedCategory] || 0}
                     </span>
                   )}
                   <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Dropdown Menu */}
              {isCategoryOpen && (
                <div className="absolute top-full left-0 mt-2 w-full lg:w-72 bg-[#1A202C] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                    {categories.map((cat) => {
                      const isActive = selectedCategory === cat;
                      const count = categoryCounts[cat] || 0;

                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            onCategoryChange(cat);
                            setIsCategoryOpen(false);
                          }}
                          className={`
                            w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all
                            ${isActive
                              ? 'bg-sims-pink/10 text-sims-pink font-bold'
                              : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                          `}
                        >
                          <span>{cat}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${isActive ? 'text-sims-pink' : 'text-slate-600'}`}>
                              {count}
                            </span>
                            {isActive && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Center: Active Filters (when present) */}
            {selectedCategory !== 'All' && (
              <div className="flex items-center flex-wrap gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-widest">
                <Filter className="w-3 h-3" />
                <span className="mr-1">Active:</span>
                <span className="flex items-center gap-1 bg-sims-pink/10 text-sims-pink px-2 py-0.5 rounded border border-sims-pink/20">
                  {selectedCategory}
                </span>
              </div>
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
                    className="bg-transparent text-sm font-medium text-slate-300 outline-none appearance-none cursor-pointer w-full"
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
