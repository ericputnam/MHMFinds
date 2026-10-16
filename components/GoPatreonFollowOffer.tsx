'use client';

import { Heart } from 'lucide-react';
import { GO_FOLLOW_SLOT_SOURCE } from '@/lib/capture/goPatreonFollow';

interface GoPatreonFollowOfferProps {
  /** The free-tier join link (never the paid checkout — see lib/capture/goPatreonFollow.ts). */
  href: string;
  /** Owner's click handler: fires the GA4 event; navigation is the anchor's own. */
  onClick: () => void;
}

/**
 * "Follow free on Patreon" — the owned-audience ask on /go/[modId] (Cass,
 * 2026-10-15), in the slot the E152 account offer used until it was killed.
 *
 * Presentational only. Inline, in normal flow, no dialog / fixed / sticky —
 * nothing blocks content on first paint. The owner renders it outside every
 * ad anchor. The link opens in a new tab so a click never interrupts the
 * countdown.
 */
export function GoPatreonFollowOffer({ href, onClick }: GoPatreonFollowOfferProps) {
  return (
    <div
      className="bg-slate-800/50 border border-sims-pink/20 rounded-xl px-6 py-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-4"
      data-capture={GO_FOLLOW_SLOT_SOURCE}
    >
      <div className="w-10 h-10 rounded-full bg-sims-pink/15 flex items-center justify-center flex-shrink-0">
        <Heart size={20} className="text-sims-pink" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold">Follow MustHaveMods free on Patreon</p>
        <p className="text-sm text-slate-400">
          New CC drops and roundups in your Patreon feed. The free tier — nothing to pay.
        </p>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className="px-5 py-2.5 bg-sims-pink hover:bg-sims-pink/80 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap inline-flex items-center justify-center"
      >
        Follow free on Patreon
      </a>
    </div>
  );
}

export default GoPatreonFollowOffer;
