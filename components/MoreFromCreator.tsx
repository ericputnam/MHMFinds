'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Package, UserCircle } from 'lucide-react';

interface CreatorMod {
  id: string;
  title: string;
  thumbnail: string | null;
  category: string;
  author: string | null;
  rating: number | null;
  isFree: boolean;
  price: string | null;
  gameVersion: string | null;
}

interface MoreFromCreatorProps {
  modId: string;
  author: string | null;
}

export function MoreFromCreator({ modId, author }: MoreFromCreatorProps) {
  const [mods, setMods] = useState<CreatorMod[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!author) {
      setLoading(false);
      return;
    }

    const fetchCreatorMods = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/mods/${modId}/creator`);
        if (!response.ok) return;
        const data = await response.json();
        setMods(data);
      } catch (err) {
        console.error('Error fetching creator mods:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCreatorMods();
  }, [modId, author]);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
          <UserCircle size={20} className="text-indigo-600" />
          More from Creator
        </h2>
        <div className="border-t border-gray-200 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/3] bg-gray-200 rounded-xl mb-3" />
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Hide if no author or no other mods
  if (!author || mods.length === 0) {
    return null;
  }

  const formatPrice = (price: string | null, isFree: boolean): string => {
    if (isFree || !price || parseFloat(price) === 0) return 'Free';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
        <UserCircle size={20} className="text-indigo-600" />
        More from {author}
      </h2>
      <div className="border-t border-gray-200 mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mods.map((mod) => (
          <Link
            key={mod.id}
            href={`/mods/${mod.id}`}
            className="group block rounded-xl overflow-hidden border border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
              {mod.thumbnail ? (
                <Image
                  src={mod.thumbnail}
                  alt={mod.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package size={32} className="text-gray-300" />
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

              {/* Category badge */}
              <div className="absolute top-2 right-2">
                <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white">
                  {mod.category}
                </span>
              </div>
            </div>

            {/* Card content */}
            <div className="p-3">
              <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-indigo-600 transition-colors leading-snug mb-1.5">
                {mod.title}
              </h3>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="truncate max-w-[60%]">
                  {mod.gameVersion || 'Sims 4'}
                </span>

                {typeof mod.rating === 'number' && mod.rating > 0 && (
                  <div className="flex items-center gap-0.5 text-yellow-500 font-semibold">
                    <Star size={12} className="fill-current" />
                    <span>{mod.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
