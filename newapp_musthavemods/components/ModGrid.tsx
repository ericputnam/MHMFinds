import React from 'react';
import { ModCard } from './ModCard';
import { Mod } from '../types';

interface ModGridProps {
  mods: Mod[];
  isLoading: boolean;
  onModClick?: (mod: Mod) => void;
}

export const ModGrid: React.FC<ModGridProps> = ({ mods, isLoading, onModClick }) => {
  
  // Skeleton Loader Component
  const SkeletonCard = () => (
    <div className="bg-mhm-card border border-white/5 rounded-2xl overflow-hidden h-full flex flex-col">
      <div className="aspect-[4/3] bg-white/5 animate-pulse relative">
         <div className="absolute top-3 left-3 w-20 h-6 bg-white/10 rounded-full" />
      </div>
      <div className="p-5 flex-1 flex flex-col space-y-3">
        <div className="h-6 bg-white/10 rounded-md w-3/4 animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-white/10" />
          <div className="h-3 bg-white/10 rounded w-1/3" />
        </div>
        <div className="space-y-2 pt-2">
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-5/6" />
        </div>
        <div className="pt-4 mt-auto flex justify-between items-center">
          <div className="h-3 bg-white/5 rounded w-1/4" />
          <div className="w-8 h-8 bg-white/5 rounded-lg" />
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (mods.length === 0) {
    return (
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-md mx-auto">
          <div className="text-6xl mb-6">👻</div>
          <h3 className="text-2xl font-bold text-white mb-3 font-display">No mods found</h3>
          <p className="text-slate-400">
            We couldn't find any mods matching your criteria. Try adjusting your filters or search for a different vibe.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="container mx-auto px-4 py-8 pb-24">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {mods.map((mod) => (
          <ModCard key={mod.id} mod={mod} onClick={onModClick} />
        ))}
      </div>
    </section>
  );
};
