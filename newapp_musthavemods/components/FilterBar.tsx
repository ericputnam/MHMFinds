import React, { useState, useRef, useEffect } from 'react';
import { Category, SortOption, FilterState } from '../types';
import { Filter, ArrowUpDown, Sparkles, Layers, ChevronDown, LayoutGrid, Check } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  resultCount: number;
  categoryCounts: Record<string, number>;
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onFilterChange, resultCount, categoryCounts }) => {
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

  return (
    <div className="w-full sticky top-20 z-40 py-4 transition-all duration-300">
      <div className="container mx-auto px-4">
        <div className="bg-mhm-card/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/40">
          <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
            
            {/* Left: Category Dropdown (Replacing Pills) */}
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
                  <div className={`p-1.5 rounded-lg ${filters.category === Category.ALL ? 'bg-sims-pink' : 'bg-slate-700'}`}>
                    <LayoutGrid className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-medium text-sm">
                    {filters.category === Category.ALL ? 'All Categories' : filters.category}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   {filters.category !== Category.ALL && (
                     <span className="bg-sims-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                       {categoryCounts[filters.category] || 0}
                     </span>
                   )}
                   <ChevronDown className={`w-4 h-4 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                </div>
              </button>

              {/* Dropdown Menu */}
              {isCategoryOpen && (
                <div className="absolute top-full left-0 mt-2 w-full lg:w-72 bg-[#1A202C] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 space-y-1 max-h-80 overflow-y-auto custom-scrollbar">
                    {Object.values(Category).map((cat) => {
                      const isActive = filters.category === cat;
                      const count = categoryCounts[cat] || 0;
                      
                      // Optional: Hide empty categories if not active (uncomment if desired)
                      // if (count === 0 && !isActive) return null; 

                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            onFilterChange({ category: cat });
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

            {/* Right: Toggles & Sort */}
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              
              {/* Visual Style Toggles */}
              <div className="flex items-center bg-black/20 p-1 rounded-xl border border-white/5 ml-auto lg:ml-0">
                <button
                  onClick={() => onFilterChange({ 
                    showMaxisMatchOnly: !filters.showMaxisMatchOnly,
                    showAlphaOnly: false 
                  })}
                  className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all gap-2
                    ${filters.showMaxisMatchOnly 
                      ? 'bg-sims-green/20 text-sims-green border border-sims-green/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                      : 'text-slate-500 hover:text-slate-300'}
                  `}
                  title="Maxis Match Only"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="">Maxis Match</span>
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  onClick={() => onFilterChange({ 
                    showAlphaOnly: !filters.showAlphaOnly,
                    showMaxisMatchOnly: false 
                  })}
                  className={`flex items-center px-3 py-2 rounded-lg text-xs font-medium transition-all gap-2
                    ${filters.showAlphaOnly 
                      ? 'bg-sims-blue/20 text-sims-blue border border-sims-blue/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]' 
                      : 'text-slate-500 hover:text-slate-300'}
                  `}
                  title="Alpha CC Only"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="">Alpha</span>
                </button>
              </div>

              {/* Sort Dropdown */}
              <div className="relative group min-w-[160px]">
                <div className="flex items-center space-x-2 bg-black/20 hover:bg-white/5 border border-white/10 hover:border-white/20 rounded-xl px-3 py-2.5 cursor-pointer transition-all">
                  <ArrowUpDown className="w-4 h-4 text-sims-purple" />
                  <select
                    value={filters.sort}
                    onChange={(e) => onFilterChange({ sort: e.target.value as SortOption })}
                    className="bg-transparent text-sm font-medium text-slate-300 outline-none appearance-none cursor-pointer w-full"
                  >
                    {Object.values(SortOption).map((opt) => (
                      <option key={opt} value={opt} className="bg-mhm-card text-slate-200 py-2">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

            </div>
          </div>
          
          {/* Active Filters Feedback Line */}
          {(filters.showMaxisMatchOnly || filters.showAlphaOnly || filters.category !== Category.ALL) && (
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center flex-wrap gap-2 text-[10px] text-slate-500 font-medium uppercase tracking-widest animate-in slide-in-from-top-1">
              <Filter className="w-3 h-3" />
              <span className="mr-1">Active:</span>
              
              {filters.category !== Category.ALL && (
                <span className="flex items-center gap-1 bg-sims-pink/10 text-sims-pink px-2 py-0.5 rounded border border-sims-pink/20">
                  {filters.category}
                </span>
              )}
              
              {filters.showMaxisMatchOnly && (
                 <span className="flex items-center gap-1 bg-sims-green/10 text-sims-green px-2 py-0.5 rounded border border-sims-green/20">
                    Maxis Match
                 </span>
              )}
              
              {filters.showAlphaOnly && (
                <span className="flex items-center gap-1 bg-sims-blue/10 text-sims-blue px-2 py-0.5 rounded border border-sims-blue/20">
                    Alpha
                </span>
              )}

              <div className="flex-1"></div>
              <span className="text-slate-400 normal-case tracking-normal font-semibold">
                Showing {resultCount} Find{resultCount !== 1 && 's'}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};