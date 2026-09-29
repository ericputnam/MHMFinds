import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  hostAllowedByDeeplinkDomains,
  extractDeepLinkParam,
  extractImpactCampaignId,
  applyKnownHostFix,
  validateAffiliateLink,
  clearCampaignPolicyCache,
  KNOWN_DEEPLINK_HOST_FIXES,
} from '@/lib/services/affiliateEarnings/linkValidator';

// Root cause (E134): 110 of 224 on-site AffiliateClicks since Jul 1 (49%) went to GTRacing catalog
// items that deep-link via `u=https://gtplayer.com/...` — a host Impact rejects for program 18111
// ("Dead End...malformed"). Impact recorded 9 actions against those 110 clicks. This is the real
// tracking-URL shape (account 2956236, ad 1719124, campaign 18111) that produced that click volume.
const GT_LYNCK_BROKEN =
  'https://gtracing.sjv.io/c/2956236/1719124/18111?prodsku=abc123&u=https%3A%2F%2Fgtplayer.com%2Fproducts%2Fgt-lynck-chair&intsrc=APIG_13261';
const GT_LYNCK_FIXED_DESTINATION = 'https://gtracing.com/products/gt-lynck-chair';

function fakeFetch(handlers: Array<{ match: string; respond: () => Response | Promise<Response> }>) {
  return vi.fn(async (input: unknown) => {
    const url = typeof input === 'string' ? input : (input as Request).url ?? String(input);
    const hit = handlers.find((h) => url.includes(h.match));
    if (!hit) throw new Error(`fakeFetch: no handler registered for ${url}`);
    return hit.respond();
  }) as unknown as typeof fetch;
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}) {
  return new Response(JSON.stringify(body), { status: init.status ?? (init.ok === false ? 500 : 200) });
}

beforeEach(() => {
  clearCampaignPolicyCache();
});

describe('hostAllowedByDeeplinkDomains — exact allowlist, never substring/prefix', () => {
  const domains = ['gtracing.com', '*.other-brand.com'];

  it('allows the exact registered host', () => {
    expect(hostAllowedByDeeplinkDomains('gtracing.com', domains)).toBe(true);
  });

  it('allows a true subdomain of a registered host', () => {
    expect(hostAllowedByDeeplinkDomains('shop.gtracing.com', domains)).toBe(true);
  });

  it('normalizes Impact wildcard-prefix notation (*.domain) before matching', () => {
    expect(hostAllowedByDeeplinkDomains('other-brand.com', domains)).toBe(true);
    expect(hostAllowedByDeeplinkDomains('www.other-brand.com', domains)).toBe(true);
  });

  it('rejects the actual dead host this feature exists to catch', () => {
    expect(hostAllowedByDeeplinkDomains('gtplayer.com', domains)).toBe(false);
  });

  it('rejects a look-alike host — no substring/prefix matching', () => {
    // "notgtracing.com" contains "gtracing.com" as a substring; a naive .includes() would wrongly
    // allow it. It shares no dot-delimited suffix with "gtracing.com", so it must be rejected.
    expect(hostAllowedByDeeplinkDomains('notgtracing.com', domains)).toBe(false);
    // Same trap the other direction: a host that merely starts with the allowed domain.
    expect(hostAllowedByDeeplinkDomains('gtracing.com.attacker.net', domains)).toBe(false);
  });
});

describe('extractDeepLinkParam / extractImpactCampaignId', () => {
  it('decodes the u= destination from a real Impact vanity tracking URL', () => {
    expect(extractDeepLinkParam(GT_LYNCK_BROKEN)).toBe('https://gtplayer.com/products/gt-lynck-chair');
  });

  it('returns null for a URL with no u= param or a malformed URL', () => {
    expect(extractDeepLinkParam('https://example.com/no-params')).toBeNull();
    expect(extractDeepLinkParam('not a url')).toBeNull();
  });

  it('recovers the CampaignId from the /c/{account}/{ad}/{campaign} path', () => {
    expect(extractImpactCampaignId(GT_LYNCK_BROKEN)).toBe('18111');
  });

  it('returns null for non-Impact-shaped URLs (e.g. an Amazon link)', () => {
    expect(extractImpactCampaignId('https://www.amazon.com/dp/B0ABC123?tag=musthavemod04-20')).toBeNull();
  });
});

describe('applyKnownHostFix', () => {
  it('rewrites the registered GTRacing host inside u=, leaving the tracking URL host untouched', () => {
    const { url, fixed } = applyKnownHostFix('18111', GT_LYNCK_BROKEN);
    expect(fixed).toBe(true);
    const rewritten = new URL(url);
    expect(rewritten.hostname).toBe('gtracing.sjv.io'); // outer tracking host unchanged
    expect(rewritten.searchParams.get('u')).toBe(GT_LYNCK_FIXED_DESTINATION);
  });

  it('is a documented, reviewable fix list, not a magic rewrite anyone can trigger', () => {
    expect(KNOWN_DEEPLINK_HOST_FIXES['18111']).toEqual({ from: 'gtplayer.com', to: 'gtracing.com' });
  });

  it('is idempotent — applying the fix to an already-fixed URL is a no-op', () => {
    const once = applyKnownHostFix('18111', GT_LYNCK_BROKEN);
    const twice = applyKnownHostFix('18111', once.url);
    expect(twice.fixed).toBe(false);
    expect(twice.url).toBe(once.url);
  });

  it('leaves the URL unchanged for a campaign with no registered fix', () => {
    const { url, fixed } = applyKnownHostFix('99999', GT_LYNCK_BROKEN);
    expect(fixed).toBe(false);
    expect(url).toBe(GT_LYNCK_BROKEN);
  });

  it('never throws on a malformed URL or a missing campaignId', () => {
    expect(() => applyKnownHostFix(null, 'not a url')).not.toThrow();
    expect(applyKnownHostFix(null, 'not a url')).toEqual({ url: 'not a url', fixed: false });
  });
});

describe('validateAffiliateLink — Impact contract + deeplink-domain legs', () => {
  const ACTIVE_POLICY = {
    Campaigns: [{ CampaignId: '18111', ContractStatus: 'Active', DeeplinkDomains: ['gtracing.com', '*.gtracing.com'] }],
  };

  it('reports "broken" for the dead gtplayer.com host even though the contract is Active', async () => {
    const fetchImpl = fakeFetch([{ match: 'Campaigns', respond: () => jsonResponse(ACTIVE_POLICY) }]);
    const result = await validateAffiliateLink({
      affiliateUrl: GT_LYNCK_BROKEN,
      campaignId: '18111',
      sid: 'sid',
      token: 'token',
      fetchImpl,
      checkDestination: false,
    });
    expect(result.outcome).toBe('broken');
    expect(result.checks.find((c) => c.name === 'deeplink-domain')?.outcome).toBe('broken');
  });

  it('reports "ok" once the host has been fixed to gtracing.com', async () => {
    const fetchImpl = fakeFetch([{ match: 'Campaigns', respond: () => jsonResponse(ACTIVE_POLICY) }]);
    const { url: fixedUrl } = applyKnownHostFix('18111', GT_LYNCK_BROKEN);
    const result = await validateAffiliateLink({
      affiliateUrl: fixedUrl,
      campaignId: '18111',
      sid: 'sid',
      token: 'token',
      fetchImpl,
      checkDestination: false,
    });
    expect(result.outcome).toBe('ok');
  });

  it('reports "broken" when the contract itself is not Active, regardless of host', async () => {
    const fetchImpl = fakeFetch([
      {
        match: 'Campaigns',
        respond: () =>
          jsonResponse({ Campaigns: [{ CampaignId: '18111', ContractStatus: 'Expired', DeeplinkDomains: ['gtracing.com'] }] }),
      },
    ]);
    const { url: fixedUrl } = applyKnownHostFix('18111', GT_LYNCK_BROKEN);
    const result = await validateAffiliateLink({
      affiliateUrl: fixedUrl,
      campaignId: '18111',
      sid: 'sid',
      token: 'token',
      fetchImpl,
      checkDestination: false,
    });
    expect(result.outcome).toBe('broken');
    expect(result.checks.find((c) => c.name === 'contract')?.outcome).toBe('broken');
  });

  it('never asserts a verdict on a network error — Campaigns API failure yields "unknown", not "ok" or "broken"', async () => {
    const fetchImpl = fakeFetch([{ match: 'Campaigns', respond: () => { throw new Error('ECONNRESET'); } }]);
    const result = await validateAffiliateLink({
      affiliateUrl: GT_LYNCK_BROKEN,
      campaignId: '18111',
      sid: 'sid',
      token: 'token',
      fetchImpl,
      checkDestination: false,
    });
    expect(result.outcome).toBe('unknown');
  });

  it('never asserts a verdict on a Campaigns API HTTP error', async () => {
    const fetchImpl = fakeFetch([{ match: 'Campaigns', respond: () => jsonResponse({}, { ok: false, status: 500 }) }]);
    const result = await validateAffiliateLink({
      affiliateUrl: GT_LYNCK_BROKEN,
      campaignId: '18111',
      sid: 'sid',
      token: 'token',
      fetchImpl,
      checkDestination: false,
    });
    expect(result.outcome).toBe('unknown');
  });
});

describe('validateAffiliateLink — destination-reachable leg', () => {
  it('reports "ok" when the decoded destination responds 200, fetched directly (not through the tracking domain)', async () => {
    const fetchImpl = fakeFetch([
      { match: 'gtracing.com/products/gt-lynck-chair', respond: () => new Response('ok', { status: 200 }) },
    ]);
    const result = await validateAffiliateLink({
      affiliateUrl: `https://gtracing.sjv.io/c/1/1/1?u=${encodeURIComponent(GT_LYNCK_FIXED_DESTINATION)}`,
      fetchImpl,
    });
    expect(result.outcome).toBe('ok');
    expect(result.destinationUrl).toBe(GT_LYNCK_FIXED_DESTINATION);
    // The check must hit the merchant host directly — never the tracking/redirect chain, so this
    // validation itself never records an Impact click.
    expect(fetchImpl).toHaveBeenCalledWith(GT_LYNCK_FIXED_DESTINATION, expect.anything());
  });

  it('reports "broken" on a non-2xx destination response', async () => {
    const fetchImpl = fakeFetch([{ match: 'gtplayer.com', respond: () => new Response('gone', { status: 404 }) }]);
    const result = await validateAffiliateLink({ affiliateUrl: GT_LYNCK_BROKEN, fetchImpl });
    expect(result.outcome).toBe('broken');
  });

  it('reports "unknown" (never "broken") on a destination fetch timeout/network error', async () => {
    const fetchImpl = fakeFetch([{ match: 'gtplayer.com', respond: () => { throw new Error('timeout'); } }]);
    const result = await validateAffiliateLink({ affiliateUrl: GT_LYNCK_BROKEN, fetchImpl });
    expect(result.outcome).toBe('unknown');
  });
});

describe('validateAffiliateLink — Amazon partner-tag leg (never a live fetch of amazon.com)', () => {
  it('reports "ok" and never calls fetch at all when the tag matches', async () => {
    const fetchImpl = vi.fn();
    const result = await validateAffiliateLink({
      affiliateUrl: 'https://www.amazon.com/dp/B0ABC123?tag=musthavemod04-20',
      checkDestination: false,
      requiredAmazonTag: 'musthavemod04-20',
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.outcome).toBe('ok');
    expect(fetchImpl).not.toHaveBeenCalled(); // bulk-fetching amazon.com is forbidden — this leg is local-only
  });

  it('reports "broken" for any tag other than the one supported store id', async () => {
    const result = await validateAffiliateLink({
      affiliateUrl: 'https://www.amazon.com/dp/B0ABC123?tag=musthavemod08-20',
      checkDestination: false,
      requiredAmazonTag: 'musthavemod04-20',
    });
    expect(result.outcome).toBe('broken');
    expect(result.checks.find((c) => c.name === 'amazon-tag')?.outcome).toBe('broken');
  });
});

describe('validateAffiliateLink — a verdict requires at least one real check', () => {
  it('resolves to "unknown", never "ok", when nothing was actually checkable', async () => {
    const result = await validateAffiliateLink({
      affiliateUrl: 'https://example.com/no-checks-possible',
      checkDestination: false,
    });
    expect(result.outcome).toBe('unknown');
    expect(result.checks.length).toBeGreaterThan(0); // never a silent empty-but-ok result
  });
});

// --- Wiring: every call site that sets AffiliateOffer.validationStatus must go through the
// shared validator. A scanner over the filesystem catches a *new* script reintroducing the bug,
// not just the three we know about today (CLAUDE.md: "fix the class, not the instance").
describe('every script that writes validationStatus goes through the shared validator', () => {
  function stripComments(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  }

  const scriptsDir = path.join(process.cwd(), 'scripts');
  const scriptFiles = fs.readdirSync(scriptsDir).filter((f) => f.endsWith('.ts'));

  it('sanity-checks the scan itself found a plausible number of scripts (vacuity guard)', () => {
    expect(scriptFiles.length).toBeGreaterThan(20);
  });

  it('flags any script that sets AffiliateOffer.validationStatus without calling validateAffiliateLink', () => {
    const UNCONDITIONAL_LITERAL = /validationStatus:\s*['"](validated|invalid)['"]/;
    const offenders: string[] = [];
    for (const file of scriptFiles) {
      const raw = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
      const stripped = stripComments(raw);
      const setsValidationStatus = UNCONDITIONAL_LITERAL.test(stripped) || /\bvalidationStatus\s*[,}]/.test(stripped);
      if (setsValidationStatus && !stripped.includes('validateAffiliateLink(')) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('confirms the three known call sites are wired (>=3 call sites, per E134)', () => {
    const required = ['impact-sync-catalog.ts', 'reactivate-impact-offers.ts', 'import-affiliate-products.ts'];
    for (const file of required) {
      expect(scriptFiles).toContain(file);
      const raw = fs.readFileSync(path.join(scriptsDir, file), 'utf8');
      expect(raw).toContain('validateAffiliateLink(');
    }
  });

  // Frozen, verbatim snippets of the actual pre-E134 code (copied from the diff this PR ships),
  // not a live `git show HEAD:<file>` read. A HEAD-relative read only proves the scanner is real
  // for the one moment between "fix committed" and "test committed" — once this test and the fix
  // land in the same commit (or a squash merge collapses both), HEAD:<file> IS the fixed content
  // and the check silently stops proving anything (caught in review: it went green-for-the-wrong-
  // reason immediately after `git rebase origin/main` folded this into a single commit). A frozen
  // fixture proves the scanner's *detection logic* is real forever, independent of git history.
  const PRE_FIX_SNIPPETS: Record<string, string> = {
    'scripts/impact-sync-catalog.ts': `
      const data = {
        ...offer,
        finalScore: offer.priority + 20,
        network: 'impact',
        sourceType: 'impact',
        validationStatus: 'validated',
        personaValidated: true,
        personaScore: 5,
        isActive: ACTIVATE,
      };
    `,
    'scripts/reactivate-impact-offers.ts': `
      if (clears && !DRY_RUN) {
        await prisma.affiliateOffer.update({
          where: { id: o.id },
          data: { isActive: true, validationStatus: 'validated' },
        });
        reactivated++;
      }
    `,
    'scripts/import-affiliate-products.ts': `
      await prisma.affiliateOffer.create({
        data: {
          ...
          isActive: true,
          ...
          validationStatus: 'validated',
          validatedAt: new Date(),
        }
      });
    `,
  };

  it('would have failed against the pre-fix tree (red before this change) — proves the scanner is real', () => {
    let sawAtLeastOnePreFixViolation = false;
    for (const [file, oldContent] of Object.entries(PRE_FIX_SNIPPETS)) {
      const stripped = stripComments(oldContent);
      const hadUnconditionalWrite = /validationStatus:\s*['"]validated['"]/.test(stripped);
      const hadValidatorCall = stripped.includes('validateAffiliateLink(');
      expect(hadValidatorCall).toBe(false); // sanity: fixture really is pre-fix
      if (hadUnconditionalWrite && !hadValidatorCall) sawAtLeastOnePreFixViolation = true;
      else throw new Error(`fixture for ${file} does not reproduce the pre-fix violation shape`);
    }
    expect(sawAtLeastOnePreFixViolation).toBe(true);
  });

  it('the live (current) versions of those same files no longer match the pre-fix fixture shape', () => {
    // Complements the frozen-fixture test above: proves the *actual current files on disk* moved
    // off the vulnerable pattern, not just that a frozen string is recognized as vulnerable.
    for (const file of Object.keys(PRE_FIX_SNIPPETS)) {
      const raw = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
      const stripped = stripComments(raw);
      expect(stripped.includes('validateAffiliateLink(')).toBe(true);
    }
  });
});
