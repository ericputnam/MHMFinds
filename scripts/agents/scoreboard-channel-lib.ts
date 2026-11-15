/**
 * E409 (Pip, 2026-11-15) — the scoreboard's session-source → channel rule, pure.
 *
 * This used to be an inline if-chain in `funnel-scoreboard.ts` `bySource`. It read
 * `medium === 'organic'` as the only search signal, so every search engine that GA4
 * records as a *referral* fell into "other": Yahoo's country front doors
 * (`uk.search.yahoo.com`, `fr.search.yahoo.com`, … 14 hosts, 3,198 sessions
 * 10-16→11-12), `cn.bing.com` (418) and the Edge new-tab feed `ntp.msn.com` (99).
 * Yahoo, DuckDuckGo, Ecosia and the MSN/Edge surfaces are all served from Bing's
 * index, so the Bing family was under-read by ~3,700 sessions/28d and the "other"
 * row carried search traffic the operator cannot act on under that label.
 *
 * Measurement only: this moves sessions between rows of the Audience table; it
 * creates none. Non-Pinterest totals are unchanged by construction (both rows are
 * non-Pinterest). No network, no fs, no env.
 */

export const AI_REFERRERS: ReadonlyArray<string> = [
  'chatgpt',
  'perplexity',
  'copilot',
  'gemini',
  'claude',
  'openai',
  'bing.com/chat',
  'you.com',
];

/**
 * Search front doors GA4 files as `referral` because the click comes from a
 * country subdomain or a feed host rather than the engine's canonical source.
 * Hosts only — a bare `bing.com` referral is left alone (it is mostly Copilot
 * and image panels, not SERP clicks, and `bing.com/chat` is already AI).
 */
export const BING_SYNDICATED_REFERRAL_HOSTS: ReadonlyArray<RegExp> = [
  /(^|\.)search\.yahoo\.com$/, // uk./fr./ca./de./au./es./it./se./br./nl./pl./id./ph./dk.search.yahoo.com
  /^cn\.bing\.com$/,
  /^ntp\.msn\.com$/, // Edge new-tab page (MSN Start) — Bing-index content feed
];

export function isBingSyndicatedReferral(source: string): boolean {
  const s = source.toLowerCase().trim();
  return BING_SYNDICATED_REFERRAL_HOSTS.some((re) => re.test(s));
}

export type ScoreboardChannel =
  | 'pinterest'
  | 'google_organic'
  | 'bing_organic'
  | 'direct'
  | 'tumblr'
  | 'reddit'
  | 'other_search'
  | 'email'
  | 'ai_referral'
  | 'other';

export interface ChannelClassification {
  channel: ScoreboardChannel;
  /** True when the row also counts toward the AI-referral total (`ai_referral` channel). */
  ai: boolean;
}

/**
 * Classify one GA4 `sessionSource` / `sessionMedium` pair. Order matters and is
 * the order the inline chain had: Pinterest first (any source containing
 * "pinterest", any medium), then the two named engines, direct, Tumblr, Reddit,
 * then any `organic` medium or a Bing-syndicated referral host as `other_search`,
 * then email. An AI referrer overrides whatever came before (as it always did).
 */
export function classifyChannel(sessionSource: string, sessionMedium: string): ChannelClassification {
  const src = (sessionSource ?? '').toLowerCase();
  const med = (sessionMedium ?? '').toLowerCase();
  let channel: ScoreboardChannel = 'other';
  if (src.includes('pinterest')) channel = 'pinterest';
  else if (src === 'google' && med === 'organic') channel = 'google_organic';
  else if (src === 'bing' && med === 'organic') channel = 'bing_organic';
  else if (src === '(direct)') channel = 'direct';
  else if (src.includes('tumblr')) channel = 'tumblr';
  else if (src.includes('reddit')) channel = 'reddit';
  else if (med === 'organic' || isBingSyndicatedReferral(src)) channel = 'other_search';
  else if (med === 'email' || src.includes('sendgrid')) channel = 'email';
  const ai = AI_REFERRERS.some((a) => src.includes(a)) || AI_MEDIUM.test(med);
  if (ai) channel = 'ai_referral';
  return { channel, ai };
}

/**
 * The inline chain tested `medium.includes('ai')`, and `email` contains `ai` — so
 * every newsletter session was filed as `ai_referral` and the scoreboard never had
 * an email row (found by this lib's own test, 2026-11-15). Match `ai` as a token:
 * `ai`, `ai-assistant`, `ai_chat` yes; `email`, `paid`, `maintenance` no.
 */
export const AI_MEDIUM = /(^|[^a-z])ai([^a-z]|$)/;
