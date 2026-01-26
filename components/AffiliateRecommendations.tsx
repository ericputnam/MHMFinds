'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink, ShoppingBag } from 'lucide-react';

interface AffiliateProduct {
  id: string;
  name: string;
  imageUrl: string;
  affiliateUrl: string;
  salePrice?: number | null;
  originalPrice?: number | null;
  partner?: string;
}

interface AffiliateRecommendationsProps {
  modId: string;
  themes: string[];
}

export function AffiliateRecommendations({ modId, themes }: AffiliateRecommendationsProps) {
  const [products, setProducts] = useState<AffiliateProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      // Don't fetch if no themes provided
      if (!themes || themes.length === 0) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch('/api/affiliates/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            themes,
            limit: 4,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to fetch product recommendations');
        }

        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Error fetching affiliate products:', err);
        setError('Unable to load recommendations');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [themes]);

  const handleProductClick = async (product: AffiliateProduct) => {
    // Track the click before redirecting
    try {
      await fetch('/api/affiliates/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          offerId: product.id,
          sourceType: 'mod_page',
          modId,
          pageUrl: typeof window !== 'undefined' ? window.location.href : '',
        }),
      });
    } catch (err) {
      // Don't block the redirect if tracking fails
      console.error('Failed to track click:', err);
    }

    // Open the affiliate link in a new tab
    window.open(product.affiliateUrl, '_blank', 'noopener,noreferrer');
  };

  // Don't render if no themes, loading, error, or no products
  if (!themes || themes.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <div className="aspect-square bg-gray-200 rounded-lg"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || products.length === 0) {
    return null;
  }

  const getPrice = (product: AffiliateProduct): number => {
    return product.salePrice || product.originalPrice || 0;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShoppingBag size={18} className="text-sims-pink" />
          <h3 className="font-bold text-gray-800">Complete the Look</h3>
        </div>
        <span className="text-[10px] text-gray-400 uppercase tracking-wide font-medium">
          Sponsored
        </span>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <button
            key={product.id}
            onClick={() => handleProductClick(product)}
            className="group text-left bg-gray-50 rounded-xl overflow-hidden hover:shadow-md hover:bg-gray-100 transition-all duration-200 border border-gray-100 hover:border-sims-pink/30"
          >
            {/* Product Image */}
            <div className="relative aspect-square bg-white overflow-hidden">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <ShoppingBag size={24} className="text-gray-400" />
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
                <ExternalLink size={20} className="text-white drop-shadow-lg" />
              </div>
            </div>

            {/* Product Info */}
            <div className="p-3">
              <p className="text-xs font-medium text-gray-800 line-clamp-2 mb-1 group-hover:text-sims-pink transition-colors">
                {product.name}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">
                  ${getPrice(product).toFixed(2)}
                </span>
                {product.partner && (
                  <span className="text-[10px] text-gray-500">
                    {product.partner}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Shop Now CTA */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <p className="text-[11px] text-gray-500 text-center">
          Clicking these links supports our site at no extra cost to you
        </p>
      </div>
    </div>
  );
}

export default AffiliateRecommendations;
