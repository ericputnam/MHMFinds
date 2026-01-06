'use client';

import React, { useState, useEffect } from 'react';
import {
  Save,
  Loader2,
  Upload,
  Plus,
  X,
  Link as LinkIcon,
} from 'lucide-react';

export interface ModFormData {
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

interface ModSubmissionFormProps {
  initialData?: Partial<ModFormData>;
  onSubmit: (data: ModFormData) => Promise<void>;
  submitLabel?: string;
  showAdminFields?: boolean;
}

export function ModSubmissionForm({
  initialData,
  onSubmit,
  submitLabel = 'Submit',
  showAdminFields = true,
}: ModSubmissionFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [imageInput, setImageInput] = useState('');

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
    ...initialData,
  });

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.title.trim()) {
        throw new Error('Title is required');
      }

      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
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

  return (
    <>
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
                Category <span className="text-red-500">*</span>
              </label>
              <select
                required
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
                  <img
                    src={formData.thumbnail}
                    alt="Thumbnail preview"
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
                      <img
                        src={img}
                        alt={`Image ${idx + 1}`}
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
                Tags
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

        {/* Settings - Only show for admins */}
        {showAdminFields && (
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
        )}

        {/* Non-admin NSFW toggle */}
        {!showAdminFields && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-6">Content Rating</h2>
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
        )}

        {/* Submit Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}
