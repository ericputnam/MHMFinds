// Typed helpers for the raw `window.gtag` global bootstrapped by the inline
// GA4 script in app/layout.tsx. Client-side only — every helper no-ops during
// SSR or when an ad blocker has stripped gtag.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export interface AffiliateClickEventParams {
  offerId: string;
  partner?: string;
  sourceType: string;
  modId?: string;
}

// Fires the `affiliate_click` GA4 event that lib/services/ga4Connector.ts
// (fetchAffiliateClicks) queries by name. The custom params must be registered
// as event-scoped custom dimensions in the GA4 UI to be queryable via the
// Data API — that registration is a one-time manual admin step.
export function trackAffiliateClick(params: AffiliateClickEventParams): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', 'affiliate_click', {
      offer_id: params.offerId,
      partner: params.partner ?? 'unknown',
      source_type: params.sourceType,
      mod_id: params.modId,
    });
  } catch {
    // Analytics must never break the click-through.
  }
}

// GA4 event name for a completed /set-password/ submission (Cass, E123).
// Unblocks the E39 read: reset tokens are deleted on consume, so without this
// event a completed reset leaves no trace anywhere. Exported so the guard test
// imports the constant instead of restating the literal.
export const PASSWORD_RESET_COMPLETE_EVENT = 'password_reset_complete';

// Fires once when /api/auth/reset-password/ answers success. Carries no email,
// token or user id — only the page it fired from. The same page serves both the
// forgot-password reset and the converted-subscriber invite; the token does not
// record which, so this event counts both (see E123).
export function trackPasswordResetComplete(): void {
  if (typeof window === 'undefined' || !window.gtag) return;
  try {
    window.gtag('event', PASSWORD_RESET_COMPLETE_EVENT, {
      method: 'set-password',
    });
  } catch {
    // Analytics must never break the reset.
  }
}
