'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Mod } from '../lib/api';
import { Download, Eye, Star, Heart, Crown, Sparkles } from 'lucide-react';

interface ModCardProps {
  mod: Mod;
  onFavorite: (modId: string) => void;
  isFavorited: boolean;
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

export function ModCard({ mod, onFavorite, isFavorited, className = '', style }: ModCardProps) {
  const router = useRouter();

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/mods/${mod.id}`);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // If there's a download URL, open it
    if (mod.downloadUrl) {
      window.open(mod.downloadUrl, '_blank');
    } else if (mod.sourceUrl) {
      // Otherwise, open the source URL
      window.open(mod.sourceUrl, '_blank');
    } else {
      // Fallback to detail page
      router.push(`/mods/${mod.id}`);
    }
  };

  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavorite(mod.id);
  };

  return (
    <div 
      className={`group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 overflow-hidden transform hover:-translate-y-2 hover:scale-[1.02] h-full flex flex-col border border-gray-100 ${className}`}
      style={style}
    >
      {/* Premium Badge - Top Left */}
      {mod.isVerified && (
        <div className="absolute top-3 left-3 z-10">
          <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
            <Crown size={12} />
            Verified
          </div>
        </div>
      )}

      {/* Featured Badge - Top Right */}
      {mod.isFeatured && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
            <Sparkles size={12} />
            Featured
          </div>
        </div>
      )}

      {/* Thumbnail Container */}
      <div className="relative aspect-[16/10] bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {/* Thumbnail image or No Preview fallback */}
        {mod.thumbnail ? (
          <img
            src={mod.thumbnail}
            alt={mod.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-200 to-indigo-300 rounded-full flex items-center justify-center mx-auto mb-2">
                <Download size={24} className="text-blue-600" />
              </div>
              <p className="text-blue-600 text-sm font-medium">No Preview</p>
            </div>
          </div>
        )}

        {/* Price Badge - Bottom Right */}
        <div className="absolute bottom-3 right-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold shadow-lg ${
            mod.isFree 
              ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white' 
              : 'bg-gradient-to-r from-amber-500 to-orange-600 text-white'
          }`}>
            {formatPrice(mod.price)}
          </span>
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="absolute bottom-3 left-3">
            <div className="flex items-center gap-2 text-white text-xs">
              <div className="flex items-center gap-1">
                <Eye size={14} />
                <span className="font-medium">{formatNumber(mod.viewCount || 0)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Download size={14} />
                <span className="font-medium">{formatNumber(mod.downloadCount || 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Category Badge */}
        <div className="mb-3">
          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
            {mod.category}
          </span>
        </div>

        {/* Creator Info - Prominent placement right after category */}
        {(mod.creator || mod.author) && (
          <div className="flex items-center gap-2 mb-3 text-sm">
            <span className="text-gray-500 font-medium">by</span>
            <span className="font-semibold text-gray-700">
              {mod.creator?.handle || mod.author || 'Creator'}
            </span>
            {mod.creator?.isVerified && (
              <div className="w-4 h-4 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                <Crown size={10} className="text-white" />
              </div>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="font-bold text-lg text-gray-900 mb-3 group-hover:text-[#1e1b4b] transition-colors leading-tight line-clamp-2">
          {mod.title}
        </h3>

        {/* Description */}
        {mod.description && (
          <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-2">
            {mod.description}
          </p>
        )}

        {/* Stats Row */}
        <div className="flex items-center justify-between mb-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-500 fill-current" />
            <span>{typeof mod.rating === 'number' ? mod.rating.toFixed(1) : '4.5'}</span>
            <span className="text-gray-400">({formatNumber(mod.ratingCount || 0)})</span>
          </div>
          <div className="text-gray-400">
            {mod.gameVersion}
          </div>
        </div>


        {/* Action Buttons */}
        <div className="flex gap-3 mt-auto">
          {/* Details Button - Icon Only */}
          <button
            onClick={handleViewDetails}
            className="flex-1 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 p-3 rounded-xl transition-all duration-300 flex items-center justify-center group/btn hover:shadow-md"
            title="View Details"
          >
            <Eye size={18} className="group-hover/btn:scale-110 transition-transform" />
          </button>

          {/* Download Button - Icon Only */}
          <button
            onClick={handleDownload}
            className="flex-1 bg-gradient-to-r from-[#1e1b4b] to-[#4338ca] hover:from-[#2d2852] hover:to-[#3730a3] text-white p-3 rounded-xl transition-all duration-300 flex items-center justify-center group/btn hover:shadow-lg hover:scale-105"
            title="Download Mod"
          >
            <Download size={18} className="group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>

        {/* Favorite Button - Floating */}
        <button
          onClick={handleFavorite}
          className={`absolute top-3 right-3 z-20 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
            isFavorited
              ? 'bg-red-500 text-white shadow-lg scale-110'
              : 'bg-white/90 text-gray-600 hover:bg-red-500 hover:text-white hover:scale-110'
          }`}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart 
            size={18} 
            className={`transition-all duration-300 ${isFavorited ? 'fill-current' : ''}`}
          />
        </button>
      </div>
    </div>
  );
}
