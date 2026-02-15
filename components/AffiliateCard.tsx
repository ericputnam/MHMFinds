'use client';

import React from 'react';
import Image from 'next/image';
import { ExternalLink, Sparkles } from 'lucide-react';

export interface AffiliateOffer {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  affiliateUrl: string;
  partner: string;
  partnerLogo: string | null;
  category: string;
  promoText: string | null;
  promoColor: string | null;
}

interface AffiliateCardProps {
  offer: AffiliateOffer;
  className?: string;
  style?: React.CSSProperties;
}

export function AffiliateCard({ offer, className = '', style }: AffiliateCardProps) {
  const handleClick = async () => {
    // Track the click (fire and forget)
    fetch('/api/affiliates/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: offer.id,
        sourceType: 'grid',
        pageUrl: window.location.href,
      }),
    }).catch(console.error);

    // Open affiliate link
    window.open(offer.affiliateUrl, '_blank');
  };

  return (
    <article
      onClick={handleClick}
      className={`group relative bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 rounded-2xl overflow-hidden hover:border-amber-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 flex flex-col h-full hover:-translate-y-1 cursor-pointer ${className}`}
      style={style}
      aria-label={`Sponsored: ${offer.name} from ${offer.partner}`}
    >
      {/* Sponsored Badge */}
      <div className="absolute top-3 left-3 z-20">
        <div className="flex items-center gap-1 bg-amber-500/90 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-lg">
          <Sparkles size={10} />
          Sponsored
        </div>
      </div>

      {/* Promo Badge */}
      {offer.promoText && (
        <div className="absolute top-3 right-3 z-20">
          <span
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-lg"
            style={{ backgroundColor: offer.promoColor || '#ec4899' }}
          >
            {offer.promoText}
          </span>
        </div>
      )}

      {/* Image Container */}
      <div className="relative aspect-[4/3] overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10 opacity-80" />
        <Image
          src={offer.imageUrl}
          alt={offer.name}
          fill
          unoptimized
          sizes="(max-width: 768px) 100vw, 33vw"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
        />
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col relative z-20 -mt-4">
        {/* Partner/Brand */}
        <div className="flex items-center gap-2 mb-2">
          {offer.partnerLogo && (
            <Image
              src={offer.partnerLogo}
              alt={offer.partner}
              width={64}
              height={16}
              unoptimized
              className="h-4 w-auto"
            />
          )}
          <span className="text-xs text-amber-400 font-semibold uppercase tracking-wide">
            {offer.partner}
          </span>
        </div>

        <h3 className="text-lg font-bold text-white leading-tight mb-2 group-hover:text-amber-400 transition-colors line-clamp-2">
          {offer.name}
        </h3>

        {offer.description && (
          <p className="text-slate-400 text-sm line-clamp-2 mb-3 flex-1 leading-relaxed">
            {offer.description}
          </p>
        )}

        {/* CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-auto">
          <span className="text-sm font-medium text-amber-400">
            View Deal
          </span>
          <div className="bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-white p-2.5 rounded-xl transition-all duration-200 group/btn">
            <ExternalLink className="w-4 h-4" />
          </div>
        </div>
      </div>
    </article>
  );
}
