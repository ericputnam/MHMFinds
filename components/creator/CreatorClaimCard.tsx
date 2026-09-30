'use client';

/**
 * CreatorClaimCard — the "Are you <creator>?" ask on /creator/[slug]/
 * (Nova, E144, 2026-09-30).
 *
 * Why this exists: E122/E129 made the claim path work end to end, and in
 * its first week the 534 creator pages drew 558 landing sessions while
 * /submit-mod/ drew 1 view total and 0 with `?creator=` (GA4 09-23→09-29;
 * 0 ModSubmission rows with source 'Creator Claim' ever). The people on a
 * creator page are that creator's fans, not the creator — roughly one
 * landing per page per week, and the creator is one person out of that.
 * A footnote-styled link asking "Are you X?" therefore reaches almost
 * nobody it is written for, however well it renders.
 *
 * So the card does two things, in one visible block in the hero:
 *   1. keeps the creator's own path — "Claim this page" → claimHref(slug)
 *      (the E122 form, which onboards a signed-in claimant);
 *   2. gives the fan something to do — "Send them this page" copies the
 *      claim URL with `ref=share`, so a claim that arrives through a
 *      forwarded link is distinguishable in GA4 from one clicked on the
 *      page (pagePathPlusQueryString), and the click itself is a GA4
 *      event (`creator_claim_share`) the scoreboard can count.
 *
 * Copy is short and functional (charter non-negotiable 2). The card is a
 * child of the hero <header>, a sibling of nothing Mediavine owns — never
 * inside <aside id="secondary"> or between .mv-ads children.
 *
 * Hidden when the page already belongs to a verified creator profile:
 * asking a claimed page's visitors to claim it again is noise.
 */

import React, { useEffect, useState } from 'react';
import { CLAIM_PARAM, claimHref } from '../../lib/creatorClaim';

const SITE = 'https://musthavemods.com';

/** `ref` value on a claim URL that a fan forwarded (vs. clicked on-page). */
export const CLAIM_SHARE_REF = 'share';

/** GA4 event fired when a visitor copies/shares the claim link. */
export const CLAIM_SHARE_EVENT = 'creator_claim_share';

/**
 * Absolute claim URL for forwarding. Same `?creator=<slug>` the form reads
 * (parseClaimSlug ignores every other param), plus `ref=share` so GA4 can
 * tell a forwarded claim view from an on-page click.
 */
export function claimShareUrl(slug: string): string {
  return `${SITE}${claimHref(slug)}&ref=${CLAIM_SHARE_REF}`;
}

/** Sanity: the share URL must still carry the slug under CLAIM_PARAM. */
export function shareUrlSlug(url: string): string | null {
  try {
    return new URL(url).searchParams.get(CLAIM_PARAM);
  } catch {
    return null;
  }
}

type ShareState = 'idle' | 'copied' | 'shown';

interface CreatorClaimCardProps {
  slug: string;
  displayName: string;
  /** True when a verified CreatorProfile already owns this page. */
  claimed?: boolean;
}

function fireShareEvent(slug: string, method: 'clipboard' | 'share' | 'shown'): void {
  (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.('event', CLAIM_SHARE_EVENT, {
    creator: slug,
    method,
  });
}

export function CreatorClaimCard({ slug, displayName, claimed = false }: CreatorClaimCardProps) {
  const [state, setState] = useState<ShareState>('idle');

  useEffect(() => {
    if (state !== 'copied') return;
    const t = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(t);
  }, [state]);

  if (claimed) return null;

  const url = claimShareUrl(slug);

  const share = async () => {
    // Clipboard first: universally understood, no OS sheet on desktop.
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setState('copied');
        fireShareEvent(slug, 'clipboard');
        return;
      }
    } catch {
      /* fall through to the next method */
    }
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: `${displayName} on MustHaveMods`, url });
        fireShareEvent(slug, 'share');
        return;
      }
    } catch {
      /* user dismissed or unsupported — show the URL instead */
    }
    setState('shown');
    fireShareEvent(slug, 'shown');
  };

  return (
    <div
      data-testid="creator-claim-card"
      className="mt-5 inline-flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-sims-pink/25 bg-sims-pink/5 px-4 py-3 text-sm"
    >
      <p className="text-slate-200 m-0">
        Are you <span className="font-semibold text-white">{displayName}</span>?{' '}
        <a
          href={claimHref(slug)}
          className="text-sims-pink font-semibold hover:underline"
          data-testid="creator-claim-link"
        >
          Claim this page →
        </a>
      </p>
      <span className="hidden sm:inline text-slate-600" aria-hidden="true">
        ·
      </span>
      <p className="text-slate-400 m-0">
        Know {displayName}?{' '}
        <button
          type="button"
          onClick={share}
          className="text-sims-pink hover:underline"
          data-testid="creator-claim-share"
        >
          {state === 'copied' ? 'Link copied' : 'Send them this page'}
        </button>
        {state === 'shown' && (
          <>
            {' '}
            <code className="select-all break-all text-slate-300" data-testid="creator-claim-share-url">
              {url}
            </code>
          </>
        )}
      </p>
    </div>
  );
}

export default CreatorClaimCard;
