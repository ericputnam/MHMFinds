'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Search, Edit, Trash2, Crown, Shield, Mail, Calendar, X, Save, Download, Users, TrendingUp, UserPlus } from 'lucide-react';

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatar: string | null;
  isCreator: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface UserStats {
  total: number;
  creators: number;
  premium: number;
  admins: number;
  newThisMonth: number;
  newToday: number;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exporting, setExporting] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchQuery && { search: searchQuery }),
      });

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/users/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [fetchUsers, fetchStats]);

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/admin/users/export?${params}`);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export users');
    } finally {
      setExporting(false);
    }
  };

  const handleUpdate = async (user: User) => {
    try {
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isCreator: user.isCreator,
          isPremium: user.isPremium,
          isAdmin: user.isAdmin,
        }),
      });
      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Update failed:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user? This action cannot be undone.')) return;

    try {
      await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
        <p className="text-slate-400">Manage user accounts and permissions</p>
      </div>

      {/* Metrics Dashboard */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-8 w-8 text-sims-pink" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.total.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">Total Users</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Edit className="h-8 w-8 text-sims-blue" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.creators.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">Creators</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.premium.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">Premium</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.admins.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">Admins</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.newThisMonth.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">New This Month</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <UserPlus className="h-8 w-8 text-purple-500" />
            </div>
            <p className="text-3xl font-bold text-white">{stats.newToday.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">New Today</p>
          </div>
        </div>
      )}

      {/* Export Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
              />
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <Download className="h-5 w-5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sims-pink focus:border-transparent"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800 border-b border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">User</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Joined</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Roles</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    No users found
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <Image
                            src={user.avatar}
                            alt={user.username}
                            width={40}
                            height={40}
                            unoptimized
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-sims-pink flex items-center justify-center text-white font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-white">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-sm text-slate-400">@{user.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Mail className="h-4 w-4 text-slate-500" />
                        <span className="text-sm">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-400 text-sm">
                        <Calendar className="h-4 w-4" />
                        {new Date(user.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {user.isAdmin && (
                          <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-medium flex items-center gap-1">
                            <Shield className="h-3 w-3" />
                            Admin
                          </span>
                        )}
                        {user.isPremium && (
                          <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs font-medium flex items-center gap-1">
                            <Crown className="h-3 w-3" />
                            Premium
                          </span>
                        )}
                        {user.isCreator && (
                          <span className="px-2 py-1 bg-sims-blue/10 text-sims-blue rounded text-xs font-medium">
                            Creator
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4 text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
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
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Edit User Roles</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {editingUser.avatar ? (
                  <Image
                    src={editingUser.avatar}
                    alt={editingUser.username}
                    width={48}
                    height={48}
                    unoptimized
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-sims-pink flex items-center justify-center text-white font-bold">
                    {editingUser.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-white">
                    {editingUser.displayName || editingUser.username}
                  </p>
                  <p className="text-sm text-slate-400">{editingUser.email}</p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-red-500" />
                    <div>
                      <p className="font-medium text-white">Admin</p>
                      <p className="text-xs text-slate-400">Full system access</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingUser.isAdmin}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, isAdmin: e.target.checked })
                    }
                    className="w-5 h-5 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-white">Premium</p>
                      <p className="text-xs text-slate-400">Premium features enabled</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingUser.isPremium}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, isPremium: e.target.checked })
                    }
                    className="w-5 h-5 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer p-3 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-3">
                    <Edit className="h-5 w-5 text-sims-blue" />
                    <div>
                      <p className="font-medium text-white">Creator</p>
                      <p className="text-xs text-slate-400">Can upload mods</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingUser.isCreator}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, isCreator: e.target.checked })
                    }
                    className="w-5 h-5 text-sims-pink bg-slate-800 border-slate-700 rounded focus:ring-sims-pink"
                  />
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleUpdate(editingUser)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold rounded-lg transition-all"
              >
                <Save className="h-5 w-5" />
                Save Changes
              </button>
              <button
                onClick={() => setEditingUser(null)}
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
