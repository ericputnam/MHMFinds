'use client';

import { CheckCircle2, Heart, Loader2 } from 'lucide-react';

interface SaveFindsOfferProps {
  /** The mod is already in the visitor's favorites (shared with the button). */
  saved: boolean;
  /** A favorite request is in flight (shared with the button). */
  pending: boolean;
  /** Owner's handler: POST the favorite, or send a signed-out visitor to sign-up. */
  onSave: () => void;
}

/**
 * "Save this find" — account-capture offer on /mods/[id] (Cass, E130,
 * 2026-09-28).
 *
 * Presentational only: the owner (ModDetailClient) holds the favorite state
 * and the 401 → sign-up flow, so the offer and the favorite button can never
 * disagree about whether the mod is saved. Inline, in normal flow, no
 * dialog / fixed / sticky — nothing may block content on first paint.
 * The copy promises exactly what exists today: a favorite stored on the
 * account. There is no favorites list page and no update alert yet, so
 * neither is mentioned.
 */
export function SaveFindsOffer({ saved, pending, onSave }: SaveFindsOfferProps) {
  return (
    <div
      className="bg-mhm-card border border-sims-pink/20 rounded-2xl px-5 py-4 mb-6 flex flex-col sm:flex-row sm:items-center gap-3"
      data-capture="mod-detail-save"
    >
      <div className="w-10 h-10 rounded-full bg-sims-pink/15 flex items-center justify-center flex-shrink-0">
        <Heart size={20} className={saved ? 'text-sims-pink fill-current' : 'text-sims-pink'} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold">Save this find</p>
        <p className="text-sm text-slate-400">
          Create a free account and this mod is saved to your favorites.
        </p>
      </div>
      {saved ? (
        <span className="inline-flex items-center gap-2 text-sm text-slate-300 whitespace-nowrap">
          <CheckCircle2 size={18} className="text-sims-green flex-shrink-0" />
          Saved to your favorites
        </span>
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

export default SaveFindsOffer;
