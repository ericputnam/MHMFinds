'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Navbar } from '../../components/Navbar';
import { Footer } from '../../components/Footer';
import { Trophy, Heart, Download, Star, TrendingUp, Loader2 } from 'lucide-react';

interface Creator {
  id: string;
  name: string;
  handle: string;
  bio: string | null;
  avatar: string | null;
  website: string | null;
  isVerified: boolean;
  modCount: number;
  totalFavorites: number;
  totalDownloads: number;
  averageRating: number;
}

export default function CreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/creators/rankings');

      if (!response.ok) {
        throw new Error('Failed to fetch creators');
      }

      const data = await response.json();
      setCreators(data.creators || []);
    } catch (err) {
      console.error('Error fetching creators:', err);
      setError('Failed to load creators. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    const badges = [
      { bg: 'from-yellow-500 to-yellow-600', text: '1st' },
      { bg: 'from-slate-400 to-slate-500', text: '2nd' },
      { bg: 'from-orange-600 to-orange-700', text: '3rd' },
    ];

    return badges[index] || { bg: 'from-slate-700 to-slate-800', text: `${index + 1}th` };
  };

  return (
    <div className="min-h-screen bg-mhm-dark text-slate-200 flex flex-col font-sans">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-mhm-dark via-[#1a1f3a] to-mhm-dark border-b border-white/5">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10"></div>
          <div className="container mx-auto px-4 py-20 relative z-10">
            <div className="max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-sims-green/10 border border-sims-green/20 rounded-full px-6 py-2 mb-6">
                <Trophy className="h-4 w-4 text-sims-green" />
                <span className="text-sm font-semibold text-sims-green">Top Creators</span>
              </div>
              <h1 className="text-5xl md:text-6xl font-extrabold mb-6 leading-tight">
                Featured{' '}
                <span className="text-white">
                  Creators
                </span>
              </h1>
              <p className="text-xl text-slate-400 leading-relaxed max-w-3xl mx-auto">
                Discover the most popular mod creators in our community, ranked by favorites and community love.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-16 pb-24">
          <div className="max-w-6xl mx-auto">

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 text-sims-pink animate-spin mx-auto mb-4" />
                  <p className="text-slate-400">Loading creators...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && !loading && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center">
                <p className="text-red-400">{error}</p>
              </div>
            )}

            {/* Empty State */}
            {!loading && !error && creators.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <Trophy className="h-16 w-16 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">No creators found yet. Check back soon!</p>
              </div>
            )}

            {/* Creators Grid */}
            {!loading && !error && creators.length > 0 && (
              <div className="space-y-6">
                {creators.map((creator, index) => {
                  const rankBadge = getRankBadge(index);
                  const isTopThree = index < 3;

                  return (
                    <div
                      key={creator.id}
                      className={`relative bg-white/5 border ${
                        isTopThree ? 'border-sims-pink/30' : 'border-white/10'
                      } rounded-2xl p-6 md:p-8 backdrop-blur-sm hover:scale-[1.02] transition-all duration-300 ${
                        isTopThree ? 'shadow-lg shadow-sims-pink/10' : ''
                      }`}
                    >
                      {/* Rank Badge */}
                      <div className="absolute -top-3 -left-3 group">
                        <div className={`bg-gradient-to-br ${rankBadge.bg} text-white font-bold text-lg w-12 h-12 rounded-full flex items-center justify-center shadow-lg`}>
                          {index + 1}
                        </div>
                        {/* Tooltip */}
                        <div className="absolute left-14 top-0 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          Ranked #{index + 1} by community favorites
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <Image
                              src={
                                creator.avatar ||
                                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(creator.name)}&backgroundColor=ec4899,a855f7,8b5cf6&textColor=ffffff`
                              }
                              alt={creator.name}
                              width={96}
                              height={96}
                              unoptimized
                              className="w-24 h-24 rounded-full object-cover border-4 border-white/10 bg-sims-pink"
                              onError={(e) => {
                                // Fallback if DiceBear fails
                                e.currentTarget.style.display = 'none';
                                const fallback = document.createElement('div');
                                fallback.className = 'w-24 h-24 rounded-full bg-sims-pink flex items-center justify-center text-3xl font-bold text-white border-4 border-white/10';
                                fallback.textContent = creator.name.charAt(0).toUpperCase();
                                e.currentTarget.parentNode?.appendChild(fallback);
                              }}
                            />
                            {creator.isVerified && (
                              <div className="absolute -bottom-1 -right-1 bg-sims-blue rounded-full p-1.5">
                                <Star className="h-4 w-4 text-white fill-white" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Creator Info */}
                        <div className="flex-grow min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div>
                              <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                                {creator.name}
                                {isTopThree && <Trophy className="h-5 w-5 text-yellow-500" />}
                              </h2>
                              <p className="text-sims-pink font-medium">@{creator.handle}</p>
                            </div>
                          </div>

                          {creator.bio && (
                            <p className="text-slate-300 mb-4 line-clamp-2">{creator.bio}</p>
                          )}

                          {/* Stats Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/5 rounded-lg p-3 border border-white/10 group relative">
                              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                <TrendingUp className="h-4 w-4" />
                                <span>Total Mods</span>
                              </div>
                              <p className="text-xl font-bold text-white">{creator.modCount}</p>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Number of mods created
                              </div>
                            </div>

                            <div className="bg-sims-pink/10 rounded-lg p-3 border border-sims-pink/20 group relative">
                              <div className="flex items-center gap-2 text-sims-pink text-sm mb-1">
                                <Heart className="h-4 w-4" />
                                <span>Favorites</span>
                              </div>
                              <p className="text-xl font-bold text-white">{creator.totalFavorites.toLocaleString()}</p>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Total times their mods were favorited
                              </div>
                            </div>

                            <div className="bg-white/5 rounded-lg p-3 border border-white/10 group relative">
                              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                <Download className="h-4 w-4" />
                                <span>Downloads</span>
                              </div>
                              <p className="text-xl font-bold text-white">{creator.totalDownloads.toLocaleString()}</p>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Total downloads across all mods
                              </div>
                            </div>

                            <div className="bg-white/5 rounded-lg p-3 border border-white/10 group relative">
                              <div className="flex items-center gap-2 text-slate-400 text-sm mb-1">
                                <Star className="h-4 w-4" />
                                <span>Avg Rating</span>
                              </div>
                              <p className="text-xl font-bold text-white">
                                {creator.averageRating > 0 ? creator.averageRating.toFixed(1) : 'N/A'}
                                {creator.averageRating > 0 && <span className="text-sm text-slate-400">/5.0</span>}
                              </p>
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                Average rating across all mods
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 flex gap-3">
                            <a
                              href={`/?creator=${creator.handle}`}
                              className="bg-sims-pink hover:bg-sims-pink/90 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-300 text-sm"
                            >
                              View Mods
                            </a>
                            {creator.website && (
                              <a
                                href={creator.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-white/5 border border-white/10 text-slate-300 font-semibold px-6 py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
                              >
                                Website
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
