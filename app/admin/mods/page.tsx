'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckSquare,
  Square,
  MoreVertical,
  Eye,
  Download,
  Star,
  ExternalLink,
  Image as ImageIcon,
  Save,
  X,
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
}

export default function ModsManagementPage() {
  const [mods, setMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterCategory, setFilterCategory] = useState('');
  const [editingMod, setEditingMod] = useState<Mod | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [modToDelete, setModToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchMods();
  }, [currentPage, searchQuery, filterCategory]);

  const fetchMods = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
        ...(filterCategory && { category: filterCategory }),
      });

      const response = await fetch(`/api/admin/mods?${params}`);
      const data = await response.json();
      setMods(data.mods || []);
      setTotalPages(data.totalPages || 1);
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

  const handleUpdate = async (mod: Mod) => {
    try {
      await fetch(`/api/admin/mods/${mod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mod),
      });
      setEditingMod(null);
      fetchMods();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Mods Management</h1>
          <p className="text-slate-400">Manage all mods in the database</p>
        </div>
        <Link
          href="/admin/mods/new"
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-sims-pink to-purple-600 text-white font-semibold rounded-lg hover:scale-105 transition-transform"
        >
          <Plus className="h-5 w-5" />
          Add New Mod
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          {/* Category Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent appearance-none"
            >
              <option value="">All Categories</option>
              <option value="Gameplay">Gameplay</option>
              <option value="Build/Buy">Build/Buy</option>
              <option value="CAS">CAS</option>
              <option value="UI/UX">UI/UX</option>
              <option value="Script Mod">Script Mod</option>
            </select>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            {selectedMods.size > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete ({selectedMods.size})
                </button>
                <button
                  onClick={() => handleBulkUpdate({ isFeatured: true })}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded-lg hover:bg-yellow-500/20 transition-colors"
                >
                  <Star className="h-4 w-4" />
                  Feature
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mods Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left">
                  <button onClick={toggleSelectAll}>
                    {selectedMods.size === mods.length ? (
                      <CheckSquare className="h-5 w-5 text-sims-pink" />
                    ) : (
                      <Square className="h-5 w-5 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Mod</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Author</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Stats</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    Loading mods...
                  </td>
                </tr>
              ) : mods.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No mods found
                  </td>
                </tr>
              ) : (
                mods.map((mod) => (
                  <tr key={mod.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <button onClick={() => toggleSelect(mod.id)}>
                        {selectedMods.has(mod.id) ? (
                          <CheckSquare className="h-5 w-5 text-sims-pink" />
                        ) : (
                          <Square className="h-5 w-5 text-slate-400" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {mod.thumbnail ? (
                          <img
                            src={mod.thumbnail}
                            alt={mod.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-slate-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white">{mod.title}</p>
                          <p className="text-sm text-slate-400">
                            {new Date(mod.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-sims-blue/10 text-sims-blue rounded-full text-xs font-medium">
                        {mod.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{mod.author || 'Unknown'}</td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {mod.isFeatured && (
                          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs font-medium">
                            Featured
                          </span>
                        )}
                        {mod.isVerified && (
                          <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-medium">
                            Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingMod(mod)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-slate-400" />
                        </button>
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
                ))
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

      {/* Edit Modal */}
      {editingMod && (
        <EditModModal
          mod={editingMod}
          onSave={handleUpdate}
          onClose={() => setEditingMod(null)}
        />
      )}

      {/* Delete Confirmation */}
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
    </div>
  );
}

// Edit Modal Component
function EditModModal({
  mod,
  onSave,
  onClose,
}: {
  mod: Mod;
  onSave: (mod: Mod) => void;
  onClose: () => void;
}) {
  const [editedMod, setEditedMod] = useState<Mod>(mod);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl w-full my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Edit Mod</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Title</label>
            <input
              type="text"
              value={editedMod.title}
              onChange={(e) => setEditedMod({ ...editedMod, title: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Category</label>
            <select
              value={editedMod.category}
              onChange={(e) => setEditedMod({ ...editedMod, category: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
            >
              <option value="Gameplay">Gameplay</option>
              <option value="Build/Buy">Build/Buy</option>
              <option value="CAS">CAS</option>
              <option value="UI/UX">UI/UX</option>
              <option value="Script Mod">Script Mod</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Author</label>
            <input
              type="text"
              value={editedMod.author || ''}
              onChange={(e) => setEditedMod({ ...editedMod, author: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
            />
          </div>

          {/* Thumbnail URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Thumbnail URL</label>
            <input
              type="url"
              value={editedMod.thumbnail || ''}
              onChange={(e) => setEditedMod({ ...editedMod, thumbnail: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
            />
          </div>

          {/* Download URL */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Download URL</label>
            <input
              type="url"
              value={editedMod.downloadUrl || ''}
              onChange={(e) => setEditedMod({ ...editedMod, downloadUrl: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink"
            />
          </div>

          {/* Toggles */}
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editedMod.isFeatured}
                onChange={(e) => setEditedMod({ ...editedMod, isFeatured: e.target.checked })}
                className="w-4 h-4 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
              />
              <span className="text-sm text-slate-300">Featured</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editedMod.isVerified}
                onChange={(e) => setEditedMod({ ...editedMod, isVerified: e.target.checked })}
                className="w-4 h-4 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
              />
              <span className="text-sm text-slate-300">Verified</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 mt-6 pt-6 border-t border-slate-800">
          <button
            onClick={() => onSave(editedMod)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sims-pink to-purple-600 text-white font-semibold rounded-lg hover:scale-105 transition-transform"
          >
            <Save className="h-5 w-5" />
            Save Changes
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
