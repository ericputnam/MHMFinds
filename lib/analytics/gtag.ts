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
