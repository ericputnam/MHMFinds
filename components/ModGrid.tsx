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
  onModClick?: (mod: Mod) => void;
  favorites: string[];
  gridColumns?: number; // New prop for dynamic grid columns
}

export function ModGrid({ mods, loading, error, onFavorite, onModClick, favorites, gridColumns = 4 }: ModGridProps) {
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
      <div className="w-full h-96 flex flex-col items-center justify-center text-slate-400">
        <div className="relative">
          <div className="absolute inset-0 bg-sims-green blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-sims-green relative z-10" />
        </div>
        <p className="animate-pulse font-medium text-lg text-sims-green">Summoning Mod Files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 rounded-3xl border border-white/5 border-dashed p-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/10 rounded-full mb-6">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-3">Oops! Something went wrong</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-sims-pink hover:bg-sims-pink/90 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-300 shadow-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (mods.length === 0) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center text-slate-500 bg-white/5 rounded-3xl border border-white/5 border-dashed">
        <Package className="w-16 h-16 mb-4 opacity-40 text-sims-pink" />
        <p className="text-lg font-medium mb-2">No finds here...</p>
        <p className="text-sm opacity-70">Try searching for "Maxis match" or "Clutter"</p>
      </div>
    );
  }

  return (
    <section className="py-8 container mx-auto px-4 bg-mhm-dark relative z-10">
      {/* Dynamic Grid - mv-ads class enables Mediavine in-content ads */}
      <div className={`grid ${getGridClasses(gridColumns)} gap-x-6 gap-y-10 mv-ads`}>
        {mods.map((mod, index) => (
          <ModCard
            key={mod.id}
            mod={mod}
            onFavorite={onFavorite}
            onClick={onModClick}
            isFavorited={favorites.includes(mod.id)}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          />
        ))}
      </div>
    </section>
  );
}
