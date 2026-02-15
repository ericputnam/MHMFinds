'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Image from 'next/image';
import {
  ArrowLeft,
  Save,
  Loader2,
  Upload,
  Plus,
  X,
  Link as LinkIcon,
  Tag,
} from 'lucide-react';
import Link from 'next/link';

interface ModFormData {
  title: string;
  description: string;
  shortDescription: string;
  version: string;
  gameVersion: string;
  category: string;
  tags: string[];
  thumbnail: string;
  images: string[];
  downloadUrl: string;
  sourceUrl: string;
  source: string;
  author: string;
  isFree: boolean;
  price: string;
  currency: string;
  isNSFW: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  // Facet fields
  contentType: string;
  visualStyle: string;
  themes: string[];
  ageGroups: string[];
  genderOptions: string[];
  occultTypes: string[];
  packRequirements: string[];
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

const CATEGORIES = [
  'Gameplay',
  'Build/Buy',
  'CAS',
  'UI/UX',
  'Script Mod',
  'Traits',
  'Careers',
  'Furniture',
  'Clothing',
  'Hair',
  'Makeup',
  'Accessories',
  'Other',
];

const GAME_VERSIONS = [
  'Sims 4',
  'Stardew Valley',
  'Animal Crossing',
  'Minecraft',
  'Other',
];

export default function EditModPage() {
  const router = useRouter();
  const params = useParams();
  const modId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [imageInput, setImageInput] = useState('');

  // Facet definitions from API
  const [facetDefinitions, setFacetDefinitions] = useState<Record<string, FacetDefinition[]>>({});

  const [formData, setFormData] = useState<ModFormData>({
    title: '',
    description: '',
    shortDescription: '',
    version: '',
    gameVersion: 'Sims 4',
    category: 'Gameplay',
    tags: [],
    thumbnail: '',
    images: [],
    downloadUrl: '',
    sourceUrl: '',
    source: 'Manual',
    author: '',
    isFree: true,
    price: '',
    currency: 'USD',
    isNSFW: false,
    isFeatured: false,
    isVerified: false,
    // Facet defaults
    contentType: '',
    visualStyle: '',
    themes: [],
    ageGroups: [],
    genderOptions: [],
    occultTypes: [],
    packRequirements: [],
  });

  // Fetch facet definitions
  useEffect(() => {
    const fetchFacets = async () => {
      try {
        const response = await fetch('/api/admin/facets');
        if (response.ok) {
          const data = await response.json();
          setFacetDefinitions(data.grouped || {});
        }
      } catch (err) {
        console.error('Failed to fetch facet definitions:', err);
      }
    };
    fetchFacets();
  }, []);

  // Fetch existing mod data
  useEffect(() => {
    const fetchMod = async () => {
      try {
        setFetching(true);
        const response = await fetch(`/api/admin/mods/${modId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch mod');
        }

        const mod = await response.json();

        setFormData({
          title: mod.title || '',
          description: mod.description || '',
          shortDescription: mod.shortDescription || '',
          version: mod.version || '',
          gameVersion: mod.gameVersion || 'Sims 4',
          category: mod.category || 'Gameplay',
          tags: mod.tags || [],
          thumbnail: mod.thumbnail || '',
          images: mod.images || [],
          downloadUrl: mod.downloadUrl || '',
          sourceUrl: mod.sourceUrl || '',
          source: mod.source || 'Manual',
          author: mod.author || '',
          isFree: mod.isFree ?? true,
          price: mod.price ? mod.price.toString() : '',
          currency: mod.currency || 'USD',
          isNSFW: mod.isNSFW || false,
          isFeatured: mod.isFeatured || false,
          isVerified: mod.isVerified || false,
          // Facet fields
          contentType: mod.contentType || '',
          visualStyle: mod.visualStyle || '',
          themes: mod.themes || [],
          ageGroups: mod.ageGroups || [],
          genderOptions: mod.genderOptions || [],
          occultTypes: mod.occultTypes || [],
          packRequirements: mod.packRequirements || [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load mod');
      } finally {
        setFetching(false);
      }
    };

    if (modId) {
      fetchMod();
    }
  }, [modId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      // Prepare data for API
      const modData = {
        ...formData,
        price: formData.isFree ? null : formData.price ? parseFloat(formData.price) : null,
        contentType: formData.contentType || null,
        visualStyle: formData.visualStyle || null,
      };

      const response = await fetch(`/api/admin/mods/${modId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update mod');
      }

      // Redirect to mods list on success
      router.push('/admin/mods');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update mod');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const addImage = () => {
    if (imageInput.trim() && !formData.images.includes(imageInput.trim())) {
      setFormData({
        ...formData,
        images: [...formData.images, imageInput.trim()],
      });
      setImageInput('');
    }
  };

  const removeImage = (image: string) => {
    setFormData({
      ...formData,
      images: formData.images.filter((img) => img !== image),
    });
  };

  // Multi-select facet toggle
  const toggleFacetValue = (facetType: keyof ModFormData, value: string) => {
    const currentValues = formData[facetType] as string[];
    if (currentValues.includes(value)) {
      setFormData({
        ...formData,
        [facetType]: currentValues.filter((v) => v !== value),
      });
    } else {
      setFormData({
        ...formData,
        [facetType]: [...currentValues, value],
      });
    }
  };

  // Get active facets for a type
  const getActiveFacets = (facetType: string): FacetDefinition[] => {
    return (facetDefinitions[facetType] || []).filter((f) => f.isActive);
  };

  if (fetching) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-sims-pink animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading mod...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/mods"
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-6 w-6 text-slate-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Edit Mod</h1>
            <p className="text-slate-400">Update mod information</p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                placeholder="Enter mod title"
              />
            </div>

            {/* Short Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Short Description <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                placeholder="Brief one-line description"
                maxLength={150}
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Full Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent resize-none"
                placeholder="Detailed description of the mod"
              />
            </div>

            {/* Author */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Author/Creator <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                placeholder="Creator name"
              />
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Source Platform
              </label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
              >
                <option value="Manual">Manual Entry</option>
                <option value="Patreon">Patreon</option>
                <option value="CurseForge">CurseForge</option>
                <option value="Tumblr">Tumblr</option>
                <option value="ModTheSims">ModTheSims</option>
                <option value="The Sims Resource">The Sims Resource</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Category (Legacy)
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Game Version */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Game Version
              </label>
              <select
                value={formData.gameVersion}
                onChange={(e) => setFormData({ ...formData, gameVersion: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
              >
                {GAME_VERSIONS.map((version) => (
                  <option key={version} value={version}>
                    {version}
                  </option>
                ))}
              </select>
            </div>

            {/* Mod Version */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Mod Version
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                placeholder="e.g., 1.0.0"
              />
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Currency
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                disabled={formData.isFree}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Facet Classification */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Tag className="h-5 w-5 text-sims-pink" />
            <h2 className="text-xl font-bold text-white">Facet Classification</h2>
          </div>
          <p className="text-slate-400 text-sm mb-6">
            Classify this mod using facets for better discoverability and filtering.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Content Type (single-select) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Content Type
              </label>
              <select
                value={formData.contentType}
                onChange={(e) => setFormData({ ...formData, contentType: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
              >
                <option value="">— Not Set —</option>
                {getActiveFacets('contentType').map((facet) => (
                  <option key={facet.id} value={facet.value}>
                    {facet.icon ? `${facet.icon} ` : ''}{facet.displayName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">What IS this mod? (hair, furniture, etc.)</p>
            </div>

            {/* Visual Style (single-select) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Visual Style
              </label>
              <select
                value={formData.visualStyle}
                onChange={(e) => setFormData({ ...formData, visualStyle: e.target.value })}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
              >
                <option value="">— Not Set —</option>
                {getActiveFacets('visualStyle').map((facet) => (
                  <option key={facet.id} value={facet.value}>
                    {facet.icon ? `${facet.icon} ` : ''}{facet.displayName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">Art style (alpha, maxis-match, etc.)</p>
            </div>

            {/* Themes (multi-select) */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Themes
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-800 border border-slate-700 rounded-lg min-h-[60px]">
                {getActiveFacets('themes').length === 0 ? (
                  <span className="text-slate-500 text-sm">No themes defined yet</span>
                ) : (
                  getActiveFacets('themes').map((facet) => {
                    const isSelected = formData.themes.includes(facet.value);
                    return (
                      <button
                        key={facet.id}
                        type="button"
                        onClick={() => toggleFacetValue('themes', facet.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                        style={
                          isSelected && facet.color
                            ? { backgroundColor: facet.color }
                            : isSelected
                            ? { backgroundColor: '#e91e63' }
                            : undefined
                        }
                      >
                        {facet.icon ? `${facet.icon} ` : ''}{facet.displayName}
                      </button>
                    );
                  })
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Aesthetic/vibe (cottagecore, goth, etc.)</p>
            </div>

            {/* Age Groups (multi-select) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Age Groups
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-800 border border-slate-700 rounded-lg min-h-[60px]">
                {getActiveFacets('ageGroups').length === 0 ? (
                  <span className="text-slate-500 text-sm">No age groups defined</span>
                ) : (
                  getActiveFacets('ageGroups').map((facet) => {
                    const isSelected = formData.ageGroups.includes(facet.value);
                    return (
                      <button
                        key={facet.id}
                        type="button"
                        onClick={() => toggleFacetValue('ageGroups', facet.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-sims-blue text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {facet.icon ? `${facet.icon} ` : ''}{facet.displayName}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Gender Options (multi-select) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Gender/Frame Options
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-800 border border-slate-700 rounded-lg min-h-[60px]">
                {getActiveFacets('genderOptions').length === 0 ? (
                  <span className="text-slate-500 text-sm">No options defined</span>
                ) : (
                  getActiveFacets('genderOptions').map((facet) => {
                    const isSelected = formData.genderOptions.includes(facet.value);
                    return (
                      <button
                        key={facet.id}
                        type="button"
                        onClick={() => toggleFacetValue('genderOptions', facet.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-purple-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {facet.icon ? `${facet.icon} ` : ''}{facet.displayName}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Occult Types (multi-select) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Occult Types
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-800 border border-slate-700 rounded-lg min-h-[60px]">
                {getActiveFacets('occultTypes').length === 0 ? (
                  <span className="text-slate-500 text-sm">No occult types defined</span>
                ) : (
                  getActiveFacets('occultTypes').map((facet) => {
                    const isSelected = formData.occultTypes.includes(facet.value);
                    return (
                      <button
                        key={facet.id}
                        type="button"
                        onClick={() => toggleFacetValue('occultTypes', facet.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {facet.icon ? `${facet.icon} ` : ''}{facet.displayName}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pack Requirements (multi-select) */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Pack Requirements
              </label>
              <div className="flex flex-wrap gap-2 p-4 bg-slate-800 border border-slate-700 rounded-lg min-h-[60px]">
                {getActiveFacets('packRequirements').length === 0 ? (
                  <span className="text-slate-500 text-sm">No packs defined</span>
                ) : (
                  getActiveFacets('packRequirements').map((facet) => {
                    const isSelected = formData.packRequirements.includes(facet.value);
                    return (
                      <button
                        key={facet.id}
                        type="button"
                        onClick={() => toggleFacetValue('packRequirements', facet.value)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          isSelected
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {facet.icon ? `${facet.icon} ` : ''}{facet.displayName}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* URLs and Media */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">URLs and Media</h2>
          <div className="space-y-4">
            {/* Download URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Download URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="url"
                  required
                  value={formData.downloadUrl}
                  onChange={(e) => setFormData({ ...formData, downloadUrl: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                  placeholder="https://example.com/download"
                />
              </div>
            </div>

            {/* Source URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Blog or Source URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="url"
                  required
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                  placeholder="https://patreon.com/post/..."
                />
              </div>
            </div>

            {/* Thumbnail */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Thumbnail URL <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="url"
                  required
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              {formData.thumbnail && (
                <div className="mt-3">
                  <Image
                    src={formData.thumbnail}
                    alt="Thumbnail preview"
                    width={128}
                    height={128}
                    unoptimized
                    className="w-32 h-32 object-cover rounded-lg border border-slate-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            {/* Additional Images */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Additional Images
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Upload className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="url"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addImage())}
                    className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <button
                  type="button"
                  onClick={addImage}
                  className="px-4 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              {formData.images.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <Image
                        src={img}
                        alt={`Image ${idx + 1}`}
                        width={96}
                        height={96}
                        unoptimized
                        className="w-24 h-24 object-cover rounded-lg border border-slate-700"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tags and Pricing */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Tags and Pricing</h2>
          <div className="space-y-4">
            {/* Tags */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Tags (Legacy)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white rounded-lg transition-colors"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-sims-blue/10 text-sims-blue rounded-full text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-500 transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Free Toggle */}
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isFree"
                checked={formData.isFree}
                onChange={(e) => setFormData({ ...formData, isFree: e.target.checked, price: '' })}
                className="w-5 h-5 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
              />
              <label htmlFor="isFree" className="text-sm font-semibold text-slate-300">
                Free Mod
              </label>
            </div>

            {/* Price */}
            {!formData.isFree && (
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Price
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-lg">
                    {formData.currency === 'USD' ? '$' : formData.currency === 'EUR' ? '€' : '£'}
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Settings</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                className="w-5 h-5 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
              />
              <div>
                <p className="text-sm font-semibold text-slate-300">Featured Mod</p>
                <p className="text-xs text-slate-400">Display prominently on the homepage</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isVerified}
                onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                className="w-5 h-5 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
              />
              <div>
                <p className="text-sm font-semibold text-slate-300">Verified Mod</p>
                <p className="text-xs text-slate-400">Mark as tested and safe</p>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isNSFW}
                onChange={(e) => setFormData({ ...formData, isNSFW: e.target.checked })}
                className="w-5 h-5 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
              />
              <div>
                <p className="text-sm font-semibold text-slate-300">NSFW Content</p>
                <p className="text-xs text-slate-400">Mark as adult/18+ content</p>
              </div>
            </label>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link
            href="/admin/mods"
            className="px-6 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
