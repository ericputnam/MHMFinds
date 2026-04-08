'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
  const [countdown, setCountdown] = useState(10);
  const [canProceed, setCanProceed] = useState(false);
  const videoSlotRef = useRef<HTMLDivElement>(null);

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

  /*
    Relocate Mediavine's Universal Video Player into our in-content ad slot.

    Why this is needed:
    Mediavine serves a Universal Player on this site, but the Script Wrapper
    auto-places it as a floating outstream container in the bottom-right
    corner of the viewport. None of the documented anchor attributes
    (`#mediavine-video-player`, `.mv-video-player`, `data-video-type="inline"`)
    reliably override that on our setup — the player keeps floating.

    How this works:
    1. Mount a target `videoSlotRef` div inside the "Advertisement" box.
    2. Watch the DOM with a MutationObserver for Mediavine to add its
       `.mv-outstream-container` (which wraps the <video> element and the
       `#universalPlayer` adunit).
    3. When it appears, reset Mediavine's floating styles (position, offsets,
       width, transform) and physically move the container into our slot.
    4. Disconnect the observer once moved, or after a 15s safety timeout.

    Risks / mitigations:
    - Moving Mediavine's DOM can disrupt viewability tracking. Mitigated by
      only moving once, and placing the slot in a naturally-visible area
      above the fold so IntersectionObserver still measures it correctly.
    - Mediavine may re-create the container on ad refresh. The observer keeps
      running for 15s to catch re-creations during initial ad-load settle.
  */
  useEffect(() => {
    if (loading) return;
    if (typeof window === 'undefined') return;

    let moved = false;

    const relocateVideo = () => {
      if (moved) return true;
      const slot = videoSlotRef.current;
      if (!slot) return false;

      // Mediavine wraps the outstream video + universalPlayer adunit in this container.
      const outstream = document.querySelector<HTMLElement>('.mv-outstream-container');
      if (!outstream) return false;

      // Already in our slot — nothing to do.
      if (slot.contains(outstream)) {
        moved = true;
        return true;
      }

      // Reset Mediavine's floating positioning so it fills the slot inline.
      const resetStyles: Partial<CSSStyleDeclaration> = {
        position: 'relative',
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        width: '100%',
        maxWidth: '100%',
        height: 'auto',
        minHeight: '360px',
        transform: 'none',
        margin: '0',
        zIndex: 'auto',
      };
      Object.assign(outstream.style, resetStyles);

      // Also reset any absolutely-positioned children that Mediavine uses for
      // the floating viewport — these are sized against the viewport and
      // would render tiny inside our 740px-wide slot otherwise.
      outstream.querySelectorAll<HTMLElement>('[style*="position: absolute"]').forEach((el) => {
        el.style.position = 'relative';
        el.style.width = '100%';
        el.style.height = 'auto';
      });

      // Make the <video> element actually fill the slot.
      const video = outstream.querySelector<HTMLVideoElement>('video');
      if (video) {
        video.style.width = '100%';
        video.style.height = 'auto';
        video.style.maxWidth = '100%';
      }

      slot.appendChild(outstream);
      moved = true;
      return true;
    };

    // Try immediately in case Mediavine already injected the player.
    if (relocateVideo()) return;

    // Otherwise watch for it to be added to the DOM.
    const observer = new MutationObserver(() => {
      relocateVideo();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback: also poll every 500ms for the first 10s (belt-and-suspenders
    // in case Mediavine mutates inside an existing node rather than adding new).
    const pollInterval = setInterval(() => {
      if (relocateVideo()) clearInterval(pollInterval);
    }, 500);

    const cleanupTimer = setTimeout(() => {
      observer.disconnect();
      clearInterval(pollInterval);
    }, 15000);

    return () => {
      observer.disconnect();
      clearInterval(pollInterval);
      clearTimeout(cleanupTimer);
    };
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
          Target slot for Mediavine's Universal Video Player.
          The videoSlotRef useEffect (above) relocates Mediavine's
          `.mv-outstream-container` into this div at runtime, resetting its
          floating styles so the <video> element renders inline here instead
          of floating in the bottom-right corner.

          min-height reserves ~360px of layout so there's no CLS between page
          mount and the video being moved in.
        */}
        <div
          ref={videoSlotRef}
          id="mhm-inline-video-slot"
          className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-8 flex flex-col"
          style={{ minHeight: '360px' }}
        >
          <div className="text-center mb-3">
            <p className="text-sm text-slate-400 uppercase tracking-wider">Advertisement</p>
            <p className="text-xs text-slate-500 mt-1">
              Thanks for supporting free mods — this ad keeps MustHaveMods running
            </p>
          </div>
          {/* Mediavine's .mv-outstream-container will be appended here by useEffect */}
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
                  style={{ width: `${((10 - countdown) / 10) * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
