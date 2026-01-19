'use client';

import { useState, useEffect } from 'react';

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

interface UseAffiliateOffersOptions {
  limit?: number;
  category?: string;
  source?: 'grid' | 'interstitial' | 'sidebar';
  refreshKey?: number | string; // Change this to trigger a refetch (e.g., page number)
}

export function useAffiliateOffers(options: UseAffiliateOffersOptions = {}) {
  const { limit = 2, category, source = 'grid', refreshKey } = options;
  const [offers, setOffers] = useState<AffiliateOffer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffers = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('limit', limit.toString());
        params.set('source', source);
        // Add cache buster to prevent browser caching
        params.set('_t', Date.now().toString());
        if (category) params.set('category', category);

        const response = await fetch(`/api/affiliates?${params}`, {
          cache: 'no-store',
        });
        if (response.ok) {
          const data = await response.json();
          setOffers(data.offers || []);
        }
      } catch (error) {
        console.error('Failed to fetch affiliate offers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [limit, category, source, refreshKey]);

  return { offers, loading };
}
