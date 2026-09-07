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

type Env = Record<string, string | undefined>;

export function isMembershipEnabled(env: Env = process.env): boolean {
  return env[MEMBERSHIP_FLAG] === '1';
}

/** The Patreon provider is only registered when the flag is on AND both OAuth credentials exist. */
export function isPatreonProviderConfigured(env: Env = process.env): boolean {
  return isMembershipEnabled(env) && !!env.PATREON_CLIENT_ID && !!env.PATREON_CLIENT_SECRET;
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
