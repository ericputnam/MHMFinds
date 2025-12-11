'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight, SlidersHorizontal } from 'lucide-react';

interface FilterSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  facets: any;
  selectedCategories: string[];
  selectedGameVersions: string[];
  onCategoryToggle: (category: string) => void;
  onGameVersionToggle: (version: string) => void;
  onClearAll: () => void;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  isOpen,
  onClose,
  facets,
  selectedCategories,
  selectedGameVersions,
  onCategoryToggle,
  onGameVersionToggle,
  onClearAll,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['categories', 'gameVersions']));

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen lg:h-auto w-80 bg-mhm-card border-r border-white/5 z-50 transform transition-transform duration-300 overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-mhm-card border-b border-white/5 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-sims-purple" />
            <h2 className="text-lg font-bold text-white">Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Filter Content */}
        <div className="p-6 space-y-6">
          {/* Clear All Button */}
          {(selectedCategories.length > 0 || selectedGameVersions.length > 0) && (
            <button
              onClick={onClearAll}
              className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg text-base font-medium transition-colors"
            >
              Clear All Filters
            </button>
          )}

          {/* Categories Section */}
          {facets?.categories && facets.categories.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('categories')}
                className="w-full flex items-center justify-between text-left group"
              >
                <span className="text-base font-bold text-white uppercase tracking-wider">Categories</span>
                {expandedSections.has('categories') ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </button>

              {expandedSections.has('categories') && (
                <div className="space-y-2 pl-1">
                  {facets.categories.map((cat: any) => (
                    <label
                      key={cat.value}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(cat.value)}
                          onChange={() => onCategoryToggle(cat.value)}
                          className="w-4 h-4 rounded border-2 border-slate-600 bg-transparent checked:bg-sims-purple checked:border-sims-purple appearance-none cursor-pointer transition-all"
                        />
                        {selectedCategories.includes(cat.value) && (
                          <svg
                            className="absolute w-3 h-3 text-white pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-base text-slate-300 group-hover:text-white transition-colors flex-1">
                        {cat.value}
                      </span>
                      <span className="text-sm text-slate-500 font-medium">
                        {cat.count}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Game Versions Section */}
          {facets?.gameVersions && facets.gameVersions.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('gameVersions')}
                className="w-full flex items-center justify-between text-left group"
              >
                <span className="text-base font-bold text-white uppercase tracking-wider">Game Version</span>
                {expandedSections.has('gameVersions') ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </button>

              {expandedSections.has('gameVersions') && (
                <div className="space-y-2 pl-1">
                  {facets.gameVersions.map((version: any) => (
                    <label
                      key={version.value}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedGameVersions.includes(version.value)}
                          onChange={() => onGameVersionToggle(version.value)}
                          className="w-4 h-4 rounded border-2 border-slate-600 bg-transparent checked:bg-sims-blue checked:border-sims-blue appearance-none cursor-pointer transition-all"
                        />
                        {selectedGameVersions.includes(version.value) && (
                          <svg
                            className="absolute w-3 h-3 text-white pointer-events-none"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="text-base text-slate-300 group-hover:text-white transition-colors flex-1">
                        {version.value}
                      </span>
                      <span className="text-sm text-slate-500 font-medium">
                        {version.count}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sources Section */}
          {facets?.sources && facets.sources.length > 0 && (
            <div className="space-y-3">
              <button
                onClick={() => toggleSection('sources')}
                className="w-full flex items-center justify-between text-left group"
              >
                <span className="text-base font-bold text-white uppercase tracking-wider">Source</span>
                {expandedSections.has('sources') ? (
                  <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
                )}
              </button>

              {expandedSections.has('sources') && (
                <div className="space-y-2 pl-1">
                  {facets.sources.slice(0, 8).map((source: any) => (
                    <div
                      key={source.value}
                      className="flex items-center justify-between text-base"
                    >
                      <span className="text-slate-400">{source.value}</span>
                      <span className="text-sm text-slate-500 font-medium">
                        {source.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
