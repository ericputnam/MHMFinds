/**
 * Nexus Mods author extraction via the public v1 API.
 *
 * Why this exists: Nexus pages live behind Cloudflare's bot challenge, so
 * `fetchDestinationHtml` always returns null for `nexusmods.com` URLs (see the
 * UNFETCHABLE_DOMAIN_PATTERNS list in `authorExtractor.ts`). The HTML scrape
 * can never recover an author. The official API at `api.nexusmods.com` is the
 * only automated path — and it's free with a personal account.
 *
 * Auth:
 *   - `NEXUS_API_KEY` env var, sent as the `apikey` header.
 *   - Personal API keys are generated at:
 *       https://www.nexusmods.com/users/myaccount?tab=api
 *
 * Rate limits (free tier, per the published docs):
 *   - 2,500 requests / day
 *   - 100 requests / hour
 *   The response carries `x-rl-hourly-remaining` and `x-rl-daily-remaining`
 *   headers; we surface them in debug logs but don't throttle ourselves —
 *   Nexus returns 429 when exhausted and we fall through gracefully.
 *
 * URL shapes we accept:
 *   - https://www.nexusmods.com/{gameDomain}/mods/{id}
 *   - https://www.nexusmods.com/{gameDomain}/mods/{id}/?tab=...
 *   - https://nexusmods.com/{gameDomain}/mods/{id}
 *
 * The `gameDomain` is Nexus's URL slug (e.g. `stardewvalley`,
 * `skyrimspecialedition`, `cyberpunk2077`). It's already in the URL — we don't
 * need to maintain a mapping table.
 *
 * Returns:
 *   - null                                  → URL is not a Nexus mods URL
 *   - { candidate: null, ... }              → API was called but no usable name
 *   - { candidate, ... }                    → API returned a usable author
 *
 * The shape mirrors `PatreonApiResult` so the orchestrator can treat both
 * uniformly. There's no paywall concept on Nexus, so the result type is
 * lighter — just `{ candidate, isMissing }`.
 */

import axios from 'axios';

import { isValidAuthor } from './badAuthorPatterns';
import type { Candidate } from './authorExtractor';

export interface NexusApiResult {
  candidate: Candidate | null;
  /**
   * True when the API returned 404 (mod was deleted/hidden). Distinguishes
   * "we tried and the mod doesn't exist anymore" from "API returned a record
   * but no usable author". Callers can use this to mark the mod as removed.
   * Optional — undefined when not applicable.
   */
  isMissing?: boolean;
}

/**
 * Parse a Nexus Mods URL into its `{gameDomain, modId}` components, or null
 * if the URL doesn't match a recognized Nexus mod URL shape. Exported for
 * unit testing — callers should generally use `fromNexusApi()`.
 */
export function parseNexusUrl(
  url: string,
): { gameDomain: string; modId: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  if (hostname !== 'nexusmods.com' && hostname !== 'www.nexusmods.com') {
    return null;
  }

  // Path: /{gameDomain}/mods/{id}/?...
  // gameDomain is lowercase alphanumeric (no hyphens in the canonical Nexus
  // slug — they collapse spaces, so "Stardew Valley" → "stardewvalley").
  const m = parsed.pathname.match(/^\/([a-z0-9]+)\/mods\/(\d+)\b/i);
  if (!m) return null;

  return { gameDomain: m[1].toLowerCase(), modId: m[2] };
}

interface NexusModResponse {
  /** Free-form display name set by the uploader (e.g. "AstralEsper"). */
  author?: unknown;
  /** Account username — usually the same as `author` but more URL-safe. */
  uploaded_by?: unknown;
  /** Profile URL — useful for backreference but not used as an author name. */
  uploaded_users_profile_url?: unknown;
  /** Mod metadata we don't currently consume but log for diagnostics. */
  name?: unknown;
  available?: unknown;
  status?: unknown;
}

/**
 * Resolve the creator for a Nexus Mods URL via the public v1 API.
 *
 * Returns:
 *   - null                                   → URL is not a Nexus mods URL
 *   - { candidate, isMissing? }              → API call attempted, result follows
 *
 * Returns `{ candidate: null }` (not throws) on:
 *   - missing NEXUS_API_KEY
 *   - 401 (bad key), 403 (forbidden), 404 (deleted), 429 (rate-limited)
 *   - 5xx, network/timeout errors
 *   - response that lacks both `author` and `uploaded_by`
 */
export async function fromNexusApi(url: string): Promise<NexusApiResult | null> {
  const parts = parseNexusUrl(url);
  if (!parts) return null;

  const apiKey = process.env.NEXUS_API_KEY;
  if (!apiKey) {
    // Without a key, the API will 401. Returning null (not-applicable) here
    // preserves the previous behavior: Nexus URLs were on the unfetchable
    // list, so author stays null. Logging once would spam the console; the
    // env-var-missing case is signaled at scraper-startup time instead.
    return { candidate: null };
  }

  const { gameDomain, modId } = parts;
  const apiUrl = `https://api.nexusmods.com/v1/games/${gameDomain}/mods/${modId}.json`;

  try {
    const response = await axios.get<NexusModResponse>(apiUrl, {
      headers: {
        apikey: apiKey,
        Accept: 'application/json',
        // Nexus's docs ask for an Application-Name + Application-Version
        // header so they can identify integrations during outage triage.
        'Application-Name': 'MHMFinds',
        'Application-Version': '1.0.0',
        'User-Agent': 'MHMFinds/1.0 (+https://musthavemods.com)',
      },
      timeout: 10000,
      // Accept 4xx so we can branch on the status without a try/catch dance.
      validateStatus: s => s < 600,
    });

    if (response.status === 404) {
      // Mod was deleted or hidden by the uploader. Surface this so the caller
      // can consider de-listing the mod, but treat it as "no candidate" for
      // author purposes.
      return { candidate: null, isMissing: true };
    }

    if (response.status === 401 || response.status === 403) {
      // Bad/missing key, or rate-limit-by-IP. Nothing we can do here.
      return { candidate: null };
    }

    if (response.status === 429) {
      // Hourly or daily limit exhausted. Caller should back off and retry
      // later. We don't surface this as a separate field because the right
      // response is identical to "no key" — try again next run.
      return { candidate: null };
    }

    if (response.status !== 200) {
      return { candidate: null };
    }

    const data = response.data;
    if (!data || typeof data !== 'object') {
      return { candidate: null };
    }

    // Priority chain mirrors fromPatreonApi: prefer the human-set display
    // name (`author`), fall back to the account handle (`uploaded_by`).
    // Each gets denylist-checked individually.
    type Pri = { value: string; strategy: string };
    const priorities: Pri[] = [];

    const author = typeof data.author === 'string' ? data.author.trim() : '';
    if (author.length >= 2) {
      priorities.push({ value: author, strategy: 'nexus-api' });
    }

    const uploadedBy =
      typeof data.uploaded_by === 'string' ? data.uploaded_by.trim() : '';
    if (uploadedBy.length >= 2 && uploadedBy.toLowerCase() !== author.toLowerCase()) {
      priorities.push({ value: uploadedBy, strategy: 'nexus-api-uploaded-by' });
    }

    for (const p of priorities) {
      if (isValidAuthor(p.value)) {
        return {
          candidate: {
            value: p.value,
            confidence: 'high',
            strategy: p.strategy,
            rawSource: p.value,
          },
        };
      }
    }

    return { candidate: null };
  } catch {
    // Network error, DNS, timeout — fall through gracefully.
    return { candidate: null };
  }
}
