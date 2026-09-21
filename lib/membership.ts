/**
 * Membership via Patreon OAuth — B2 (Rio, 2026-09-07).
 *
 * Everything in this module is a NO-OP until the operator sets
 * `NEXT_PUBLIC_MEMBERSHIP_ENABLED=1` (plus the Patreon client credentials).
 * With the flag off: no Patreon provider is registered, the /go countdown
 * behaves exactly as before, and no badge renders anywhere.
 *
 * Env names (values live in `.env.local` / Vercel only, never in git):
 *   NEXT_PUBLIC_MEMBERSHIP_ENABLED  "1" turns the feature on (server + client)
 *   PATREON_CLIENT_ID               existing — OAuth client
 *   PATREON_CLIENT_SECRET           existing — OAuth client
 *   PATREON_CAMPAIGN_ID             optional — lock "member" to this campaign
 *   PATREON_MEMBER_MIN_CENTS        optional — minimum pledge that counts as
 *                                   a site member (e.g. "300" = $3 tier and
 *                                   up, "500" = $5 and up). Default 0 = any
 *                                   active patron. This is the operator's
 *                                   pricing knob (Tier 2) — no code change.
 *
 * Pure helpers are kept free of server-only imports so this file is safe to
 * import from client components (GoClient, Navbar). The only network call is
 * `fetchPatreonMembership`, which runs inside the NextAuth `jwt` callback on
 * the server.
 */

export const MEMBERSHIP_FLAG = 'NEXT_PUBLIC_MEMBERSHIP_ENABLED';

/** OAuth scopes: identity + email (NextAuth default) + the patron's memberships. */
export const PATREON_SCOPE = 'identity identity[email] identity.memberships';

/** v2 identity endpoint used as `userinfo` (the provider default is the deprecated v1 `current_user`). */
export const PATREON_USERINFO_URL =
  'https://www.patreon.com/api/oauth2/v2/identity?fields%5Buser%5D=email,full_name,image_url';

/** v2 identity endpoint with memberships + campaign relationship included. */
export const PATREON_MEMBERSHIP_URL =
  'https://www.patreon.com/api/oauth2/v2/identity' +
  '?include=memberships.campaign' +
  '&fields%5Bmember%5D=patron_status,currently_entitled_amount_cents';

/** Public Patreon page — the "become a patron" destination. */
export const PATREON_PAGE_URL = 'https://www.patreon.com/MustHaveModsOfficial';

/**
 * Direct checkout for the tier that carries the site perk — the $3 tier
 * (id 24880520; this is the same public join link the Patreon page uses).
 *
 * E40 (Rio, 2026-09-12): the /go CTA was switched to lead with this checkout
 * link, Connect second. REVERTED 2026-09-19 by E40's own pre-committed rule:
 * 09-13→09-18 produced 0 paid-and-connected (of 41 linked), 1 perk-tier join,
 * and patreon_click fell 8.75 → 3.57 users/day. /go is back on
 * PATREON_PAGE_URL with Connect first. These constants stay exported (no
 * consumer on the site today) so a future variant does not have to re-derive
 * the tier id; the morning operator-did probe reports tier price/id changes.
 */
export const PATREON_MEMBER_TIER_CHECKOUT_URL =
  'https://www.patreon.com/checkout/MustHaveModsOfficial?rid=24880520';
export const PATREON_MEMBER_TIER_PRICE_LABEL = '$3/mo';

/**
 * Public join link for the campaign's FREE tier (id 24870826, "Free", from
 * `GET /campaigns/{id}?include=tiers&fields[tier]=url`, 2026-09-21).
 *
 * E74 (Rio, 2026-09-21): the E69 pre-read classified every Patreon-linked
 * site account against the campaign's member list — 48 of 52 were not in
 * the campaign at all (never followed, not even free), 4 free, 0 paying. So
 * the /go "Connect Patreon" click is a *follow* funnel reaching non-followers,
 * and after OAuth those people came back to the same countdown and the same
 * "Connect Patreon" line. The post-connect state asks for the free follow
 * first (this link); the $3 perk is stated in prose, not linked — leading
 * with the $3 checkout is the E40 kill above.
 */
export const PATREON_FREE_TIER_CHECKOUT_URL =
  'https://www.patreon.com/checkout/MustHaveModsOfficial?rid=24870826';

/**
 * Query marker appended to the OAuth `callbackUrl` by the /go Connect button,
 * so the page can tell "just came back from Patreon" apart from a fresh visit
 * without touching the JWT/session (auth is Tier 2). The session itself only
 * carries `isPremium`; a linked-but-not-a-member visitor is indistinguishable
 * from a credentials user otherwise.
 */
export const POST_CONNECT_PARAM = 'patreon';
export const POST_CONNECT_VALUE = 'connected';

/** Pure: `href` with `?patreon=connected` added (idempotent; keeps query + hash). */
export function withPostConnectMarker(href: string): string {
  try {
    const u = new URL(href);
    u.searchParams.set(POST_CONNECT_PARAM, POST_CONNECT_VALUE);
    return u.toString();
  } catch {
    return href;
  }
}

/** Pure: does a `location.search` string carry the post-connect marker? */
export function hasPostConnectMarker(search: string | null | undefined): boolean {
  if (!search) return false;
  try {
    return new URLSearchParams(search).get(POST_CONNECT_PARAM) === POST_CONNECT_VALUE;
  } catch {
    return false;
  }
}

type Env = Record<string, string | undefined>;

/**
 * Is the membership feature on?
 *
 * Next.js inlines `NEXT_PUBLIC_*` into client bundles ONLY when the variable
 * is referenced literally as `process.env.NEXT_PUBLIC_…`. A dynamic
 * `env[MEMBERSHIP_FLAG]` lookup is left as-is, and in the browser
 * `process.env` is an empty object — so the flag read `undefined` on the
 * client while the server (authOptions) read "1". Q5 shipped dark for
 * visitors on 2026-09-07 → 09-08: no /go CTA, no countdown skip, no badge
 * (Rio, 2026-09-08). The default path MUST stay a literal read; an injected
 * `env` is only for tests.
 */
export function isMembershipEnabled(env?: Env): boolean {
  const value = env ? env[MEMBERSHIP_FLAG] : process.env.NEXT_PUBLIC_MEMBERSHIP_ENABLED;
  return value === '1';
}

/** The Patreon provider is only registered when the flag is on AND both OAuth credentials exist. */
export function isPatreonProviderConfigured(env?: Env): boolean {
  const e = env ?? process.env;
  return isMembershipEnabled(env) && !!e.PATREON_CLIENT_ID && !!e.PATREON_CLIENT_SECRET;
}

export interface PatreonMembership {
  /** True when at least one membership (matching the campaign, if set) has `patron_status === "active_patron"`. */
  isActivePatron: boolean;
  /** Highest currently-entitled pledge across matching memberships, in cents. */
  entitledCents: number;
  /** Campaign id that satisfied the check, if any. */
  campaignId: string | null;
}

interface PatreonIncluded {
  type?: string;
  id?: string;
  attributes?: { patron_status?: string | null; currently_entitled_amount_cents?: number | null };
  relationships?: { campaign?: { data?: { id?: string; type?: string } | null } };
}

/**
 * Parse a Patreon v2 identity response (with `include=memberships.campaign`).
 * Pure; safe to unit test. Malformed input → not a patron.
 *
 * @param campaignId when set, only memberships of that campaign count. When
 *   unset, any active membership counts — set `PATREON_CAMPAIGN_ID` in
 *   production so a patron of another creator cannot unlock member perks.
 */
export function parsePatreonIdentity(json: unknown, campaignId?: string | null): PatreonMembership {
  const none: PatreonMembership = { isActivePatron: false, entitledCents: 0, campaignId: null };
  if (!json || typeof json !== 'object') return none;
  const included = (json as { included?: unknown }).included;
  if (!Array.isArray(included)) return none;

  let best: PatreonMembership = none;
  for (const item of included as PatreonIncluded[]) {
    if (!item || item.type !== 'member') continue;
    const memberCampaign = item.relationships?.campaign?.data?.id ?? null;
    if (campaignId && memberCampaign !== campaignId) continue;
    if (item.attributes?.patron_status !== 'active_patron') continue;
    const cents = Number(item.attributes?.currently_entitled_amount_cents ?? 0) || 0;
    if (!best.isActivePatron || cents > best.entitledCents) {
      best = { isActivePatron: true, entitledCents: cents, campaignId: memberCampaign };
    }
  }
  return best;
}

/** Minimum pledge (cents) that unlocks site membership. Unset/invalid → 0 (any active patron). */
export function memberMinCents(env: Env = process.env): number {
  const n = Number(env.PATREON_MEMBER_MIN_CENTS ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** Does this membership unlock site perks under the configured pledge floor? */
export function qualifiesForMembership(m: PatreonMembership | null | undefined, env: Env = process.env): boolean {
  if (!m || !m.isActivePatron) return false;
  return m.entitledCents >= memberMinCents(env);
}

/**
 * Server-side: ask Patreon whether the signed-in user is an active patron.
 * Returns null on any network/API failure so the caller can leave the
 * user's existing status untouched (a Patreon hiccup must never break sign-in).
 */
export async function fetchPatreonMembership(
  accessToken: string,
  campaignId: string | null | undefined = process.env.PATREON_CAMPAIGN_ID,
): Promise<PatreonMembership | null> {
  try {
    const res = await fetch(PATREON_MEMBERSHIP_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return parsePatreonIdentity(json, campaignId || null);
  } catch {
    return null;
  }
}
