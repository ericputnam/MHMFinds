# Legacy WordPress Pages vs. Collection Pages — Strategy & Implementation

**Date:** 2026-07-03 (revised same day — see "Reconciliation" below)
**Context:** 2026-07-02 growth audit ("Queued" #1 in `reports/rpm-dip-mitigation-2026-07-02.md`): every legacy WordPress-style page outperformed its `/games/sims-4/[topic]/` collection twin on GSC impressions and clicks, and `/games/sims-4/pregnancy-mods/` was "Crawled – currently not indexed." Estimated upside: +1,500–2,000 impressions/mo.

## Root causes found

1. **Canonical pointed at a redirect (sitewide).** `next.config.js` sets `trailingSlash: true`, so every non-slash URL 308-redirects to the slash variant. But collection pages, game pages, mod detail pages, and the Next.js sitemaps all declared **non-slash** canonicals/`<loc>`s. GSC confirmed the damage: declared canonical `…/pregnancy-mods` vs. Google-selected canonical `…/pregnancy-mods/`, with impressions split across both variants for every collection page. A canonical that 308s is a conflicting signal — a likely trigger for the pregnancy page's "Crawled – currently not indexed" verdict.
2. **Duplicate intent metadata** between legacy listicles and collection pages competing for identical head terms.
3. **Near-orphan collection pages**: nothing in the app UI links to `/games/sims-4/<topic>/` — only the sitemap and sibling collection pages do. Weak internal linking compounds the indexing problem (games-page collection nav is a queued follow-up).
4. The `__pregnancy_keyword__` workaround was **not** the direct cause — the page renders 115 mods fine — but the real facet is still pending (Phase 1a backfill).

## Reconciliation with the parallel consolidation (same day)

While this branch was being built, a parallel session shipped commit `5af9390` (deployed to prod ~07:08): **18 permanent redirects consolidating 9 legacy URLs into 6 collection pages** — the four strong audit pairs (female-clothes, male-clothes, cc-skin-details, gallery-poses), pregnancy-mods, and the 4-page body-preset cluster into the new `/games/sims-4/body-presets/` collection. That decision supersedes this branch's original "differentiate the strong pairs" position; this branch was reconciled to match and now completes what the consolidation left open (canonicals, sitemap hygiene, WP-side cleanup, cross-links for the still-live pairs).

## Final per-pair strategy

### Consolidated (301 → collection page; collection owns the head term)

| Legacy URL(s) | Collection page |
|---|---|
| `/sims-4-pregnancy-mods/` | `/games/sims-4/pregnancy-mods/` |
| `/sims-4-female-clothes-cc/` | `/games/sims-4/female-clothes/` |
| `/sims-4-male-clothes-cc/` | `/games/sims-4/male-clothes/` |
| `/sims-4-cc-skin-details/` | `/games/sims-4/skin-details/` |
| `/sims-4-gallery-poses/` | `/games/sims-4/poses/` |
| `/sims-4-body-presets/`, `/sims-4-male-body-presets-cc/`, `/sims-4-plus-size-body-presets/`, `/sims-4-athletic-body-presets/` | `/games/sims-4/body-presets/` |

For these: head-term metaTitles on the collection pages, **no** blogUrl (a cross-link would 301 back to the same page), WordPress canonical override → collection page, excluded from the blog-posts sitemap.

### Differentiated (legacy article stays live; two-way cross-links; collection targets browse intent)

| Collection | blogUrl (reciprocal box on the article via `mhm_collection_crosslinks`) |
|---|---|
| hair-cc | `/sims-4-hairstyles-cc/` (box also on `/sims-4-hair-mods/`) |
| clutter | `/sims-4-clutter/` (box also on `/sims-4-clutter-cc/`) |
| holidays-cc | `/sims-4-holiday-mods/` (box also on `-ideas`/`-traditions`) |
| tattoos | `/sims-4-tattoos/` |
| furniture-cc | `/sims-4-furniture-cc/` |
| skin-details | `/sims-4-skin-overlay/` (its `-cc-skin-details` twin was consolidated; skin-overlay is the live editorial companion, box also on `/sims-4-skin-details/`) |
| poses | `/sims-4-poses/` (its `gallery-poses` twin was consolidated) |

These collections keep browse-intent "Finder — Browse N+…" metaTitles so they stop competing with the listicles for identical queries.

## Changes shipped

**This branch (Next.js — deploys on next push):**
- Trailing-slash canonicals everywhere: collection pages (+ JSON-LD), game pages, mod detail pages, `sitemap-nextjs.xml`, `sitemap-mods.xml`.
- `sitemap-blog-posts.xml` excludes all 9 consolidated legacy posts (it's built from the WP REST API, so WP-side sitemap filters don't cover it).
- `lib/collections.ts`: blogUrl cross-links on the 7 differentiated collections; browse-intent titles for differentiated, head-term titles for consolidated; body-presets entry ported from main; `buildWhereClause` ORs `contentType: 'pregnancy'` so the Phase 1a backfill activates automatically.
- `vercel.json` synced with main's 18 consolidation redirects.
- Tests: `canonical-trailing-slash.test.ts` (canonical hygiene + self-loop guard: no blogUrl may point at a redirected legacy path), seo-phase1 6.0 locks the differentiated pages as NOT redirected, redirect pairs locked in 2.0.
- `push-blog-functions-prod.sh` gained a `--yes` flag for reviewed non-interactive pushes.

**WordPress prod + staging (live as of this session, via push scripts):**
- `mhm_collection_crosslinks`: "Browse the full collection" box appended to the 12 live differentiated articles (verified rendering on all 12 via apex).
- `mhm_consolidated_post_map`: canonical override → collection page for all 9 consolidated posts (their blog-origin copies no longer declare a canonical that 301s); Rank Math sitemap exclusion as belt-and-braces (module currently disabled).
- New CRITICAL_MARKER `mhm_collection_crosslinks` in both push scripts protects the feature from the scp-overwrite failure mode.
- `check-blog-sidebar.sh` passed after each prod push.

## Operator follow-ups

1. **Deploy this branch** — until then, prod collection pages still declare non-slash canonicals and the blog-posts sitemap still lists the 9 redirected URLs.
2. **GSC after deploy:** request indexing for the 6 consolidated collection pages (pregnancy-mods especially).
3. ~~Games-page collection nav~~ **DONE (2026-07-03)**: compact "Browse collections" chip strip under the Hero on `/games/[game]`, linking all 11 collections with head-term anchors in first-paint HTML. Approved by mhm-growth (placement above grid, full head terms, no Footer version this pass) and mhm-ad-revenue (outside the ad flex row, no .mv-ads class, no loading gate). Revisit a Footer version only if GSC still shows under-indexing in 2–4 weeks.
4. **Phase 1a pregnancy facet backfill** remains queued (prod DB write, operator-gated).
5. Watch GSC 2–4 weeks: consolidated collections should absorb the legacy pages' impressions; slash/non-slash variants should fold together.
