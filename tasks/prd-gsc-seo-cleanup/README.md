# GSC SEO Cleanup - Master PRD List

Generated: 2026-02-17 from Google Search Console data (Jan 18 - Feb 17, 2026)

## Executive Summary

Eight SEO issues identified from GSC data analysis. PRDs 5 & 6 deployed Feb 19. PRDs 7 & 8 added Feb 20 from updated GSC data.

**Priority order** (highest impact first):

| # | PRD | Impact | Effort | Status |
|---|-----|--------|--------|--------|
| 1 | Request Reindexing of Canonical URLs | Critical - stops signal dilution | Low | In progress (manual GSC) |
| 2 | Meta Title/Description Optimization for 0-CTR Pages | High - 105 quick wins | Medium | Done on staging |
| 3 | Duplicate/Competing URL Consolidation | High - merges split authority | Medium | Superseded by PRD 7 |
| 4 | Fragment URL Deindexing | Medium - 3+ fragment URLs indexed | Low | No change needed |
| 5 | Homepage & Next.js Page SEO Hardening | Medium - 12.5K impressions | Medium | **Deployed** (Feb 19) |
| 6 | Sitemap Enhancement & Cleanup | Medium - improves crawl efficiency | Low | **Deployed** (Feb 19) |
| 7 | Content Cannibalization Fix | High - 6 duplicate groups | Low | **New** (Feb 20) |
| 8 | /homepage/ Redirect to / | Medium - homepage signal dilution | Low | **New** (Feb 20) |

---

## PRD 1: Request Reindexing of Canonical URLs

### Problem
Google still has 12+ pages indexed under `blog.musthavemods.com` despite the canonical URL rewrite middleware being deployed. These blog-domain pages collectively have **3,500+ impressions** but are splitting ranking signals with their `musthavemods.com` counterparts.

### Top Offending Pages (by impressions)

| blog.musthavemods.com URL | Impressions | Clicks | Position |
|---------------------------|-------------|--------|----------|
| /sims-4-cas-cheat/ | 1,028 | 0 | 14.0 |
| /sims-4-body-presets/ | 927 | 53 | 8.1 |
| /sims-4-trait-mods/ | 650 | 7 | 12.4 |
| /sims-4-custom-aspirations/ | 158 | 7 | 13.2 |
| /how-to-have-triplets-in-sims-4/ | 130 | 0 | 9.6 |
| /sims-4-no-ea-eyelashes/ | 115 | 1 | 10.8 |
| /sims-4-satisfaction-points-cheat/ | 114 | 0 | 15.6 |
| /sims-4-build-challenges/ | 101 | 2 | 9.6 |
| /how-to-edit-uneditable-lots-in-sims-4/ | 163 | 0 | 10.0 |
| /sims-4-curseforge/ | 49 | 0 | 8.1 |
| /sims-4-clutter-cc/ | 51 | 0 | 8.6 |
| /sims-4-cc-finds-for-january/ | 46 | 7 | 5.4 |
| /sims-4-pixie-cut-cc/ | 45 | 4 | 6.2 |
| /sims-4-cc/ | 42 | 2 | 12.3 |
| /sims-4-broken-after-update/ | 19 | 0 | 12.3 |
| /sims-4-family-poses/ | 27 | 3 | 8.9 |
| /privacy-policy/ | 15 | 0 | 8.1 |

### Action Items
1. Use GSC URL Inspection API to request reindexing of each `musthavemods.com` equivalent
2. Verify each `musthavemods.com` version has proper canonical tags (already confirmed deployed)
3. Monitor over next 2-4 weeks for Google to migrate indexed URLs

### Acceptance Criteria
- [ ] All 17 musthavemods.com equivalents submitted for reindexing via GSC API
- [ ] Confirmed canonical tags are correct on each page
- [ ] Created tracking list of submitted URLs with dates

---

## PRD 2: Meta Title/Description Optimization for High-Volume 0-CTR Pages

### Problem
105 query/page combinations identified where the site ranks position 3-20 with significant impressions but extremely low or 0% CTR. This means Google is showing the page but users aren't clicking because the title/description aren't compelling.

### Highest-Impact Targets (sorted by potential click gain)

| Query | Page | Position | Impressions | CTR | Potential +Clicks |
|-------|------|----------|-------------|-----|-------------------|
| career megapack sims 4 | /sims-4-career-mods/ | 9.4 | 186 | 1.08% | +7 |
| wicked whims exception | /sims-4-wicked-whims-exception-error/ | 10.4 | 119 | 0% | +6 |
| wicked whims exception error 2025 | /sims-4-wicked-whims-exception-error/ | 9.3 | 152 | 1.97% | +5 |
| sims 4 magic beans | /sims-4-magic-beans/ | 3.5 | 93 | 0% | +5 |
| sims 4 wedding dress cc | /best-sims-4-wedding-cc/ | 12.3 | 90 | 2.22% | +3 |
| sims delivery error | /sims-4-delivery-express-error/ | 9.8 | 108 | 1.85% | +3 |
| teen jobs collection sims 4 | /sims-4-teen-jobs/ | 10.4 | 82 | 1.22% | +3 |
| how to get magic beans sims 4 | /sims-4-magic-beans/ | 7.6 | 59 | 0% | +3 |
| sims 4 must have mods | / (homepage) | 8.1 | 450 | 4.67% | +2 |

### Approach
These are WordPress blog posts - meta titles/descriptions are controlled by Rank Math SEO plugin.

**Option A (WordPress SSH - staging only):**
Update Rank Math meta via WP-CLI:
```bash
wp post meta update <post_id> rank_math_title "Optimized Title | Must Have Mods"
wp post meta update <post_id> rank_math_description "Compelling description targeting the query..."
```

**Option B (Middleware override):**
Add page-specific meta tag overrides in the middleware `rewriteHtml()` function for the highest-impact pages.

### Priority Pages for Title/Description Rewrite

1. `/sims-4-magic-beans/` - Position 3.5, 0% CTR across 170+ impressions for 4 query variants
2. `/sims-4-wicked-whims-exception-error/` - Position 9-12, low CTR across 540+ impressions for 7 query variants
3. `/sims-4-career-mods/` - Position 9.4, 1% CTR, 186 impressions
4. `/sims-4-teen-jobs/` - Position 8-10, 0-3% CTR across 216+ impressions for 5 variants
5. `/best-sims-4-wedding-cc/` - Position 12-15, 0-2% CTR across 234+ impressions for 4 variants
6. `/sims-4-delivery-express-error/` - Position 9.8, 1.85% CTR, 108 impressions
7. `/sims-4-teen-mods/` - Position 9-15, 0% CTR across 144+ impressions
8. `/best-woohoo-mods-sims-4-ultimate-guide/` - Position 7-16, 0-3% CTR across 101+ impressions
9. `/sims-4-y2k-cc-finds-for-2025/` - Position 10.6, 0% CTR, 46 impressions
10. `/sims-4-food-mods/` - Position 7.6, 0% CTR, 31 impressions

### Acceptance Criteria
- [ ] Top 10 pages have optimized meta titles (include target query, under 60 chars)
- [ ] Top 10 pages have optimized meta descriptions (include CTA, under 155 chars)
- [ ] No duplicate titles across the site
- [ ] Titles match user search intent (informational vs transactional)

---

## PRD 3: Duplicate/Competing URL Consolidation

### Problem
Several topics have multiple pages competing for the same queries, diluting ranking signals.

### Identified Duplicates

| Topic | URL A (primary) | URL B (secondary) | Combined Impressions |
|-------|-----------------|-------------------|---------------------|
| Body Presets | /sims-4-male-body-presets-cc/ (2,773 imp) | /sims-4-body-presets-2/ (1,094 imp) AND /sims-4-body-presets/ (1,030 imp) | 4,897 |
| Wedding CC | /best-sims-4-wedding-cc/ (1,060 imp) | /27-must-have-sims-4-wedding-cc-2024/ (434 imp) | 1,494 |
| CC Clothes Packs | /sims-4-cc-clothes-packs/ (3,024 imp) | /sims-4-cc-clothes-packs-2025/ (869 imp) | 3,893 |
| Custom Aspirations | /sims-4-custom-aspirations/ (610 imp) | blog version (158 imp) | 768 |
| Skin Details | /sims-4-cc-skin-details/ (1,420 imp) | /sims-4-male-skin-details/ (2,178 imp) AND /sims-4-skin-overlay/ (4,200 imp) | 7,798 |

### Action Items
1. For each pair, choose the canonical (primary) URL
2. Add `<link rel="canonical" href="primary">` to the secondary page via Rank Math
3. Optionally add 301 redirects from secondary to primary (WordPress level)
4. Update internal links to point to primary URL

### Acceptance Criteria
- [ ] Each duplicate pair has a designated primary URL
- [ ] Secondary URLs have canonical tags pointing to primary
- [ ] Internal links updated to use primary URLs
- [ ] No self-competing pages for the same query clusters

---

## PRD 4: Fragment URL Deindexing

### Problem
Google is indexing fragment URLs as separate pages, creating duplicate content signals.

### Affected URLs
| Indexed URL | Impressions | Position |
|-------------|-------------|----------|
| /sims-4-teen-mods/#cas | 23 | 8.9 |
| /sims-4-teen-mods/#gameplay | 23 | 8.9 |
| /sims-4-teen-mods/#traits | 23 | 8.9 |

### Action Items
1. Add canonical tag on the base URL `/sims-4-teen-mods/` (Rank Math should handle this)
2. Verify the middleware passes through the Rank Math canonical correctly
3. Consider adding `<meta name="robots" content="noindex">` for fragment-specific requests (middleware level)

### Acceptance Criteria
- [ ] Base URL `/sims-4-teen-mods/` has canonical pointing to itself (no fragment)
- [ ] Fragment URLs not generating separate index entries within 4 weeks
- [ ] No new fragment URLs appearing in GSC

---

## PRD 5: Homepage & Next.js App Page SEO Hardening

### Problem
The homepage receives 12,501 impressions but averages position 39.3 — it ranks well for branded terms ("musthavemods", position 1.4) but poorly for generic terms ("sims 4 mods", position 55.5).

### Key Stats
| Query | Impressions | Clicks | CTR | Position |
|-------|-------------|--------|-----|----------|
| musthavemods | 280 | 213 | 76% | 1.4 |
| must have mods | 408 | 143 | 35% | 4.6 |
| sims 4 mods | 783 | 39 | 5% | 55.5 |
| sims 4 cc | 359 | 7 | 2% | 66.1 |
| best sims 4 mods | 144 | 3 | 2% | 49.0 |
| sims 4 must have mods | 458 | 23 | 5% | 9.0 |

### Action Items

**Homepage (`app/page.tsx` / `app/layout.tsx`):**
1. Optimize `<title>` to target "Sims 4 Mods" more directly (currently: "MustHaveMods - Premium Sims 4 Mods & Custom Content Discovery" — too long, keyword not prominent enough)
2. Improve meta description to include action verbs and key queries
3. Ensure structured data (JSON-LD) is comprehensive and accurate
4. Add more indexable text content on the homepage (currently search-heavy, light on crawlable text)

**Game pages (`app/games/[game]/page.tsx`):**
1. Verify each game page has unique, optimized title and description
2. Ensure game pages have proper canonical URLs
3. Add structured data for game-specific content

### Acceptance Criteria
- [ ] Homepage title optimized (under 60 chars, primary keyword first)
- [ ] Homepage description optimized (under 155 chars, includes CTA)
- [ ] All 4 game pages have unique titles and descriptions
- [ ] JSON-LD structured data validated
- [ ] No duplicate titles between homepage and game pages

---

## PRD 6: Sitemap Enhancement & Cleanup

### Problem
The current sitemap structure (`/sitemap.xml`) includes both Next.js and WordPress blog sitemaps, but:
1. WordPress-side sitemaps (`wp-sitemap.xml`) return 404 through the proxy
2. Blog sitemaps may still reference `blog.musthavemods.com` if they bypass the middleware
3. No clear signal to Google about which URLs are canonical

### Action Items
1. Verify all blog post URLs in `sitemap-blog-posts.xml` use `musthavemods.com` (not `blog.musthavemods.com`)
2. Ensure `wp-sitemap.xml` and `wp-sitemap-posts-post-*.xml` either work or return proper 404
3. Add `<lastmod>` dates to blog sitemaps for better crawl prioritization
4. Consider adding `<priority>` hints for high-value pages

### Acceptance Criteria
- [ ] All sitemap URLs use `musthavemods.com` canonical domain
- [ ] No broken sitemap URLs
- [ ] High-value pages have recent `<lastmod>` dates
- [ ] Sitemap submitted to GSC (if not already)

---

## Execution Plan

### Phase 1: Immediate (Tonight)
- **PRD 1**: Request reindexing via GSC API (agent can do this with MCP tools)
- **PRD 5**: Homepage SEO hardening (code changes to Next.js app)
- **PRD 4**: Fragment URL fix (middleware change)

### Phase 2: WordPress Meta Optimization
- **PRD 2**: Meta title/description optimization (requires WordPress SSH access)
- **PRD 3**: Duplicate URL consolidation (requires WordPress canonical/redirect setup)

### Phase 3: Infrastructure
- **PRD 6**: Sitemap cleanup (code changes + verification)

### Estimated Impact
- **PRD 1**: ~90 additional clicks/month (from consolidating blog subdomain signals)
- **PRD 2**: ~80 additional clicks/month (from improving CTR on 105 quick wins)
- **PRD 3**: ~50 additional clicks/month (from consolidating duplicate page authority)
- **PRD 4**: Minimal direct traffic, prevents further signal dilution
- **PRD 5**: ~30 additional clicks/month (from improved generic keyword rankings)
- **PRD 6**: Indirect improvement to crawl efficiency and indexing speed
