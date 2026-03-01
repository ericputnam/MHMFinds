# SEO Guide

Comprehensive SEO reference for MustHaveMods. Covers meta tag standards, technical SEO configuration, Google Search Console workflows, and known issues.

---

## Meta Title Rules

1. **Primary keyword near the front.** Lead with the search term users type, not the brand name.
   - Good: `Sims 4 Mods & CC - Browse 10,000+ Custom Content | MustHaveMods`
   - Bad: `MustHaveMods - Premium Sims 4 Mods & Custom Content Discovery`

2. **Under 60 characters.** Google truncates titles beyond ~60 chars in SERPs. Measure before deploying.

3. **Include quantity signals.** Numbers like "10,000+" or "15,000+" communicate breadth and build click confidence.

4. **Match user search intent.** Action words that reflect what the user wants to do:
   - Prefer: "Find", "Browse", "Search", "Download"
   - Avoid: "Discover", "Premium", "Ultimate"

5. **Meta descriptions should be action-oriented.** Under 155 characters. Mention specific filterable content types and include a call to action.
   - Example: `Filter by hair, clothes, furniture, gameplay mods, and more. Free CC from top creators.`

6. **No duplicate titles across the site.** Every page needs a unique title. Game pages, blog posts, and the homepage must all differ.

---

## robots.txt Canonical Rewriting

WordPress generates `robots.txt` with `blog.musthavemods.com` sitemap references. Since the blog is proxied through `musthavemods.com`, these references point search engines to the wrong domain.

**How it works** (`app/robots.txt/route.ts`):
- Fetches the WordPress-generated `robots.txt`
- Replaces all `blog.musthavemods.com` references with `musthavemods.com`
- Ensures the main sitemap (`musthavemods.com/sitemap.xml`) is referenced
- If the main sitemap URL is missing, it appends a `Sitemap:` directive

```typescript
// Simplified logic in app/robots.txt/route.ts
let robotsContent = await response.text();
robotsContent = robotsContent.replace(/https?:\/\/blog\.musthavemods\.com/g, 'https://musthavemods.com');
if (!robotsContent.includes('musthavemods.com/sitemap.xml')) {
  robotsContent += '\nSitemap: https://musthavemods.com/sitemap.xml\n';
}
```

**Rule**: When proxying WordPress through a different domain, always rewrite `robots.txt` and `sitemap.xml` to use the canonical domain.

---

## Sitemap

The Next.js sitemap (`app/sitemap.ts`) includes:

- `<changefreq>` tags indicating how often pages change (e.g., `daily` for homepage, `weekly` for game pages)
- `<priority>` values signaling relative importance to crawlers (e.g., `1.0` for homepage, `0.8` for game pages)
- Game pages explicitly listed:
  - `/games/sims-4`
  - `/games/stardew-valley`
  - `/games/minecraft`

WordPress sitemaps are also proxied through the middleware, with all `blog.musthavemods.com` references rewritten to `musthavemods.com`.

---

## GSC-Driven SEO Workflow

A systematic process for identifying and fixing SEO issues using Google Search Console data.

### Step 1: Pull Performance Data

Extract from GSC: queries, pages, impressions, clicks, CTR, and average position. Focus on the last 28 days for trend accuracy.

### Step 2: Identify Quick Wins

**High impressions + low CTR = title/description problem.**

These are pages Google already ranks but users do not click. Fixing the title and description is the fastest way to gain clicks without building new content or links.

Example criteria:
- Position 3-20 (page 1-2 of results)
- 50+ impressions in the period
- CTR below 3%

### Step 3: Identify Structural Issues

- **Duplicate URLs competing for the same queries** -- splits ranking signals between pages
- **Fragment URLs indexed** (e.g., `/page/#section`) -- creates phantom duplicate content
- **Old domain URLs still indexed** -- dilutes authority if migration is incomplete

### Step 4: Prioritize by Estimated Click Gain

Formula: `impressions x (expected CTR at position - current CTR)`

Expected CTR benchmarks by position:
| Position | Expected CTR |
|----------|-------------|
| 1 | 25-30% |
| 2 | 15-18% |
| 3 | 10-12% |
| 4-5 | 6-8% |
| 6-10 | 3-5% |

### Step 5: Group into PRDs by Effort Type

- **Code changes** (Next.js meta tags, middleware, sitemap)
- **WordPress changes** (Rank Math meta, canonical tags via WP-CLI)
- **Manual GSC actions** (reindexing requests, URL removal)

All PRDs for this project live in `tasks/prd-gsc-seo-cleanup/README.md`.

### Current PRD Status

| # | PRD | Status |
|---|-----|--------|
| 1 | Request Reindexing of Canonical URLs | In progress (manual GSC) |
| 2 | Meta Title/Description for 0-CTR Pages | Done on staging |
| 3 | Duplicate URL Consolidation | Superseded by PRD 7 |
| 4 | Fragment URL Deindexing | No change needed |
| 5 | Homepage & Next.js Page SEO Hardening | Deployed (Feb 19) |
| 6 | Sitemap Enhancement & Cleanup | Deployed (Feb 19) |
| 7 | Content Cannibalization Fix | New (Feb 20) |
| 8 | /homepage/ Redirect to / | New (Feb 20) |

---

## Content Cannibalization (WordPress `-2` Suffixes)

### The Problem

WordPress auto-appends `-2` to a post slug when a slug already exists. Both the original and the `-2` version self-canonicalize, so Google splits ranking signals between them instead of consolidating authority.

### How to Fix

Set a Rank Math canonical URL on the secondary page pointing to the primary page via WP-CLI:

```bash
# Find the post ID of the secondary page
wp post list --post_type=post --fields=ID,post_name | grep "sims-4-body-presets$"

# Set canonical on secondary pointing to primary
wp post meta update <ID> rank_math_canonical_url "https://musthavemods.com/<primary-slug>/"
```

### How to Choose the Primary URL

Pick the URL with **better position and more clicks** in GSC data. The `-2` version is often the newer, more complete content and frequently outperforms the original.

### Verification

```bash
curl -sL "https://musthavemods.com/<secondary-slug>/" | grep canonical
# Expected: <link rel="canonical" href="https://musthavemods.com/<primary-slug>/" />
```

After setting canonicals, request reindexing of the secondary URLs in the GSC web UI.

### Known Duplicate Groups (6 total)

| Secondary URL | Primary URL (canonical target) |
|---------------|-------------------------------|
| `/sims-4-body-presets/` | `/sims-4-body-presets-2/` |
| `/sims-4-cc-clothes-packs/` | `/sims-4-cc-clothes-packs-2025/` |
| `/sims-4-goth-cc/` | `/sims-4-goth-cc-2/` |
| `/sims-4-cc/` | `/sims-4-cc-2/` |
| `/sims-4-eyelashes-cc/` | `/sims-4-eyelashes-cc-2/` |
| `/15-must-have-sims-4-woohoo-mods-for-2025/` | `/best-woohoo-mods-sims-4-ultimate-guide/` |

### Prevention

When creating new WordPress posts, always check if a similar slug already exists. If WordPress appends `-2`, investigate whether the old post should be updated instead of creating a duplicate.

---

## `/homepage/` Signal Dilution

### The Problem

The WordPress front page lives at `/homepage/` (page-id-25). The Next.js app serves the actual homepage at `/`. Both are indexed by Google as separate pages, splitting homepage ranking signals.

| URL | Source | Indexed? |
|-----|--------|----------|
| `musthavemods.com/` | Next.js | Yes |
| `musthavemods.com/homepage/` | WordPress (proxied) | Yes |

### The Fix

Add a 301 redirect in `middleware.ts` before the WordPress proxy logic:

```typescript
if (pathname === '/homepage' || pathname === '/homepage/') {
  return NextResponse.redirect(new URL('/', request.url), 301);
}
```

### Verification

```bash
# Should return 301 with Location: https://musthavemods.com/
curl -sI "https://musthavemods.com/homepage/"

# Should return 200
curl -sI "https://musthavemods.com/"
```

After deploying, request reindexing of `/homepage/` in GSC.

---

## Domain Migration (blog.musthavemods.com to musthavemods.com)

### Status

The blog was migrated from `blog.musthavemods.com` to be served through `musthavemods.com` via Vercel rewrites and Next.js middleware. As of Feb 2026, migration is nearly complete -- down to approximately 1 URL still receiving clicks on the old subdomain (from 17+).

### How the Middleware Handles It

The middleware (`middleware.ts`) proxies WordPress HTML requests and performs these rewrites:

**In `<head>`**:
- Rewrites ALL `blog.musthavemods.com` references to `musthavemods.com` (canonical URLs, og:url, oEmbed)
- Strips `noindex` meta tags that WordPress may inject
- Strips `x-robots-tag` response headers

**In `<body>`**:
- Rewrites only `href=` links (navigation links)
- Does NOT rewrite `src=` links (images, scripts, CSS stay on the blog CDN)

**In XML** (sitemaps, RSS feeds):
- Rewrites all domain references throughout

### Key Implementation Details

- Sends `X-Forwarded-Host: musthavemods.com` header to WordPress
- Drops `content-length`, `content-encoding`, `transfer-encoding` headers from the WordPress response (body is rewritten, so original sizes are invalid)
- URL-encoded references (`https%3A%2F%2Fblog.musthavemods.com`) are also rewritten (oEmbed discovery links use encoded URLs)

### Top Pages That Were on the Old Domain

| blog.musthavemods.com URL | Impressions | Status |
|---------------------------|-------------|--------|
| /sims-4-cas-cheat/ | 1,028 | Migrating |
| /sims-4-body-presets/ | 927 | Deindexing (noindex confirmed) |
| /sims-4-trait-mods/ | 650 | Submitted and indexed on new domain |
| /sims-4-custom-aspirations/ | 158 | Migrating |

---

## Vercel Domain Configuration

| Setting | Value |
|---------|-------|
| Primary domain | `musthavemods.com` (non-www) |
| www redirect | `www.musthavemods.com` 308 redirect to `musthavemods.com` |
| Vercel project | `mhm-finds-dw5l` |
| Vercel team | `team_0Fnq8KTqbPQ9ZhfhGQBHAbTC` |

**Non-www is canonical.** All canonical URLs, sitemaps, and meta tags must use `musthavemods.com` (not `www.musthavemods.com`). A mismatch between the serving domain and canonical URLs causes Google to report "Redirect error" in GSC.

### CLI Domain Management

The Vercel CLI cannot change domain redirect settings. Use the REST API:

```bash
PATCH /v9/projects/{projectId}/domains/{domain}?teamId={teamId}
Body: {"redirect": null}
# or
Body: {"redirect": "musthavemods.com", "redirectStatusCode": 308}
```

Auth token location: `~/Library/Application Support/com.vercel.cli/auth.json`

---

## Key GSC Gotchas

### URL Inspection API Shows Cached Data

The URL Inspection API returns the last crawl results, not the live state of the page. After deploying changes (canonical tags, redirects, meta titles), the API will continue showing old data until Google re-crawls the page.

### Cannot Request Reindexing via API

Only URL inspection is available programmatically. Reindexing requests must be submitted manually through the GSC web UI (URL Inspection > Request Indexing).

### Non-www / www Canonical Mismatch

If canonical URLs use `musthavemods.com` but the domain serves from `www.musthavemods.com`, Google reports a "Redirect error" because it detects a mismatch between the canonical and the final URL after redirects. Always ensure the serving domain matches the canonical domain.

### vercel.json Catch-All Rewrites Bypass Middleware

Vercel processes requests in this order:

1. `vercel.json` rewrites (edge layer) -- runs FIRST
2. Next.js middleware -- runs SECOND, only for requests NOT already handled by edge rewrites

If a `vercel.json` rewrite matches an HTML page, the request goes directly to the destination and **never reaches middleware**. This means canonical rewriting, noindex stripping, and other SEO fixes in middleware will not run.

**Rule**: Only keep static asset rewrites (`/wp-content/*`, `/wp-includes/*`) in `vercel.json`. All HTML-serving WordPress routes must go through middleware.

### noindex Stripping

Confirmed working as of Feb 19, 2026. The page `/sims-4-trait-mods/` was re-crawled and is now "Submitted and indexed" after the middleware began stripping noindex tags.

---

## WordPress Proxy: SEO-Critical Middleware Behavior

The middleware detects WordPress vs Next.js routes using a `NEXTJS_PREFIXES` set. Any path whose first segment is not in the set (and is not a file extension) is proxied to WordPress.

```
Known Next.js prefixes:
api, admin, creators, mods, account, sign-in, submit-mod,
about, privacy, terms, games, go, _next, sitemap, manifest
```

**Adding new Next.js routes**: If you create a new top-level Next.js route (e.g., `/collections`), add its prefix to the `NEXTJS_PREFIXES` set in `middleware.ts`. Otherwise, middleware will proxy it to WordPress and the Next.js page will never render.

---

## Appendix: Meta Title/Description Optimization Targets

High-impact pages identified from GSC data where title/description changes would yield the most additional clicks. These are WordPress blog posts managed via Rank Math.

| Page | Target Query | Position | Impressions | Current CTR | Estimated +Clicks |
|------|-------------|----------|-------------|-------------|-------------------|
| /sims-4-career-mods/ | career megapack sims 4 | 9.4 | 186 | 1.08% | +7 |
| /sims-4-wicked-whims-exception-error/ | wicked whims exception | 10.4 | 119 | 0% | +6 |
| /sims-4-magic-beans/ | sims 4 magic beans | 3.5 | 93 | 0% | +5 |
| /best-sims-4-wedding-cc/ | sims 4 wedding dress cc | 12.3 | 90 | 2.22% | +3 |
| /sims-4-delivery-express-error/ | sims delivery error | 9.8 | 108 | 1.85% | +3 |
| /sims-4-teen-jobs/ | teen jobs collection sims 4 | 10.4 | 82 | 1.22% | +3 |

Update meta via WP-CLI:

```bash
wp post meta update <post_id> rank_math_title "Optimized Title | Must Have Mods"
wp post meta update <post_id> rank_math_description "Compelling description targeting the query..."
```
