/**
 * URL slug → contentType matcher.
 *
 * Tokenizes a post URL slug, strips stopwords / numbers / short tokens, then
 * looks each remaining token up in FACET_VOCABULARY. If multiple content
 * types match, VOCABULARY_PRIORITY resolves the tie (most-specific wins).
 *
 * This is the **authoritative** contentType signal for new-mod ingest — per
 * PRD-mhm-wwm-extraction-fixes.md R1, a hit here is treated as high
 * confidence and MUST never be overridden by title/description keyword
 * heuristics.
 */

import { FACET_VOCABULARY, VOCABULARY_PRIORITY, type ContentType } from './facetVocabulary';

/**
 * Tokens that appear in virtually every Sims/CC post slug and carry no
 * contentType signal. Dropped during tokenization.
 */
const STOPWORDS: ReadonlySet<string> = new Set([
  'sims', '3', '4', 'cc', 'mod', 'mods',
  'best', 'top', 'free', 'pack', 'set', 'new', 'download',
]);

/**
 * Pre-index FACET_VOCABULARY as keyword → set of contentTypes for O(1)
 * lookup during match. A single keyword may belong to more than one
 * contentType in theory, though VOCABULARY_PRIORITY is the tiebreaker.
 */
const KEYWORD_INDEX: Map<string, Set<ContentType>> = (() => {
  const index = new Map<string, Set<ContentType>>();
  for (const [contentType, keywords] of Object.entries(FACET_VOCABULARY)) {
    for (const keyword of keywords) {
      const key = keyword.toLowerCase();
      const existing = index.get(key);
      if (existing) {
        existing.add(contentType);
      } else {
        index.set(key, new Set([contentType]));
      }
    }
  }
  return index;
})();

/**
 * Pre-compute priority rank: contentType → index in VOCABULARY_PRIORITY.
 * Lower index = higher priority (wins tiebreaks).
 */
const PRIORITY_RANK: Map<ContentType, number> = new Map(
  VOCABULARY_PRIORITY.map((ct, idx) => [ct, idx]),
);

/**
 * Split a URL's pathname into lowercase tokens on /, -, _ boundaries, then
 * drop stopwords, numeric-only tokens, and tokens ≤ 1 char. Accepts either
 * a full URL or a bare path.
 */
export function tokenizeSlug(url: string): string[] {
  if (!url) return [];

  let slug: string;
  try {
    // Only the pathname carries slug information; the domain / query string
    // aren't meaningful for contentType detection.
    const parsed = new URL(url);
    slug = parsed.pathname;
  } catch {
    // Not a fully-qualified URL — treat the whole input as a path.
    slug = url;
  }

  return slug
    .toLowerCase()
    .split(/[\/\-_]+/)
    .map((tok) => tok.trim())
    .filter((tok) => {
      if (tok.length <= 1) return false;
      if (STOPWORDS.has(tok)) return false;
      // Drop numeric-only tokens (years, counts, etc.)
      if (/^\d+$/.test(tok)) return false;
      return true;
    });
}

export interface SlugMatchResult {
  contentType: ContentType;
  confidence: 'high';
  strategy: 'url-slug-keyword';
}

/**
 * Match a URL slug against FACET_VOCABULARY. Returns the best-priority hit
 * (or null if no tokens match). A returned match is always high confidence
 * — see PRD R1.
 */
export function matchContentTypeFromSlug(url: string): SlugMatchResult | null {
  const tokens = tokenizeSlug(url);
  if (tokens.length === 0) return null;

  // Collect every contentType any surviving token maps to.
  const candidates = new Set<ContentType>();
  for (const token of tokens) {
    const hits = KEYWORD_INDEX.get(token);
    if (hits) {
      hits.forEach((ct) => candidates.add(ct));
    }
  }

  if (candidates.size === 0) return null;

  // Pick the candidate with the lowest priority rank (most specific).
  // Candidates that don't appear in VOCABULARY_PRIORITY get a sentinel rank
  // that pushes them to the back.
  let best: ContentType | null = null;
  let bestRank = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate) => {
    const rank = PRIORITY_RANK.get(candidate) ?? Number.MAX_SAFE_INTEGER;
    if (rank < bestRank) {
      bestRank = rank;
      best = candidate;
    }
  });

  if (!best) return null;

  return {
    contentType: best,
    confidence: 'high',
    strategy: 'url-slug-keyword',
  };
}
