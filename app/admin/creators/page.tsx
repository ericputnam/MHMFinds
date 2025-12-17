'use client';

import React, { useState, useEffect } from 'react';
import { Search, Edit, Trash2, Star, Package, Users as UsersIcon, Save, X } from 'lucide-react';

interface Creator {
  id: string;
  handle: string;
  bio: string | null;
  website: string | null;
  isVerified: boolean;
  isFeatured: boolean;
  user: {
    displayName: string | null;
    email: string;
    avatar: string | null;
  };
  _count: {
    mods: number;
  };
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingCreator, setEditingCreator] = useState<Creator | null>(null);

  useEffect(() => {
    fetchCreators();
  }, [searchQuery]);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const params = searchQuery ? `?search=${searchQuery}` : '';
      const response = await fetch(`/api/admin/creators${params}`);
      const data = await response.json();
      setCreators(data.creators || []);
    } catch (error) {
      console.error('Failed to fetch creators:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (creator: Creator) => {
    try {
      await fetch(`/api/admin/creators/${creator.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          handle: creator.handle,
          bio: creator.bio,
          website: creator.website,
          isVerified: creator.isVerified,
          isFeatured: creator.isFeatured,
        }),
      });
      setEditingCreator(null);
      fetchCreators();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this creator profile?')) return;

    try {
      await fetch(`/api/admin/creators/${id}`, { method: 'DELETE' });
      fetchCreators();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Creators Management</h1>
        <p className="text-slate-400">Manage creator profiles and verification</p>
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search creators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
          />
        </div>
      </div>

      {/* Creators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            Loading creators...
          </div>
        ) : creators.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400">
            No creators found
          </div>
        ) : (
          creators.map((creator) => (
            <div
              key={creator.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {creator.user.avatar ? (
                    <img
                      src={creator.user.avatar}
                      alt={creator.handle}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-sims-pink flex items-center justify-center text-white font-bold">
                      {creator.handle.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-white">
                      {creator.user.displayName || creator.handle}
                    </h3>
                    <p className="text-sm text-sims-pink">@{creator.handle}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {creator.isVerified && (
                    <Star className="h-5 w-5 text-sims-blue fill-sims-blue" />
                  )}
                  {creator.isFeatured && (
                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  )}
                </div>
              </div>

              {creator.bio && (
                <p className="text-sm text-slate-400 mb-4 line-clamp-2">{creator.bio}</p>
              )}

              <div className="flex items-center gap-4 mb-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  <span>{creator._count.mods} mods</span>
                </div>
              </div>

              {creator.website && (
                <a
                  href={creator.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-sims-blue hover:text-sims-pink transition-colors truncate block mb-4"
                >
                  {creator.website}
                </a>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setEditingCreator(creator)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors text-sm"
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(creator.id)}
                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Modal */}
      {editingCreator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Edit Creator</h3>
              <button
                onClick={() => setEditingCreator(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Handle
                </label>
                <input
                  type="text"
                  value={editingCreator.handle}
                  onChange={(e) =>
                    setEditingCreator({ ...editingCreator, handle: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Bio</label>
                <textarea
                  value={editingCreator.bio || ''}
                  onChange={(e) =>
                    setEditingCreator({ ...editingCreator, bio: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={editingCreator.website || ''}
                  onChange={(e) =>
                    setEditingCreator({ ...editingCreator, website: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCreator.isVerified}
                    onChange={(e) =>
                      setEditingCreator({
                        ...editingCreator,
                        isVerified: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
                  />
                  <span className="text-sm text-slate-300">Verified</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingCreator.isFeatured}
                    onChange={(e) =>
                      setEditingCreator({
                        ...editingCreator,
                        isFeatured: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
                  />
                  <span className="text-sm text-slate-300">Featured</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-800">
              <button
                onClick={() => handleUpdate(editingCreator)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold rounded-lg transition-all"
              >
                <Save className="h-5 w-5" />
                Save Changes
              </button>
              <button
                onClick={() => setEditingCreator(null)}
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
