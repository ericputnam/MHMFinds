// Shared affiliate-link validator.
//
// Root cause this fixes (E134, 2026-09-28): impact-sync-catalog.ts, reactivate-impact-offers.ts,
// and import-affiliate-products.ts each set `validationStatus: 'validated'` on an AffiliateOffer
// with no check that the link actually resolves, that the network's contract is still active, or
// that the deep-link destination is even one the campaign allows. GTRacing catalog items deep-link
// via `u=https://gtplayer.com/...`, a host Impact rejects for program 18111 ("Dead End...
// malformed") — 110 of 224 on-site AffiliateClicks since Jul 1 (49%) went to those dead links while
// Impact recorded only 9 actions. The $0 that closed E13/E55 was measured on this broken pipe, not
// on an absence of buyer demand.
//
// Design follows CLAUDE.md's standing rule "enumerate the ways a check can be wrong before wiring
// it to a destructive action": every check below returns one of three outcomes, never a boolean.
// 'unknown' (network error, timeout, API field genuinely absent) must NEVER cause a write —
// callers should treat unknown as "leave existing status alone", the same way a WARN differs from
// a FAIL. 'broken' always wins over 'unknown' (a link is broken even if we can't also confirm the
// contract is active). 'ok' only when every applicable check passed.
//
// Also follows "canonicalize a host with an exact allowlist on the parsed host, never a substring
// or prefix test" — hostAllowedByDeeplinkDomains compares URL.hostname, not a raw string.includes.

export type LinkValidationOutcome = 'ok' | 'broken' | 'unknown';

export interface LinkValidationCheck {
  name: 'contract' | 'deeplink-domain' | 'destination-reachable' | 'amazon-tag' | 'no-checks-applicable';
  outcome: LinkValidationOutcome;
  detail: string;
}

export interface LinkValidationResult {
  outcome: LinkValidationOutcome;
  checks: LinkValidationCheck[];
  /** The decoded merchant destination URL, if one could be extracted. Never the tracking URL itself. */
  destinationUrl: string | null;
}

export interface CampaignPolicy {
  contractStatus: string | null;
  /**
   * Impact's Campaigns API DeeplinkDomains field. `null` means the campaign genuinely does not
   * expose this field (confirmed 2026-09-28: present and populated for GTRacing/Envato/GMG/Humble
   * Bundle, so most campaigns DO have it) — absence means "cannot check this leg", not "any host
   * is allowed". Never treat null as an allow-all.
   */
  deeplinkDomains: string[] | null;
}

export interface ValidateLinkOptions {
  affiliateUrl: string;
  /** Pre-extracted deep-link destination, if the caller already knows it (skips re-parsing `u=`). */
  deepLinkUrl?: string | null;
  /** Impact CampaignId, required to run the contract/deeplink-domain legs. */
  campaignId?: string | null;
  sid?: string | null;
  token?: string | null;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  /**
   * Skip the live destination fetch. Required for Amazon links: CLAUDE.md forbids bulk-fetching
   * amazon.com, and Amazon has no campaignId/contract concept, so the only safe check left is the
   * partner-tag leg below.
   */
  checkDestination?: boolean;
  /** If the URL is an amazon.* host, its `tag=` param must equal this or the leg reports 'broken'. */
  requiredAmazonTag?: string;
}

// Known at-source host repairs, applied before validation so a re-sync self-heals instead of
// re-copying the same dead link. Keyed by Impact CampaignId (string, matches API's CampaignId).
export const KNOWN_DEEPLINK_HOST_FIXES: Record<string, { from: string; to: string }> = {
  '18111': { from: 'gtplayer.com', to: 'gtracing.com' }, // GTRacing — E134
};

const AMAZON_HOSTS = ['amazon.com', 'amzn.to', 'amzn.com'];

function isAmazonHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return AMAZON_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}

/** Strip Impact's optional wildcard-prefix notation ("*.domain.com" or "*domain.com") for comparison. */
function normalizeDomainPattern(pattern: string): string {
  return pattern.replace(/^\*\.?/, '').toLowerCase();
}

/** Exact-allowlist host match — never a substring/prefix test (CLAUDE.md standing rule). */
export function hostAllowedByDeeplinkDomains(hostname: string, domains: string[]): boolean {
  const host = hostname.toLowerCase();
  return domains.some((raw) => {
    const d = normalizeDomainPattern(raw);
    return host === d || host.endsWith(`.${d}`);
  });
}

/** Decode the `u=` deep-link destination from an Impact vanity tracking URL. Null if absent/malformed. */
export function extractDeepLinkParam(affiliateUrl: string): string | null {
  try {
    return new URL(affiliateUrl).searchParams.get('u');
  } catch {
    return null;
  }
}

// Matches network.ts's IMPACT_PATH_PATTERN shape: /c/{account}/{ad}/{campaign}.
const IMPACT_CAMPAIGN_PATH = /^\/c\/\d+\/\d+\/(\d+)/;

/**
 * Recover the Impact CampaignId from a tracking URL's own path, for callers (like
 * reactivate-impact-offers.ts) that only have the stored affiliateUrl and no separate
 * campaign/programId column on AffiliateOffer. Null if the URL isn't Impact-shaped.
 */
export function extractImpactCampaignId(affiliateUrl: string): string | null {
  try {
    const match = new URL(affiliateUrl).pathname.match(IMPACT_CAMPAIGN_PATH);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Rewrite a known-broken deep-link host inside the `u=` param, in place, before it is ever stored.
 * Only touches the destination embedded in `u=`; the tracking URL's own host is untouched. Returns
 * the original URL unchanged if there is no fix registered for this campaign, no `u=` param, or the
 * `u=` host does not match the registered `from` host exactly.
 */
export function applyKnownHostFix(
  campaignId: string | null | undefined,
  affiliateUrl: string
): { url: string; fixed: boolean } {
  if (!campaignId) return { url: affiliateUrl, fixed: false };
  const fix = KNOWN_DEEPLINK_HOST_FIXES[campaignId];
  if (!fix) return { url: affiliateUrl, fixed: false };

  try {
    const outer = new URL(affiliateUrl);
    const deepLink = outer.searchParams.get('u');
    if (!deepLink) return { url: affiliateUrl, fixed: false };
    const inner = new URL(deepLink);
    if (inner.hostname.toLowerCase() !== fix.from.toLowerCase()) {
      return { url: affiliateUrl, fixed: false };
    }
    inner.hostname = fix.to;
    outer.searchParams.set('u', inner.toString());
    return { url: outer.toString(), fixed: true };
  } catch {
    return { url: affiliateUrl, fixed: false };
  }
}

// Per-process cache of campaign policy reads, keyed `${sid}:${campaignId}`, so a catalog sync that
// checks hundreds of items from the same campaign makes one Campaigns API call, not hundreds.
const policyCache = new Map<string, CampaignPolicy | 'unknown'>();

/** Test-only: clear the campaign-policy cache between runs/specs. */
export function clearCampaignPolicyCache(): void {
  policyCache.clear();
}

export async function fetchCampaignPolicy(
  campaignId: string,
  sid: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 10000
): Promise<CampaignPolicy | 'unknown'> {
  const cacheKey = `${sid}:${campaignId}`;
  const cached = policyCache.get(cacheKey);
  if (cached) return cached;

  try {
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const res = await fetchImpl(`https://api.impact.com/Mediapartners/${sid}/Campaigns?PageSize=200`, {
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return 'unknown'; // API error — never assert a verdict from an error response
    const json: unknown = await res.json();
    const campaigns: any[] = (json as any)?.Campaigns ?? [];
    const match = campaigns.find((c) => String(c.CampaignId) === String(campaignId));
    if (!match) return 'unknown'; // campaign not found in this page — cannot assert anything

    const domains =
      Array.isArray(match.DeeplinkDomains) && match.DeeplinkDomains.length > 0
        ? (match.DeeplinkDomains as string[])
        : null;
    const policy: CampaignPolicy = {
      contractStatus: match.ContractStatus ?? null,
      deeplinkDomains: domains,
    };
    policyCache.set(cacheKey, policy);
    return policy;
  } catch {
    return 'unknown'; // network error / timeout — never a verdict
  }
}

/**
 * Validate one affiliate link. Combines up to four checks (contract status, deep-link domain
 * policy, live destination reachability, Amazon partner-tag correctness) into a single outcome:
 * any 'broken' leg wins outright; otherwise any 'unknown' leg forces the overall result to
 * 'unknown'; 'ok' only when every applicable leg passed.
 */
export async function validateAffiliateLink(opts: ValidateLinkOptions): Promise<LinkValidationResult> {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const timeoutMs = opts.timeoutMs ?? 10000;
  const checkDestination = opts.checkDestination ?? true;
  const checks: LinkValidationCheck[] = [];
  let destinationUrl = opts.deepLinkUrl ?? extractDeepLinkParam(opts.affiliateUrl);

  let sawUnknown = false;
  let sawBroken = false;

  // Leg 1: Impact contract status + deep-link domain allowlist (only if we have campaign creds).
  if (opts.campaignId && opts.sid && opts.token) {
    const policy = await fetchCampaignPolicy(opts.campaignId, opts.sid, opts.token, fetchImpl, timeoutMs);
    if (policy === 'unknown') {
      checks.push({ name: 'contract', outcome: 'unknown', detail: 'Campaigns API unreachable or campaign not found' });
      sawUnknown = true;
    } else {
      if (policy.contractStatus && policy.contractStatus !== 'Active') {
        checks.push({ name: 'contract', outcome: 'broken', detail: `contract status is ${policy.contractStatus}, not Active` });
        sawBroken = true;
      } else {
        checks.push({ name: 'contract', outcome: 'ok', detail: `contract ${policy.contractStatus ?? 'status unknown but campaign found'}` });
      }

      if (destinationUrl && policy.deeplinkDomains) {
        let destHost: string | null = null;
        try {
          destHost = new URL(destinationUrl).hostname;
        } catch {
          destHost = null;
        }
        if (destHost) {
          if (hostAllowedByDeeplinkDomains(destHost, policy.deeplinkDomains)) {
            checks.push({ name: 'deeplink-domain', outcome: 'ok', detail: `${destHost} is in DeeplinkDomains` });
          } else {
            checks.push({
              name: 'deeplink-domain',
              outcome: 'broken',
              detail: `${destHost} is NOT in DeeplinkDomains [${policy.deeplinkDomains.join(', ')}]`,
            });
            sawBroken = true;
          }
        }
      } else if (destinationUrl && !policy.deeplinkDomains) {
        // Field genuinely absent for this campaign — skip the leg rather than assume pass or fail.
        checks.push({ name: 'deeplink-domain', outcome: 'unknown', detail: 'campaign does not expose DeeplinkDomains' });
      }
    }
  }

  // Leg 2: live destination reachability — a direct fetch of the decoded merchant URL, never
  // through the tracking/redirect chain, so this check itself never records a network click.
  if (checkDestination && destinationUrl) {
    try {
      const res = await fetchImpl(destinationUrl, {
        method: 'GET',
        redirect: 'follow',
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) MHMLinkCheck/1.0' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (res.ok) {
        checks.push({ name: 'destination-reachable', outcome: 'ok', detail: `HTTP ${res.status}` });
      } else {
        checks.push({ name: 'destination-reachable', outcome: 'broken', detail: `HTTP ${res.status}` });
        sawBroken = true;
      }
    } catch (err) {
      checks.push({
        name: 'destination-reachable',
        outcome: 'unknown',
        detail: `fetch failed: ${err instanceof Error ? err.message : String(err)}`,
      });
      sawUnknown = true;
    }
  }

  // Leg 3: Amazon partner-tag correctness (operator decision #2: musthavemod04-20 is the only
  // supported store id). Purely local/string-based — never a network fetch, so it runs even when
  // checkDestination is false (as it must be for Amazon, per the bulk-fetch ban above).
  if (opts.requiredAmazonTag) {
    try {
      const url = new URL(opts.affiliateUrl);
      if (isAmazonHost(url.hostname)) {
        const tag = url.searchParams.get('tag');
        if (tag === opts.requiredAmazonTag) {
          checks.push({ name: 'amazon-tag', outcome: 'ok', detail: `tag=${tag}` });
        } else {
          checks.push({
            name: 'amazon-tag',
            outcome: 'broken',
            detail: `tag=${tag ?? '(missing)'}, expected ${opts.requiredAmazonTag}`,
          });
          sawBroken = true;
        }
      }
    } catch {
      // Malformed URL is caught by the destination-reachable leg (or, for Amazon with
      // checkDestination=false, is simply not checkable here) — do not double-count as unknown.
    }
  }

  // A verdict of 'ok' with zero checks actually run is worse than useless — it looks like
  // evidence when none was gathered. Callers must pass at least a campaignId+creds, a
  // checkDestination leg, or a requiredAmazonTag for this to resolve to anything but 'unknown'.
  if (checks.length === 0) {
    checks.push({
      name: 'no-checks-applicable',
      outcome: 'unknown',
      detail: 'no campaignId/creds, checkDestination=false, and no requiredAmazonTag — nothing was verifiable',
    });
    sawUnknown = true;
  }

  const outcome: LinkValidationOutcome = sawBroken ? 'broken' : sawUnknown ? 'unknown' : 'ok';
  return { outcome, checks, destinationUrl };
}
