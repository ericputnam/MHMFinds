// Affiliate network identification + subid injection.
//
// The join between network commission reports and our AffiliateClick records
// depends on injecting the click ID into the tracking URL at redirect time,
// using each network's designated sub-tracking parameter. Without this,
// conversions can never be attributed to a click, offer, or placement.

export type AffiliateNetwork = 'impact' | 'rakuten' | 'cj' | 'amazon';

// Impact.com (formerly Impact Radius) issues per-brand vanity tracking domains.
// The ones below are confirmed Impact domains; the /c/{account}/{ad}/{campaign}
// path shape is also unique to Impact and catches vanity domains not listed.
const IMPACT_DOMAINS = [
  'impact.com',
  'sjv.io',
  'pxf.io',
  'cfzu.net',
  '7eer.net',
  'evyy.net',
  'ojrq.net',
  'vzew.net',
];
const IMPACT_PATH_PATTERN = /^\/c\/\d+\/\d+\/\d+/;

const RAKUTEN_DOMAINS = ['linksynergy.com', 'rakutenadvertising.com'];

const CJ_DOMAINS = [
  'anrdoezrs.net',
  'dpbolvw.net',
  'tkqlhce.com',
  'kqzyfj.com',
  'jdoqocy.com',
  'cj.com',
];

const AMAZON_DOMAINS = ['amazon.com', 'amzn.to', 'amzn.com'];

// The query parameter each network echoes back in its conversion reports.
export const SUBID_PARAM: Record<AffiliateNetwork, string> = {
  impact: 'subId1', // Impact Actions API returns this as SubId1
  rakuten: 'u1', // Rakuten Events API returns this as u1
  cj: 'sid', // CJ Commission Detail API returns this as shopperId
  amazon: 'ascsubtag', // Amazon Associates reports include this as the tracking subtag
};

function hostMatches(hostname: string, domains: string[]): boolean {
  return domains.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

/**
 * Detect which affiliate network a tracking URL belongs to.
 * Returns null for unrecognized URLs (direct/manual links).
 */
export function detectNetworkFromUrl(affiliateUrl: string): AffiliateNetwork | null {
  let url: URL;
  try {
    url = new URL(affiliateUrl);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLowerCase();

  if (hostMatches(hostname, RAKUTEN_DOMAINS)) return 'rakuten';
  if (hostMatches(hostname, CJ_DOMAINS)) return 'cj';
  if (hostMatches(hostname, AMAZON_DOMAINS)) return 'amazon';
  if (hostMatches(hostname, IMPACT_DOMAINS)) return 'impact';
  // Impact vanity domains (e.g. logitech.cfzu.net, oyrosycom.sjv.io) all share
  // the /c/{accountId}/{adId}/{campaignId} path structure.
  if (IMPACT_PATH_PATTERN.test(url.pathname)) return 'impact';

  return null;
}

/**
 * Append our click ID to a tracking URL using the network's subid parameter,
 * so the network's conversion report can be joined back to the click.
 *
 * Returns the URL unchanged if the network is unrecognized or the URL is
 * malformed — a broken redirect is worse than a missing subid.
 */
export function appendClickSubId(
  affiliateUrl: string,
  clickId: string,
  networkOverride?: string | null
): string {
  const network =
    (networkOverride as AffiliateNetwork | null) || detectNetworkFromUrl(affiliateUrl);
  if (!network || !SUBID_PARAM[network]) return affiliateUrl;

  try {
    const url = new URL(affiliateUrl);
    url.searchParams.set(SUBID_PARAM[network], clickId);
    return url.toString();
  } catch {
    return affiliateUrl;
  }
}
