'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

interface FacetValue {
  id: string;
  facetType: string;
  value: string;
  displayName: string;
  icon?: string;
  color?: string;
  count: number;
}

interface FacetGroup {
  [key: string]: FacetValue[];
}

interface FacetedSidebarProps {
  selectedFacets: {
    contentType?: string[];
    visualStyle?: string[];
    themes?: string[];
    ageGroups?: string[];
    genderOptions?: string[];
  };
  onFacetChange: (facetType: string, values: string[]) => void;
  onClearAll: () => void;
}

const FACET_TYPE_LABELS: Record<string, string> = {
  contentType: 'Content Type',
  visualStyle: 'Visual Style',
  themes: 'Theme & Vibe',
  ageGroups: 'Age Group',
  genderOptions: 'Gender',
};

const FACET_TYPE_ORDER = ['contentType', 'visualStyle', 'themes', 'ageGroups', 'genderOptions'];

export function FacetedSidebar({ selectedFacets, onFacetChange, onClearAll }: FacetedSidebarProps) {
  const [facets, setFacets] = useState<FacetGroup>({});
  const [loading, setLoading] = useState(true);
  // Only Content Type is expanded by default - other filters are collapsed to reduce sidebar clutter
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['contentType']));

  useEffect(() => {
    fetchFacets();
  }, []);

  const fetchFacets = async () => {
    try {
      const res = await fetch('/api/facets');
      const data = await res.json();
      setFacets(data.facets || {});
    } catch (error) {
      console.error('Failed to fetch facets:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleFacet = (facetType: string, value: string) => {
    const current = selectedFacets[facetType as keyof typeof selectedFacets] || [];
    const newValues = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onFacetChange(facetType, newValues);
  };

  const hasActiveFilters = Object.values(selectedFacets).some(arr => arr && arr.length > 0);

  const totalActiveFilters = Object.values(selectedFacets).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  if (loading) {
    return (
      <div className="w-64 bg-mhm-card rounded-xl p-4 animate-pulse">
        <div className="h-6 bg-white/10 rounded mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-4 bg-white/5 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-mhm-card border border-white/5 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <h3 className="text-white font-semibold">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-xs text-sims-pink hover:text-sims-pink/80 flex items-center gap-1"
          >
            Clear all ({totalActiveFilters})
          </button>
        )}
      </div>

      {/* Active Filters Pills */}
      {hasActiveFilters && (
        <div className="px-4 py-2 border-b border-white/5 flex flex-wrap gap-1.5">
          {Object.entries(selectedFacets).map(([type, values]) =>
            values?.map(value => {
              const facetValue = facets[type]?.find(f => f.value === value);
              return (
                <span
                  key={`${type}-${value}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-sims-pink/20 text-sims-pink text-xs rounded-full"
                >
                  {facetValue?.displayName || value}
                  <button
                    onClick={() => toggleFacet(type, value)}
                    className="hover:bg-sims-pink/30 rounded-full p-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })
          )}
        </div>
      )}

      {/* Facet Groups */}
      <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto">
        {FACET_TYPE_ORDER.map(facetType => {
          const values = facets[facetType];
          if (!values || values.length === 0) return null;

          const isExpanded = expandedGroups.has(facetType);
          const selectedValues = selectedFacets[facetType as keyof typeof selectedFacets] || [];
          const hasSelection = selectedValues.length > 0;

          return (
            <div key={facetType} className="mb-1">
              {/* Group Header */}
              <button
                onClick={() => toggleGroup(facetType)}
                className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                  hasSelection ? 'bg-sims-pink/10' : 'hover:bg-white/5'
                }`}
              >
                <span className={`text-sm font-medium ${hasSelection ? 'text-sims-pink' : 'text-slate-300'}`}>
                  {FACET_TYPE_LABELS[facetType]}
                  {hasSelection && (
                    <span className="ml-1.5 text-xs bg-sims-pink text-white px-1.5 py-0.5 rounded-full">
                      {selectedValues.length}
                    </span>
                  )}
                </span>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-slate-400" />
                ) : (
                  <ChevronRight size={16} className="text-slate-400" />
                )}
              </button>

              {/* Group Values */}
              {isExpanded && (
                <div className="mt-1 ml-2 space-y-0.5">
                  {values.slice(0, 20).map(facet => {
                    const isSelected = selectedValues.includes(facet.value);
                    return (
                      <button
                        key={facet.value}
                        onClick={() => toggleFacet(facetType, facet.value)}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-all ${
                          isSelected
                            ? 'bg-sims-pink/20 text-white'
                            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2 text-sm">
                          {facet.icon && <span className="text-xs">{facet.icon}</span>}
                          <span className={isSelected ? 'font-medium' : ''}>
                            {facet.displayName}
                          </span>
                        </span>
                        <span className={`text-xs ${isSelected ? 'text-sims-pink' : 'text-slate-500'}`}>
                          {facet.count > 0 ? facet.count : ''}
                        </span>
                      </button>
                    );
                  })}
                  {values.length > 20 && (
                    <div className="mt-2 pt-2 border-t border-white/5">
                      <button className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-sims-pink py-1.5 transition-colors">
                        <span className="bg-white/5 px-2 py-0.5 rounded-full">+{values.length - 20} more</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
