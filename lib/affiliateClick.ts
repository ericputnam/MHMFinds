// Client-side helper: track an affiliate click and navigate to the
// subid-tagged redirect URL returned by /api/affiliates/click.
//
// The window MUST be opened synchronously inside the click handler (before any
// await) or popup blockers will kill the navigation. We open a blank tab first,
// then point it at the tracked URL once the API responds — falling back to the
// raw affiliate URL if tracking fails, so the user always lands on the product.

import { trackAffiliateClick } from '@/lib/analytics/gtag';

export interface AffiliateClickContext {
  offerId: string;
  sourceType: 'grid' | 'mod_page' | 'interstitial' | 'sidebar';
  modId?: string;
  partner?: string;
  fallbackUrl: string;
}

export async function trackAndOpenAffiliateLink(context: AffiliateClickContext): Promise<void> {
  const newTab = window.open('about:blank', '_blank', 'noopener,noreferrer');

  // GA4 leading indicator; the DB click row below remains the source of truth.
  trackAffiliateClick({
    offerId: context.offerId,
    partner: context.partner,
    sourceType: context.sourceType,
    modId: context.modId,
  });

  let targetUrl = context.fallbackUrl;
  try {
    const res = await fetch('/api/affiliates/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        offerId: context.offerId,
        sourceType: context.sourceType,
        modId: context.modId,
        pageUrl: window.location.href,
      }),
    });
    const data = await res.json();
    if (data?.redirectUrl) targetUrl = data.redirectUrl;
  } catch (err) {
    console.error('Failed to track affiliate click:', err);
  }

  if (newTab) {
    newTab.location.href = targetUrl;
  } else {
    // Popup blocked despite the synchronous open — navigate in place.
    window.location.href = targetUrl;
  }
}
