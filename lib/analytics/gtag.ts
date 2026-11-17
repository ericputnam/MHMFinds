// Typed helpers for the raw `window.gtag` global bootstrapped by the inline
// GA4 script in app/layout.tsx. Client-side only — every helper no-ops during
// SSR or when an ad blocker has stripped gtag.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * The GA4 event parameter that names the capture surface (home-hero, footer,
 * collection-page, mod-detail-save, go-member-cta-join, ...). Cass, E426.
 *
 * It is NOT `source`. gtag.js reads an event parameter called `source` as the
 * session's campaign source: the hit restarts the session with
 * sessionSource = the surface and medium (not set), so the visitor's real
 * channel (Pinterest, google, ...) loses the rest of the visit and the channel
 * report grows an "Unassigned" row. Measured in GA4 (W45 → W46, 2026-11):
 * sessionSource "home-hero" 2/wk before E341 started firing
 * newsletter_form_view{source} on 11-05, then 349, then 945/wk; collection-page
 * 0 → 70 → 174; footer 0 → 22 → 51; "go-member-cta-connect" (an event param
 * only, never in any URL) appeared as a source as well.
 *
 * `content_type` feeds the standard `contentType` dimension, so it needs no
 * custom-definition registration, and the `share` event has carried it since
 * launch with its sessions still attributed to Pinterest / google / bing.
 * Read surfaces with `contentType`; before the E426 deploy the same values
 * are on `customEvent:source` (union both for a window spanning the change).
 */
export const GA4_SURFACE_PARAM = 'content_type' as const;

/**
 * Event-parameter names gtag.js may treat as traffic-source fields. No GA4
 * event on this site may carry one (guarded by ga4-no-traffic-source-params).
 */
export const GA4_TRAFFIC_SOURCE_PARAMS: readonly string[] = [
  'source',
  'medium',
  'campaign',
  'term',
  'content',
  'campaign_source',
  'campaign_medium',
  'campaign_name',
  'campaign_id',
  'campaign_term',
  'campaign_content',
];

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
