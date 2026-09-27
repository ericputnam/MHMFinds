/**
 * The WordPress guide inventory, in one place.
 *
 * Two surfaces need the same list of blog guides and the same exclusions:
 * `/sitemap-blog-posts.xml` (what Google may crawl) and `/llms-full.txt`
 * (what an answer engine may cite). Both used to keep their own copy of
 * `REDIRECTED_POST_PATHS` with a "keep in sync" comment; a comment is not a
 * gate, so the constant lives here and both import it.
 *
 * `fetchAllWpGuides()` paginates the WP REST API and reports whether it
 * finished. A zero-rows check is not enough: a fetch capped at N pages returns
 * a plausible, wrong population with no error at all, so callers get
 * `complete` and must degrade visibly when it is false — never a 500.
 */

export const APEX = 'https://musthavemods.com';
const BLOG_ORIGIN_RE = /https?:\/\/blog\.musthavemods\.com/g;

export const WP_POSTS_ENDPOINT = 'https://blog.musthavemods.com/wp-json/wp/v2/posts';

/**
 * Legacy posts whose apex URLs 301 to a collection page (vercel.json). A
 * cite-able or crawl-able list must not hand anyone a URL that redirects.
 *
 * The four body-preset listicles were un-redirected in 2026-07 and
 * /sims-4-pregnancy-mods/ + /sims-4-y2k-cc/ in 2026-09 (PR #63, E21) because
 * the blog copy outranked the collection page — they are NOT in this list and
 * must stay cite-able.
 */
export const REDIRECTED_POST_PATHS: readonly string[] = [
  '/sims-4-female-clothes-cc/',
  '/sims-4-male-clothes-cc/',
  '/sims-4-cc-skin-details/',
  '/sims-4-gallery-poses/',
  '/sims-4-goth-cc/',
  '/sims-4-cottagecore-cc/',
];

/** blog.musthavemods.com → musthavemods.com. The apex is the canonical host. */
export function toApexUrl(link: string): string {
  return (link || '').replace(BLOG_ORIGIN_RE, APEX);
}

export function isRedirectedPostUrl(url: string): boolean {
  return REDIRECTED_POST_PATHS.some((p) => url.endsWith(p));
}

export interface WpGuide {
  /** Raw `title.rendered` — still HTML-entity encoded; the caller decodes. */
  titleRendered: string;
  /** Canonical apex URL, trailing slash as WordPress emits it. */
  url: string;
  /** YYYY-MM-DD from `date_gmt`, or '' when absent. */
  date: string;
  /** Raw `modified_gmt` (YYYY-MM-DDTHH:MM:SS, UTC) — only requested by fetchWpGuidesModifiedSince. */
  modifiedGmt?: string;
}

export interface WpGuideFetch {
  guides: WpGuide[];
  /** False when a page errored, the cap was hit, or WP never told us the total. */
  complete: boolean;
  pagesFetched: number;
  totalPages: number | null;
}

export const WP_GUIDES_PER_PAGE = 100;
/** 682 posts = 7 pages on 2026-09-21. The cap is headroom, not a target. */
export const WP_GUIDES_MAX_PAGES = 15;

type FetchLike = typeof fetch;

/**
 * Every published guide, apex-rewritten, redirected slugs dropped.
 * Never throws: a partial or empty result with `complete: false` is the
 * failure mode, so a crawler surface can still answer 200.
 */
export async function fetchAllWpGuides(options?: {
  maxPages?: number;
  revalidate?: number;
  fetchImpl?: FetchLike;
}): Promise<WpGuideFetch> {
  return fetchWpGuidesPaged(options ?? {});
}

/**
 * `modified_after` is compared by WordPress against `post_modified`, which is
 * the SITE's local time, not UTC. Asking for one extra day and re-checking
 * `modified_gmt` client-side makes the window exact whatever the site's
 * timezone setting is. Format: UTC wall clock, no zone suffix.
 */
export function wpModifiedAfterParam(since: Date): string {
  return new Date(since.getTime() - 24 * 3600e3).toISOString().replace(/\.\d{3}Z$/, '');
}

/**
 * Guides published or edited at/after `since` (UTC), apex-rewritten,
 * redirected slugs dropped (E121 — the IndexNow `--guides` leg). An empty
 * window is a complete answer; a failed page is not. Never throws.
 */
export async function fetchWpGuidesModifiedSince(
  since: Date,
  options?: { maxPages?: number; fetchImpl?: FetchLike },
): Promise<WpGuideFetch> {
  return fetchWpGuidesPaged({ ...(options ?? {}), revalidate: 0, modifiedSince: since });
}

async function fetchWpGuidesPaged(options: {
  maxPages?: number;
  revalidate?: number;
  fetchImpl?: FetchLike;
  modifiedSince?: Date;
}): Promise<WpGuideFetch> {
  const maxPages = options.maxPages ?? WP_GUIDES_MAX_PAGES;
  const revalidate = options.revalidate ?? 3600;
  const doFetch = options.fetchImpl ?? fetch;
  const since = options.modifiedSince;
  const query = since
    ? `&_fields=title,link,date_gmt,modified_gmt&modified_after=${wpModifiedAfterParam(since)}&orderby=modified&order=desc`
    : '&_fields=title,link,date_gmt';
  const sinceMs = since ? since.getTime() : null;

  const guides: WpGuide[] = [];
  const seen = new Set<string>();
  let pagesFetched = 0;
  let totalPages: number | null = null;
  let errored = false;

  for (let page = 1; page <= maxPages; page++) {
    let res: Response;
    try {
      res = await doFetch(
        `${WP_POSTS_ENDPOINT}?per_page=${WP_GUIDES_PER_PAGE}&page=${page}${query}`,
        (revalidate > 0 ? { next: { revalidate } } : { cache: 'no-store' }) as RequestInit,
      );
    } catch (error) {
      console.error(`[wpGuides] fetch threw on page ${page}:`, error);
      errored = true;
      break;
    }

    if (!res?.ok) {
      // 400 past the last page is WordPress's normal end-of-list, not an error.
      if (res?.status !== 400 || page === 1) errored = true;
      break;
    }

    let posts: Array<{ title?: { rendered?: string }; link?: string; date_gmt?: string; modified_gmt?: string }>;
    try {
      posts = (await res.json()) as typeof posts;
    } catch (error) {
      console.error(`[wpGuides] bad JSON on page ${page}:`, error);
      errored = true;
      break;
    }
    if (!Array.isArray(posts)) {
      errored = true;
      break;
    }

    pagesFetched = page;

    for (const p of posts) {
      const url = toApexUrl(p.link ?? '');
      const titleRendered = p.title?.rendered ?? '';
      if (!url || !titleRendered) continue;
      if (isRedirectedPostUrl(url)) continue;
      if (seen.has(url)) continue;
      if (sinceMs !== null) {
        const modifiedMs = Date.parse(`${p.modified_gmt ?? ''}Z`);
        if (!Number.isFinite(modifiedMs) || modifiedMs < sinceMs) continue;
      }
      seen.add(url);
      const guide: WpGuide = { titleRendered, url, date: (p.date_gmt ?? '').split('T')[0] };
      if (since) guide.modifiedGmt = p.modified_gmt ?? '';
      guides.push(guide);
    }

    const headerTotal = Number(res.headers?.get?.('X-WP-TotalPages') ?? '');
    if (Number.isFinite(headerTotal) && headerTotal > 0) totalPages = headerTotal;

    if (posts.length < WP_GUIDES_PER_PAGE) break;
    if (totalPages !== null && page >= totalPages) break;
  }

  const capHit = pagesFetched >= maxPages && (totalPages === null || totalPages > maxPages);
  // A full-inventory read that returns nothing is broken; a "modified since" read may legitimately be empty.
  const complete = !errored && !capHit && (guides.length > 0 || since !== undefined);

  return { guides, complete, pagesFetched, totalPages };
}
