'use client';

/**
 * CreatorBadgeEmbed — the copy-paste block on /creator/[slug]/badge/
 * (Nova, E269, 2026-10-25).
 *
 * Shows the badge in both variants and three snippets (HTML, Markdown, bare
 * link). Every copy fires one GA4 event (`creator_badge_copy`, params:
 * creator slug, kind, variant) so "badge embeds" can be read as copies, not
 * guessed. The sessions the badge sends are read separately in GA4 as
 * `sessionSource = creator-badge` (lib/creatorBadge.ts).
 *
 * Copy is short and functional (charter non-negotiable 2). This component
 * never renders inside an ad anchor — the badge page has no sidebar.
 */

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  BADGE_ALT,
  BADGE_COPY_EVENT,
  BADGE_HEIGHT,
  BADGE_IMAGE_PATH,
  BADGE_VARIANTS,
  BADGE_WIDTH,
  badgeSnippet,
  type BadgeSnippetKind,
  type BadgeVariant,
} from '../../lib/creatorBadge';

interface CreatorBadgeEmbedProps {
  slug: string;
  displayName: string;
}

const SNIPPETS: Array<{ kind: BadgeSnippetKind; label: string; hint: string }> = [
  { kind: 'html', label: 'HTML', hint: 'Tumblr, Patreon (HTML block), WordPress, Blogger, your own site' },
  { kind: 'markdown', label: 'Markdown', hint: 'CurseForge descriptions, GitHub READMEs, Ko-fi' },
  { kind: 'link', label: 'Just the link', hint: 'Linktree, bios, anywhere that only takes a URL' },
];

function fireCopyEvent(slug: string, kind: BadgeSnippetKind, variant: BadgeVariant): void {
  (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.('event', BADGE_COPY_EVENT, {
    creator: slug,
    kind,
    variant,
  });
}

export function CreatorBadgeEmbed({ slug, displayName }: CreatorBadgeEmbedProps) {
  const [variant, setVariant] = useState<BadgeVariant>('dark');
  const [copied, setCopied] = useState<BadgeSnippetKind | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const copy = async (kind: BadgeSnippetKind) => {
    const text = badgeSnippet(kind, slug, displayName, variant);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setCopied(kind);
        fireCopyEvent(slug, kind, variant);
      }
    } catch {
      /* clipboard unavailable — the snippet is selectable below */
    }
  };

  return (
    <div data-testid="creator-badge-embed" className="space-y-8">
      {/* Variant picker + preview */}
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-4" role="radiogroup" aria-label="Badge style">
          {BADGE_VARIANTS.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={variant === v}
              onClick={() => setVariant(v)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                variant === v
                  ? 'border-sims-pink bg-sims-pink/10 text-white'
                  : 'border-white/10 text-slate-400 hover:text-white hover:border-white/30'
              }`}
              data-testid={`creator-badge-variant-${v}`}
            >
              {v === 'dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
        <div
          className={`inline-block rounded-2xl p-6 border border-white/10 ${
            variant === 'light' ? 'bg-slate-100' : 'bg-black/40'
          }`}
        >
          {/* Static SVG from public/; unoptimized because the optimizer does not take SVG. */}
          <Image
            src={BADGE_IMAGE_PATH[variant]}
            alt={BADGE_ALT}
            width={BADGE_WIDTH}
            height={BADGE_HEIGHT}
            unoptimized
            data-testid="creator-badge-preview"
          />
        </div>
      </div>

      {/* Snippets */}
      <div className="space-y-5">
        {SNIPPETS.map(({ kind, label, hint }) => {
          const text = badgeSnippet(kind, slug, displayName, variant);
          return (
            <div key={kind} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div>
                  <p className="text-sm font-semibold text-white m-0">{label}</p>
                  <p className="text-xs text-slate-500 m-0">{hint}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copy(kind)}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-sims-pink text-white text-sm font-semibold hover:bg-sims-pink/90 transition-colors"
                  data-testid={`creator-badge-copy-${kind}`}
                >
                  {copied === kind ? 'Copied' : 'Copy'}
                </button>
              </div>
              <code
                className="block select-all break-all whitespace-pre-wrap text-xs text-slate-300 bg-black/40 rounded-lg p-3"
                data-testid={`creator-badge-snippet-${kind}`}
              >
                {text}
              </code>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CreatorBadgeEmbed;
