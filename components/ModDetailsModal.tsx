'use client';

import React from 'react';
import Image from 'next/image';
import { X, Download, Heart, ExternalLink, CheckCircle2, Star, Eye, Layers, Sparkles } from 'lucide-react';
import { Mod } from '../lib/api';
import { ProtectedDownloadButton } from './subscription/ProtectedDownloadButton';

// Facet tag colors (shared with ModCard)
const FACET_COLORS: Record<string, { bg: string; text: string }> = {
  // Content types
  'hair': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'tops': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  'bottoms': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'dresses': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'shoes': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  'accessories': { bg: 'bg-violet-500/20', text: 'text-violet-300' },
  'jewelry': { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  'makeup': { bg: 'bg-rose-500/20', text: 'text-rose-300' },
  'furniture': { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  'lighting': { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  'decor': { bg: 'bg-red-500/20', text: 'text-red-300' },
  'poses': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  'gameplay-mod': { bg: 'bg-indigo-500/20', text: 'text-indigo-300' },
  'script-mod': { bg: 'bg-violet-500/20', text: 'text-violet-300' },
  'lot': { bg: 'bg-lime-500/20', text: 'text-lime-300' },
  // Visual styles
  'alpha': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'maxis-match': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  // Themes
  'christmas': { bg: 'bg-red-500/20', text: 'text-red-300' },
  'halloween': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  'cottagecore': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'y2k': { bg: 'bg-fuchsia-500/20', text: 'text-fuchsia-300' },
  'goth': { bg: 'bg-slate-500/20', text: 'text-slate-300' },
  'modern': { bg: 'bg-gray-500/20', text: 'text-gray-300' },
  'vintage': { bg: 'bg-amber-500/20', text: 'text-amber-300' },
  'fantasy': { bg: 'bg-violet-500/20', text: 'text-violet-300' },
  // Age groups
  'infant': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'toddler': { bg: 'bg-orange-500/20', text: 'text-orange-300' },
  'child': { bg: 'bg-yellow-500/20', text: 'text-yellow-300' },
  'teen': { bg: 'bg-green-500/20', text: 'text-green-300' },
  'young-adult': { bg: 'bg-cyan-500/20', text: 'text-cyan-300' },
  'adult': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'elder': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  'all-ages': { bg: 'bg-indigo-500/20', text: 'text-indigo-300' },
  // Gender
  'feminine': { bg: 'bg-pink-500/20', text: 'text-pink-300' },
  'masculine': { bg: 'bg-blue-500/20', text: 'text-blue-300' },
  'unisex': { bg: 'bg-purple-500/20', text: 'text-purple-300' },
  // Default
  'default': { bg: 'bg-slate-500/20', text: 'text-slate-300' },
};

function getFacetColor(value: string): { bg: string; text: string } {
  return FACET_COLORS[value.toLowerCase()] || FACET_COLORS['default'];
}

function formatFacetLabel(value: string): string {
  return value
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface ModDetailsModalProps {
  mod: Mod;
  onClose: () => void;
}

export const ModDetailsModal: React.FC<ModDetailsModalProps> = ({ mod, onClose }) => {

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Format numbers for display
  const formatNumber = (num: number | undefined): string => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(0) + 'k';
    return num.toString();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div className="bg-[#0F141F] w-full max-w-5xl rounded-3xl border border-white/10 shadow-2xl shadow-black/80 overflow-hidden flex flex-col md:flex-row max-h-[90vh] animate-in zoom-in-95 duration-300 relative">

        {/* Close Button (Mobile overlay) */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 text-white rounded-full md:hidden hover:bg-black/70 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Left: Visuals */}
        <div className="md:w-5/12 lg:w-5/12 bg-black relative flex-shrink-0 min-h-[300px] md:min-h-0">
          <Image
            src={mod.thumbnail || '/placeholder.jpg'}
            alt={mod.title}
            fill
            className="object-cover opacity-80"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0F141F] via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-[#0F141F]" />

          {/* Floating Badge */}
          <div className="absolute top-6 left-6">
            {mod.isFree ? (
              <div className="bg-sims-green/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg flex items-center gap-2 border border-white/10">
                <Layers className="w-3.5 h-3.5" /> Free Mod
              </div>
            ) : (
              <div className="bg-amber-500/90 backdrop-blur-md px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-lg flex items-center gap-2 border border-white/10">
                <Sparkles className="w-3.5 h-3.5" /> ${parseFloat(mod.price || '0').toFixed(2)}
              </div>
            )}
          </div>
        </div>

        {/* Right: Content (Scrollable) */}
        <div className="flex-1 flex flex-col md:w-7/12 overflow-y-auto custom-scrollbar bg-[#0F141F]">

          {/* Header Section */}
          <div className="p-8 pb-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-1 rounded bg-white/5 text-[#06B6D4] text-[10px] font-bold uppercase tracking-wider border border-white/5">
                  {mod.contentType || mod.category}
                </span>
              </div>
              <button
                onClick={onClose}
                className="hidden md:block text-slate-500 hover:text-white transition-colors p-1"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight mb-4 font-display">
              {mod.title}
            </h2>

            <div className="flex items-center justify-between border-b border-white/5 pb-6 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-sims-pink p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#151B2B] flex items-center justify-center text-white text-xs font-bold">
                    {(mod.creator?.handle || mod.author || 'C').substring(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-400 text-xs uppercase tracking-wide font-semibold">Created By</span>
                  <div className="flex items-center text-white font-bold gap-1">
                    {mod.creator?.handle || mod.author || 'Creator'}
                    {(mod.creator?.isVerified || mod.isVerified) && (
                      <CheckCircle2 className="w-4 h-4 text-[#06B6D4]" />
                    )}
                  </div>
                </div>
              </div>

              {mod.rating && mod.rating > 0 && (
                <div className="flex items-center gap-6 text-center">
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1 text-yellow-400 font-bold">
                      <span>{mod.rating.toFixed(1)}</span>
                      <Star className="w-4 h-4 fill-current" />
                    </div>
                    <span className="text-[10px] text-slate-500 font-medium uppercase">Rating</span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg p-3 text-center border border-white/5 hover:border-sims-pink/30 transition-all">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Download className="w-3.5 h-3.5 text-sims-pink" />
                  <div className="text-white font-bold text-base">{formatNumber(mod.downloadCount)}</div>
                </div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Downloads</div>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg p-3 text-center border border-white/5 hover:border-pink-500/30 transition-all">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Heart className="w-3.5 h-3.5 text-pink-500" />
                  <div className="text-white font-bold text-base">{formatNumber(mod._count?.favorites || 0)}</div>
                </div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Favorites</div>
              </div>
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] rounded-lg p-3 text-center border border-white/5 hover:border-cyan-500/30 transition-all">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <Eye className="w-3.5 h-3.5 text-cyan-500" />
                  <div className="text-white font-bold text-base">{formatNumber(mod.viewCount || 0)}</div>
                </div>
                <div className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Views</div>
              </div>
            </div>

            {/* Main Actions */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <ProtectedDownloadButton
                modId={mod.id}
                downloadUrl={mod.downloadUrl}
                sourceUrl={mod.sourceUrl}
                className="flex-1 bg-sims-pink hover:bg-sims-pink/90 text-white py-3 px-5 rounded-xl font-bold text-sm shadow-lg transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Mod
              </ProtectedDownloadButton>
              <a
                href={mod.sourceUrl || 'https://musthavemods.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-[#1E293B] hover:bg-[#334155] text-white py-3 px-5 rounded-xl font-bold text-sm border border-white/10 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                {mod.sourceUrl ? 'View Blog Post' : 'MustHaveMods Blog'}
              </a>
            </div>

            {/* About Section */}
            {mod.description && (
              <div className="mb-6">
                <h3 className="text-white font-bold text-base mb-3">
                  About This Mod
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {mod.description}
                </p>
              </div>
            )}

            {/* Facets Section */}
            {(mod.contentType || mod.visualStyle || (mod.themes && mod.themes.length > 0) || (mod.ageGroups && mod.ageGroups.length > 0) || (mod.genderOptions && mod.genderOptions.length > 0)) && (
              <div className="mb-6">
                <h3 className="text-white font-bold text-base mb-3">
                  Details
                </h3>
                <div className="space-y-3">
                  {/* Content Type & Visual Style */}
                  {(mod.contentType || mod.visualStyle) && (
                    <div className="flex flex-wrap gap-2">
                      {mod.contentType && (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide ${getFacetColor(mod.contentType).bg} ${getFacetColor(mod.contentType).text} border border-white/5`}>
                          {formatFacetLabel(mod.contentType)}
                        </span>
                      )}
                      {mod.visualStyle && (
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide ${getFacetColor(mod.visualStyle).bg} ${getFacetColor(mod.visualStyle).text} border border-white/5`}>
                          {formatFacetLabel(mod.visualStyle)}
                        </span>
                      )}
                    </div>
                  )}
                  {/* Themes */}
                  {mod.themes && mod.themes.length > 0 && (
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold block mb-1.5">Themes</span>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.themes.map((theme) => (
                          <span
                            key={theme}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${getFacetColor(theme).bg} ${getFacetColor(theme).text}`}
                          >
                            {formatFacetLabel(theme)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Age Groups */}
                  {mod.ageGroups && mod.ageGroups.length > 0 && (
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold block mb-1.5">Age Groups</span>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.ageGroups.map((age) => (
                          <span
                            key={age}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${getFacetColor(age).bg} ${getFacetColor(age).text}`}
                          >
                            {formatFacetLabel(age)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Gender Options */}
                  {mod.genderOptions && mod.genderOptions.length > 0 && (
                    <div>
                      <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold block mb-1.5">Gender</span>
                      <div className="flex flex-wrap gap-1.5">
                        {mod.genderOptions.map((gender) => (
                          <span
                            key={gender}
                            className={`px-2.5 py-1 rounded-md text-[11px] font-medium ${getFacetColor(gender).bg} ${getFacetColor(gender).text}`}
                          >
                            {formatFacetLabel(gender)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {mod.tags && mod.tags.length > 0 && (
              <div>
                <h3 className="text-white font-bold text-base mb-3">
                  Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {mod.tags.map((tag, index) => (
                    <span key={index} className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/5 transition-all hover:border-white/20 cursor-pointer">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
