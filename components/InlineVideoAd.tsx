'use client';

import { useEffect, useRef, useState } from 'react';

/*
  Inline Mediavine video ad slot.

  Ports the proven Universal Player relocation pattern from the /go/[modId]
  interstitial (app/go/[modId]/GoClient.tsx) into a reusable component so
  high-traffic pages (starting with /mods/[id]) get a video-first ad slot.
  Video CPM is 5-10x display CPM.

  How it works:
  1. Render a display-ad fallback (`.mv-ads`, ~98% fill) inside a styled slot.
  2. Watch the DOM with a MutationObserver for Mediavine's floating
     `.mv-outstream-container` (the Universal Player). The documented anchor
     attributes (`.mv-video-player`, `data-video-type="inline"`) do NOT
     reliably anchor the player inline on our setup — it floats bottom-right.
  3. When the container appears, reset its floating styles and physically
     move it into this slot; hide the display fallback so the box doesn't
     show an empty 250px gap above the video.
  4. If neither video nor display fills within 8s, hide the whole box so the
     user never sees empty "Advertisement" chrome.

  Rules (per CLAUDE.md):
  - `.mv-ads` needs ≥2 children — Mediavine injects BETWEEN children.
  - Never call window.mediavine.newPageView() here; the global
    usePageTracking hook already fires it per route change, and a second
    call races Mediavine's init and tears down every ad slot on the page.
  - This component must be in the DOM on first paint (no loading guards in
    parents) or Mediavine's initial scan misses the anchors entirely.
*/
export function InlineVideoAd() {
  const videoSlotRef = useRef<HTMLDivElement>(null);
  const displayFallbackRef = useRef<HTMLDivElement>(null);
  const [adSlotEmpty, setAdSlotEmpty] = useState(false);

  // Relocate the Universal Player into our slot when Mediavine mounts it.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let moved = false;

    const relocateVideo = () => {
      if (moved) return true;
      const slot = videoSlotRef.current;
      if (!slot) return false;

      const outstream = document.querySelector<HTMLElement>('.mv-outstream-container');
      if (!outstream) return false;

      if (slot.contains(outstream)) {
        moved = true;
        return true;
      }

      // Reset Mediavine's floating positioning so the player renders inline
      // and fills the slot width in a 16:9 box (the default outstream
      // thumbnail is ~160x90, which reads as a broken ad in a wide slot).
      const resetStyles: Partial<CSSStyleDeclaration> = {
        position: 'relative',
        top: 'auto',
        left: 'auto',
        right: 'auto',
        bottom: 'auto',
        width: '100%',
        height: 'auto',
        maxWidth: '100%',
        aspectRatio: '16 / 9',
        transform: 'none',
        margin: '0 auto',
        zIndex: 'auto',
      };
      Object.assign(outstream.style, resetStyles);

      outstream
        .querySelectorAll<HTMLElement>('video, .mv-video-wrapper, .mv-video-container')
        .forEach((el) => {
          el.style.width = '100%';
          el.style.height = '100%';
          el.style.maxWidth = '100%';
          (el.style as CSSStyleDeclaration & { objectFit: string }).objectFit = 'contain';
        });

      // Hide the display fallback once video wins — otherwise the 250px
      // display slot sits empty above the video.
      if (displayFallbackRef.current) {
        displayFallbackRef.current.style.display = 'none';
      }

      slot.appendChild(outstream);
      moved = true;
      return true;
    };

    if (relocateVideo()) return;

    const observer = new MutationObserver(() => {
      relocateVideo();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Belt-and-suspenders: Mediavine sometimes mutates inside an existing
    // node rather than adding new ones, which the observer can miss.
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
  }, []);

  // Hide the whole box if neither video nor display ever fills. 8s covers
  // Mediavine's auction + lazy-load without leaving empty chrome on screen.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let settled = false;
    const checkFill = () => {
      if (settled) return;
      const slot = videoSlotRef.current;
      if (!slot) return;

      const hasVideo = !!slot.querySelector(
        '.mv-outstream-container video, .mv-outstream-container iframe'
      );
      const display = displayFallbackRef.current;
      const hasDisplay = !!(
        display &&
        (display.querySelector('iframe') || display.querySelector('ins') || display.offsetHeight > 260)
      );

      if (hasVideo || hasDisplay) {
        settled = true;
        setAdSlotEmpty(false);
      }
    };

    const fillPoll = setInterval(checkFill, 500);
    const hideTimer = setTimeout(() => {
      if (!settled) setAdSlotEmpty(true);
      clearInterval(fillPoll);
    }, 8000);

    return () => {
      clearInterval(fillPoll);
      clearTimeout(hideTimer);
    };
  }, []);

  return (
    <div
      className={`flex justify-center my-6${adSlotEmpty ? ' hidden' : ''}`}
      aria-hidden={adSlotEmpty}
    >
      <div
        ref={videoSlotRef}
        id="mhm-inline-video-slot"
        className="bg-mhm-card border border-white/5 rounded-2xl shadow-lg p-4 flex flex-col items-center w-full max-w-[728px]"
      >
        <div className="text-center mb-3">
          <p className="text-sm text-slate-400 uppercase tracking-wider">Advertisement</p>
          <p className="text-xs text-slate-500 mt-1">
            Thanks for supporting free mods — this ad keeps MustHaveMods running
          </p>
        </div>
        <div ref={displayFallbackRef} className="mv-ads w-full min-h-[250px]">
          <div />
          <div />
        </div>
      </div>
    </div>
  );
}
