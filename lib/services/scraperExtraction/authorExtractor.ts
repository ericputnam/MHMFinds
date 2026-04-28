/**
 * Multi-strategy author extractor shared by both the MHM and WWM scrapers.
 *
 * Strategies run in priority order. The first non-null candidate wins, then we
 * apply a CreatorProfile fuzzy-match BOOSTER and finally run the shared
 * isValidAuthor() denylist as the FINAL GATE.
 *
 * Usage:
 *   const result = await extractAuthor({ url, title, $, prisma });
 *   if (result.value) { ... }
 *
 * If `result.value` is null, do NOT write garbage to the DB. The strategy field
 * will be `'denylist-rejected'` when the chain found a candidate but it failed
 * the denylist, or the name of the last strategy that returned null otherwise.
 *
 * See also: lib/services/scraperExtraction/badAuthorPatterns.ts
 */

import type { CheerioAPI } from 'cheerio';
import type { PrismaClient } from '@prisma/client';
import axios from 'axios';
import * as cheerio from 'cheerio';

import { isValidAuthor } from './badAuthorPatterns';
import { fromNexusApi } from './nexusApiClient';

// ============================================
// DESTINATION FETCH
// ============================================

/**
 * Domains we never fetch: they respond with generic/blog-level metadata that
 * shadows the real creator info, or they 403 us outright. URL strategy already
 * handles the well-known shapes for these (Patreon /c/, TSR /members/).
 *
 * File-host domains (Drive, Dropbox, Mediafire, Mega) are here because their
 * pages contain no creator info — only the file viewer/login UI. Fetching them
 * risks letting the OG strategy extract garbage like "Drive" from
 * `og:site_name`.
 */
const UNFETCHABLE_DOMAIN_PATTERNS = [
  /(^|\.)patreon\.com$/i,
  /(^|\.)curseforge\.com$/i,
  // Nexus Mods (most Stardew Valley mods live here): Cloudflare blocks generic
  // HEAD/GET with a "Just a moment..." challenge page on www.nexusmods.com,
  // so HTML strategies are useless. Author extraction goes through
  // `fromNexusApi()` (api.nexusmods.com, requires NEXUS_API_KEY) — see
  // `nexusApiClient.ts`. We still keep the page-fetch on the unfetchable
  // list so we don't waste a round-trip on the Cloudflare challenge.
  /(^|\.)nexusmods\.com$/i,
  /(^|\.)drive\.google\.com$/i,
  /(^|\.)docs\.google\.com$/i,
  /(^|\.)dropbox\.com$/i,
  /(^|\.)mediafire\.com$/i,
  /(^|\.)mega\.nz$/i,
  /(^|\.)mega\.co\.nz$/i,
  /(^|\.)simfileshare\.net$/i,
];

function isUnfetchableDomain(hostname: string): boolean {
  return UNFETCHABLE_DOMAIN_PATTERNS.some(re => re.test(hostname));
}

/**
 * Fetch `url` and return a Cheerio of its HTML. Returns null on any failure
 * (protected domain, 403, 5xx, timeout, Cloudflare challenge, non-HTML body).
 * Never throws.
 */
export async function fetchDestinationHtml(url: string): Promise<CheerioAPI | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (isUnfetchableDomain(parsed.hostname.toLowerCase())) return null;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: s => s < 500,
    });

    if (response.status >= 400) return null;

    const body = response.data;
    if (typeof body !== 'string') return null;

    if (
      body.includes('Just a moment') ||
      body.includes('cf-chl-opt') ||
      body.includes('Checking your browser')
    ) {
      return null;
    }

    return cheerio.load(body);
  } catch {
    return null;
  }
}

// ============================================
// TYPES
// ============================================

export type Confidence = 'high' | 'medium' | 'low';

export interface Candidate {
  value: string;
  confidence: Confidence;
  strategy: string;
  rawSource: string;
  /**
   * When true, the orchestrator REQUIRES the CreatorProfile/known-author
   * booster to find a match before accepting this candidate. Used by
   * weakly-trusted strategies like `url-patreon-post-slug` where the leading
   * slug-segment could be a creator handle OR a Sim-character name OR a
   * topic word, and we can't tell from URL alone. If the booster fails, the
   * candidate is dropped and the chain continues.
   */
  requiresValidation?: boolean;
}

export interface ExtractAuthorInput {
  url: string;
  title: string;
  /**
   * Cheerio of the page where the mod was found. When the caller is an
   * aggregator (MHM / WWM roundup pages), this is the AGGREGATOR's DOM and
   * its JSON-LD / OpenGraph belong to the blog post, NOT the mod creator.
   * In that case pass `fetchDestination: true` so HTML strategies run against
   * the fetched destination DOM instead.
   */
  $: CheerioAPI;
  prisma: PrismaClient;
  /**
   * When true, the orchestrator fetches `url` and runs HTML strategies
   * (JSON-LD, OpenGraph) against the fetched DOM instead of the passed-in $.
   * Aggregator scrapers MUST set this so they don't capture blog-level
   * metadata instead of mod-creator metadata. Skipped for protected domains
   * (Patreon, CurseForge) — URL strategy already handles their known shapes.
   */
  fetchDestination?: boolean;
}

export interface ExtractAuthorResult {
  value: string | null;
  confidence: Confidence | null;
  strategy: string;
  /**
   * Set to true when the upstream signal (currently only the Patreon public
   * posts API) indicated the post is paywalled — i.e. requires an active
   * paid Patreon membership to read. Callers (e.g. backfill scripts, the
   * live scraper) SHOULD treat the corresponding mod as paid by setting
   * `isFree: false`. Stays undefined when no paywall signal was observed,
   * so existing code that only reads `value`/`confidence`/`strategy` is
   * unaffected.
   */
  isPaywalled?: boolean;
}

/**
 * Result shape returned by `fromPatreonApi`. Distinguishes between:
 *   - A successful candidate (`candidate` is non-null).
 *   - A paywalled post (`candidate` null, `isPaywalled` true).
 *   - An API call we made but couldn't extract anything from (both null/false).
 *
 * `fromPatreonApi` returns `null` when the URL is not a Patreon /posts/{...}
 * URL — i.e. the strategy is not applicable. Once we've made the network
 * call, we always return a result object so callers can distinguish "didn't
 * apply" from "applied but no candidate" from "applied, paywalled".
 */
export interface PatreonApiResult {
  candidate: Candidate | null;
  isPaywalled: boolean;
}

// ============================================
// HELPERS
// ============================================

function cleanHandle(raw: string): string {
  return raw
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Decode HTML entities and strip non-printable characters so author names
 * never contain raw entity codes like `&#9790;` (☾) or `&amp;` (&).
 *
 * Why this exists: HTML strategies (`fromOpenGraph`, `fromHtmlHeuristics`)
 * read author names from `meta[content="..."]` attributes that frequently
 * contain numeric/named HTML entities verbatim. Without decoding, these
 * end up as `Maxi Moons &#9790;` in the database.
 *
 * Implementation: cheerio's text-extraction reliably decodes ALL HTML
 * entity forms (named, decimal numeric `&#NNN;`, hex numeric `&#xHHHH;`).
 * We wrap the value in a temp tag and read `.text()` — fewer surprises
 * than maintaining our own entity table.
 *
 * Also strips control characters and zero-width spaces (U+200B-U+200D, U+FEFF)
 * which can sneak in from copy-paste sources.
 */
function decodeHtmlEntities(s: string): string {
  if (!s) return s;
  // Cheerio decodes entities when reading text content. Wrap in a tag so the
  // load doesn't get confused by leading whitespace or partial markup.
  let decoded: string;
  try {
    decoded = cheerio.load(`<x>${s}</x>`, null, false)('x').text();
  } catch {
    decoded = s;
  }
  // Strip control chars (0x00-0x1F, 0x7F) and zero-width characters that
  // serve no purpose in a display name.
  // eslint-disable-next-line no-control-regex
  return decoded.replace(/[ -​-‍﻿]/g, '').trim();
}

/**
 * Normalize an author string for downstream use:
 *   - decode HTML entities
 *   - collapse internal whitespace
 *   - strip leading/trailing whitespace
 *
 * This is the canonical entry-point applied at the orchestrator level on
 * every Candidate.value. Strategies should NOT call this — let the
 * orchestrator do it once so the cleaning rules live in one place.
 */
export function cleanAuthorString(raw: string): string {
  return decodeHtmlEntities(raw).replace(/\s+/g, ' ').trim();
}

function titleCase(s: string): string {
  return s
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Tiny Levenshtein distance implementation (edit distance).
 * Used for fuzzy-matching candidates against CreatorProfile.handle.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1, // insert
        prev[j] + 1, // delete
        prev[j - 1] + cost, // substitute
      );
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }

  return prev[b.length];
}

// ============================================
// STRATEGY 1: JSON-LD
// ============================================

/**
 * Parse `<script type="application/ld+json">` blocks for `author.name` or
 * `creator.name`. There can be multiple blocks per page — walk them all.
 *
 * Returns the first usable `name` found. Confidence: high.
 */
export function fromJsonLd($: CheerioAPI): Candidate | null {
  const scripts = $('script[type="application/ld+json"]');
  let found: Candidate | null = null;

  scripts.each((_, el) => {
    if (found) return;
    const raw = $(el).html();
    if (!raw) return;

    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch {
      return; // skip invalid JSON-LD
    }

    const candidate = extractAuthorFromJsonLdNode(data);
    if (candidate) {
      found = {
        value: candidate,
        confidence: 'high',
        strategy: 'jsonld',
        rawSource: candidate,
      };
    }
  });

  return found;
}

/**
 * Walks a JSON-LD payload (object, array, or @graph) and returns the first
 * `author.name` or `creator.name` string encountered.
 */
function extractAuthorFromJsonLdNode(node: unknown): string | null {
  if (!node) return null;

  // Array: iterate
  if (Array.isArray(node)) {
    for (const item of node) {
      const v = extractAuthorFromJsonLdNode(item);
      if (v) return v;
    }
    return null;
  }

  if (typeof node !== 'object') return null;
  const obj = node as Record<string, unknown>;

  // @graph wrapper (common in schema.org blocks)
  if (obj['@graph']) {
    const v = extractAuthorFromJsonLdNode(obj['@graph']);
    if (v) return v;
  }

  // Direct author / creator fields
  for (const key of ['author', 'creator']) {
    const val = obj[key];
    if (!val) continue;

    if (typeof val === 'string' && val.trim().length >= 2) {
      return val.trim();
    }
    if (Array.isArray(val)) {
      for (const item of val) {
        if (typeof item === 'string' && item.trim().length >= 2) {
          return item.trim();
        }
        if (
          item &&
          typeof item === 'object' &&
          typeof (item as { name?: unknown }).name === 'string'
        ) {
          const n = (item as { name: string }).name.trim();
          if (n.length >= 2) return n;
        }
      }
    }
    if (typeof val === 'object' && val !== null) {
      const n = (val as { name?: unknown }).name;
      if (typeof n === 'string' && n.trim().length >= 2) {
        return n.trim();
      }
    }
  }

  return null;
}

// ============================================
// STRATEGY 2: OpenGraph
// ============================================

/**
 * Check `<meta property="article:author">` or `og:article:author`.
 *
 * Explicitly IGNORES `<meta name="author">` because that usually reflects the
 * blog author (e.g., the MHM editor), not the mod creator we care about.
 */
export function fromOpenGraph($: CheerioAPI): Candidate | null {
  // article:author has the highest confidence
  const articleAuthor = $('meta[property="article:author"]').attr('content')?.trim();
  if (articleAuthor && articleAuthor.length >= 2) {
    return {
      value: articleAuthor,
      confidence: 'high',
      strategy: 'og-article-author',
      rawSource: articleAuthor,
    };
  }

  const ogArticleAuthor = $('meta[property="og:article:author"]').attr('content')?.trim();
  if (ogArticleAuthor && ogArticleAuthor.length >= 2) {
    return {
      value: ogArticleAuthor,
      confidence: 'medium',
      strategy: 'og-article-author',
      rawSource: ogArticleAuthor,
    };
  }

  return null;
}

// ============================================
// STRATEGY 2.5: Site-specific HTML heuristics
// ============================================

/**
 * Site-specific HTML scanning that doesn't fit the generic JSON-LD / OG
 * strategies. Runs against whatever DOM the orchestrator feeds it (passed-in
 * $ or destination-fetched DOM). Currently handles:
 *
 *   - The Sims Resource: `<meta property="og:title" content="{author}'s {title}">`
 *     Every TSR download page uses this exact possessive format. High-confidence
 *     because the pattern is site-enforced, not user-generated.
 *
 * Future additions: other known sites with consistent og:title or schema formats.
 */
export function fromHtmlHeuristics($: CheerioAPI, url: string): Candidate | null {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    // Unparseable URL — heuristics that need hostname context won't run, but
    // site-agnostic ones could still fire below.
  }

  if (hostname.includes('thesimsresource.com')) {
    // TSR product detail pages embed their own metadata as HTML-encoded JSON
    // on `<div class="item-wrapper" data-item="...">`. The first matching
    // wrapper IS the main product; subsequent wrappers belong to "More from
    // this creator" / "Featured items" carousels, which carry OTHER creators
    // and would mislead us. We disambiguate by matching the URL's `/id/{N}/`
    // segment against the embedded `ID` field.
    //
    // This strategy is preferred over og:title parsing because:
    //   - It survives possessive-form ambiguity (Arltos' vs Arltos's vs no
    //     possessive at all — TSR doesn't always include one).
    //   - The JSON's `creator` field is the canonical handle, not a token
    //     that has to be split out of a sentence.
    //   - Carousel og:title can only contain ONE author; data-item wrappers
    //     are addressable by ID.
    const idMatch = url.match(/\/id\/(\d+)/i);
    const targetId = idMatch ? idMatch[1] : null;

    const wrappers = $('.item-wrapper[data-item], div[data-item]');
    let dataItemCandidate: Candidate | null = null;

    wrappers.each((_, el) => {
      if (dataItemCandidate) return;
      const raw = $(el).attr('data-item');
      if (!raw) return;
      let parsed: { creator?: unknown; ID?: unknown } | null = null;
      try {
        // The attribute is HTML-encoded (cheerio's .attr() decodes it back to
        // a plain JSON string), so we can JSON.parse directly.
        parsed = JSON.parse(raw);
      } catch {
        return;
      }
      if (!parsed) return;
      // When we have a target ID, only accept the matching wrapper. When we
      // don't (URL was missing /id/), accept the first wrapper found —
      // it's reliably the main product on TSR.
      if (targetId && String(parsed.ID ?? '') !== targetId) return;

      const creator = typeof parsed.creator === 'string' ? parsed.creator.trim() : '';
      if (creator.length >= 2) {
        dataItemCandidate = {
          value: creator,
          confidence: 'high',
          strategy: 'tsr-data-item',
          rawSource: creator,
        };
      }
    });

    if (dataItemCandidate) return dataItemCandidate;

    // Fallback: og:title = "{author}'s {title}" (or "{author}' {title}" when
    // the author's name already ends in 's'). The regex tolerates either
    // possessive form. We only run this when data-item didn't match, e.g.
    // for older TSR layouts.
    const ogTitle = $('meta[property="og:title"]').attr('content')?.trim();
    if (ogTitle) {
      const m = ogTitle.match(/^(.+?)'s?\s+(.+)$/);
      if (m && m[1].trim().length >= 2) {
        const value = m[1].trim();
        return {
          value,
          confidence: 'high',
          strategy: 'tsr-og-title',
          rawSource: ogTitle,
        };
      }
    }
  }

  return null;
}

// ============================================
// STRATEGY 2.7: Patreon public posts API
// ============================================

/**
 * Resolve the creator for a Patreon `/posts/{slug}-{id}` (or `/posts/{id}`) URL
 * by calling the public posts API: `https://www.patreon.com/api/posts/{id}`.
 *
 * This endpoint returns JSON:API with the post's `relationships.user`, the
 * `relationships.campaign`, and the actual records in `included[]`. We try a
 * fallback chain of candidate fields in priority order:
 *   1. user.full_name        → strategy "patreon-api"
 *   2. campaign.name         → strategy "patreon-api-campaign"
 *   3. user.vanity           → strategy "patreon-api-vanity"
 *
 * Each candidate is denylist-checked (isValidAuthor) BEFORE being returned —
 * some real Patreon creators have `full_name` values that are denylisted
 * generic words ("Dress", "November", "Moon") but distinctive vanities or
 * campaign names ("Dresss", "november4sims", "MoonShinerSims"). Without this
 * fallback chain, those creators end up with null authors despite the API
 * returning useful data.
 *
 * Paywall detection: when the API returns 403 ViewForbidden, the post is paid
 * and the public API can't read it. We surface this via `isPaywalled: true` so
 * callers can mark the mod as paid (`isFree: false`).
 *
 * Why this is high-confidence:
 *   - It's Patreon's own data, served by their public API.
 *   - No auth required — works for any public post.
 *   - Bypasses the JS-rendering / Cloudflare HTML-fetch problem entirely.
 *
 * Returns:
 *   - null                                  → URL is not a Patreon /posts/ URL
 *   - { candidate, isPaywalled }            → API was called; result follows
 */
export async function fromPatreonApi(url: string): Promise<PatreonApiResult | null> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!parsed.hostname.toLowerCase().includes('patreon.com')) return null;

  // Match `/posts/{anything-trailing-number}` or `/posts/{number}`.
  // The trailing numeric segment is the post ID.
  const m = parsed.pathname.match(/^\/posts\/(?:.*-)?(\d+)\/?$/);
  if (!m) return null;
  const postId = m[1];

  try {
    const response = await axios.get(
      `https://www.patreon.com/api/posts/${postId}`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
        timeout: 10000,
        // Accept 4xx so we can read the JSON:API errors[] array and detect
        // ViewForbidden (paywall) vs ResourceMissing (deleted) etc.
        validateStatus: s => s < 600,
      },
    );

    // 403 with code_name === "ViewForbidden" = paid post, public API blind.
    // The post exists but requires a paid membership to read. Caller should
    // mark the mod as paid; Tier-2 cookie auth is needed to recover the
    // author. Other 403 reasons are rare; treat them as plain "no candidate".
    if (response.status === 403) {
      const code = response.data?.errors?.[0]?.code_name;
      if (code === 'ViewForbidden') {
        return { candidate: null, isPaywalled: true };
      }
      return { candidate: null, isPaywalled: false };
    }

    if (response.status !== 200) {
      return { candidate: null, isPaywalled: false };
    }

    const data = response.data;
    if (!data || !Array.isArray(data.included)) {
      return { candidate: null, isPaywalled: false };
    }

    // Build a priority-ordered candidate list from included[]:
    //   1. user.full_name      → "patreon-api"
    //   2. campaign.name       → "patreon-api-campaign"
    //   3. user.vanity         → "patreon-api-vanity"
    // Each is denylist-checked. The first that passes wins. This handles the
    // "Dress / November / Moon" cases where full_name is a generic English
    // word but campaign.name or vanity is a distinctive creator handle.
    type Pri = { value: string; strategy: string };
    const priorities: Pri[] = [];

    for (const item of data.included) {
      if (item?.type !== 'user') continue;
      const attrs = item.attributes || {};
      const fullName = typeof attrs.full_name === 'string' ? attrs.full_name.trim() : '';
      if (fullName.length >= 2) {
        priorities.push({ value: fullName, strategy: 'patreon-api' });
      }
    }

    for (const item of data.included) {
      if (item?.type !== 'campaign') continue;
      const attrs = item.attributes || {};
      const name = typeof attrs.name === 'string' ? attrs.name.trim() : '';
      if (name.length >= 2) {
        priorities.push({ value: name, strategy: 'patreon-api-campaign' });
      }
    }

    for (const item of data.included) {
      if (item?.type !== 'user') continue;
      const attrs = item.attributes || {};
      const vanity = typeof attrs.vanity === 'string' ? attrs.vanity.trim() : '';
      if (vanity.length >= 2) {
        priorities.push({ value: vanity, strategy: 'patreon-api-vanity' });
      }
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
          isPaywalled: false,
        };
      }
    }

    return { candidate: null, isPaywalled: false };
  } catch {
    return { candidate: null, isPaywalled: false };
  }
}

// ============================================
// STRATEGY 3: URL patterns
// ============================================

/**
 * Extract author from well-known URL patterns: Patreon /c/ slug, TSR members,
 * Tumblr subdomain, itch.io subdomain.
 *
 * Returns null for URL shapes where the author can't be reliably derived
 * (e.g., Patreon /posts/{id}), letting the chain continue.
 */
export function fromUrl(url: string): Candidate | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname;

  // Patreon /c/creator → high confidence
  if (hostname.includes('patreon.com')) {
    const cMatch = pathname.match(/^\/c\/([^\/?]+)/i);
    if (cMatch) {
      const raw = cMatch[1];
      const cleaned = titleCase(cleanHandle(raw));
      return {
        value: cleaned,
        confidence: 'high',
        strategy: 'url-patreon-c',
        rawSource: raw,
      };
    }

    // Patreon /posts/{slug-with-id} — extract the leading hyphen-segment as a
    // candidate creator. Many Patreon post slugs are of the form
    // `{creator-handle}-{topic-words}-{numeric-id}` (e.g.
    // `hoodlem-makiage-71276188`, `morallee-lute-x-120073619`). When the
    // leading segment is a real creator, this works. When it's a topic word
    // ("crown", "butterfly", "simple"), the badAuthorPatterns denylist kicks
    // in and rejects it, leaving the chain to fall through to title patterns.
    //
    // Returns medium confidence — Patreon slugs are not authoritative; this
    // is a best-effort extraction.
    if (pathname.startsWith('/posts/')) {
      const slug = pathname.replace(/^\/posts\//, '').replace(/\/$/, '');
      // Pure-numeric (no slug, just postID) → unrecoverable.
      if (/^\d+$/.test(slug)) return null;

      // First hyphen-segment, ignoring the trailing numeric postID.
      const firstSeg = slug.split('-')[0];
      if (!firstSeg || /^\d+$/.test(firstSeg)) return null;

      // Only single-word leading segments are plausibly creator handles.
      // Multi-segment slugs like `there-will-be-...` are almost always titles.
      const cleaned = titleCase(firstSeg);
      if (cleaned.length < 3) return null;

      return {
        value: cleaned,
        confidence: 'low',
        strategy: 'url-patreon-post-slug',
        rawSource: firstSeg,
        // Patreon /posts/ slug heads are ambiguous — could be a creator
        // handle ("hoodlem-makiage-..."), a Sim character name
        // ("margot-hair-..."), or a topic word. Require validation against
        // a known creator before accepting. Without this gate, the live
        // scraper produced ~30% Sim-name false positives.
        requiresValidation: true,
      };
    }

    // Patreon /{creator} (not a numeric segment, not "posts")
    const slugMatch = pathname.match(/^\/([^\/?]+)/);
    if (slugMatch && !/^\d+$/.test(slugMatch[1]) && slugMatch[1] !== 'posts') {
      const raw = slugMatch[1];
      const cleaned = titleCase(cleanHandle(raw));
      return {
        value: cleaned,
        confidence: 'medium',
        strategy: 'url-patreon-slug',
        rawSource: raw,
      };
    }
    return null;
  }

  // The Sims Resource — /members/{name}/ or /staff/{Name}/
  if (hostname.includes('thesimsresource.com')) {
    const memberMatch = pathname.match(/\/members\/([^\/?]+)/i);
    if (memberMatch) {
      const raw = memberMatch[1];
      const cleaned = titleCase(cleanHandle(raw));
      return {
        value: cleaned,
        confidence: 'high',
        strategy: 'url-tsr-members',
        rawSource: raw,
      };
    }
    const staffMatch = pathname.match(/\/staff\/([^\/?]+)/i);
    if (staffMatch) {
      const raw = staffMatch[1];
      const cleaned = titleCase(cleanHandle(raw));
      return {
        value: cleaned,
        confidence: 'high',
        strategy: 'url-tsr-staff',
        rawSource: raw,
      };
    }
    return null;
  }

  // CurseForge — Cloudflare blocks our HTML fetches and the public API
  // endpoint /v1/mods/search is tier-gated, so URL parsing is the only
  // automated signal we have for these mods.
  //
  // Many CurseForge slugs have the form `{creator-handle}-{topic-words}`,
  // e.g. `eggsims-bracelet11`, `luxeinluv-bracelets-adults`,
  // `playerswonderland-opal-pearl-bracelet`. When the leading hyphen-segment
  // is a real creator, the CreatorProfile booster confirms it. When it's a
  // brand word ("luxe", "cute", "modern"), the booster fails and the
  // candidate is dropped — same gating model as Patreon /posts/{slug}-{id}.
  //
  // Confidence: low + requiresValidation. Without booster confirmation, a
  // CurseForge slug like `lace-boots-79` would otherwise produce "Lace" as
  // the author. The validation gate prevents that.
  if (hostname.endsWith('curseforge.com')) {
    // Path shapes:
    //   /sims4/create-a-sim/{slug}            (CC)
    //   /sims4/mods/{slug}                    (gameplay mods)
    //   /sims4/{class}/{slug}/gallery         (gallery suffix variant)
    // The leading slug segment is what we extract.
    const slugMatch = pathname.match(/\/sims4\/[^\/]+\/([^\/?]+)/i);
    if (slugMatch) {
      const slug = slugMatch[1];
      // Pure-numeric → no author hint
      if (/^\d+$/.test(slug)) return null;

      // First hyphen-segment. Reject digit-only or sub-3-char heads.
      const firstSeg = slug.split('-')[0];
      if (!firstSeg || /^\d+$/.test(firstSeg) || firstSeg.length < 3) return null;

      const cleaned = titleCase(firstSeg);
      return {
        value: cleaned,
        confidence: 'low',
        strategy: 'url-curseforge-slug',
        rawSource: firstSeg,
        // Same validation contract as Patreon /posts/ slugs: weak signal,
        // booster must confirm before we accept it.
        requiresValidation: true,
      };
    }
    return null;
  }

  // Tumblr's canonical URL form: www.tumblr.com/{creator}/{postId}/...
  // (e.g. /bloodmooncc/64367.../nihil-nose-chains). First path segment is the
  // blog name. Must come BEFORE the generic `.tumblr.com` subdomain handler
  // below, otherwise "www.tumblr.com" gets matched by the subdomain rule and
  // returns null.
  if (hostname === 'tumblr.com' || hostname === 'www.tumblr.com') {
    const m = pathname.match(/^\/([^\/?]+)\/(\d+)/);
    if (m) {
      const slug = m[1];
      const reserved = new Set([
        'dashboard', 'explore', 'search', 'settings', 'likes', 'following',
        'followers', 'tagged', 'login', 'register', 'blog', 'help', 'about',
        'policy', 'legal', 'messaging', 'inbox', 'neue', 'post',
      ]);
      if (!reserved.has(slug.toLowerCase())) {
        const cleaned = titleCase(cleanHandle(slug));
        return {
          value: cleaned,
          confidence: 'medium',
          strategy: 'url-tumblr-path',
          rawSource: slug,
        };
      }
    }
    return null;
  }

  // Tumblr subdomain (username.tumblr.com), not www or the main tumblr.com
  if (hostname.endsWith('.tumblr.com')) {
    const sub = hostname.replace(/\.tumblr\.com$/, '');
    if (sub && sub !== 'www' && !sub.includes('.')) {
      const cleaned = titleCase(cleanHandle(sub));
      return {
        value: cleaned,
        confidence: 'medium',
        strategy: 'url-tumblr-subdomain',
        rawSource: sub,
      };
    }
    return null;
  }

  // itch.io subdomain
  if (hostname.endsWith('.itch.io')) {
    const sub = hostname.replace(/\.itch\.io$/, '');
    if (sub && sub !== 'www' && !sub.includes('.')) {
      const cleaned = titleCase(cleanHandle(sub));
      return {
        value: cleaned,
        confidence: 'medium',
        strategy: 'url-itch-subdomain',
        rawSource: sub,
      };
    }
    return null;
  }

  return null;
}

// ============================================
// STRATEGY 4: Title patterns ("X by Y" / "X - Y" / "X (Y)" / "X | Y")
// ============================================

/**
 * Returns true if a parenthesized string in a mod title is almost certainly
 * a variant/version/quantity/position marker rather than an author name.
 *
 * Matches (case-insensitive):
 *   - anything containing a digit: "V2", "5 Types", "No. 2", "Set of 3"
 *   - known variant keywords: Set, Pack, Types, Variants, Version, Edition,
 *     Collection, Bundle, Bonus, Extra, Addon, Recolor, Recolors, Patch, Fix,
 *     Update, Alpha, Beta
 *   - known positional/directional: Left, Right, Center, Front, Back, Top,
 *     Bottom, Upper, Lower, Middle
 *   - known sex/age markers: Male, Female, Unisex, Adult, Teen, Child, Kids,
 *     Toddler, Baby, Men, Women, Boys, Girls
 */
function isLikelyVariantMarker(s: string): boolean {
  if (/\d/.test(s)) return true;
  const lower = s.toLowerCase();
  const tokens = new Set([
    'set', 'pack', 'types', 'type', 'variants', 'variant', 'version', 'edition',
    'collection', 'bundle', 'bonus', 'extra', 'addon', 'recolor', 'recolors',
    'patch', 'fix', 'update', 'alpha', 'beta',
    'left', 'right', 'center', 'centre', 'front', 'back', 'top', 'bottom',
    'upper', 'lower', 'middle',
    'male', 'female', 'unisex', 'adult', 'teen', 'child', 'kids', 'toddler',
    'baby', 'men', 'women', 'boys', 'girls',
  ]);
  if (tokens.has(lower)) return true;
  const tokensArr = Array.from(tokens);
  for (const t of tokensArr) {
    if (new RegExp(`\\b${t}\\b`, 'i').test(s)) return true;
  }
  return false;
}

/**
 * Heuristic title-based extraction. DEMOTED from the live scrapers' previous
 * position at the top of the chain — JSON-LD / OG / URL strategies are more
 * reliable, so this is now a fallback with `medium` confidence.
 */
export function fromTitlePattern(title: string): Candidate | null {
  if (!title) return null;

  // Pattern 1: "Mod Name by AuthorName"
  const byMatch = title.match(/^(.+?)\s+by\s+(.+)$/i);
  if (byMatch && byMatch[2].trim().length >= 2) {
    return {
      value: byMatch[2].trim(),
      confidence: 'medium',
      strategy: 'title-by',
      rawSource: title,
    };
  }

  // Pattern 2: dash-separated author. Handles latin hyphen `-`, en-dash `–`,
  // and em-dash `—`. We try BOTH orderings:
  //   "Mod Name - AuthorName"   (mod first, common on TSR/CurseForge titles)
  //   "AuthorName - Mod Name"   (creator first, common on Patreon/MHM titles
  //                              like "Hoodlem – Makiage Tattoo")
  //
  // Heuristic for creator-first form: the LEFT side is a single word (no
  // spaces), and the RIGHT side has multiple words. A multi-word left side
  // would more likely be a mod name (e.g., "Maxis Match Hair - Author").
  //
  // Each candidate is length-bounded (3..30 chars) and validated downstream
  // by the denylist, so worst case we just fall through to other strategies.
  const DASH_SEPARATOR = /\s+[-–—]\s+/;
  const dashSplit = title.split(DASH_SEPARATOR);
  if (dashSplit.length === 2) {
    const [left, right] = dashSplit.map(s => s.trim());

    // Creator-first: single-word author on the LEFT, multi-word mod on RIGHT.
    // Tried first because real-world Patreon/MHM titles use this form (e.g.
    // "Hoodlem – Makiage Tattoo"). If we tried mod-first first, the right
    // side ("Makiage Tattoo") would match as a candidate "author" and shadow
    // the real one ("Hoodlem").
    const leftIsSingleWord = /^[A-Za-z][A-Za-z0-9]+$/.test(left);
    const rightHasMultipleWords = right.split(/\s+/).length >= 2;
    if (
      leftIsSingleWord &&
      rightHasMultipleWords &&
      left.length >= 3 &&
      left.length < 30
    ) {
      return {
        value: left,
        confidence: 'medium',
        strategy: 'title-dash-creator-first',
        rawSource: title,
      };
    }

    // Mod-first: "Mod Name - AuthorName". The right side could just as easily
    // be a description tail ("CAS Close Up – No Emotions", "Controlled
    // Position – CAS Tuning Mod") as it could be a creator. Require validation
    // against a known creator before accepting — without this gate, the
    // backfill pulled in dozens of mod-feature labels as fake authors.
    if (/^[A-Z][a-zA-Z0-9\s]+$/.test(right) && right.length >= 3 && right.length < 30) {
      return {
        value: right,
        confidence: 'low',
        strategy: 'title-dash',
        rawSource: title,
        requiresValidation: true,
      };
    }
  }

  // Pattern 3: "Mod Name (AuthorName)"
  // Parens in Sims CC titles are overwhelmingly variant/version/quantity
  // markers ("(V2)", "(5 Types)", "(Left)", "(Set of 3)", "(Male)") — NOT
  // authors. Reject those cases, keep the pattern only for the rare true
  // positive like "Shiny Hair (RealCreator)".
  const parenMatch = title.match(/^(.+?)\s+\(([^)]+)\)$/);
  if (parenMatch && parenMatch[2].length > 2 && parenMatch[2].length < 30) {
    const parenContent = parenMatch[2].trim();
    if (!isLikelyVariantMarker(parenContent)) {
      return {
        value: parenContent,
        confidence: 'medium',
        strategy: 'title-paren',
        rawSource: title,
      };
    }
  }

  // Pattern 4: "Mod Name | AuthorName"
  const pipeMatch = title.match(/^(.+?)\s+\|\s+(.+)$/);
  if (pipeMatch && pipeMatch[2].length > 2 && pipeMatch[2].length < 30) {
    return {
      value: pipeMatch[2].trim(),
      confidence: 'medium',
      strategy: 'title-pipe',
      rawSource: title,
    };
  }

  return null;
}

// ============================================
// STRATEGY 5: CreatorProfile fuzzy-match (confidence BOOSTER)
// ============================================

/**
 * Validate a candidate against the "known creators" universe by checking:
 *   1. CreatorProfile.handle (Levenshtein distance <= 1)
 *   2. Existing Mod.author distinct values (case-insensitive exact match,
 *      then substring containment for tolerance against legacy "Name 12345"
 *      garbage that still embeds the real handle)
 *
 * The candidate must be at least 4 characters to avoid spurious 1-edit
 * collisions on short strings.
 *
 * This serves a dual purpose:
 *   - Confidence booster: lifts medium-confidence candidates to high.
 *   - Validation gate: when a strategy sets `requiresValidation: true`,
 *     a null return here causes the orchestrator to drop the candidate.
 *
 * Returns a Candidate with the canonical handle at HIGH confidence if found.
 */
export async function fromCreatorProfileMatch(
  candidate: string,
  prisma: PrismaClient,
): Promise<Candidate | null> {
  const normalized = candidate.trim();
  if (normalized.length < 4) return null;

  const target = normalized.toLowerCase();

  // 1. CreatorProfile.handle fuzzy match
  try {
    const profiles = await prisma.creatorProfile.findMany({
      select: { handle: true },
      take: 5000,
    });

    for (const p of profiles) {
      const handle = p.handle;
      if (!handle) continue;
      if (handle.length < 4) continue;

      const dist = levenshtein(handle.toLowerCase(), target);
      if (dist <= 1) {
        return {
          value: handle,
          confidence: 'high',
          strategy: 'creator-profile-match',
          rawSource: candidate,
        };
      }
    }
  } catch {
    // DB failure shouldn't break extraction — fall through to Mod.author.
  }

  // 2. Mod.author exact match (case-insensitive). The matched author must
  //    ITSELF pass isValidAuthor() — a "Default" value in legacy garbage
  //    rows shouldn't validate "Default" as a creator.
  try {
    const exact = await (prisma as any).mod?.findFirst?.({
      where: { author: { equals: normalized, mode: 'insensitive' } },
      select: { author: true },
    });
    if (exact?.author && isValidAuthor(exact.author)) {
      return {
        value: exact.author,
        confidence: 'high',
        strategy: 'known-author-exact',
        rawSource: candidate,
      };
    }
  } catch {
    // Either not Prisma (test stub) or transient DB error — keep going.
  }

  return null;
}

// ============================================
// ORCHESTRATOR
// ============================================

/**
 * Run URL → Title → HTML strategies (JSON-LD, OpenGraph) in priority order.
 * First non-null, non-denylisted candidate wins. Then apply the CreatorProfile
 * fuzzy-match booster. Finally gate with isValidAuthor().
 *
 * Strategy ordering rationale (revised Apr 2026):
 * URL patterns and title heuristics are the most trustworthy signals when the
 * caller is an aggregator (MHM / WWM). JSON-LD and OpenGraph on aggregator
 * pages return blog-level metadata (e.g. "Felister Moraa" for every MHM mod),
 * so HTML strategies are demoted to last place. Aggregator callers should set
 * `fetchDestination: true` so HTML strategies read the destination DOM rather
 * than the aggregator's $ (which would just reproduce the blog author bug).
 *
 * NEVER writes garbage: if the final candidate fails the denylist, returns
 * `{ value: null, confidence: null, strategy: 'denylist-rejected' }`.
 */
export async function extractAuthor(
  input: ExtractAuthorInput,
): Promise<ExtractAuthorResult> {
  const { url, title, $, prisma, fetchDestination = false } = input;

  // Resolve which DOM to feed HTML strategies. When fetchDestination is true,
  // we pull the destination page and use its cheerio. When the fetch fails or
  // the domain is unfetchable, HTML strategies simply get an empty cheerio and
  // return null — we do NOT fall back to the aggregator's $ because that's
  // the very bug we're avoiding.
  let htmlContext: CheerioAPI = $;
  if (fetchDestination) {
    const fetched = await fetchDestinationHtml(url);
    htmlContext = fetched ?? cheerio.load('');
  }

  let winner: Candidate | null = null;
  let sawDenylistRejection = false;
  // Tracks whether ANY upstream signal said the post is paywalled. Currently
  // only the Patreon public posts API can set this (returns 403 ViewForbidden
  // for paid posts). Surfaced on the final ExtractAuthorResult so callers can
  // mark the mod as paid (`isFree: false`) even when no author was recovered.
  let isPaywalled = false;

  // Strategy 0: Patreon public posts API (async, network-bound).
  // For Patreon /posts/{slug}-{id} URLs this is the most authoritative signal
  // we have — Patreon's own API tells us the creator's display name. We only
  // call it when fetchDestination is true (i.e. the caller is OK with a
  // network round-trip), and only for Patreon URLs. Costs one HTTP request
  // and is rate-limit-safe in practice (the public API has generous limits).
  if (fetchDestination) {
    try {
      const apiResult = await fromPatreonApi(url);
      if (apiResult) {
        if (apiResult.isPaywalled) isPaywalled = true;
        const apiCandidate = apiResult.candidate;
        if (apiCandidate) {
          // Normalize before validation so HTML entities / zero-width chars
          // can't slip past either the denylist or downstream consumers.
          const cleaned = cleanAuthorString(apiCandidate.value);
          // The fallback-chain inside fromPatreonApi already denylist-checks
          // each candidate, but we re-check here for defense-in-depth.
          if (cleaned.length >= 2 && isValidAuthor(cleaned)) {
            winner = { ...apiCandidate, value: cleaned };
          } else {
            sawDenylistRejection = true;
          }
        }
      }
    } catch {
      // ignore — fall through to sync strategies
    }
  }

  // Strategy 0.5: Nexus Mods public v1 API (async, network-bound).
  // For nexusmods.com/{game}/mods/{id} URLs the API at api.nexusmods.com is
  // our ONLY automated signal — the public HTML pages are Cloudflare-walled.
  // Requires NEXUS_API_KEY env var; if missing, fromNexusApi returns null
  // candidate and we fall through (Nexus URLs typically yield no useful
  // signal from the URL or title strategies, so author stays null).
  if (fetchDestination && !winner) {
    try {
      const apiResult = await fromNexusApi(url);
      if (apiResult?.candidate) {
        const cleaned = cleanAuthorString(apiResult.candidate.value);
        if (cleaned.length >= 2 && isValidAuthor(cleaned)) {
          winner = { ...apiResult.candidate, value: cleaned };
        } else {
          sawDenylistRejection = true;
        }
      }
    } catch {
      // ignore — fall through to sync strategies
    }
  }

  // Run sync strategies in priority order. We apply isValidAuthor() to each
  // strategy's output as an EARLY filter so that a garbage-but-present
  // higher-priority strategy doesn't shadow a lower-priority good one.
  //
  // fromHtmlHeuristics covers site-specific patterns (e.g. TSR's "{author}'s
  // {title}" og:title format) that generic JSON-LD / article:author don't
  // see. It runs last because URL + Title are already more reliable.
  const strategies: Array<() => Candidate | null> = [
    () => fromUrl(url),
    () => fromTitlePattern(title),
    () => fromJsonLd(htmlContext),
    () => fromOpenGraph(htmlContext),
    () => fromHtmlHeuristics(htmlContext, url),
  ];

  if (!winner) {
    for (const run of strategies) {
      const candidate = run();
      if (!candidate) continue;
      // Decode HTML entities + strip zero-width chars BEFORE the denylist
      // check. Without this a value like "Maxi Moons &#9790;" passes the
      // denylist (no patterns match the entity), reaches the DB raw, and
      // shows up that way in the UI.
      const cleaned = cleanAuthorString(candidate.value);
      if (cleaned.length < 2 || !isValidAuthor(cleaned)) {
        // Candidate existed but failed the denylist. Try the next strategy.
        sawDenylistRejection = true;
        continue;
      }
      winner = { ...candidate, value: cleaned };
      break;
    }
  }

  if (!winner) {
    return {
      value: null,
      confidence: null,
      strategy: sawDenylistRejection ? 'denylist-rejected' : 'no-strategy-matched',
      isPaywalled: isPaywalled || undefined,
    };
  }

  // 5. Booster: CreatorProfile fuzzy match (boosts to high, may replace value
  //    with the canonical handle casing). For `requiresValidation` candidates,
  //    a booster MISS means the candidate is unverified — we drop it.
  let boost: Candidate | null = null;
  try {
    boost = await fromCreatorProfileMatch(winner.value, prisma);
    if (boost) {
      winner = {
        value: cleanAuthorString(boost.value),
        confidence: 'high',
        strategy: `${winner.strategy}+${boost.strategy}`,
        rawSource: winner.rawSource,
      };
    }
  } catch {
    // ignore — extraction already has a candidate
  }

  // Enforce requiresValidation: weakly-trusted candidates (currently only
  // `url-patreon-post-slug`) must be confirmed by the CreatorProfile booster.
  // Without confirmation, drop the candidate and report the chain as having
  // ended without a verified author.
  if (winner.requiresValidation && !boost) {
    return {
      value: null,
      confidence: null,
      strategy: 'unvalidated-rejected',
      isPaywalled: isPaywalled || undefined,
    };
  }

  // FINAL GATE: denylist rejection. The booster could in theory produce a bad
  // value, so re-validate before returning.
  if (!isValidAuthor(winner.value)) {
    return {
      value: null,
      confidence: null,
      strategy: 'denylist-rejected',
      isPaywalled: isPaywalled || undefined,
    };
  }

  return {
    value: winner.value,
    confidence: winner.confidence,
    strategy: winner.strategy,
    isPaywalled: isPaywalled || undefined,
  };
}
