'use client';

import Link from 'next/link';
import { NewsletterSignup } from './NewsletterSignup';

/**
 * Homepage capture strip (Cass, E73, 2026-09-21).
 *
 * The homepage is the largest Next.js page (3,411 sessions/7d, GA4
 * 2026-09-13→09-19) and its only capture surface was the footer form, which
 * produced 1 signup between 09-04 and 09-19. The two other inline blocks that
 * sit at the *bottom* of a page read 0 adds on /mods/[id] (E10, 7,366
 * sessions) and 0.31/1K on collection pages (E6); the one block that sits
 * mid-page where the visitor is already looking (/go/, E4) is the only one
 * that converts (1.30/1K). So this strip sits above the grid, not below it.
 *
 * Two owned-audience paths, each attributed on its own key:
 *   - email: NewsletterSignup source="home-hero" (waitlist.source, GA4
 *     newsletter_signup{source}).
 *   - account: link to sign-up with ?ref=home-hero; GA4 account_cta_click
 *     here, GA4 sign_up{ref} on the sign-in page's success branch.
 *
 * Ad-safety: this is a sibling of the grid row and of aside#secondary, never
 * a child of a .mv-ads container, no modal, nothing hidden on first paint.
 * Guarded by __tests__/unit/home-capture.test.ts.
 */
export const HOME_CAPTURE_SOURCE = 'home-hero';

export function HomeCapture() {
  const handleAccountClick = () => {
    (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag?.(
      'event',
      'account_cta_click',
      { source: HOME_CAPTURE_SOURCE }
    );
  };

  return (
    <section
      aria-labelledby="home-capture-heading"
      className="container mx-auto px-4 pt-6"
    >
      <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:px-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        <div className="md:flex-1 min-w-0">
          <h2 id="home-capture-heading" className="text-white font-semibold text-base leading-tight">
            New Sims 4 CC lists every week, in one email
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Or{' '}
            <Link
              href={`/sign-in/?mode=signup&ref=${HOME_CAPTURE_SOURCE}`}
              onClick={handleAccountClick}
              className="text-slate-300 underline decoration-white/20 underline-offset-2 hover:text-white hover:decoration-sims-pink/60 transition-colors"
            >
              create a free account
            </Link>{' '}
            to save finds as you browse.
          </p>
        </div>
        <div className="w-full md:w-auto md:min-w-[360px] lg:min-w-[420px]">
          <NewsletterSignup source={HOME_CAPTURE_SOURCE} />
        </div>
      </div>
    </section>
  );
}

export default HomeCapture;
