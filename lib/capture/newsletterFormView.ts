/**
 * Viewer denominator for every `NewsletterSignup` form (Cass, E341, 2026-11-05).
 *
 * Why: B1's November kill path grades each copy test on "subscribers per 1k
 * viewers of that surface" (targets.json). The two one-click opt-ins already
 * fire a view (`member_optin_view`, `patreon_connect_optin_view`), but the
 * shared typed-email form behind footer / home-hero / collection-page /
 * creator-page / creator-hub fired nothing until a submit. Those surfaces had
 * 20 + 12 + 5 + 1 + 0 rows on 11-05 and no denominator at all, so none of them
 * could be graded and no copy test on them could be read.
 *
 * What counts as a view: the form itself is at least half inside the viewport
 * once in a page view (IntersectionObserver). Rendering in the footer of a page
 * nobody scrolls to is not a view. The event carries the surface's own
 * `source`, the same string the `waitlist.source` row will carry, so the
 * numerator (DB rows by source) and denominator (GA4 users by source) join on
 * one key. Nothing is sent to /api/waitlist on view.
 */

/** GA4 event fired once per mounted form when it first becomes visible. */
export const NEWSLETTER_FORM_VIEW_EVENT = 'newsletter_form_view';

/** Fraction of the form that must be inside the viewport to count as seen. */
export const NEWSLETTER_FORM_VIEW_THRESHOLD = 0.5;

/** The minimal IntersectionObserverEntry shape the decision needs. */
export interface FormViewEntry {
  isIntersecting: boolean;
  intersectionRatio: number;
}

/**
 * True when any entry shows the form at or above the threshold. Pure so the
 * component's decision is testable without a browser observer.
 */
export function isFormViewed(entries: readonly FormViewEntry[]): boolean {
  return entries.some(
    (e) => e.isIntersecting && e.intersectionRatio >= NEWSLETTER_FORM_VIEW_THRESHOLD
  );
}

/**
 * Subscribers per 1,000 viewers of one surface. Null when viewers is 0 or
 * unknown, never a fake number. Exact in, exact out; round at the print site.
 */
export function subscribersPer1kViewers(rows: number | null, viewers: number | null): number | null {
  if (rows == null || viewers == null || viewers <= 0) return null;
  return (rows / viewers) * 1000;
}
