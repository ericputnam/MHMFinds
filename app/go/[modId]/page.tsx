'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  Download,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Clock,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';

interface Mod {
  id: string;
  title: string;
  thumbnail: string | null;
  downloadUrl: string | null;
  sourceUrl: string | null;
  source: string;
  creator?: {
    handle: string;
  };
}

interface AffiliateOffer {
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

export default function DownloadInterstitialPage() {
  const params = useParams();
  const router = useRouter();
  const [mod, setMod] = useState<Mod | null>(null);
  const [offers, setOffers] = useState<AffiliateOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [canProceed, setCanProceed] = useState(false);

  // Fetch mod and affiliate offers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [modResponse, offersResponse] = await Promise.all([
          fetch(`/api/mods/${params.modId}`),
          fetch('/api/affiliates?limit=3&source=interstitial'),
        ]);

        if (modResponse.ok) {
          const modData = await modResponse.json();
          setMod(modData);
        }

        if (offersResponse.ok) {
          const offersData = await offersResponse.json();
          setOffers(offersData.offers || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (params.modId) {
      fetchData();
    }
  }, [params.modId]);

  // Countdown timer
  useEffect(() => {
    if (loading) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanProceed(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading]);

  const handleProceed = useCallback(() => {
    if (!mod) return;

    const targetUrl = mod.downloadUrl || mod.sourceUrl;
    if (targetUrl) {
      window.open(targetUrl, '_blank');
      // Redirect back to mod page or home
      router.push(`/mods/${mod.id}`);
    }
  }, [mod, router]);

  const handleAffiliateClick = (offer: AffiliateOffer) => {
    // Open affiliate link immediately (don't wait for tracking)
    window.open(offer.affiliateUrl, '_blank');

    // Track the click in the background (fire and forget)
    fetch('/api/affiliates/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: offer.id,
        sourceType: 'interstitial',
        modId: params.modId,
        pageUrl: window.location.href,
      }),
    }).catch((error) => {
      console.error('Failed to track click:', error);
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mhm-dark flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-sims-pink mx-auto mb-4" />
          <p className="text-slate-400">Preparing your download...</p>
        </div>
      </div>
    );
  }

  if (!mod) {
    return (
      <div className="min-h-screen bg-mhm-dark flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-white mb-4">Mod not found</p>
          <Link href="/" className="text-sims-pink hover:underline">
            Return to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mhm-dark">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            href={`/mods/${mod.id}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to mod
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Mod Preview */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-6">
            {mod.thumbnail && (
              <Image
                src={mod.thumbnail}
                alt={mod.title}
                width={96}
                height={96}
                className="w-24 h-24 rounded-lg object-cover"
                unoptimized
              />
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">{mod.title}</h1>
              <p className="text-slate-400">
                Your download from {mod.source} will begin shortly
              </p>
            </div>
            {!canProceed && (
              <div className="text-center">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock className="h-5 w-5" />
                  <span className="text-2xl font-bold tabular-nums">{countdown}s</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Affiliate Offers */}
        {offers.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="h-5 w-5 text-sims-pink" />
              <h2 className="text-lg font-semibold text-white">
                While you wait, check out these deals
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <button
                  key={offer.id}
                  onClick={() => handleAffiliateClick(offer)}
                  className="group bg-slate-800/50 border border-slate-700 hover:border-sims-pink/50 rounded-xl p-4 text-left transition-all hover:shadow-lg"
                >
                  <div className="relative mb-3">
                    <Image
                      src={offer.imageUrl}
                      alt={offer.name}
                      width={200}
                      height={200}
                      className="w-full aspect-square object-cover rounded-lg bg-slate-700"
                      unoptimized
                    />
                    {offer.promoText && (
                      <span
                        className="absolute top-2 right-2 px-2 py-1 text-xs font-bold text-white rounded-full"
                        style={{ backgroundColor: offer.promoColor || '#ec4899' }}
                      >
                        {offer.promoText}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                    {offer.partner}
                  </div>
                  <h3 className="font-semibold text-white group-hover:text-sims-pink transition-colors line-clamp-2 mb-2">
                    {offer.name}
                  </h3>
                  {offer.description && (
                    <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                      {offer.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-sims-pink">
                    <ShoppingBag className="h-4 w-4" />
                    <span>View Deal</span>
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Continue Button (always visible at bottom) */}
        <div className="text-center">
          {canProceed ? (
            <button
              onClick={handleProceed}
              className="inline-flex items-center gap-2 px-8 py-4 bg-sims-pink hover:bg-sims-pink/80 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl"
            >
              <Download className="h-6 w-6" />
              Continue to Download
            </button>
          ) : (
            <div className="text-slate-400">
              <p className="mb-2">Your download will be ready in {countdown} seconds</p>
              <div className="w-64 h-2 bg-slate-700 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-sims-pink transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
