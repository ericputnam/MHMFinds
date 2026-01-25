'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  Download,
  Star,
  ExternalLink,
  Image as ImageIcon,
  RefreshCw,
  Tag,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

interface Mod {
  id: string;
  title: string;
  category: string;
  author: string | null;
  downloadCount: number;
  rating: number | null;
  isFeatured: boolean;
  isVerified: boolean;
  createdAt: string;
  thumbnail: string | null;
  downloadUrl: string | null;
  // Facet fields
  contentType: string | null;
  visualStyle: string | null;
  themes: string[];
}

interface FacetDefinition {
  id: string;
  facetType: string;
  value: string;
  displayName: string;
  icon: string | null;
  color: string | null;
  isActive: boolean;
}

export default function ModsManagementPage() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterCategory, setFilterCategory] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modToDelete, setModToDelete] = useState<string | null>(null);

  // Facet filters
  const [filterContentType, setFilterContentType] = useState('');
  const [filterVisualStyle, setFilterVisualStyle] = useState('');
  const [filterTheme, setFilterTheme] = useState('');
  const [filterMissingFacets, setFilterMissingFacets] = useState(false);
  const [missingFacetsCount, setMissingFacetsCount] = useState(0);

  // Facet definitions
  const [facetDefs, setFacetDefs] = useState<Record<string, FacetDefinition[]>>({});

  // Quick edit popover
  const [quickEditMod, setQuickEditMod] = useState<string | null>(null);
  const [quickEditType, setQuickEditType] = useState<'contentType' | 'visualStyle' | 'themes' | null>(null);
  const quickEditRef = useRef<HTMLDivElement>(null);

  // Image hover preview
  const [hoverImage, setHoverImage] = useState<{ url: string; title: string; x: number; y: number } | null>(null);

  // Bulk facet edit modal
  const [showBulkFacetModal, setShowBulkFacetModal] = useState(false);
  const [bulkContentType, setBulkContentType] = useState<{ mode: 'noChange' | 'set' | 'clear'; value: string }>({
    mode: 'noChange',
    value: '',
  });
  const [bulkVisualStyle, setBulkVisualStyle] = useState<{ mode: 'noChange' | 'set' | 'clear'; value: string }>({
    mode: 'noChange',
    value: '',
  });
  const [bulkThemes, setBulkThemes] = useState<{ mode: 'noChange' | 'set' | 'add' | 'clear'; values: string[] }>({
    mode: 'noChange',
    values: [],
  });
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Fetch facet definitions
  useEffect(() => {
    const fetchFacets = async () => {
      try {
        const response = await fetch('/api/admin/facets');
        if (response.ok) {
          const data = await response.json();
          setFacetDefs(data.grouped || {});
        }
      } catch (err) {
        console.error('Failed to fetch facet definitions:', err);
      }
    };
    fetchFacets();
  }, []);

  // Close quick edit on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (quickEditRef.current && !quickEditRef.current.contains(e.target as Node)) {
        setQuickEditMod(null);
        setQuickEditType(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchMods();
  }, [currentPage, searchQuery, filterCategory, filterContentType, filterVisualStyle, filterTheme, filterMissingFacets]);

  const fetchMods = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterCategory && { category: filterCategory }),
        ...(filterContentType && { contentType: filterContentType }),
        ...(filterVisualStyle && { visualStyle: filterVisualStyle }),
        ...(filterTheme && { theme: filterTheme }),
        ...(filterMissingFacets && { missingFacets: 'true' }),
      });

      const response = await fetch(`/api/admin/mods?${params}`);
      const data = await response.json();
      setMods(data.mods || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
      setMissingFacetsCount(data.missingFacetsCount || 0);
    } catch (error) {
      console.error('Failed to fetch mods:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedMods.size === mods.length) {
      setSelectedMods(new Set());
    } else {
      setSelectedMods(new Set(mods.map((m) => m.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedMods);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedMods(newSelected);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedMods.size} selected mods?`)) return;

    try {
      await fetch('/api/admin/mods/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedMods) }),
      });
      setSelectedMods(new Set());
      fetchMods();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const handleBulkUpdate = async (updates: Partial<Mod>) => {
    try {
      await fetch('/api/admin/mods/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedMods),
          updates,
        }),
      });
      setSelectedMods(new Set());
      fetchMods();
    } catch (error) {
      console.error('Bulk update failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/mods/${id}`, { method: 'DELETE' });
      fetchMods();
      setShowDeleteConfirm(false);
      setModToDelete(null);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Quick edit handlers
  const handleQuickEdit = async (modId: string, field: string, value: string | string[] | null) => {
    // Optimistic update
    setMods((prev) =>
      prev.map((m) => (m.id === modId ? { ...m, [field]: value } : m))
    );

    try {
      const response = await fetch(`/api/admin/mods/${modId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      setQuickEditMod(null);
      setQuickEditType(null);
    } catch (error) {
      console.error('Quick edit failed:', error);
      // Revert on failure
      fetchMods();
    }
  };

  // Bulk facet update
  const handleBulkFacetUpdate = async () => {
    setBulkUpdating(true);

    try {
      const payload: Record<string, unknown> = {
        modIds: Array.from(selectedMods),
      };

      // Content Type
      if (bulkContentType.mode === 'set') {
        payload.contentType = bulkContentType.value;
      } else if (bulkContentType.mode === 'clear') {
        payload.contentType = null;
      }

      // Visual Style
      if (bulkVisualStyle.mode === 'set') {
        payload.visualStyle = bulkVisualStyle.value;
      } else if (bulkVisualStyle.mode === 'clear') {
        payload.visualStyle = null;
      }

      // Themes
      if (bulkThemes.mode !== 'noChange') {
        payload.themes = {
          mode: bulkThemes.mode,
          values: bulkThemes.values,
        };
      }

      const response = await fetch('/api/admin/mods/bulk-facets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Bulk update failed');
      }

      setShowBulkFacetModal(false);
      setSelectedMods(new Set());
      setBulkContentType({ mode: 'noChange', value: '' });
      setBulkVisualStyle({ mode: 'noChange', value: '' });
      setBulkThemes({ mode: 'noChange', values: [] });
      fetchMods();
    } catch (error) {
      console.error('Bulk facet update failed:', error);
    } finally {
      setBulkUpdating(false);
    }
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setFilterCategory('');
    setFilterContentType('');
    setFilterVisualStyle('');
    setFilterTheme('');
    setFilterMissingFacets(false);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery || filterCategory || filterContentType || filterVisualStyle || filterTheme || filterMissingFacets;

  // Helper to get facet display name
  const getFacetDisplay = (facetType: string, value: string | null): { name: string; color: string | null } => {
    if (!value) return { name: '—', color: null };
    const facet = (facetDefs[facetType] || []).find((f) => f.value === value);
    return {
      name: facet ? `${facet.icon || ''} ${facet.displayName}`.trim() : value,
      color: facet?.color || null,
    };
  };

  const getActiveFacets = (facetType: string): FacetDefinition[] => {
    return (facetDefs[facetType] || []).filter((f) => f.isActive);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Mods Management</h1>
          <p className="text-slate-400">Manage all mods in the database ({total} total)</p>
        </div>
        <Link
          href="/admin/mods/new"
          className="flex items-center gap-2 px-6 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold rounded-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Add New Mod
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search mods..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
            />
          </div>

          {/* Content Type Filter */}
          <div className="relative">
            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={filterContentType}
              onChange={(e) => setFilterContentType(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent appearance-none"
            >
              <option value="">All Content Types</option>
              {getActiveFacets('contentType').map((f) => (
                <option key={f.id} value={f.value}>
                  {f.icon || ''} {f.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Visual Style Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={filterVisualStyle}
              onChange={(e) => setFilterVisualStyle(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent appearance-none"
            >
              <option value="">All Visual Styles</option>
              {getActiveFacets('visualStyle').map((f) => (
                <option key={f.id} value={f.value}>
                  {f.icon || ''} {f.displayName}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={filterTheme}
              onChange={(e) => setFilterTheme(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent appearance-none"
            >
              <option value="">All Themes</option>
              {getActiveFacets('themes').map((f) => (
                <option key={f.id} value={f.value}>
                  {f.icon || ''} {f.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Second row of filters */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          {/* Missing Facets Filter */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filterMissingFacets}
              onChange={(e) => setFilterMissingFacets(e.target.checked)}
              className="w-4 h-4 text-sims-pink bg-slate-800 border-slate-600 rounded focus:ring-sims-pink"
            />
            <span className="text-sm text-slate-300 flex items-center gap-1">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              Missing Facets Only
              {missingFacetsCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-semibold">
                  {missingFacetsCount}
                </span>
              )}
            </span>
          </label>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Clear All Filters
            </button>
          )}

          {/* Bulk Actions */}
          {selectedMods.size > 0 && (
            <div className="flex gap-2 ml-auto">
              <button
                onClick={() => setShowBulkFacetModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-sims-blue/10 text-sims-blue border border-sims-blue/20 rounded-lg hover:bg-sims-blue/20 transition-colors"
              >
                <Tag className="h-4 w-4" />
                Edit Facets ({selectedMods.size})
              </button>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                Delete ({selectedMods.size})
              </button>
              <button
                onClick={() => handleBulkUpdate({ isFeatured: true })}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
              >
                <Star className="h-4 w-4" />
                Feature
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mods Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-4 py-4 text-left">
                  <button onClick={toggleSelectAll}>
                    {selectedMods.size === mods.length && mods.length > 0 ? (
                      <CheckSquare className="h-5 w-5 text-sims-pink" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">Mod</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">Content Type</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">Visual Style</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">Themes</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">Stats</th>
                <th className="px-4 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-4 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading mods...
                  </td>
                </tr>
              ) : mods.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No mods found
                  </td>
                </tr>
              ) : (
                mods.map((mod) => {
                  const contentTypeDisplay = getFacetDisplay('contentType', mod.contentType);
                  const visualStyleDisplay = getFacetDisplay('visualStyle', mod.visualStyle);

                  return (
                    <tr key={mod.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <button onClick={() => toggleSelect(mod.id)}>
                          {selectedMods.has(mod.id) ? (
                            <CheckSquare className="h-5 w-5 text-sims-pink" />
                          ) : (
                            <Square className="h-5 w-5 text-slate-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {mod.thumbnail ? (
                            <div
                              className="relative"
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setHoverImage({
                                  url: mod.thumbnail!,
                                  title: mod.title,
                                  x: rect.right + 10,
                                  y: rect.top,
                                });
                              }}
                              onMouseLeave={() => setHoverImage(null)}
                            >
                              <img
                                src={mod.thumbnail}
                                alt={mod.title}
                                className="w-12 h-12 rounded-lg object-cover cursor-zoom-in"
                              />
                            </div>
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-slate-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white truncate max-w-[200px]">{mod.title}</p>
                            <p className="text-sm text-slate-400">{mod.author || 'Unknown'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Content Type - Quick Edit */}
                      <td className="px-4 py-4 relative">
                        <button
                          onClick={() => {
                            setQuickEditMod(mod.id);
                            setQuickEditType('contentType');
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            mod.contentType
                              ? 'hover:opacity-80'
                              : 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20'
                          }`}
                          style={
                            mod.contentType && contentTypeDisplay.color
                              ? { backgroundColor: `${contentTypeDisplay.color}20`, color: contentTypeDisplay.color }
                              : undefined
                          }
                        >
                          {contentTypeDisplay.name}
                        </button>

                        {/* Quick Edit Popover */}
                        {quickEditMod === mod.id && quickEditType === 'contentType' && (
                          <div
                            ref={quickEditRef}
                            className="absolute z-50 top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 min-w-[180px]"
                          >
                            <button
                              onClick={() => handleQuickEdit(mod.id, 'contentType', null)}
                              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 rounded"
                            >
                              — Clear —
                            </button>
                            {getActiveFacets('contentType').map((f) => (
                              <button
                                key={f.id}
                                onClick={() => handleQuickEdit(mod.id, 'contentType', f.value)}
                                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 ${
                                  mod.contentType === f.value
                                    ? 'bg-sims-pink/20 text-sims-pink'
                                    : 'text-white hover:bg-slate-700'
                                }`}
                              >
                                {f.icon && <span>{f.icon}</span>}
                                {f.displayName}
                                {mod.contentType === f.value && <Check className="h-3 w-3 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Visual Style - Quick Edit */}
                      <td className="px-4 py-4 relative">
                        <button
                          onClick={() => {
                            setQuickEditMod(mod.id);
                            setQuickEditType('visualStyle');
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            mod.visualStyle
                              ? 'hover:opacity-80'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                          style={
                            mod.visualStyle && visualStyleDisplay.color
                              ? { backgroundColor: `${visualStyleDisplay.color}20`, color: visualStyleDisplay.color }
                              : undefined
                          }
                        >
                          {visualStyleDisplay.name}
                        </button>

                        {quickEditMod === mod.id && quickEditType === 'visualStyle' && (
                          <div
                            ref={quickEditRef}
                            className="absolute z-50 top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 min-w-[180px]"
                          >
                            <button
                              onClick={() => handleQuickEdit(mod.id, 'visualStyle', null)}
                              className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-700 rounded"
                            >
                              — Clear —
                            </button>
                            {getActiveFacets('visualStyle').map((f) => (
                              <button
                                key={f.id}
                                onClick={() => handleQuickEdit(mod.id, 'visualStyle', f.value)}
                                className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 ${
                                  mod.visualStyle === f.value
                                    ? 'bg-sims-pink/20 text-sims-pink'
                                    : 'text-white hover:bg-slate-700'
                                }`}
                              >
                                {f.icon && <span>{f.icon}</span>}
                                {f.displayName}
                                {mod.visualStyle === f.value && <Check className="h-3 w-3 ml-auto" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Themes - Quick Edit */}
                      <td className="px-4 py-4 relative">
                        <button
                          onClick={() => {
                            setQuickEditMod(mod.id);
                            setQuickEditType('themes');
                          }}
                          className="flex flex-wrap gap-1 max-w-[150px]"
                        >
                          {mod.themes.length === 0 ? (
                            <span className="px-2 py-1 bg-slate-700 text-slate-400 rounded text-xs">
                              No themes
                            </span>
                          ) : (
                            mod.themes.slice(0, 2).map((theme) => {
                              const themeDisplay = getFacetDisplay('themes', theme);
                              return (
                                <span
                                  key={theme}
                                  className="px-2 py-0.5 rounded text-xs font-medium"
                                  style={
                                    themeDisplay.color
                                      ? { backgroundColor: `${themeDisplay.color}20`, color: themeDisplay.color }
                                      : { backgroundColor: '#6366f120', color: '#6366f1' }
                                  }
                                >
                                  {themeDisplay.name}
                                </span>
                              );
                            })
                          )}
                          {mod.themes.length > 2 && (
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded text-xs">
                              +{mod.themes.length - 2}
                            </span>
                          )}
                        </button>

                        {quickEditMod === mod.id && quickEditType === 'themes' && (
                          <div
                            ref={quickEditRef}
                            className="absolute z-50 top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-2 min-w-[200px] max-h-[300px] overflow-y-auto"
                          >
                            <div className="text-xs text-slate-400 px-3 py-1 mb-1">
                              Click to toggle themes
                            </div>
                            {getActiveFacets('themes').map((f) => {
                              const isSelected = mod.themes.includes(f.value);
                              return (
                                <button
                                  key={f.id}
                                  onClick={() => {
                                    const newThemes = isSelected
                                      ? mod.themes.filter((t) => t !== f.value)
                                      : [...mod.themes, f.value];
                                    handleQuickEdit(mod.id, 'themes', newThemes);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm rounded flex items-center gap-2 ${
                                    isSelected
                                      ? 'bg-sims-pink/20 text-sims-pink'
                                      : 'text-white hover:bg-slate-700'
                                  }`}
                                >
                                  {f.icon && <span>{f.icon}</span>}
                                  {f.displayName}
                                  {isSelected && <Check className="h-3 w-3 ml-auto" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <Download className="h-4 w-4" />
                            <span>{mod.downloadCount}</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-400 text-sm">
                            <Star className="h-4 w-4" />
                            <span>{typeof mod.rating === 'number' ? mod.rating.toFixed(1) : 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-1">
                          {mod.isFeatured && (
                            <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-xs font-medium">
                              Featured
                            </span>
                          )}
                          {mod.isVerified && (
                            <span className="px-2 py-0.5 bg-green-500/10 text-green-500 rounded text-xs font-medium">
                              Verified
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/admin/mods/${mod.id}/edit`}
                            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4 text-slate-400" />
                          </Link>
                          {mod.downloadUrl && (
                            <a
                              href={mod.downloadUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                              title="View"
                            >
                              <ExternalLink className="h-4 w-4 text-slate-400" />
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setModToDelete(mod.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-slate-400">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && modToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Delete</h3>
            <p className="text-slate-300 mb-6">
              Are you sure you want to delete this mod? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(modToDelete)}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setModToDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Hover Preview */}
      {hoverImage && (
        <div
          className="fixed z-[100] pointer-events-none"
          style={{
            left: Math.min(hoverImage.x, window.innerWidth - 420),
            top: Math.max(10, Math.min(hoverImage.y, window.innerHeight - 480)),
          }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl max-w-[400px]">
            <img
              src={hoverImage.url}
              alt="Preview"
              className="w-96 h-96 object-contain rounded-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <p className="mt-2 text-white font-medium text-sm leading-snug">
              {hoverImage.title}
            </p>
          </div>
        </div>
      )}

      {/* Bulk Facet Edit Modal */}
      {showBulkFacetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">
                Bulk Edit Facets ({selectedMods.size} mods)
              </h3>
              <button
                onClick={() => setShowBulkFacetModal(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Content Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Content Type
                </label>
                <div className="flex gap-2 mb-2">
                  {(['noChange', 'set', 'clear'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBulkContentType({ ...bulkContentType, mode })}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        bulkContentType.mode === mode
                          ? 'bg-sims-pink text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {mode === 'noChange' ? 'No Change' : mode === 'set' ? 'Set To' : 'Clear'}
                    </button>
                  ))}
                </div>
                {bulkContentType.mode === 'set' && (
                  <select
                    value={bulkContentType.value}
                    onChange={(e) => setBulkContentType({ ...bulkContentType, value: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Select Content Type...</option>
                    {getActiveFacets('contentType').map((f) => (
                      <option key={f.id} value={f.value}>
                        {f.icon || ''} {f.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Visual Style */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Visual Style
                </label>
                <div className="flex gap-2 mb-2">
                  {(['noChange', 'set', 'clear'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBulkVisualStyle({ ...bulkVisualStyle, mode })}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        bulkVisualStyle.mode === mode
                          ? 'bg-sims-pink text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {mode === 'noChange' ? 'No Change' : mode === 'set' ? 'Set To' : 'Clear'}
                    </button>
                  ))}
                </div>
                {bulkVisualStyle.mode === 'set' && (
                  <select
                    value={bulkVisualStyle.value}
                    onChange={(e) => setBulkVisualStyle({ ...bulkVisualStyle, value: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="">Select Visual Style...</option>
                    {getActiveFacets('visualStyle').map((f) => (
                      <option key={f.id} value={f.value}>
                        {f.icon || ''} {f.displayName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Themes */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Themes
                </label>
                <div className="flex gap-2 mb-2">
                  {(['noChange', 'set', 'add', 'clear'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setBulkThemes({ ...bulkThemes, mode })}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        bulkThemes.mode === mode
                          ? 'bg-sims-pink text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {mode === 'noChange'
                        ? 'No Change'
                        : mode === 'set'
                        ? 'Replace'
                        : mode === 'add'
                        ? 'Add'
                        : 'Clear'}
                    </button>
                  ))}
                </div>
                {(bulkThemes.mode === 'set' || bulkThemes.mode === 'add') && (
                  <div className="flex flex-wrap gap-2 p-3 bg-slate-800 border border-slate-700 rounded-lg">
                    {getActiveFacets('themes').map((f) => {
                      const isSelected = bulkThemes.values.includes(f.value);
                      return (
                        <button
                          key={f.id}
                          onClick={() => {
                            setBulkThemes({
                              ...bulkThemes,
                              values: isSelected
                                ? bulkThemes.values.filter((v) => v !== f.value)
                                : [...bulkThemes.values, f.value],
                            });
                          }}
                          className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-sims-pink text-white'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                        >
                          {f.icon || ''} {f.displayName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preview */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                <p className="text-sm font-semibold text-slate-300 mb-2">Preview Changes:</p>
                <ul className="text-sm text-slate-400 space-y-1">
                  {bulkContentType.mode !== 'noChange' && (
                    <li>
                      Content Type:{' '}
                      {bulkContentType.mode === 'clear'
                        ? 'Will be cleared'
                        : `Set to "${bulkContentType.value || '(select value)'}"`}
                    </li>
                  )}
                  {bulkVisualStyle.mode !== 'noChange' && (
                    <li>
                      Visual Style:{' '}
                      {bulkVisualStyle.mode === 'clear'
                        ? 'Will be cleared'
                        : `Set to "${bulkVisualStyle.value || '(select value)'}"`}
                    </li>
                  )}
                  {bulkThemes.mode !== 'noChange' && (
                    <li>
                      Themes:{' '}
                      {bulkThemes.mode === 'clear'
                        ? 'Will be cleared'
                        : bulkThemes.mode === 'add'
                        ? `Add: ${bulkThemes.values.join(', ') || '(select themes)'}`
                        : `Replace with: ${bulkThemes.values.join(', ') || '(select themes)'}`}
                    </li>
                  )}
                  {bulkContentType.mode === 'noChange' &&
                    bulkVisualStyle.mode === 'noChange' &&
                    bulkThemes.mode === 'noChange' && (
                      <li className="text-slate-500 italic">No changes selected</li>
                    )}
                </ul>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleBulkFacetUpdate}
                disabled={
                  bulkUpdating ||
                  (bulkContentType.mode === 'noChange' &&
                    bulkVisualStyle.mode === 'noChange' &&
                    bulkThemes.mode === 'noChange')
                }
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sims-pink hover:bg-sims-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
              >
                {bulkUpdating ? 'Updating...' : 'Apply Changes'}
              </button>
              <button
                onClick={() => setShowBulkFacetModal(false)}
                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
