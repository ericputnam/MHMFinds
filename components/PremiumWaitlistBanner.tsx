'use client';

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { NewsletterSignup } from './NewsletterSignup';

interface PremiumWaitlistBannerProps {
  /** Waitlist source tag — lets us measure intent per placement */
  source?: string;
}

/**
 * Premium intent test (MVP — measures demand, gates nothing).
 *
 * The full Stripe subscription stack exists but was deliberately not
 * enforced at launch. Before building a real paywall, this banner
 * measures how many users actively opt in when offered a premium tier
 * at the moment they're waiting on the download countdown. The KPI is
 * Waitlist signups with this source tag (visible in /admin/waitlist) —
 * a much more honest conversion signal than an assumed rate.
 */
export function PremiumWaitlistBanner({ source = 'premium_go' }: PremiumWaitlistBannerProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-gradient-to-r from-sims-pink/10 to-purple-500/10 border border-sims-pink/20 rounded-xl p-4 mb-8">
      {expanded ? (
        <div>
          <p className="text-sm text-white font-semibold mb-1">
            Get early access to MHM Premium
          </p>
          <p className="text-xs text-slate-400 mb-3">
            Instant downloads with no countdown, ad-free browsing. Drop your email and
            you&apos;ll be first in line when it launches.
          </p>
          <NewsletterSignup source={source} />
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-sims-pink flex-shrink-0" />
            <div>
              <p className="text-sm text-white font-semibold">
                Skip the wait next time
              </p>
              <p className="text-xs text-slate-400">
                Premium is coming: instant downloads, no countdown, no ads
              </p>
            </div>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="px-4 py-2 bg-sims-pink/20 hover:bg-sims-pink/30 border border-sims-pink/40 text-sims-pink text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Join the waitlist
          </button>
        </div>
      )}
    </div>
  );
}

export default PremiumWaitlistBanner;
