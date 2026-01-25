'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Tag, Save, X, Check, XCircle } from 'lucide-react';

interface FacetDefinition {
  id: string;
  facetType: string;
  value: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  modCount: number;
  createdAt: string;
  updatedAt: string;
}

type FacetType = 'contentType' | 'visualStyle' | 'themes' | 'ageGroups' | 'genderOptions' | 'occultTypes' | 'packRequirements';

// Emoji and color suggestions based on common facet values
const FACET_SUGGESTIONS: Record<string, { icon: string; color: string }> = {
  // Content Types
  hair: { icon: '💇', color: '#8B5CF6' },
  furniture: { icon: '🪑', color: '#F59E0B' },
  decor: { icon: '🖼️', color: '#EC4899' },
  clothing: { icon: '👗', color: '#EF4444' },
  tops: { icon: '👕', color: '#3B82F6' },
  bottoms: { icon: '👖', color: '#6366F1' },
  shoes: { icon: '👟', color: '#10B981' },
  accessories: { icon: '💍', color: '#F472B6' },
  makeup: { icon: '💄', color: '#EC4899' },
  skin: { icon: '✨', color: '#FBBF24' },
  eyes: { icon: '👁️', color: '#06B6D4' },
  eyebrows: { icon: '🤨', color: '#78716C' },
  lashes: { icon: '👁️', color: '#1F2937' },
  lipstick: { icon: '💋', color: '#DC2626' },
  blush: { icon: '🌸', color: '#FB7185' },
  eyeshadow: { icon: '🎨', color: '#A855F7' },
  nails: { icon: '💅', color: '#F43F5E' },
  poses: { icon: '🧘', color: '#8B5CF6' },
  animations: { icon: '🎬', color: '#F97316' },
  // Rooms
  kitchen: { icon: '🍳', color: '#EAB308' },
  bathroom: { icon: '🛁', color: '#0EA5E9' },
  bedroom: { icon: '🛏️', color: '#A78BFA' },
  'living-room': { icon: '🛋️', color: '#84CC16' },
  dining: { icon: '🍽️', color: '#F59E0B' },
  office: { icon: '💼', color: '#6B7280' },
  outdoor: { icon: '🌳', color: '#22C55E' },
  // Build
  walls: { icon: '🧱', color: '#92400E' },
  floors: { icon: '🟫', color: '#78716C' },
  windows: { icon: '🪟', color: '#60A5FA' },
  doors: { icon: '🚪', color: '#A16207' },
  roofing: { icon: '🏠', color: '#B45309' },
  lighting: { icon: '💡', color: '#FDE047' },
  // Themes
  modern: { icon: '🏢', color: '#6B7280' },
  vintage: { icon: '📻', color: '#D97706' },
  boho: { icon: '🌻', color: '#F59E0B' },
  minimalist: { icon: '⬜', color: '#E5E7EB' },
  luxury: { icon: '👑', color: '#EAB308' },
  cottagecore: { icon: '🌿', color: '#86EFAC' },
  goth: { icon: '🦇', color: '#1F2937' },
  romantic: { icon: '💕', color: '#FB7185' },
  halloween: { icon: '🎃', color: '#F97316' },
  christmas: { icon: '🎄', color: '#16A34A' },
  summer: { icon: '☀️', color: '#FACC15' },
  winter: { icon: '❄️', color: '#93C5FD' },
  holidays: { icon: '🎉', color: '#EC4899' },
  // Visual Styles
  'maxis-match': { icon: '🎮', color: '#10B981' },
  alpha: { icon: '✨', color: '#8B5CF6' },
  // Age Groups
  toddler: { icon: '👶', color: '#FB923C' },
  child: { icon: '🧒', color: '#34D399' },
  teen: { icon: '🧑', color: '#60A5FA' },
  adult: { icon: '🧑‍🦰', color: '#8B5CF6' },
  elder: { icon: '👴', color: '#9CA3AF' },
  // Gender
  masculine: { icon: '♂️', color: '#3B82F6' },
  feminine: { icon: '♀️', color: '#EC4899' },
  unisex: { icon: '⚧️', color: '#A855F7' },
  // Lots
  residential: { icon: '🏡', color: '#22C55E' },
  commercial: { icon: '🏪', color: '#3B82F6' },
  community: { icon: '🏛️', color: '#8B5CF6' },
  // Other
  'full-body': { icon: '👔', color: '#6366F1' },
  swimwear: { icon: '👙', color: '#06B6D4' },
  sleepwear: { icon: '😴', color: '#A78BFA' },
  athletic: { icon: '🏃', color: '#EF4444' },
  career: { icon: '💼', color: '#475569' },
  pet: { icon: '🐕', color: '#F59E0B' },
  vehicle: { icon: '🚗', color: '#6366F1' },
  plants: { icon: '🌱', color: '#22C55E' },
};

// Function to get emoji/color suggestion based on facet value
const getSuggestion = (value: string): { icon: string; color: string } => {
  const normalized = value.toLowerCase().replace(/\s+/g, '-');

  // Direct match
  if (FACET_SUGGESTIONS[normalized]) {
    return FACET_SUGGESTIONS[normalized];
  }

  // Partial match
  for (const [key, suggestion] of Object.entries(FACET_SUGGESTIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return suggestion;
    }
  }

  // Default
  return { icon: '🏷️', color: '#6366F1' };
};

const FACET_TYPES: { value: FacetType; label: string; description: string }[] = [
  { value: 'contentType', label: 'Content Type', description: 'What IS this mod? (e.g., hair, furniture, makeup)' },
  { value: 'visualStyle', label: 'Visual Style', description: 'Art style of the mod (e.g., alpha, maxis-match)' },
  { value: 'themes', label: 'Themes', description: 'Aesthetic/vibe of the mod (e.g., cottagecore, goth)' },
  { value: 'ageGroups', label: 'Age Groups', description: 'Which sim ages this mod works with' },
  { value: 'genderOptions', label: 'Gender Options', description: 'Body frame compatibility' },
  { value: 'occultTypes', label: 'Occult Types', description: 'Special sim type compatibility' },
  { value: 'packRequirements', label: 'Pack Requirements', description: 'Required game packs' },
];

export default function FacetDefinitionsPage() {
  const [facets, setFacets] = useState<FacetDefinition[]>([]);
  const [grouped, setGrouped] = useState<Record<string, FacetDefinition[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FacetType>('contentType');
  const [editingFacet, setEditingFacet] = useState<FacetDefinition | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFacet, setNewFacet] = useState({
    facetType: 'contentType' as FacetType,
    value: '',
    displayName: '',
    description: '',
    icon: '',
    color: '#6366f1',
    sortOrder: 0,
    isActive: true,
  });

  useEffect(() => {
    fetchFacets();
  }, []);

  const fetchFacets = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/facets');
      if (!response.ok) {
        throw new Error('Failed to fetch facets');
      }
      const data = await response.json();
      setFacets(data.facets || []);
      setGrouped(data.grouped || {});
    } catch (err) {
      console.error('Failed to fetch facets:', err);
      setError('Failed to load facet definitions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/facets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newFacet,
          description: newFacet.description || null,
          icon: newFacet.icon || null,
          color: newFacet.color || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create facet');
      }

      setShowAddForm(false);
      setNewFacet({
        facetType: activeTab,
        value: '',
        displayName: '',
        description: '',
        icon: '',
        color: '#6366f1',
        sortOrder: 0,
        isActive: true,
      });
      fetchFacets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create facet');
    }
  };

  const handleUpdate = async (facet: FacetDefinition) => {
    try {
      setError(null);
      const payload = {
        value: facet.value,
        displayName: facet.displayName,
        description: facet.description,
        icon: facet.icon,
        color: facet.color,
        sortOrder: facet.sortOrder,
        isActive: facet.isActive,
      };

      console.log('[Taxonomy] Updating facet:', facet.id, payload);

      const response = await fetch(`/api/admin/facets/${facet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      console.log('[Taxonomy] Update response:', response.status, data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update facet');
      }

      setEditingFacet(null);
      fetchFacets();
    } catch (err) {
      console.error('[Taxonomy] Update error:', err);
      setError(err instanceof Error ? err.message : 'Failed to update facet');
    }
  };

  const handleToggleActive = async (facet: FacetDefinition) => {
    try {
      setError(null);
      const response = await fetch(`/api/admin/facets/${facet.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !facet.isActive }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to toggle facet status');
      }

      fetchFacets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle facet status');
    }
  };

  const handleDelete = async (facet: FacetDefinition) => {
    if (facet.modCount > 0) {
      alert(`Cannot delete this facet: ${facet.modCount} mod(s) are using it.`);
      return;
    }

    if (!confirm(`Delete "${facet.displayName}"? This action cannot be undone.`)) return;

    try {
      setError(null);
      const response = await fetch(`/api/admin/facets/${facet.id}`, { method: 'DELETE' });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete facet');
      }

      fetchFacets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete facet');
    }
  };

  const openAddForm = () => {
    setNewFacet({
      ...newFacet,
      facetType: activeTab,
    });
    setShowAddForm(true);
  };

  const currentFacets = grouped[activeTab] || [];
  const currentTypeInfo = FACET_TYPES.find((t) => t.value === activeTab);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Facet Definitions</h1>
          <p className="text-slate-400">
            Manage the taxonomy values used for mod classification and filtering
          </p>
        </div>
        <button
          onClick={openAddForm}
          className="flex items-center gap-2 px-6 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold rounded-lg transition-all"
        >
          <Plus className="h-5 w-5" />
          Add Facet Value
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-2">
        <div className="flex flex-wrap gap-2">
          {FACET_TYPES.map((type) => {
            const count = grouped[type.value]?.length || 0;
            return (
              <button
                key={type.value}
                onClick={() => setActiveTab(type.value)}
                className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                  activeTab === type.value
                    ? 'bg-sims-pink text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {type.label}
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    activeTab === type.value
                      ? 'bg-white/20'
                      : 'bg-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Type Description */}
      {currentTypeInfo && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
          <p className="text-slate-300">
            <strong>{currentTypeInfo.label}:</strong> {currentTypeInfo.description}
          </p>
        </div>
      )}

      {/* Facets Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Value
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Display Name
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Icon
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Color
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Order
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Active
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  Mods
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    Loading facet definitions...
                  </td>
                </tr>
              ) : currentFacets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No facet values defined for {currentTypeInfo?.label || activeTab}.
                    <button
                      onClick={openAddForm}
                      className="ml-2 text-sims-pink hover:underline"
                    >
                      Add one now
                    </button>
                  </td>
                </tr>
              ) : (
                currentFacets.map((facet) => (
                  <tr key={facet.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <code className="text-sm text-slate-300 bg-slate-800 px-2 py-1 rounded">
                        {facet.value}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4 text-sims-blue" />
                        <span className="font-semibold text-white">{facet.displayName}</span>
                      </div>
                      {facet.description && (
                        <p className="text-xs text-slate-500 mt-1">{facet.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {facet.icon ? (
                        <span className="text-xl">{facet.icon}</span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {facet.color ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-md border border-slate-600"
                            style={{ backgroundColor: facet.color }}
                          />
                          <code className="text-xs text-slate-400">{facet.color}</code>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-slate-400">{facet.sortOrder}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(facet)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors ${
                          facet.isActive
                            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                            : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                        }`}
                      >
                        {facet.isActive ? (
                          <>
                            <Check className="h-3 w-3" />
                            Yes
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            No
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-lg text-sm font-medium ${
                          facet.modCount > 0
                            ? 'bg-sims-blue/10 text-sims-blue'
                            : 'text-slate-500'
                        }`}
                      >
                        {facet.modCount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingFacet(facet)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(facet)}
                          className={`p-2 rounded-lg transition-colors ${
                            facet.modCount > 0
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-red-500/10'
                          }`}
                          title={
                            facet.modCount > 0
                              ? `Cannot delete: ${facet.modCount} mods using this facet`
                              : 'Delete'
                          }
                          disabled={facet.modCount > 0}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Total Facet Values</p>
          <p className="text-2xl font-bold text-white">{facets.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Active Values</p>
          <p className="text-2xl font-bold text-green-500">
            {facets.filter((f) => f.isActive).length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Inactive Values</p>
          <p className="text-2xl font-bold text-slate-400">
            {facets.filter((f) => !f.isActive).length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <p className="text-slate-400 text-sm">Facet Types</p>
          <p className="text-2xl font-bold text-sims-pink">{FACET_TYPES.length}</p>
        </div>
      </div>

      {/* Add Facet Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Add Facet Value</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Facet Type
                </label>
                <select
                  value={newFacet.facetType}
                  onChange={(e) =>
                    setNewFacet({ ...newFacet, facetType: e.target.value as FacetType })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                >
                  {FACET_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFacet.value}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase().replace(/\s+/g, '-');
                    const suggestion = getSuggestion(value);
                    setNewFacet({
                      ...newFacet,
                      value,
                      // Auto-suggest icon and color if not manually set
                      icon: newFacet.icon || suggestion.icon,
                      color: newFacet.color === '#6366f1' ? suggestion.color : newFacet.color,
                    });
                  }}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                  placeholder="e.g., maxis-match"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Internal identifier (lowercase, hyphens only) - emoji/color auto-suggested
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newFacet.displayName}
                  onChange={(e) => setNewFacet({ ...newFacet, displayName: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                  placeholder="e.g., Maxis Match"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newFacet.description}
                  onChange={(e) => setNewFacet({ ...newFacet, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink resize-none"
                  placeholder="Optional help text"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={newFacet.icon}
                    onChange={(e) => setNewFacet({ ...newFacet, icon: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                    placeholder="👗"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newFacet.color}
                      onChange={(e) => setNewFacet({ ...newFacet, color: e.target.value })}
                      className="w-12 h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newFacet.color}
                      onChange={(e) => setNewFacet({ ...newFacet, color: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink text-sm"
                      placeholder="#6366f1"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={newFacet.sortOrder}
                    onChange={(e) =>
                      setNewFacet({ ...newFacet, sortOrder: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Active
                  </label>
                  <label className="flex items-center gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newFacet.isActive}
                      onChange={(e) => setNewFacet({ ...newFacet, isActive: e.target.checked })}
                      className="w-5 h-5 text-sims-pink bg-slate-700 border-slate-600 rounded focus:ring-sims-pink"
                    />
                    <span className="text-white">Enabled</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCreate}
                disabled={!newFacet.value || !newFacet.displayName}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sims-pink hover:bg-sims-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
              >
                <Plus className="h-5 w-5" />
                Create
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Facet Modal */}
      {editingFacet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Edit Facet Value</h3>
              <button
                onClick={() => setEditingFacet(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Facet Type
                </label>
                <input
                  type="text"
                  value={
                    FACET_TYPES.find((t) => t.value === editingFacet.facetType)?.label ||
                    editingFacet.facetType
                  }
                  disabled
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Value <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingFacet.value}
                  onChange={(e) =>
                    setEditingFacet({
                      ...editingFacet,
                      value: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                    })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                />
                {editingFacet.modCount > 0 && (
                  <p className="text-xs text-yellow-500 mt-1">
                    Warning: {editingFacet.modCount} mod(s) use this value. Changing it will NOT update those mods.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Display Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingFacet.displayName}
                  onChange={(e) =>
                    setEditingFacet({ ...editingFacet, displayName: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={editingFacet.description || ''}
                  onChange={(e) =>
                    setEditingFacet({ ...editingFacet, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Icon (Emoji)
                  </label>
                  <input
                    type="text"
                    value={editingFacet.icon || ''}
                    onChange={(e) => setEditingFacet({ ...editingFacet, icon: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                    maxLength={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingFacet.color || '#6366f1'}
                      onChange={(e) => setEditingFacet({ ...editingFacet, color: e.target.value })}
                      className="w-12 h-10 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={editingFacet.color || ''}
                      onChange={(e) => setEditingFacet({ ...editingFacet, color: e.target.value })}
                      className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={editingFacet.sortOrder}
                    onChange={(e) =>
                      setEditingFacet({
                        ...editingFacet,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Active
                  </label>
                  <label className="flex items-center gap-3 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingFacet.isActive}
                      onChange={(e) =>
                        setEditingFacet({ ...editingFacet, isActive: e.target.checked })
                      }
                      className="w-5 h-5 text-sims-pink bg-slate-700 border-slate-600 rounded focus:ring-sims-pink"
                    />
                    <span className="text-white">Enabled</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => handleUpdate(editingFacet)}
                disabled={!editingFacet.value || !editingFacet.displayName}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sims-pink hover:bg-sims-pink/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
              >
                <Save className="h-5 w-5" />
                Save
              </button>
              <button
                onClick={() => setEditingFacet(null)}
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
