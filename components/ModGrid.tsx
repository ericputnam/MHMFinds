'use client';

import React from 'react';
import { Mod } from '../lib/api';
import { ModCard } from './ModCard';
import { Loader2, AlertCircle, Search, Package, Heart, TrendingUp, Sparkles, Filter } from 'lucide-react';

export interface ModGridProps {
  mods: Mod[];
  loading: boolean;
  error: string | null;
  onFavorite: (modId: string) => void;
  favorites: string[];
  gridColumns?: number; // New prop for dynamic grid columns
}

export function ModGrid({ mods, loading, error, onFavorite, favorites, gridColumns = 4 }: ModGridProps) {
  // Dynamic grid classes based on gridColumns prop
  const getGridClasses = (cols: number) => {
    switch (cols) {
      case 3:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case 4:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
      case 5:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
      default:
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className={`grid ${getGridClasses(gridColumns)} gap-8`}>
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 animate-pulse">
              {/* Skeleton Image */}
              <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-200 to-gray-300"></div>

              {/* Skeleton Content */}
              <div className="p-5 space-y-4">
                {/* Category Badge */}
                <div className="h-6 bg-gray-200 rounded-full w-20"></div>

                {/* Creator */}
                <div className="h-4 bg-gray-200 rounded w-32"></div>

                {/* Title */}
                <div className="space-y-2">
                  <div className="h-5 bg-gray-200 rounded w-full"></div>
                  <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded w-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                  <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
                  <div className="h-10 bg-gray-200 rounded-xl flex-1"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-lg p-12 text-center border border-red-100">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">Oops! Something went wrong</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (mods.length === 0) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl shadow-lg p-12 text-center border border-indigo-100">
        <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full mb-6 shadow-md">
          <Search className="w-12 h-12 text-indigo-600" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">No mods found</h3>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          We couldn't find any mods matching your criteria. Try adjusting your search or filters.
        </p>

        {/* Suggestions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Package className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Browse all mods</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Filter className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Clear filters</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <TrendingUp className="w-8 h-8 text-pink-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">View trending</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      {/* Results Summary */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <span>{mods.length} mods found</span>
        </div>
      </div>

      {/* Dynamic Grid */}
      <div className={`grid ${getGridClasses(gridColumns)} gap-8 auto-rows-fr`}>
        {mods.map((mod, index) => (
          <ModCard
            key={mod.id}
            mod={mod}
            onFavorite={onFavorite}
            isFavorited={favorites.includes(mod.id)}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
