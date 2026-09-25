'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Star, Package, UserCircle, ArrowRight } from 'lucide-react';
import type { MoreFromCreatorData } from '@/lib/creatorMods';

/**
 * "More from <creator>" on the mod page (E106, 2026-09-25).
 *
 * Presentational only. The data is resolved on the server by
 * lib/creatorMods.ts getMoreFromCreator() in app/mods/[id]/page.tsx and
 * arrives as a prop, so every link below is in the first-paint HTML —
 * a crawler following /mods/[id] reaches the creator's other mods and,
 * when the creator clears MIN_MODS_FOR_PAGE, the /creator/[slug]/ page.
 * Do not reintroduce a fetch here: the pre-E106 version loaded via
 * useEffect → /api/mods/[id]/creator and none of its links were crawlable.
 *
 * Sits between two `.mv-ads` InContentAd siblings in ModDetailClient; it
 * is a sibling of those anchors, never a child.
 */

interface MoreFromCreatorProps {
  data: MoreFromCreatorData | null;
}

function formatPrice(price: string | null, isFree: boolean): string {
  if (isFree || !price || parseFloat(price) === 0) return 'Free';
  return `$${parseFloat(price).toFixed(2)}`;
}

export function MoreFromCreator({ data }: MoreFromCreatorProps) {
  // Hide when the creator has no other mods
  if (!data || data.mods.length === 0) {
    return null;
  }

  const { displayName, totalMods, creatorHref, mods } = data;

  return (
    <section
      className="bg-mhm-card border border-white/5 rounded-2xl shadow-lg p-6 mt-6"
      aria-labelledby="more-from-creator-heading"
      data-testid="more-from-creator"
    >
      <h2
        id="more-from-creator-heading"
        className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2"
      >
        <UserCircle size={20} className="text-sims-pink" />
        {creatorHref ? (
          <Link href={creatorHref} className="hover:text-sims-pink transition-colors">
            More from {displayName}
          </Link>
        ) : (
          <>More from {displayName}</>
        )}
      </h2>
      <div className="border-t border-white/10 mb-6" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {mods.map((mod) => (
          <Link
            key={mod.id}
            href={`/mods/${mod.id}/`}
            className="group block rounded-xl overflow-hidden border border-white/10 hover:border-sims-pink/40 hover:shadow-lg transition-all duration-300"
          >
            {/* Thumbnail */}
            <div className="relative aspect-[4/3] bg-white/5 overflow-hidden">
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
                  <Package size={32} className="text-slate-500" />
                </div>
              )}

              {/* Price badge */}
              <div className="absolute top-2 left-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold text-white shadow ${
                    mod.isFree ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                >
                  {formatPrice(mod.price, mod.isFree)}
                </span>
              </div>

              {/* Category badge */}
              {mod.category && (
                <div className="absolute top-2 right-2">
                  <span className="bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-white">
                    {mod.category}
                  </span>
                </div>
              )}
            </div>

            {/* Card content */}
            <div className="p-3">
              <h3 className="text-sm font-semibold text-white line-clamp-2 group-hover:text-sims-pink transition-colors leading-snug mb-1.5">
                {mod.title}
              </h3>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="truncate max-w-[60%]">{mod.gameVersion || 'Sims 4'}</span>

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

      {/* Crawlable path to the creator page; only printed when that page exists (>= MIN_MODS_FOR_PAGE). */}
      {creatorHref && (
        <div className="mt-5 pt-4 border-t border-white/10">
          <Link
            href={creatorHref}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-sims-pink hover:text-white transition-colors"
          >
            See all {totalMods} mods by {displayName}
            <ArrowRight size={16} />
          </Link>
        </div>
      )}
    </section>
  );
}
