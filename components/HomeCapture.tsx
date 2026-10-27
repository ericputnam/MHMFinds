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
    <section aria-labelledby="home-capture-heading" className="hero-capture">
      <p id="home-capture-heading" className="hc-title">
        Get the week&apos;s best finds
      </p>
      <p className="ef-copy">
        <span className="ef-wide">One email a week with new mod &amp; CC lists — or </span>
        <span className="ef-narrow">One email a week, or </span>
        <Link
          href={`/sign-in/?mode=signup&ref=${HOME_CAPTURE_SOURCE}`}
          onClick={handleAccountClick}
        >
          create a free account
        </Link>
        <span className="ef-wide"> to save finds as you browse.</span>
      </p>
      <NewsletterSignup source={HOME_CAPTURE_SOURCE} variant="strip" />
    </section>
  );
}

export default HomeCapture;
