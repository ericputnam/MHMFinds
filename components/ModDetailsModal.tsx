'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, Download, Heart, ExternalLink, CheckCircle2, Star, Eye, Layers, Sparkles, ArrowRight, Package } from 'lucide-react';
import { Mod } from '../lib/api';
import { ProtectedDownloadButton } from './subscription/ProtectedDownloadButton';
import { getFacetColor, formatFacetLabel } from '../lib/facetColors';

interface RelatedMod {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string;
  author: string | null;
  rating: number | null;
  isFree: boolean;
  price: string | null;
}

interface ModDetailsModalProps {
  mod: Mod;
  onClose: () => void;
}

export const ModDetailsModal: React.FC<ModDetailsModalProps> = ({ mod, onClose }) => {
  const [relatedMods, setRelatedMods] = useState<RelatedMod[]>([]);

  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const response = await fetch(`/api/mods/${mod.id}/related`);
        if (!response.ok) return;
        const data = await response.json();
        setRelatedMods(data.slice(0, 4));
      } catch {
        // silently fail — related mods are non-critical
      }
    };
    fetchRelated();
  }, [mod.id]);

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
            unoptimized
            sizes="(max-width: 768px) 100vw, 40vw"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
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
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
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

            {/* View Full Details — bridges modal → detail page → related mods flow */}
            <Link
              href={`/mods/${mod.id}`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 w-full py-3 px-5 rounded-xl font-bold text-sm bg-gradient-to-r from-[#06B6D4]/20 to-sims-pink/20 border border-[#06B6D4]/30 text-[#06B6D4] hover:from-[#06B6D4]/30 hover:to-sims-pink/30 hover:border-[#06B6D4]/50 transition-all hover:-translate-y-0.5 mb-6"
            >
              View Full Details
              <ArrowRight className="w-4 h-4" />
            </Link>

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
                    <Link
                      key={index}
                      href={`/?search=${encodeURIComponent(tag)}`}
                      onClick={onClose}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs border border-white/5 transition-all hover:border-white/20"
                    >
                      {tag}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Related Mods */}
            {relatedMods.length > 0 && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <h3 className="text-white font-bold text-base mb-4">
                  You Might Also Like
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {relatedMods.map((related) => (
                    <Link
                      key={related.id}
                      href={`/mods/${related.id}`}
                      onClick={onClose}
                      className="group block rounded-xl overflow-hidden border border-white/5 hover:border-sims-pink/30 bg-white/5 hover:bg-white/10 transition-all"
                    >
                      <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                        {related.thumbnail ? (
                          <Image
                            src={related.thumbnail}
                            alt={related.title}
                            fill
                            unoptimized
                            sizes="200px"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Package size={24} className="text-slate-600" />
                          </div>
                        )}
                        <div className="absolute top-2 left-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white ${
                            related.isFree ? 'bg-sims-green/90' : 'bg-amber-500/90'
                          }`}>
                            {related.isFree ? 'Free' : `$${parseFloat(related.price || '0').toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-xs font-semibold text-white line-clamp-2 group-hover:text-sims-blue transition-colors leading-snug">
                          {related.title}
                        </h4>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {related.author || 'Unknown Creator'}
                        </p>
                      </div>
                    </Link>
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
