'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Download, ArrowLeft, Loader2, Clock, Info } from 'lucide-react';
import { useDownloadTracking } from '@/lib/hooks/useAnalytics';

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
  const { trackDownload } = useDownloadTracking();

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

  // NOTE: Do NOT call window.mediavine.newPageView() here.
  // `usePageTracking` is already mounted globally in app/providers.tsx and
  // fires newPageView() on every route change (including this page's
  // initial mount). Calling it a second time from this component races
  // Mediavine's initial ad setup and tears down every ad slot on the page
  // — including the bottom sticky. The layout-shell fix above is enough:
  // by the time Mediavine runs its first DOM scan, the mv-ads wrapper,
  // the video slot, and the sticky <aside> are already in the DOM.

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

      // Reset Mediavine's floating positioning so it renders inline inside
      // our slot. Deliberately DO NOT force width: 100% — we want the video
      // to keep its natural (small) size and be centered by the flex parent,
      // so the "Advertisement" box can hug the video tightly.
      const resetStyles: Partial<CSSStyleDeclaration> = {
        position: 'relative',
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        maxWidth: '100%',
        transform: 'none',
        margin: '0 auto',
        zIndex: 'auto',
      };
      Object.assign(outstream.style, resetStyles);

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
      // Track the download click before navigating away (fire-and-forget)
      trackDownload(mod.id);
      window.open(targetUrl, '_blank');
      // Redirect back to mod page or home
      router.push(`/mods/${mod.id}`);
    }
  }, [mod, router, trackDownload]);

  // Hard error: mod fetch finished but no mod returned. This is a real
  // not-found state, so it's fine to bail out of the layout entirely —
  // there's no download to monetize.
  if (!loading && !mod) {
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

  /*
    CRITICAL: Render the full layout shell (including the video slot,
    `mv-ads` wrapper, and `<aside id="secondary">` sidebar) on the FIRST
    paint, regardless of `loading` state. Mediavine's Script Wrapper
    scans the DOM for ad anchors when the page first hydrates. If the
    layout is gated behind a loading skeleton, Mediavine sees no anchors,
    fills nothing, and the entire pageview shows zero ads even after
    the data resolves.

    Data-dependent parts (mod thumbnail, title, source) fall back to
    skeleton placeholders while `loading === true`. The Continue button
    is disabled until both `mod` and `canProceed` are ready.
  */
  return (
    <div className="min-h-screen bg-mhm-dark">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href={mod ? `/mods/${mod.id}` : '/'}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to mod
          </Link>
        </div>
      </div>

      {/*
        2-column layout on desktop: main content (col-span-2) + sticky sidebar
        (col-span-1, hidden on mobile). Matches the pattern used by
        app/mods/[id]/page.tsx so Mediavine treats the aside consistently.
      */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content column */}
          <div className="lg:col-span-2">
            {/* Mod Preview — skeleton while mod loads */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-6">
                {loading || !mod ? (
                  <>
                    <div className="w-24 h-24 rounded-lg bg-slate-700/60 animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-6 w-3/4 bg-slate-700/60 rounded animate-pulse" />
                      <div className="h-4 w-1/2 bg-slate-700/40 rounded animate-pulse" />
                    </div>
                    <Loader2 className="h-6 w-6 animate-spin text-sims-pink" />
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </div>
            </div>

            {/*
              Video advertisement box.
              The outer flex container centers the box horizontally in the
              main column. The box itself uses `inline-flex` + `w-fit` so it
              shrinks to hug Mediavine's Universal Player at its natural size
              (~300-400px wide, 16:9) instead of stretching to a huge empty
              container. min-height/min-width reserve a reasonable footprint
              so there's no CLS before the player is moved in.
            */}
            <div className="flex justify-center mb-8">
              <div
                ref={videoSlotRef}
                id="mhm-inline-video-slot"
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 inline-flex flex-col items-center"
                style={{ minHeight: '240px', minWidth: '340px', maxWidth: '100%' }}
              >
                <div className="text-center mb-3">
                  <p className="text-sm text-slate-400 uppercase tracking-wider">Advertisement</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Thanks for supporting free mods — this ad keeps MustHaveMods running
                  </p>
                </div>
                {/* Mediavine's .mv-outstream-container is appended here by useEffect */}
              </div>
            </div>

            {/*
              Content-hub wrapper with `mv-ads` class.

              Mediavine's Script Wrapper injects in-content display ads
              BETWEEN the children of an `.mv-ads` element (same mechanism as
              components/ModGrid.tsx). A single-child mv-ads does not fill.

              With two sibling content blocks (install guide + Pinterest CTA),
              Mediavine has exactly one legitimate injection anchor between
              them — which is under the install guide, exactly where the
              user wants a content ad. The Pinterest CTA is a content block
              that gives the ad context and also funnels traffic back to our
              #1 referral source.
            */}
            <div className="mv-ads space-y-8 mb-8">
              {/* Install guide */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
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

              {/* Mediavine injects a display ad in this gap */}

              {/* Pinterest CTA — Pinterest is the #1 traffic source */}
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-white font-semibold mb-0.5">Never miss a mod drop</p>
                    <p className="text-sm text-slate-400">
                      Follow us on Pinterest for daily Sims 4 CC finds
                    </p>
                  </div>
                  <a
                    href="https://www.pinterest.com/musthavemods/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2.5 bg-[#E60023] hover:bg-[#BD081C] text-white font-semibold rounded-lg transition-colors whitespace-nowrap"
                  >
                    Follow on Pinterest
                  </a>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <div className="text-center">
              {canProceed && mod ? (
                <button
                  onClick={handleProceed}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-sims-pink hover:bg-sims-pink/80 text-white font-bold text-lg rounded-xl transition-all shadow-lg hover:shadow-xl"
                >
                  <Download className="h-6 w-6" />
                  Continue to Download
                </button>
              ) : (
                <div className="text-slate-400">
                  <p className="mb-2">
                    {loading
                      ? 'Preparing your download...'
                      : `Your download will be ready in ${countdown} seconds`}
                  </p>
                  <div className="w-64 h-2 bg-slate-700 rounded-full mx-auto overflow-hidden">
                    <div
                      className="h-full bg-sims-pink transition-all duration-1000 ease-linear"
                      style={{ width: `${loading ? 0 : ((10 - countdown) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/*
            Mediavine sticky sidebar (desktop only, lg+).

            Why only ONE placeholder here (unlike /mods/[id] which has two):
            This is a short interstitial page — no scrolling, everything
            fits in one viewport. A classic ATF + BTF sidebar puts the BTF
            sticky ad at its natural flow position AFTER the ATF, which on
            a short page lands halfway down the viewport. The ad then
            appears "at the bottom" because the user never scrolls.

            With a single placeholder as the one-and-only child of the
            aside, Mediavine's sticky sidebar ad renders at flow position
            y=0 inside the aside — top-right of the grid row, right next
            to the mod preview card. This is the position the user wants.

            Rules (per CLAUDE.md / MEMORY.md):
            - <aside id="secondary" class="widget-area primary-sidebar">
            - overflow must be visible (no overflow:hidden on ancestors)
            - Do NOT add position:sticky/fixed — Mediavine handles stickiness
            - Sticky ad MUST be the last (here: only) element in the sidebar
          */}
          <aside
            id="secondary"
            className="widget-area primary-sidebar hidden lg:block overflow-visible"
            role="complementary"
            aria-label="Sidebar ads"
          >
            {/* Single sticky placeholder — Mediavine places its sidebar ad
                at the top of this div and makes it sticky. min-h-[600px]
                reserves enough vertical space for a 300x600 half-page unit
                without causing CLS as Mediavine mounts the iframe. */}
            <div className="min-h-[600px]" />
          </aside>
        </div>
      </div>
    </div>
  );
}
