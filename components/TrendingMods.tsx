'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Package, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRef } from 'react';

interface TrendingMod {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string;
  author: string | null;
  rating: number | null;
  isFree: boolean;
  price: string | null;
  gameVersion: string | null;
  downloadCount: number;
}

export function TrendingMods() {
  const [mods, setMods] = useState<TrendingMod[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await fetch('/api/mods?sortBy=downloadCount&sortOrder=desc&limit=12');
        if (!response.ok) return;
        const data = await response.json();
        setMods(data.mods || []);
      } catch (err) {
        console.error('Error fetching trending mods:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 320;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-sims-pink" />
          <h2 className="text-xl font-bold text-white">Trending Mods</h2>
        </div>
        <div className="flex gap-4 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex-shrink-0 w-[280px]">
              <div className="aspect-[4/3] bg-white/5 rounded-xl mb-3" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (mods.length === 0) return null;

  const formatPrice = (price: string | null, isFree: boolean): string => {
    if (isFree || !price || parseFloat(price) === 0) return 'Free';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-sims-pink" />
          <h2 className="text-xl font-bold text-white">Trending Mods</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {mods.map((mod) => (
          <Link
            key={mod.id}
            href={`/mods/${mod.id}`}
            className="group flex-shrink-0 w-[280px] rounded-xl overflow-hidden bg-mhm-card border border-white/5 hover:border-sims-pink/30 hover:shadow-lg hover:shadow-sims-pink/5 transition-all duration-300"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] bg-white/5 overflow-hidden">
              {mod.thumbnail ? (
                <Image
                  src={mod.thumbnail}
                  alt={mod.title}
                  fill
                  sizes="280px"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package size={32} className="text-slate-600" />
                </div>
              )}

              {/* Price badge */}
              <div className="absolute top-2 left-2">
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white shadow ${
                  mod.isFree ? 'bg-emerald-500' : 'bg-amber-500'
                }`}>
                  {formatPrice(mod.price, mod.isFree)}
                </span>
              </div>

              {/* Game badge */}
              <div className="absolute top-2 right-2">
                <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white">
                  {mod.gameVersion || 'Sims 4'}
                </span>
              </div>
            </div>

            {/* Card content */}
            <div className="p-3">
              <h3 className="text-sm font-semibold text-slate-200 line-clamp-2 group-hover:text-sims-pink transition-colors leading-snug mb-1.5">
                {mod.title}
              </h3>

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="truncate max-w-[55%]">
                  {mod.author || 'Unknown Creator'}
                </span>

                <div className="flex items-center gap-2">
                  {typeof mod.rating === 'number' && mod.rating > 0 && (
                    <div className="flex items-center gap-0.5 text-yellow-500 font-semibold">
                      <Star size={11} className="fill-current" />
                      <span>{mod.rating.toFixed(1)}</span>
                    </div>
                  )}
                  <span className="text-slate-600">{mod.category}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
