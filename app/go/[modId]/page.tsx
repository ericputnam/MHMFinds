'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Download, ArrowLeft, Loader2, Clock, Info } from 'lucide-react';

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

export default function DownloadInterstitialPage() {
  const params = useParams();
  const router = useRouter();
  const [mod, setMod] = useState<Mod | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(5);
  const [canProceed, setCanProceed] = useState(false);

  // Fetch mod details
  useEffect(() => {
    const fetchData = async () => {
      try {
        const modResponse = await fetch(`/api/mods/${params.modId}`);
        if (modResponse.ok) {
          const modData = await modResponse.json();
          setMod(modData);
        }
      } catch (error) {
        console.error('Error fetching mod:', error);
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
                unoptimized
                className="w-24 h-24 rounded-lg object-cover"
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

        {/*
          Mediavine Universal Video Player
          The wrapper script in app/components/ConditionalScripts.tsx auto-detects
          #mediavine-video-player on every page and injects the floating player.
          Same pattern as app/mods/[id]/page.tsx. No Mediavine dashboard setup needed.
        */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden mb-8">
          <div
            id="mediavine-video-player"
            className="mv-video-player"
            data-video-type="floating"
            style={{ minHeight: '400px' }}
          >
            {/* Mediavine Universal Player injects here automatically */}
          </div>
        </div>

        {/*
          Mediavine in-content display slot.
          Mediavine Script Wrapper injects display ads into elements with the
          `mv-ads` class (same mechanism used by components/ModGrid.tsx).
          Wrapping a small "what's next" content block so the ad has real
          content context to sit inside of — higher fill rate than an empty div.
        */}
        <div className="mv-ads bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-sims-pink flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-white mb-2">
                How to install this mod
              </h2>
              <ol className="text-sm text-slate-300 space-y-1 list-decimal list-inside">
                <li>Extract the downloaded .zip file</li>
                <li>
                  Copy the <code className="text-sims-pink">.package</code> files to{' '}
                  <code className="text-sims-pink">Documents/Electronic Arts/The Sims 4/Mods</code>
                </li>
                <li>Enable custom content in Game Options → Other</li>
                <li>Restart The Sims 4 and enjoy!</li>
              </ol>
            </div>
          </div>
        </div>

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
