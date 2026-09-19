import { describe, it, expect, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  isMembershipEnabled,
  isPatreonProviderConfigured,
  memberMinCents,
  parsePatreonIdentity,
  qualifiesForMembership,
  PATREON_MEMBER_TIER_CHECKOUT_URL,
  PATREON_MEMBER_TIER_PRICE_LABEL,
} from '../../lib/membership'

/**
 * Membership via Patreon OAuth (B2, Rio 2026-09-07).
 *
 * The contract these tests protect: with NEXT_PUBLIC_MEMBERSHIP_ENABLED unset
 * the feature is a complete no-op (no provider, no countdown skip, no badge),
 * and membership is only granted to an *active* patron of *our* campaign.
 */

function readSource(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '../../', relativePath), 'utf-8')
}

const member = (over: Record<string, unknown> = {}, campaign = 'c-mhm') => ({
  type: 'member',
  id: 'm1',
  attributes: { patron_status: 'active_patron', currently_entitled_amount_cents: 300, ...over },
  relationships: { campaign: { data: { id: campaign, type: 'campaign' } } },
})

describe('feature flag: everything is off by default', () => {
  it('flag unset → disabled', () => {
    expect(isMembershipEnabled({})).toBe(false)
    expect(isMembershipEnabled({ NEXT_PUBLIC_MEMBERSHIP_ENABLED: 'true' })).toBe(false)
    expect(isMembershipEnabled({ NEXT_PUBLIC_MEMBERSHIP_ENABLED: '0' })).toBe(false)
  })

  it('flag "1" → enabled', () => {
    expect(isMembershipEnabled({ NEXT_PUBLIC_MEMBERSHIP_ENABLED: '1' })).toBe(true)
  })

  describe('default path reads the real process.env (the client-bundle regression, 2026-09-08)', () => {
    afterEach(() => vi.unstubAllEnvs())

    it('no-arg call reflects process.env.NEXT_PUBLIC_MEMBERSHIP_ENABLED', () => {
      vi.stubEnv('NEXT_PUBLIC_MEMBERSHIP_ENABLED', '1')
      expect(isMembershipEnabled()).toBe(true)
      vi.stubEnv('NEXT_PUBLIC_MEMBERSHIP_ENABLED', '0')
      expect(isMembershipEnabled()).toBe(false)
    })

    it('provider check with no args also reads process.env', () => {
      vi.stubEnv('NEXT_PUBLIC_MEMBERSHIP_ENABLED', '1')
      vi.stubEnv('PATREON_CLIENT_ID', 'a')
      vi.stubEnv('PATREON_CLIENT_SECRET', 'b')
      expect(isPatreonProviderConfigured()).toBe(true)
      vi.stubEnv('NEXT_PUBLIC_MEMBERSHIP_ENABLED', '0')
      expect(isPatreonProviderConfigured()).toBe(false)
    })
  })

  it('provider needs the flag AND both Patreon credentials', () => {
    expect(isPatreonProviderConfigured({ PATREON_CLIENT_ID: 'a', PATREON_CLIENT_SECRET: 'b' })).toBe(false)
    expect(isPatreonProviderConfigured({ NEXT_PUBLIC_MEMBERSHIP_ENABLED: '1', PATREON_CLIENT_ID: 'a' })).toBe(false)
    expect(
      isPatreonProviderConfigured({ NEXT_PUBLIC_MEMBERSHIP_ENABLED: '1', PATREON_CLIENT_ID: 'a', PATREON_CLIENT_SECRET: 'b' }),
    ).toBe(true)
  })
})

describe('parsePatreonIdentity', () => {
  it('active patron of our campaign → member', () => {
    const r = parsePatreonIdentity({ data: {}, included: [member()] }, 'c-mhm')
    expect(r).toEqual({ isActivePatron: true, entitledCents: 300, campaignId: 'c-mhm' })
  })

  it('active patron of a different campaign → not a member when campaign is locked', () => {
    const r = parsePatreonIdentity({ included: [member({}, 'c-other')] }, 'c-mhm')
    expect(r.isActivePatron).toBe(false)
  })

  it('any active membership counts when no campaign id is configured', () => {
    const r = parsePatreonIdentity({ included: [member({}, 'c-other')] }, null)
    expect(r.isActivePatron).toBe(true)
  })

  it('former / declined patron → not a member', () => {
    expect(parsePatreonIdentity({ included: [member({ patron_status: 'former_patron' })] }, 'c-mhm').isActivePatron).toBe(false)
    expect(parsePatreonIdentity({ included: [member({ patron_status: 'declined_patron' })] }, 'c-mhm').isActivePatron).toBe(false)
    expect(parsePatreonIdentity({ included: [member({ patron_status: null })] }, 'c-mhm').isActivePatron).toBe(false)
  })

  it('picks the highest entitled pledge across memberships', () => {
    const r = parsePatreonIdentity(
      { included: [member({ currently_entitled_amount_cents: 100 }), member({ currently_entitled_amount_cents: 1000 })] },
      'c-mhm',
    )
    expect(r.entitledCents).toBe(1000)
  })

  it('malformed input → not a member, never throws', () => {
    expect(parsePatreonIdentity(null).isActivePatron).toBe(false)
    expect(parsePatreonIdentity('nope').isActivePatron).toBe(false)
    expect(parsePatreonIdentity({ included: 'nope' }).isActivePatron).toBe(false)
    expect(parsePatreonIdentity({ included: [null, {}, { type: 'campaign' }] }).isActivePatron).toBe(false)
  })
})

describe('pledge floor (the operator pricing knob, PATREON_MEMBER_MIN_CENTS)', () => {
  const active = { isActivePatron: true, entitledCents: 300, campaignId: 'c-mhm' }

  it('unset / invalid → 0 (any active patron qualifies)', () => {
    expect(memberMinCents({})).toBe(0)
    expect(memberMinCents({ PATREON_MEMBER_MIN_CENTS: 'abc' })).toBe(0)
    expect(memberMinCents({ PATREON_MEMBER_MIN_CENTS: '-5' })).toBe(0)
    expect(qualifiesForMembership(active, {})).toBe(true)
  })

  it('"300" → $3 patrons qualify, "500" → they do not', () => {
    expect(qualifiesForMembership(active, { PATREON_MEMBER_MIN_CENTS: '300' })).toBe(true)
    expect(qualifiesForMembership(active, { PATREON_MEMBER_MIN_CENTS: '500' })).toBe(false)
  })

  it('never qualifies a non-patron, whatever the floor', () => {
    expect(qualifiesForMembership({ isActivePatron: false, entitledCents: 9999, campaignId: null }, {})).toBe(false)
    expect(qualifiesForMembership(null, {})).toBe(false)
  })
})

describe('source-level guards (no-op until the flag is set)', () => {
  it('lib/membership.ts must not import prisma (it is imported by client components)', () => {
    expect(readSource('lib/membership.ts')).not.toMatch(/@\/lib\/prisma|from ['"]\.\/prisma/)
  })

  it('the flag is read as a LITERAL process.env.NEXT_PUBLIC_… so Next.js inlines it into client bundles', () => {
    // Regression guard: `env[MEMBERSHIP_FLAG]` on the default path is never
    // inlined by Next.js, and the browser's process.env is {} — the /go CTA,
    // countdown skip and badge were all dark in production 2026-09-07 → 09-08
    // while the server-side provider registration worked.
    const src = readSource('lib/membership.ts')
    expect(src).toMatch(/:\s*process\.env\.NEXT_PUBLIC_MEMBERSHIP_ENABLED\b/)
    expect(src).not.toMatch(/process\.env\[MEMBERSHIP_FLAG\]/)
    expect(src).not.toMatch(/env:\s*Env\s*=\s*process\.env\)\s*:\s*boolean\s*\{\s*return env\[MEMBERSHIP_FLAG\]/)
  })

  it('client components call isMembershipEnabled() with no argument (the inlined path)', () => {
    expect(readSource('app/go/[modId]/GoClient.tsx')).toContain('isMembershipEnabled()')
    expect(readSource('components/Navbar.tsx')).toContain('isMembershipEnabled()')
  })

  it('authOptions registers the Patreon provider only behind isPatreonProviderConfigured()', () => {
    const src = readSource('lib/authOptions.ts')
    expect(src).toContain('isPatreonProviderConfigured()')
    expect(src).toMatch(/isPatreonProviderConfigured\(\)\s*\?\s*\[\s*PatreonProvider/)
  })

  it('/go countdown skip is gated by isMembershipEnabled() and session.isPremium', () => {
    const src = readSource('app/go/[modId]/GoClient.tsx')
    expect(src).toContain('isMembershipEnabled()')
    expect(src).toMatch(/const isMember = membershipOn && !!session\?\.user\?\.isPremium/)
  })

  it('/go keeps its ad anchors (mv-ads wrapper + empty aside#secondary) after the membership change', () => {
    const src = readSource('app/go/[modId]/GoClient.tsx')
    expect(src).toContain('className="mv-ads')
    expect(src).toContain('id="secondary"')
  })
})

describe('E65 — E40 reverted per its rule: /go member CTA is Connect first, landing page second (Rio, 2026-09-19)', () => {
  // E40 (PR #83, 2026-09-13) led with a "$3/mo" checkout link and put Connect
  // second. Its pre-committed revert rule fired on the 09-19 read: paid-and-
  // connected 0 of 41 linked, perk-tier joins 09-13→09-19 = 1 (< 8), and
  // patreon_click 3.57 users/day (< 4.375 = 50% of the 8.75 baseline). This
  // block pins the pre-#83 CTA so the revert cannot be half-applied.
  it('the perk-tier constants still exist (tier id is documented, not re-derived) but /go does not use them', () => {
    expect(PATREON_MEMBER_TIER_CHECKOUT_URL).toBe('https://www.patreon.com/checkout/MustHaveModsOfficial?rid=24880520')
    expect(PATREON_MEMBER_TIER_PRICE_LABEL).toBe('$3/mo')
    const src = readSource('app/go/[modId]/GoClient.tsx')
    expect(src).not.toContain('PATREON_MEMBER_TIER_CHECKOUT_URL')
    expect(src).not.toContain('PATREON_MEMBER_TIER_PRICE_LABEL')
  })

  it('/go renders the Connect button before the join link, and the join link is the campaign landing page', () => {
    const src = readSource('app/go/[modId]/GoClient.tsx')
    const connect = src.indexOf('onClick={handleConnectPatreon}')
    const join = src.indexOf('href={PATREON_PAGE_URL}')
    expect(connect).toBeGreaterThan(-1)
    expect(join).toBeGreaterThan(-1)
    expect(connect).toBeLessThan(join)
    expect(src).toContain('Patrons skip the wait.')
    expect(src).toContain('Become a patron')
  })

  it('both GA4 source names survive the revert so E24/E40 reads stay comparable', () => {
    const src = readSource('app/go/[modId]/GoClient.tsx')
    expect(src).toContain("source: 'go-member-cta-join'")
    expect(src).toContain("source: 'go-member-cta-connect'")
    expect(src).toContain("gtag('event', 'member_skip_countdown'")
  })

  it('the revert touches only the CTA: mv-ads wrapper, empty aside#secondary and the 10s countdown are unchanged', () => {
    const src = readSource('app/go/[modId]/GoClient.tsx')
    expect(src).toContain('className="mv-ads')
    // Strip JSX comments first: the comment above the real <aside> quotes
    // `<aside id="secondary" ...>` as documentation, and a naive match would
    // capture the documentation instead of the element (house rule).
    // Strip every /* */ block comment (JSX `{/* */}` included): the CRITICAL
    // first-paint comment quotes `<aside id="secondary">` too. A `//` line
    // comment mentions a bare `<aside>`, so also anchor on the id.
    const code = src
      .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '') // JSX comment, braces included
      .replace(/\/\*[\s\S]*?\*\//g, '') // plain block comments
    const asides = code.match(/<aside\s+id="secondary"[^>]*>[\s\S]*?<\/aside>/g) ?? []
    expect(asides).toHaveLength(1)
    // The aside must stay empty: nothing but whitespace between the tags.
    const inner = (asides[0] ?? '').replace(/^<aside\s+id="secondary"[^>]*>/, '').replace(/<\/aside>$/, '')
    expect(inner.trim()).toBe('')
    expect(src).toContain('useState(10)')
    expect(src).toContain('((10 - countdown) / 10) * 100')
    // The CTA is a sibling of the mv-ads wrapper (it renders before it), never a child.
    expect(src.indexOf('onClick={handleConnectPatreon}')).toBeLessThan(src.indexOf('className="mv-ads'))
  })
})
