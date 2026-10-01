'use client';

import Link from 'next/link';
import { CheckCircle2, Heart, Loader2 } from 'lucide-react';

interface GoSaveOfferProps {
  /** The visitor has a session — changes the copy, never the flow. */
  signedIn: boolean;
  /** The mod is in the visitor's favorites. */
  saved: boolean;
  /** A favorite request is in flight. */
  pending: boolean;
  /** Owner's handler: POST the favorite, or send a signed-out visitor to sign-up. */
  onSave: () => void;
  /** Where "View your favorites" goes (the signed-in favorites page). */
  favoritesHref: string;
}

/**
 * "Save this mod" — account-capture offer on /go/[modId] (Cass, E152,
 * 2026-10-01). Replaces the E4 email box in the same slot.
 *
 * Presentational only: GoClient owns the favorite request and the
 * 401 → sign-up flow. Inline, in normal flow, no dialog / fixed / sticky —
 * nothing may block content on first paint. The owner renders it outside
 * every ad anchor.
 *
 * Copy is split by session status: a signed-in visitor is never told to
 * "create a free account".
 */
export function GoSaveOffer({ signedIn, saved, pending, onSave, favoritesHref }: GoSaveOfferProps) {
  return (
    <div
      className="bg-slate-800/50 border border-sims-pink/20 rounded-xl px-6 py-5 mb-8 flex flex-col sm:flex-row sm:items-center gap-4"
      data-capture="go-save"
    >
      <div className="w-10 h-10 rounded-full bg-sims-pink/15 flex items-center justify-center flex-shrink-0">
        <Heart size={20} className={saved ? 'text-sims-pink fill-current' : 'text-sims-pink'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold">Save this mod for later</p>
        <p className="text-sm text-slate-400">
          {signedIn
            ? 'Add it to your favorites and find it again any time.'
            : 'Create a free account and this mod is saved to your favorites, so you can find it again any time.'}
        </p>
      </div>
      {saved ? (
        <Link
          href={favoritesHref}
          className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white whitespace-nowrap"
        >
          <CheckCircle2 size={18} className="text-sims-green flex-shrink-0" />
          Saved · View your favorites
        </Link>
      ) : (
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          aria-busy={pending}
          className="px-5 py-2.5 bg-sims-pink hover:bg-sims-pink/80 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-colors whitespace-nowrap inline-flex items-center justify-center gap-2"
        >
          {pending ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Saving...
            </>
          ) : (
            'Save to favorites'
          )}
        </button>
      )}
    </div>
  );
}

export default GoSaveOffer;
