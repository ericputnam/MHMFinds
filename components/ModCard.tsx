'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Mod } from '../lib/api';
import { Download, Eye, Star, Heart, Crown, Sparkles } from 'lucide-react';
import { ProtectedDownloadButton } from './subscription/ProtectedDownloadButton';

interface ModCardProps {
  mod: Mod;
  onFavorite: (modId: string) => void;
  isFavorited: boolean;
  onClick?: (mod: Mod) => void;
  className?: string;
  style?: React.CSSProperties;
}

const formatPrice = (price: string | null): string => {
  if (!price || parseFloat(price) === 0) return 'Free';
  return `$${parseFloat(price).toFixed(2)}`;
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export function ModCard({ mod, onFavorite, isFavorited, onClick, className = '', style }: ModCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    if (onClick) {
      onClick(mod);
    } else {
      router.push(`/mods/${mod.id}`);
    }
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleCardClick();
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(mod.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: (e: React.MouseEvent) => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      // Create a synthetic mouse event from the keyboard event
      action(e as unknown as React.MouseEvent);
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className={`group relative bg-mhm-card border border-white/5 rounded-2xl overflow-hidden hover:border-sims-purple/30 transition-all duration-300 hover:shadow-2xl hover:shadow-sims-pink/10 flex flex-col h-full hover:-translate-y-1 cursor-pointer ${className}`}
      style={style}
      aria-label={`${mod.title} by ${mod.creator?.handle || mod.author || 'Unknown Creator'}`}
    >
      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-t from-mhm-card via-transparent to-transparent z-10 opacity-80" />
        {mod.thumbnail ? (
          <img
            src={mod.thumbnail}
            alt={mod.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-2">
                <Download size={24} className="text-slate-400" />
              </div>
              <p className="text-slate-400 text-sm font-medium">No Preview</p>
            </div>
          </div>
        )}

        {/* Floating Tags */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 items-end">
          <span className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white border border-white/10">
            {mod.category}
          </span>
          {mod.isFeatured && (
            <span className="bg-sims-pink px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-lg flex items-center gap-1">
              <Sparkles size={10} />
              Featured
            </span>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute top-3 left-3 z-20">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold text-white shadow-lg flex items-center gap-1 ${
            mod.isFree ? 'bg-sims-green/90' : 'bg-amber-500/90'
          }`}>
            {formatPrice(mod.price)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col relative z-20 -mt-4">
        <div className="mb-1">
          {/* Rating Badge */}
          {typeof mod.rating === 'number' && mod.rating > 0 && (
            <div className="inline-flex items-center gap-1 text-yellow-400 text-xs font-bold mb-2 bg-yellow-400/10 px-2 py-0.5 rounded">
              <Star className="w-3 h-3 fill-current" />
              {mod.rating.toFixed(1)}
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-sims-blue transition-colors line-clamp-2">
          {mod.title}
        </h3>

        {/* Author Line */}
        {(mod.creator || mod.author) && (
          <div className="flex items-center text-slate-400 text-xs mb-4 font-medium">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center mr-2 text-[8px] text-white border border-white/10">
              {(mod.creator?.handle || mod.author || 'C').substring(0, 2).toUpperCase()}
            </div>
            <span className="hover:text-white cursor-pointer transition-colors">
              {mod.creator?.handle || mod.author || 'Creator'}
            </span>
            {(mod.creator?.isVerified || mod.isVerified) && (
              <Crown className="w-3 h-3 ml-1 text-sims-blue" />
            )}
          </div>
        )}

        {mod.description && (
          <p className="text-slate-400 text-sm line-clamp-2 mb-4 flex-1 leading-relaxed">
            {mod.description}
          </p>
        )}

        {/* Stats & Action */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
          <div className="flex items-center text-slate-500 text-xs font-medium">
            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {formatNumber(mod.downloadCount || 0)} Downloads
          </div>

          <ProtectedDownloadButton
            modId={mod.id}
            downloadUrl={mod.downloadUrl}
            sourceUrl={mod.sourceUrl}
            className="bg-white/5 hover:bg-white text-white hover:text-black p-2.5 rounded-xl transition-all duration-200 group/btn"
          >
            <Download className="w-4 h-4" />
          </ProtectedDownloadButton>
        </div>
      </div>

      {/* Favorite Button - Floating */}
      <button
        onClick={handleFavorite}
        onKeyDown={(e) => handleKeyDown(e, handleFavorite)}
        className={`absolute top-3 right-3 z-30 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 pointer-events-auto backdrop-blur-md ${
          isFavorited
            ? 'bg-sims-pink text-white shadow-lg scale-110'
            : 'bg-black/40 text-white hover:bg-sims-pink hover:scale-110'
        }`}
        aria-label={isFavorited ? `Remove ${mod.title} from favorites` : `Add ${mod.title} to favorites`}
        aria-pressed={isFavorited}
        title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Heart
          size={18}
          className={`transition-all duration-300 ${isFavorited ? 'fill-current' : ''}`}
          aria-hidden="true"
        />
      </button>
    </article>
  );
}
