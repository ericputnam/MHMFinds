import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  isMembershipEnabled,
  isPatreonProviderConfigured,
  memberMinCents,
  parsePatreonIdentity,
  qualifiesForMembership,
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
