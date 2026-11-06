'use client';

// E352 (Pip, 2026-11-06) — "Share" for mod and collection pages.
//
// Placement rule (Mediavine): render this only in a non-ad zone — a sibling
// of every `.mv-ads` element, never a child, and never inside or beside
// <aside id="secondary">. __tests__/unit/share-button.test.ts enforces it for
// every page that imports this component.
//
// Phones get the OS share sheet (Messages, Discord, WhatsApp — where Sims
// players actually swap links); desktop (~90-98 % of mod/collection landings)
// copies the link. The link carries `?via=share` (lib/share/pageShare.ts).

import { useEffect, useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import {
  buildShareUrl,
  trackShare,
  type ShareContentType,
} from '@/lib/share/pageShare';

interface ShareButtonProps {
  /** Site path of the page being shared, e.g. `/mods/<id>/`. */
  path: string;
  /** Title for the OS share sheet. */
  title: string;
  contentType: ShareContentType;
  /** Mod id or collection slug, sent as GA4 `item_id`. */
  itemId: string;
  label?: string;
  className?: string;
}

function prefersShareSheet(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  try {
    return window.matchMedia?.('(pointer: coarse)').matches ?? false;
  } catch {
    return false;
  }
}

export function ShareButton({
  path,
  title,
  contentType,
  itemId,
  label = 'Share',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const onClick = async () => {
    const url = buildShareUrl(path);

    if (prefersShareSheet()) {
      try {
        await navigator.share({ title, url });
        trackShare({ method: 'web_share', contentType, itemId });
        return;
      } catch (err) {
        // The visitor closed the sheet: that is not a share, and not a reason
        // to copy behind their back.
        if (err instanceof DOMException && err.name === 'AbortError') return;
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        trackShare({ method: 'clipboard', contentType, itemId });
        return;
      }
    } catch {
      /* fall through to the prompt */
    }

    // Last resort (insecure context, clipboard blocked): show the URL so it
    // can be copied by hand.
    window.prompt('Copy this link:', url);
    trackShare({ method: 'prompt', contentType, itemId });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="share-button"
      aria-live="polite"
      className={
        className ??
        'inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-sims-pink hover:text-white transition-colors'
      }
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      <span>{copied ? 'Link copied' : label}</span>
    </button>
  );
}

export default ShareButton;
