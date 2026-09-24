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
  PATREON_FREE_TIER_CHECKOUT_URL,
  POST_CONNECT_PARAM,
  POST_CONNECT_VALUE,
  withPostConnectMarker,
  hasPostConnectMarker,
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

describe('E74 — /go post-connect state: follow free first (Rio, 2026-09-21)', () => {
  // The E69 pre-read (2026-09-21) classified all 52 Patreon-linked site
  // accounts against the campaign member list: 48 not in the campaign, 4 free,
  // 0 paying. Connect is a follow funnel, and after OAuth those visitors saw
  // the same "Connect Patreon" line again. This block pins the mechanism:
  // a query marker on the OAuth callbackUrl (no JWT/session change — auth is
  // Tier 2), a free-tier join link first, the $3 perk in prose only.
  const strip = (src: string) =>
    src.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

  it('the free tier join link is the campaign FREE tier, not the $3 tier', () => {
    expect(PATREON_FREE_TIER_CHECKOUT_URL).toBe('https://www.patreon.com/checkout/MustHaveModsOfficial?rid=24870826')
    expect(PATREON_FREE_TIER_CHECKOUT_URL).not.toBe(PATREON_MEMBER_TIER_CHECKOUT_URL)
  })

  it('withPostConnectMarker adds ?patreon=connected and keeps path, query and hash', () => {
    expect(withPostConnectMarker('https://musthavemods.com/go/abc123/')).toBe(
      `https://musthavemods.com/go/abc123/?${POST_CONNECT_PARAM}=${POST_CONNECT_VALUE}`,
    )
    expect(withPostConnectMarker('https://musthavemods.com/go/abc123/?ref=pin#top')).toBe(
      'https://musthavemods.com/go/abc123/?ref=pin&patreon=connected#top',
    )
  })

  it('withPostConnectMarker is idempotent (a reconnect does not double the marker)', () => {
    const once = withPostConnectMarker('https://musthavemods.com/go/abc123/')
    expect(withPostConnectMarker(once)).toBe(once)
    expect((once.match(/patreon=connected/g) ?? []).length).toBe(1)
  })

  it('withPostConnectMarker never throws on a non-URL (returns the input)', () => {
    expect(withPostConnectMarker('not a url')).toBe('not a url')
  })

  it('hasPostConnectMarker reads location.search exactly', () => {
    expect(hasPostConnectMarker('?patreon=connected')).toBe(true)
    expect(hasPostConnectMarker('?ref=pin&patreon=connected')).toBe(true)
    expect(hasPostConnectMarker('?patreon=1')).toBe(false)
    expect(hasPostConnectMarker('?connected=patreon')).toBe(false)
    expect(hasPostConnectMarker('')).toBe(false)
    expect(hasPostConnectMarker(null)).toBe(false)
    expect(hasPostConnectMarker(undefined)).toBe(false)
  })

  it('/go sends the marker on EVERY Patreon sign-in path and reads it back from location.search', () => {
    // Guard the class, not a count: a third Connect path (E99) must carry the
    // marker too, and a fourth cannot be added without it.
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    const calls = code.match(/signIn\('patreon',\s*\{\s*callbackUrl:\s*withPostConnectMarker\(window\.location\.href\)\s*\}\)/g) ?? []
    const all = code.match(/signIn\('patreon'/g) ?? []
    expect(all.length).toBeGreaterThanOrEqual(2)
    expect(calls).toHaveLength(all.length)
    expect(code).not.toMatch(/callbackUrl:\s*window\.location\.href\s*\}/)
    expect(code).toContain('hasPostConnectMarker(window.location.search)')
  })

  it('the post-connect state is gated on flag AND marker AND an authenticated non-member session', () => {
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    expect(code).toMatch(
      /const showPostConnect = membershipOn && postConnect && sessionStatus === 'authenticated' && !isMember/,
    )
    // The standard CTA yields to it (never both lines at once).
    expect(code).toContain('{membershipOn && !loading && !showPostConnect && (')
    expect(code).toContain('{showPostConnect && !loading && (')
  })

  it('the post-connect state leads with the FREE follow link and states the $3 perk in prose, never the $3 checkout', () => {
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    expect(code).toContain('href={PATREON_FREE_TIER_CHECKOUT_URL}')
    expect(code).toContain('Follow free on Patreon')
    expect(code).toContain('$3/mo patrons skip this wait')
    expect(code).toContain('Already a patron? Reconnect')
    expect(code).not.toContain('PATREON_MEMBER_TIER_CHECKOUT_URL')
    // Free link before the reconnect button inside the state.
    expect(code.indexOf('href={PATREON_FREE_TIER_CHECKOUT_URL}')).toBeLessThan(code.indexOf('onClick={handleReconnectPatreon}'))
  })

  it('GA4: patreon_click keeps exactly its two E24/E40 sources; the new state uses its own event names', () => {
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    const clicks = code.match(/gtag\('event',\s*'patreon_click'/g) ?? []
    expect(clicks).toHaveLength(2)
    expect(code).toContain("source: 'go-member-cta-connect'")
    expect(code).toContain("source: 'go-member-cta-join'")
    expect(code).toContain("gtag('event', 'patreon_post_connect_view'")
    expect(code).toContain("gtag('event', 'patreon_follow_click'")
    expect(code).toContain("gtag('event', 'patreon_reconnect_click'")
  })

  it('the post-connect state is a sibling of the mv-ads wrapper (renders before it) and outside the aside', () => {
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    const state = code.indexOf('{showPostConnect && !loading && (')
    expect(state).toBeGreaterThan(-1)
    expect(state).toBeLessThan(code.indexOf('className="mv-ads'))
    expect(state).toBeLessThan(code.indexOf('id="secondary"'))
  })
})

describe('E99 — /go member CTA stays visible after the countdown (Rio, 2026-09-24)', () => {
  // The Connect / Become-a-patron line lived only in the countdown branch, so
  // it unmounted the moment "Continue to Download" appeared: a 2026-09-24
  // headless render of a logged-out /go showed both links at t+4s and neither
  // at t+13s. GA4 09-16→09-22: 411 users rendered /go, 39 clicked Patreon —
  // every one of them inside the 10 s. This block pins the after-wait line:
  // its own event name (E65's patreon_click read on 09-26 stays clean), the
  // same two link kinds in the same order, a sibling of the ad anchors.
  const strip = (src: string) =>
    src.replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const AFTER_WAIT_GATE = '{canProceed && mod && membershipOn && !isMember && !showPostConnect && ('

  it('renders only once the download is ready, for non-members, and never alongside the post-connect state', () => {
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    expect(code).toContain(AFTER_WAIT_GATE)
    expect(code).toContain('Patrons skip this wait next time.')
  })

  it('uses its own GA4 event name with a connect and a join source; patreon_click still has exactly its two sources', () => {
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    const afterWait = code.match(/gtag\('event',\s*'patreon_click_after_wait'/g) ?? []
    expect(afterWait).toHaveLength(2)
    expect(code).toContain("source: 'go-member-cta-connect-after-wait'")
    expect(code).toContain("source: 'go-member-cta-join-after-wait'")
    const clicks = code.match(/gtag\('event',\s*'patreon_click'/g) ?? []
    expect(clicks).toHaveLength(2)
  })

  it('keeps Connect before the campaign landing page link, and the block after the countdown CTA in source order', () => {
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    const block = code.indexOf(AFTER_WAIT_GATE)
    const connect = code.indexOf('onClick={handleConnectPatreonAfterWait}', block)
    const join = code.indexOf('href={PATREON_PAGE_URL}', block)
    expect(connect).toBeGreaterThan(block)
    expect(join).toBeGreaterThan(connect)
    // The countdown CTA (E65) must still be the first Connect / join pair in the file.
    expect(code.indexOf('onClick={handleConnectPatreon}')).toBeLessThan(block)
    expect(code.indexOf('href={PATREON_PAGE_URL}')).toBeLessThan(block)
  })

  it('is a sibling of the mv-ads wrapper (renders before it) and outside the aside', () => {
    const code = strip(readSource('app/go/[modId]/GoClient.tsx'))
    const block = code.indexOf(AFTER_WAIT_GATE)
    expect(block).toBeGreaterThan(-1)
    expect(block).toBeLessThan(code.indexOf('className="mv-ads'))
    expect(block).toBeLessThan(code.indexOf('id="secondary"'))
  })

  it('the scoreboard counts the new event so the read is a row every morning, not a one-off query', () => {
    const scoreboard = readSource('scripts/agents/funnel-scoreboard.ts')
    expect(scoreboard).toContain("'patreon_click_after_wait'")
  })
})
