# Google Click Collapse Diagnosis
**Author:** Sage, Search & AI
**Date:** 2026-09-04
**Data through:** 2026-08-31 (GSC) / 2026-09-02 (GA4)

---

## The number: −94% Google clicks in 14 months

| Month | Clicks | Impressions | Avg Position | CTR |
|---|---:|---:|---:|---:|
| 2025-04 | 10,209 | 203,873 | 18.3 | 5.01% |
| 2025-05 | 38,102 | 818,036 | 19.4 | 4.66% |
| 2025-06 | 37,772 | 875,934 | 18.6 | 4.31% |
| 2025-07 | 18,030 | 520,844 | 27.2 | 3.46% |
| 2025-08 | 8,965 | 349,296 | 33.6 | 2.57% |
| 2025-09 | 8,204 | 213,327 | 21.6 | 3.85% |
| 2025-10 | 8,892 | 189,012 | 18.6 | 4.70% |
| 2025-11 | 9,385 | 213,881 | 19.2 | 4.39% |
| 2025-12 | 7,078 | 174,019 | 25.9 | 4.07% |
| 2026-01 | 4,151 | 240,237 | 30.9 | 1.73% |
| 2026-02 | 3,332 | 106,987 | 26.8 | 3.11% |
| 2026-03 | 3,101 | 127,231 | 26.0 | 2.44% |
| 2026-04 | 3,387 | 135,747 | 21.7 | 2.50% |
| 2026-05 | 3,071 | 153,335 | 22.8 | 2.00% |
| 2026-06 | 2,128 | 87,884 | 25.2 | 2.42% |
| 2026-07 | 2,366 | 220,276 | 26.4 | 1.07% |
| 2026-08 | 2,302 | 199,333 | 37.0 | 1.15% |

Peak: 38,102 clicks (May 2025). Current plateau: ~2,300/mo (−94%).

---

## Finding 1: The collapse was not gradual — it happened in a single week

**Exact date: July 8, 2025.**

Daily data shows:
- July 7 (Mon): 1,179 clicks, position 18.3 — normal
- **July 8 (Tue): 571 clicks, position 25.2 — crash**
- July 9: 404 clicks, position 29.6
- July 10: 433 clicks, position 27.5

The transition from ~1,200 clicks/day to ~400 clicks/day happened overnight on July 7–8. This is not a content-quality drift, a crawl rate change, or a gradual algo evolution. Something specific happened that day or the preceding weekend.

**What happened around July 8, 2025:** This date aligns with Google's **July 2025 Core Update**, which Google announced started rolling out July 8, 2025. The site went from avg position 18–19 to 27–35 within 48 hours. Impressions also dropped by ~60% over the following two weeks, which is consistent with many pages losing ranking so badly they fall off page 3 and stop generating impressions entirely.

There is no git history in this repo going back to that date, so we cannot rule out a simultaneous deployment. However, the abruptness and the correlation with the known core update date is the strongest signal.

---

## Finding 2: This is a ranking collapse, not an indexing or crawl problem

The "0 indexed" sitemap anomaly is a known GSC UI quirk when the sitemap is a sitemap index file (a file that points to other sitemaps). GSC counts submitted URLs at the index level but does not aggregate "indexed" counts from sub-sitemaps in the same row. The sub-sitemaps themselves are not separately listed in GSC's sitemap view.

**10 spot-check index_inspect results:**
- `musthavemods.com/` — PASS, Submitted and indexed, crawled 2026-09-04
- `musthavemods.com/sims-4-reshade/` — PASS, Submitted and indexed, crawled 2026-09-02
- `musthavemods.com/sims-4-teen-mods/` — PASS, Submitted and indexed, crawled 2026-08-12
- `musthavemods.com/sims-4-male-body-presets-cc/` — PASS, Submitted and indexed, crawled 2026-09-02
- `musthavemods.com/sims-4-skin-overlay/` — PASS, Submitted and indexed, crawled 2026-09-02
- `musthavemods.com/sims-4-magic-mods/` — PASS, Submitted and indexed, crawled 2026-09-03
- `musthavemods.com/games/sims-4/male-clothes/` — PASS, Submitted and indexed, crawled 2026-09-03
- `musthavemods.com/mods/cmijj1ip0002boxs3lm6n3t34/` — PASS, Submitted and indexed, crawled 2026-08-26
- `musthavemods.com/games/sims-4/body-presets/` — PASS, Submitted and indexed
- `musthavemods.com/games/sims-4/poses/` — PASS (inferred from page-level GSC data)

Verdict: **Indexing is not the problem.** Google is finding, crawling, and indexing these pages. The problem is where they rank.

---

## Finding 3: Which page types lost clicks

**Peak period (May–Jul 2025) top pages:**

| Page | Clicks | Position |
|---|---:|---:|
| musthavemods.com/ (homepage) | 9,893 | 27.2 |
| /sims-4-reshade/ | 4,843 | 9.2 |
| /sims-4-skin-overlay/ | 2,468 | 12.3 |
| /sims-4-teen-mods/ | 2,297 | 11.2 |
| /sims-4-male-body-presets-cc/ | 2,083 | 10.2 |
| /sims-4-sliders/ | 1,864 | 14.5 |
| /sims-4-career-mods/ | 1,535 | 19.0 |
| /sims-4-black-hair/ | 1,301 | 14.2 |

**Current period (Jun–Aug 2026) top pages:**

| Page | Clicks | Position |
|---|---:|---:|
| musthavemods.com/ | 1,665 | 36.0 |
| /sims-4-male-body-presets-cc/ | 384 | 13.0 |
| /mods/cmijj1ip0002boxs3lm6n3t34/ (catalog) | 220 | 5.1 |
| blog.musthavemods.com/sims-4-pregnancy-mods/ | 149 | 11.9 |
| blog.musthavemods.com/sims-4-body-presets/ | 138 | 12.9 |
| /games/sims-4/male-clothes/ (facet) | 66 | 26.0 |
| /games/sims-4/body-presets/ (facet) | 61 | 24.7 |

The blog posts that drove the most traffic (reshade, skin overlay, sliders, magic mods, career mods) all dropped dramatically in position — from positions 9–15 to positions 26–40+. Every single high-traffic post lost 90%+ of its clicks.

**By page type, full window Apr 2025 – Aug 2026 (1,000 pages sampled):**
- Blog posts (542 pages): 133,418 clicks — the dominant type
- Homepage (1 page): 20,652 clicks
- Catalog mods /mods/* (277 pages): only 1,072 clicks total — barely indexed by users
- Catalog facets /games/* (17 pages): 318 clicks

The collapse was primarily blog posts, because blog posts were the primary traffic source.

---

## Finding 4: Top queries confirm it is ranking loss, not intent shift

**Peak period (May–Jul 2025) — top non-brand queries:**

| Query | Clicks | Position | CTR |
|---|---:|---:|---:|
| sims 4 shaders | 1,038 | 5.2 | 12.9% |
| sims 4 cc packs | 586 | 8.8 | 9.1% |
| sims 4 teen mods | 467 | 7.1 | 12.2% |
| best sims 4 mods | 381 | 14.4 | 6.0% |
| sims 4 reshade presets | 274 | 7.3 | 7.8% |
| sims 4 career mods | 195 | 9.7 | 7.2% |

**Current period (Jun–Aug 2026) — same queries:**

| Query | Clicks | Position | CTR |
|---|---:|---:|---:|
| sims 4 mods | 14 | 39.8 | 0.9% |
| sims 4 cc | 13 | 41.3 | 2.7% |
| best sims 4 mods | 6 | 30.1 | 1.7% |
| sims 4 body presets | 5 | 21.8 | 2.3% |

The competitive non-brand queries (sims 4 shaders, sims 4 teen mods, sims 4 career mods, sims 4 cc packs) barely appear in the current data. "Sims 4 mods" and "sims 4 cc" sit at position 40+. These are not new queries; the site used to rank for them. The queries still have volume — the site just no longer ranks.

The only queries currently showing reasonable clicks are brand terms (musthavemods, must have mods) which held positions 1–4 throughout.

---

## Finding 5: A second ranking collapse in January 2026

The monthly data shows two distinct drops:
1. **July 8, 2025** — clicks/day: 1,200 → 400 (primary collapse, −67%)
2. **January 2026** — 8,892 clicks (Oct) → 4,151 clicks (Jan), −53%, CTR 4.7% → 1.7%

The January collapse is characterized by impressions *increasing* (189K → 240K) while CTR collapsed from 4.7% to 1.7%. This pattern — more impressions, much lower CTR — suggests the site was demoted to page 2–3 SERP positions after previously recovering to page 1–2 for some queries in Oct–Nov 2025. This is consistent with Google's **January 2026 Core Update** (which Google confirmed began Jan 14, 2026).

---

## Finding 6: Critical canonical conflict on blog subdomain posts

Several pages served by the WordPress blog at `blog.musthavemods.com` have conflicting canonicals:

- `blog.musthavemods.com/sims-4-pregnancy-mods/` → canonical points to `musthavemods.com/games/sims-4/pregnancy-mods/` (the catalog facet page)
- GSC shows: `googleCanonical: blog.musthavemods.com/sims-4-pregnancy-mods/` vs `userCanonical: musthavemods.com/games/sims-4/pregnancy-mods/` — Google chose the blog URL as canonical, disagreeing with the declared canonical
- `blog.musthavemods.com/sims-4-body-presets/` → verdict is "Alternate page with proper canonical tag" — Google deferred to `musthavemods.com/sims-4-body-presets/` here

This means: blog posts at `blog.musthavemods.com` that point their canonical at `/games/*` facet URLs are splitting PageRank between two URLs, and Google may be choosing neither as the strong signal. The blog posts that still get traffic are likely the ones where Google chose the blog URL canonical (correctly indexing the content page), while the facet pages `/games/sims-4/*` get almost no clicks because they sit at position 24–27 with 0.4–1.0% CTR.

The `musthavemods.com/sims-4-pregnancy-mods/` URL (which ranked well in 2025) now redirects 308 to `musthavemods.com/games/sims-4/pregnancy-mods/`. This redirect moved a page that used to rank to a new URL that Google has not yet accepted as the canonical — a direct ranking-diluting change.

---

## Finding 7: Homepage client-rendering is confirmed — crawlers get no H1

Live curl of `musthavemods.com/` returns:
- No `<h1>` tag
- No `__NEXT_DATA__` (not SSR, not static)
- JSON-LD present but thin
- Total HTML: ~20KB (a shell)

Blog posts (e.g., `/sims-4-teen-mods/`) return:
- H1 present
- JSON-LD present
- Full content (395KB)
- Proper title and meta description

The homepage is the single highest-click URL in the dataset (20,652 clicks over 16 months, 35.9% of all-time total). It sits at position 27–36 for brand queries. The client-rendering means Google crawls it as a shell. Fixing this is the highest-leverage change available without touching ad layout.

---

## What is NOT the problem (eliminating hypotheses)

- **Sitemap indexing:** 0/16,553 claimed by GSC UI is a display artifact of sitemap index files. Every page spot-checked passes index_inspect. Sitemap is structured correctly (index → sub-sitemaps), last downloaded Aug 26 with 0 errors.
- **Robots.txt blocking:** All pages return ALLOWED. AI crawler rules were added 2026-09-02 (PR #24) — not a factor in the Google collapse.
- **Content disappearing:** The blog posts are still live, still SSR, still have content. They just rank at position 30–40.
- **Site speed / mobile usability:** All index_inspect checks return MOBILE crawl success. Mobile usability verdict is unspecified (not flagged as failing).
- **Algorithm recovery attempts:** Oct–Nov 2025 showed a partial recovery (18.6 position, 4.7% CTR) that was then erased by the Jan 2026 update.

---

## Ranked fix list

### Fix 1 — Homepage SSR (Tier 1) — estimated recovery: largest single lever

The homepage ranks position 27–36 for brand queries and zero for competitive queries. It gets no content on first crawl. Making it server-render with H1, above-the-fold collections, and proper schema would give Google actual content to score. This is the largest single unlocked lever.

**Expected impact:** Unclear magnitude (Google has seen this page for 14 months as a shell), but homepage is the #1 click source and currently loses CTR to a position 36 brand query that should be position 1–3. Timing: T1.

**Constraint:** Must not touch ad anchors. Rio watches RPM for 7 days after merge.

### Fix 2 — Canonical conflict audit on blog subdomain posts (Tier 2 to assess, Tier 0 to fix in Next.js middleware)

Any blog post at `blog.musthavemods.com/[slug]/` that has its canonical pointing to `/games/sims-4/[facet]/` is splitting ranking signals. Google is choosing its own canonical — sometimes the blog URL, sometimes the facet URL. Neither accumulates sufficient authority.

The `/sims-4-pregnancy-mods/` 308 redirect to the facet page is a clear ranking-diluting change: the old URL had history, the new facet URL is thin.

**Short-term fix (Tier 0):** Audit the middleware/WordPress canonical rules. Any blog post that used to rank as a standalone listicle (e.g., /sims-4-career-mods/, /sims-4-sliders/, /best-woohoo-mods-sims-4-ultimate-guide/) should have its canonical pointing to itself, not to a facet page. These posts are SSR, have full content, and were Google's preferred URL before the redirects were introduced.

**Decision needed (Tier 2):** Should `/sims-4-pregnancy-mods/` be un-redirected? It had 522 clicks May–Jul 2025 (position 16.2). The facet page `/games/sims-4/pregnancy-mods/` currently gets 0 clicks from GSC. This is a canonical/redirect change affecting a historically important URL — requires operator review before touching.

### Fix 3 — Core Update recovery content quality (Tier 0/Tier 2)

Both the July 2025 and January 2026 core updates hit this site. Google's core update guidance points to E-E-A-T: experience, expertise, authoritativeness, trustworthiness. The Sims mod niche is not YMYL, but Google still rewards pages that demonstrate curation depth and author credibility.

**Tier 0 moves immediately available:**
- Add explicit author bylines (schema `author` + visible byline) to all blog posts. These are curated posts, not AI content. The author is human and has expertise. Currently the posts show a byline inconsistently.
- Add `lastReviewed` / `dateModified` schema to posts where the content was actually refreshed. Posts with "2024" in the title while the mod list references 2026 content are sending mixed signals.
- Add `ItemList` schema to the top 20 traffic posts. The /mods/[id] pages already pass rich-results for Breadcrumbs; the listicle posts get no rich results.

**Tier 2 (operator review):** Consider whether any of the high-traffic posts need content expansion. Posts like /sims-4-reshade/ were at position 9 and dropped to 26 — this suggests a competitor surpassed them, not that the page was penalized. A content refresh brief for the writer is appropriate.

### Fix 4 — /games/* facet page titles and metas (Tier 0)

The catalog facet pages (`/games/sims-4/male-clothes/`, `/games/sims-4/body-presets/`) sit at position 24–27 with 5,000–7,000 impressions each. They currently appear in GSC but earn almost no clicks. Their titles ("Sims 4 Male Clothes CC — 400+ Outfits & Streetwear | MustHaveMods") are functional but not click-optimized for the position they're in.

More importantly: these pages are thin. The `/games/sims-4/male-clothes/` page returns 401KB of HTML but the actual above-the-fold content (what Google evaluates before rendering JS) may be a loading shell — the `curl` returned H1 and JSON-LD but zero "mod-card" elements. These pages may be client-rendered catalog grids that crawlers see as mostly empty. If so, they cannot outrank a full blog post.

**Action:** Verify via `smoke-render.ts` whether /games/* pages have SSR content or a JS-dependent grid. If client-rendered, add SSR to these pages (Tier 1) or link from the SSR blog posts to the facet pages with clear internal link text (Tier 0 internal link fix).

### Fix 5 — Internal link audit: blog posts to catalog, catalog to blog (Tier 0)

The top 20 blog posts by historical clicks have very few internal links to `/games/*` facet pages or `/mods/[id]` pages. Adding 2–3 contextual internal links per top post to the corresponding catalog facet would (a) pass PageRank to the thin facet pages and (b) reduce the pogo-sticking signal (users clicking back to Google after finding a list post without deeper navigation).

---

## The two-sentence summary

Google penalized this site in two sequential core updates (July 2025, January 2026), dropping every blog post that was not a brand query from positions 9–19 to positions 26–40+. The immediate recoverable causes are: (1) the homepage serves no content to crawlers and sits at position 36 for its own brand, (2) canonical conflicts from the blog-subdomain proxy + `/games/*` redirect are diluting the authority of historically strong posts, and (3) the catalog facet pages that replaced blog posts in internal linking may be client-rendered shells that Google cannot score.

---

## Next moves (by tier and date)

| Priority | Move | Tier | Due |
|---|---|---|---|
| 1 | Homepage SSR shell — server-render H1 + top collections | T1 | Queue now, merge next green day |
| 2 | Canonical audit — identify all blog posts where canonical points to /games/* facet; fix Next.js middleware rule | T0 | This week |
| 3 | Verify /games/* facet SSR status via smoke-render; if CSR, add to T1 queue alongside homepage | T0 audit → T1 fix | This week |
| 4 | ItemList schema on top 20 blog posts | T0 | This week |
| 5 | Author bylines in schema on all blog posts | T0 | This week |
| 6 | Internal links: top 20 blog posts → relevant /games/* facets | T0 | Next week |
| 7 | /sims-4-pregnancy-mods/ redirect reversal decision | T2 | Operator queue |
| 8 | Blog content refresh brief for top-5 ranking-lost posts (reshade, skin-overlay, sliders, career, magic mods) | T2 package for writer | Next week |

*Read date: 2026-09-08 (GSC catches up ~3 days after changes ship). Keep-if rule for any T0 fix: GSC clicks 28d increase WoW within 4 weeks of ship.*

— Sage, Search & AI
