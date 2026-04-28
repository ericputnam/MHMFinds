# PRD: MHM + WeWantMods Scraper Extraction Fixes

**Status:** Not Started
**Created:** 2026-04-23
**Owner:** Scraper pipeline
**Scope:** **New scrapes only.** No retroactive backfill — existing rows keep whatever they have.

---

## Problem Statement

Both the MHM scraper (`lib/services/mhmScraper.ts`) and the WeWantMods scraper (`lib/services/weWantModsScraper.ts`) produce unreliable `contentType`, `category`, and `author` values on ingest. The failure modes are known (see Root Cause Audit below) and produce:

- **`contentType = null`** — URL pattern didn't match and title detection returned low confidence. Requires `scripts/fix-null-content-types.ts` to patch retroactively.
- **Wrong `contentType`** — title/description keyword triggered a medium-confidence hit that overrode a stronger URL signal. Example: a clothing mod titled "Hair Salon Set" gets tagged `hair`.
- **Garbage `author`** — `"Title"`, `"ShRef"`, `"Id"`, numeric IDs extracted from URL path segments. Requires `scripts/cleanup-author-data.ts` to fix retroactively.
- **Missing `author`** — WeWantMods has no fallback chain; if the `"N. Title by Author"` regex misses, author is undefined.

This PRD fixes extraction at scrape time so the cleanup scripts become unnecessary for new data.

---

## Root Cause Audit Summary

| # | Root Cause | Scrapers affected | Location |
|---|---|---|---|
| 1 | URL slug patterns too strict (`/hair-cc/` won't match `/sims-4-hair-cc-pack/`) | MHM, WWM | [mhmScraperUtils.ts:184-219](../lib/services/mhmScraperUtils.ts), [weWantModsScraper.ts:462-506](../lib/services/weWantModsScraper.ts) |
| 2 | Title detection with low-confidence overrides null URL detection | MHM, WWM | [mhmScraper.ts:1345](../lib/services/mhmScraper.ts), [weWantModsScraper.ts:1966-2019](../lib/services/weWantModsScraper.ts) |
| 3 | No audit logging / no dry-run → garbage writes silently | MHM, WWM | both |
| 4 | Author from blog meta tags (`.author-name`, `meta[name=author]`) returns blog author, not mod creator | MHM | [mhmScraper.ts:1236-1262](../lib/services/mhmScraper.ts) |
| 5 | Author extraction has no bad-pattern denylist at scrape time | MHM, WWM | denylist only in [scripts/cleanup-author-data.ts:31-58](../scripts/cleanup-author-data.ts) |
| 6 | WeWantMods has no author fallback chain (single regex, no `ensureAuthor()`) | WWM | [weWantModsScraper.ts:962](../lib/services/weWantModsScraper.ts) |
| 7 | Patreon `/posts/{id}` numeric URLs not handled by URL author extraction | MHM, WWM | both |
| 8 | Download link detection requires literal `"Download:"` prefix — misses button-only layouts | MHM | [mhmScraper.ts:702](../lib/services/mhmScraper.ts) |

---

## Goals

1. **Get `contentType` right on ingest** with URL slug as the authoritative signal.
2. **Get `author` right on ingest** with a multi-strategy chain and a denylist.
3. **Make extraction failures visible** via dry-run + confidence logging, so we stop debugging in production.
4. **Share logic between MHM and WWM** — stop duplicating URL/category maps.

### Non-Goals

- Retroactive backfill of existing mods (stay focused; existing cleanup scripts already handle that).
- Changes to CurseForge/Patreon/Tumblr aggregators (covered by [PRD-scraper-facet-accuracy](./PRD-scraper-facet-accuracy.md)).
- Rewriting the `contentTypeDetector` confidence model (this PRD trusts it, just feeds it better inputs).

---

## Requirements

### R1. URL Slug Keyword Weighting (contentType)

**Current:** URL patterns match only exact segments (`/hair-cc/`). If the slug is `/sims-4-watch-cc/`, no match → fall through to title keyword detection.

**New:** Tokenize the URL slug by splitting on `-`, `/`, `_`, and drop stopwords (`sims`, `4`, `3`, `cc`, `mod`, `mods`, `best`, `top`, `free`, `pack`, `set`, numbers). Match remaining tokens against the facet vocabulary (`FACET_VOCABULARY` — new shared constant). A match returns `{ contentType, confidence: 'high' }`.

**Examples:**
- `/sims-4-watch-cc/` → tokens `[watch]` → `contentType = 'watches'` (high)
- `/best-sims-4-makeup-cc-2024/` → tokens `[makeup]` → `contentType = 'makeup'` (high)
- `/sims-4-hair-salon-set/` → tokens `[hair, salon]` — ambiguous, `hair` wins by vocabulary priority (high)
- `/sims-4-new-cc-pack/` → no vocabulary match → return undefined, fall back to title

**Precedence (new):**
1. URL slug keyword match (high) — **authoritative, never overridden**
2. WordPress post category/tag extraction (high) — for MHM, fetch post metadata
3. URL pattern match (existing, for pre-known slug structures)
4. Title/description keyword detection (medium/low) — only used if #1-3 return undefined

**Files:** create `lib/services/scraperExtraction/urlSlugMatcher.ts` (shared). Update [mhmScraperUtils.ts:184](../lib/services/mhmScraperUtils.ts) and [weWantModsScraper.ts:1978](../lib/services/weWantModsScraper.ts) to call it first.

### R2. Author Extraction Chain — "Innovations"

A single source of truth: `lib/services/scraperExtraction/authorExtractor.ts` (new, shared by both scrapers). Runs strategies in order; first one that passes the denylist wins.

| # | Strategy | Confidence | Cost |
|---|---|---|---|
| 1 | **Structured data (JSON-LD)** — parse `<script type="application/ld+json">` blocks, look for `author.name` or `creator.name`. Mod creators' personal blogs almost always emit this via WordPress/Squarespace. | high | cheap |
| 2 | **OpenGraph article author** — `<meta property="article:author">`, `<meta property="og:article:author">`. Distinct from generic `meta[name=author]` which is the blog author. | high | cheap |
| 3 | **URL structure parse** — Patreon `/posts/{id}` → fetch `/api/posts/{id}` public metadata; Patreon `/c/{creator}` → creator slug; TSR `/members/{name}` → name; Tumblr `{handle}.tumblr.com` → handle; itch.io `{creator}.itch.io` → creator | high | cheap |
| 4 | **"by {Author}" in title** — existing heuristic, keep it but demote priority | medium | cheap |
| 5 | **Known-creator corroboration** — if the extracted candidate matches an existing `CreatorProfile.handle` (case-insensitive, fuzzy within 1 edit), bump confidence to high. This is the innovation: we already have ~N creators in the DB — use them. | boost | cheap |
| 6 | **Wayback Machine fallback** — port the logic from [cleanup-author-data.ts:234](../scripts/cleanup-author-data.ts) for when the live page is blocked (Patreon 403). Only fires on cache miss + blocked-site list. | medium | expensive |
| 7 | **LLM classifier fallback** — if strategies 1-6 all fail and we have the mod page HTML, send a ≤2KB text window to a cheap model (Haiku) with a constrained prompt: *"Extract the mod creator's name from this page. Return null if unclear. No explanation."* Rate-limited, only fires on borderline cases. | low | expensive |
| 8 | **Blocklist check (final gate)** — reject any candidate matching `badAuthorPatterns` (from [cleanup-author-data.ts:31](../scripts/cleanup-author-data.ts)) or that's purely numeric, under 2 chars, or in a hardcoded list (`Title`, `ShRef`, `Id`, `Post`, `Download`, `Free`, `CC`, `Mod`). Fail → author = null (not garbage). | — | cheap |

**Writing `null` is better than writing garbage.** If all strategies fail, set `author = null` and log. A cleanup pass or manual reviewer can fix it later — but at least it's not polluting search.

### R3. Dry-Run + Confidence Logging

Both scrapers gain a `--dry-run` flag that runs the full pipeline and emits a CSV report:

```csv
url, title, extracted_contentType, ct_confidence, ct_strategy, extracted_author, author_confidence, author_strategy, would_write
```

Add `--confidence-threshold=high|medium|low` so ops can run a scrape in "strict mode" (only high-confidence extractions get written). Default stays `medium` to avoid regressing ingest volume.

Every write in prod emits a structured log line with confidence/strategy so we can graph `% high / % medium / % null` over time and catch regressions when source HTML changes.

### R4. Download Link Detection (MHM only)

The `"Download:"` literal prefix check at [mhmScraper.ts:702](../lib/services/mhmScraper.ts) should be relaxed to any `<a>` whose `href` matches a known mod-source domain OR whose text contains any of `["Download", "Get it", "Grab it", "Link"]` (case-insensitive). Prevents dropping mods with button-only layouts.

### R5. Share Code Between Scrapers

Extract into `lib/services/scraperExtraction/`:
- `urlSlugMatcher.ts` (R1)
- `authorExtractor.ts` (R2)
- `facetVocabulary.ts` — the single source of truth for URL→contentType mapping (currently split between [mhmScraperUtils.ts:133-162](../lib/services/mhmScraperUtils.ts) and [weWantModsScraper.ts:80-402](../lib/services/weWantModsScraper.ts) `URL_CATEGORY_MAP`)
- `badAuthorPatterns.ts` — shared with [scripts/cleanup-author-data.ts](../scripts/cleanup-author-data.ts)
- `extractionLogger.ts` (R3)

Both scrapers call into this module. `contentTypeDetector.ts` stays as-is — it's good, it just needs better inputs.

---

## Success Metrics

Tracked via structured logs (R3):

| Metric | Baseline (pre-PRD) | Target (30d post-ship) |
|---|---|---|
| % of new mods with `contentType != null` | ~60-70% (estimated, needs measurement) | ≥ 95% |
| % of new mods with `contentType` extracted at **high** confidence | unknown | ≥ 80% |
| % of new mods with `author != null` AND passing denylist | unknown (cleanup script runs periodically) | ≥ 95% |
| % of new mods requiring the null-contentType cleanup script | unknown | 0 (script becomes obsolete for new mods) |
| Mods dropped due to download-link parse failure (R4) | unknown | reduced by ≥ 50% |

Baselines get captured in **Phase 0** (see below) before any code changes.

---

## Implementation Phases

Each phase has concrete tasks ready to be tracked. Phases are gated: don't start N+1 until N's exit criteria are met. Every phase that touches extraction lives behind `EXTRACTION_V2=true` so rollback is one env-var flip.

### Phase 0 — Measurement & baseline capture (0.5d)

**Goal:** real numbers before we change anything. Without baselines we can't prove the fix worked.

**Tasks:**
- [ ] 0.1 Create `lib/services/scraperExtraction/extractionLogger.ts` — minimal logger that records `{ url, title, field, value, confidence, strategy }` to an in-memory array during a run.
- [ ] 0.2 Add `--dry-run` flag parser to both scraper entry points: `scripts/run-mhm-scraper.ts` (or equivalent) and `scripts/run-wewantmods-scraper.ts`. Flag short-circuits DB writes only.
- [ ] 0.3 Instrument current extraction code in both scrapers to emit logger events for `contentType` and `author` without changing behavior.
- [ ] 0.4 Run MHM scraper in dry-run on last 200 posts; write results to `data/phase0-mhm-baseline.csv`.
- [ ] 0.5 Run WWM scraper in dry-run on last 200 posts; write to `data/phase0-wwm-baseline.csv`.
- [ ] 0.6 Write `scripts/phase0-extraction-baseline.ts` to summarize the CSVs: % null, % high/medium/low confidence, most-common failure modes.
- [ ] 0.7 Paste baseline numbers into this PRD's Success Metrics table (replacing "unknown").

**Exit criteria:**
- Both baseline CSVs exist in `data/`.
- Baseline numbers filled in in the PRD.
- Zero DB writes during measurement.

**Rollback:** none needed; measurement-only, no behavioral change.

---

### Phase 1 — URL slug weighting + shared facet vocabulary (1d)

**Goal:** URL slug becomes the authoritative contentType signal. `/sims-4-watch-cc` → `watches`, high confidence.

**Tasks:**
- [ ] 1.1 Create `lib/services/scraperExtraction/facetVocabulary.ts`. Consolidate the contentType→keyword map from [mhmScraperUtils.ts:133-162](../lib/services/mhmScraperUtils.ts) and the `URL_CATEGORY_MAP` from [weWantModsScraper.ts:80-402](../lib/services/weWantModsScraper.ts). Export `FACET_VOCABULARY: Record<ContentType, string[]>` and `VOCABULARY_PRIORITY: ContentType[]` (tiebreaker order).
- [ ] 1.2 Create `lib/services/scraperExtraction/urlSlugMatcher.ts`:
  - `tokenizeSlug(url: string): string[]` — split on `/`, `-`, `_`; lowercase; drop stopwords (`sims`, `3`, `4`, `cc`, `mod`, `mods`, `best`, `top`, `free`, `pack`, `set`, `new`, `download`, numbers, ≤ 1 char tokens).
  - `matchContentTypeFromSlug(url: string): { contentType, confidence: 'high', strategy: 'url-slug-keyword' } | null` — tokenize, scan vocabulary, return first priority-ordered hit.
- [ ] 1.3 Unit test `__tests__/unit/urlSlugMatcher.test.ts` — minimum 20 fixtures including:
  - `/sims-4-watch-cc/` → `watches`
  - `/sims-4-hair-cc-pack/` → `hair`
  - `/best-sims-4-makeup-cc-2024/` → `makeup`
  - `/sims-4-hair-salon-set/` → `hair` (priority wins over `furniture`)
  - `/sims-4-new-cc-pack/` → `null` (no vocabulary match)
  - `/halloween-decor-sims-4/` → `seasonal` (priority over `decor`) — documents the risk-table tradeoff
  - Plus 14 more from real MHM/WWM URLs in the Phase 0 CSV.
- [ ] 1.4 Rewrite [mhmScraperUtils.ts:detectContentTypeFromUrl](../lib/services/mhmScraperUtils.ts) to call `matchContentTypeFromSlug` first, then fall back to the existing pattern matcher.
- [ ] 1.5 Rewrite [weWantModsScraper.ts:detectContentType](../lib/services/weWantModsScraper.ts) to call `matchContentTypeFromSlug` first.
- [ ] 1.6 **Precedence fix:** in both scrapers, remove the `detectedContentType || titleContentType` short-circuit. New order: (a) URL slug match, (b) WordPress post category/tag extraction [MHM only — new helper], (c) existing URL-pattern match, (d) title/desc keyword detection. Title detection never overrides a URL match.
- [ ] 1.7 Gate all of 1.4-1.6 behind `EXTRACTION_V2` env flag. Old code path stays callable for quick revert.
- [ ] 1.8 Re-run Phase 0's dry-run with `EXTRACTION_V2=true`. Write comparison report `data/phase1-mhm-comparison.csv` showing per-row: baseline contentType vs new contentType. Flag rows that changed.
- [ ] 1.9 Manual spot-check 30 random "changed" rows from the comparison to confirm the new value is correct.

**Exit criteria:**
- All unit tests pass.
- % of new mods with `contentType != null` improves by ≥ 15pp over baseline.
- ≥ 80% of non-null extractions are now `high` confidence.
- Manual spot-check shows ≥ 28/30 new values are correct.

**Rollback:** unset `EXTRACTION_V2`. Old extraction path still lives.

---

### Phase 2 — Author extraction chain + denylist (2d)

**Goal:** multi-strategy author extractor shared by both scrapers. Garbage goes to `null`, not the DB.

**Tasks:**
- [ ] 2.1 Create `lib/services/scraperExtraction/badAuthorPatterns.ts`. Port the denylist from [scripts/cleanup-author-data.ts:31-58](../scripts/cleanup-author-data.ts) + add: purely numeric, length < 2, and hardcoded tokens (`Title`, `ShRef`, `Id`, `Post`, `Download`, `Free`, `CC`, `Mod`). Export `isValidAuthor(candidate: string): boolean`.
- [ ] 2.2 Update [scripts/cleanup-author-data.ts](../scripts/cleanup-author-data.ts) to import from the shared module (no logic duplication).
- [ ] 2.3 Create `lib/services/scraperExtraction/authorExtractor.ts` with one function per strategy:
  - `fromJsonLd($: cheerio.Root): Candidate | null` — parse `<script type="application/ld+json">`, look for `author.name` or `creator.name`.
  - `fromOpenGraph($: cheerio.Root): Candidate | null` — `meta[property="article:author"]`, `meta[property="og:article:author"]`. Explicitly ignore `meta[name="author"]` (blog author).
  - `fromUrl(url: string): Candidate | null` — Patreon `/c/{creator}`, Patreon `/posts/{id}` (fetch public post metadata), TSR `/members/{name}`, Tumblr subdomain, itch.io subdomain.
  - `fromTitlePattern(title: string): Candidate | null` — "X by Y", "X - Y" (existing heuristic, demoted).
  - `fromCreatorProfileMatch(candidate: string): Promise<Candidate | null>` — fuzzy-match against `CreatorProfile.handle` using Levenshtein distance ≤ 1, minimum 4 chars. Confidence boost to `high` on match.
  - Every strategy returns `{ value, confidence, strategy, rawSource }`.
- [ ] 2.4 Create `extractAuthor(input: { url, title, $, scrapers }): Promise<{ value: string | null, confidence, strategy }>`:
  - Runs strategies 1-4 in order.
  - Applies strategy 5 (CreatorProfile boost) on the winning candidate.
  - Applies `isValidAuthor` gate on the final value.
  - If gate fails, returns `{ value: null, ... }` — never writes garbage.
- [ ] 2.5 Wire `extractAuthor` into MHM scraper, replacing [mhmScraper.ts:1236-1262](../lib/services/mhmScraper.ts). Keep the existing `ensureAuthor` chain as the final fallback after strategy 4.
- [ ] 2.6 Wire `extractAuthor` into WWM scraper at [weWantModsScraper.ts:962](../lib/services/weWantModsScraper.ts). This closes the WWM gap (today it has no fallback at all).
- [ ] 2.7 Unit test `__tests__/unit/authorExtractor.test.ts` with HTML fixtures in `__tests__/fixtures/mod-pages/`:
  - Personal blog with JSON-LD author → extracted from strategy 1
  - Patreon `/c/creatorname` URL → strategy 3
  - Patreon `/posts/12345` URL → strategy 3 via public API
  - TSR `/members/sims4mom` → strategy 3
  - Tumblr `pixel-sugar.tumblr.com` → strategy 3
  - Page with garbage meta tags + good title → strategy 4 wins
  - Candidate matches existing `CreatorProfile` → strategy 5 boost
  - Candidate `"Title"` → rejected by denylist → null
- [ ] 2.8 Gate all Phase 2 changes behind `EXTRACTION_V2` env flag.
- [ ] 2.9 Re-run dry-run with `EXTRACTION_V2=true` on Phase 0 sample. Write `data/phase2-author-comparison.csv`.
- [ ] 2.10 Manual spot-check 30 "changed" rows.

**Exit criteria:**
- All unit tests pass.
- `% author != null` ≥ 95%.
- `% author passes denylist` = 100% (denylist is final gate; 0 garbage writes).
- Manual spot-check: ≥ 28/30 correct.

**Rollback:** unset `EXTRACTION_V2`.

---

### Phase 3 — Dry-run + confidence reporting polish (0.5d)

**Goal:** ops can run either scraper with full observability. Makes Phase 4+ measurable.

**Tasks:**
- [ ] 3.1 Upgrade `extractionLogger.ts` from Phase 0: structured JSON output + CSV export.
- [ ] 3.2 Add `--confidence-threshold=high|medium|low` flag. Only writes ≥ threshold. Default: `medium` (preserves ingest volume).
- [ ] 3.3 Add `--output=<path>` flag for CSV export location.
- [ ] 3.4 Add npm scripts to `package.json`:
  - `scrape:mhm:dry-run` → runs MHM with `--dry-run` + CSV to `data/scrape-reports/`
  - `scrape:wwm:dry-run` → same for WWM
- [ ] 3.5 Add a stdout summary printed at end of every run (dry or not): `{ total, written, nullContentType, nullAuthor, highConf%, mediumConf%, lowConf% }`.
- [ ] 3.6 In prod path (non-dry), emit one structured log line per write with confidence/strategy so we can graph `% high` over time.

**Exit criteria:**
- Both npm scripts work end-to-end.
- CSV schema documented at top of this PRD's R3 section.

**Rollback:** N/A — purely additive.

---

### Phase 4 — Download-link relaxation + WWM parity (0.5d)

**Goal:** stop dropping mods because of UI copy variations. Bring WWM to feature parity with MHM.

**Tasks:**
- [ ] 4.1 Rewrite [mhmScraper.ts:702](../lib/services/mhmScraper.ts) download-link detection. Accept any `<a>` whose `href` matches known mod-source domains (Patreon, CurseForge, TSR, Tumblr, SimsDomination, itch.io, Box, Mediafire, Google Drive, Dropbox) OR whose link text contains any of: `Download`, `Get it`, `Grab it`, `Link`, `Free download` (case-insensitive). Log when the domain-only heuristic fires vs text-only, for audit.
- [ ] 4.2 Confirm WWM now has full author chain from Phase 2 (verify via dry-run).
- [ ] 4.3 Run full dry-run on both scrapers. Produce `data/phase4-final-comparison.csv`.
- [ ] 4.4 Flip `EXTRACTION_V2=true` in staging. Run real (non-dry) scrapes on a 50-post sample. Verify DB rows look correct.
- [ ] 4.5 Flip `EXTRACTION_V2=true` in prod. Monitor the first 24h of scrapes via the structured logs from 3.6.

**Exit criteria:**
- All Success Metrics targets hit on the final comparison CSV.
- 24h prod soak with no regression in write-rate or error-rate.
- PRD status moved to **Completed** in `PRD-INDEX.md`.

**Rollback:** unset `EXTRACTION_V2` in prod. Staging stays on for continued testing.

---

### Phase 5 — Optional innovations (deferred; tracked here for completeness)

**Gate:** only start if Phase 4's 30-day metrics show `% null author` > 5% OR specific failure modes justify the cost.

**Strategy 6 — Wayback Machine fallback (~1d)**
- [ ] 5.1 Port Wayback lookup from [scripts/cleanup-author-data.ts:234](../scripts/cleanup-author-data.ts) into `authorExtractor.ts` as strategy 6.
- [ ] 5.2 Only fires when live page returns 403/410 AND the domain is in a blocked-site allowlist (Patreon, etc.).
- [ ] 5.3 Rate-limit to 1 req/sec; cache hits for 30d.

**Strategy 7 — LLM classifier fallback (~1.5d)**
- [ ] 5.4 Add `lib/services/scraperExtraction/llmAuthorClassifier.ts`. Sends ≤2KB of mod page text to Haiku with a constrained prompt.
- [ ] 5.5 Gated behind `EXTRACTION_LLM_FALLBACK=true` env flag. Fires only when strategies 1-6 all return null.
- [ ] 5.6 Daily budget cap (env var). Logs cost per run.
- [ ] 5.7 Result passes through the same denylist gate (strategy 8).

**Exit criteria:** each strategy independently improves null-author rate by ≥ 2pp at acceptable cost/latency, else do not ship.

---

**Total estimate: 4.5 dev-days for Phases 0-4. Phase 5 strategies are ~2.5d each if/when triggered.**

---

## Risks

| Risk | Mitigation |
|---|---|
| URL slug tokenization over-matches and produces false positives (e.g., `/halloween-decor` → matches `decor` when it should be `seasonal`) | Vocabulary priority list + unit test fixtures; "vocabulary priority" is explicit in R1 |
| LLM fallback (strategy 7) introduces cost/latency regression | Gated behind env flag; rate-limited; only fires when strategies 1-6 all fail |
| Fuzzy CreatorProfile matching (strategy 5) matches the wrong creator | Require edit distance ≤ 1 AND at least 4 char length; log every match for audit |
| Behavioral change to existing scrapes | `EXTRACTION_V2=true` env flag for gradual rollout; easy revert |
| Dry-run mode diverges from real run and misses bugs | Shared code path — dry-run only skips the DB write, everything else runs identically |

---

## Out of Scope

- ContentAggregator / PrivacyAggregator (see [PRD-scraper-facet-accuracy](./PRD-scraper-facet-accuracy.md)).
- Age group, gender, visual style extraction (different PRD).
- Retroactive fixes for existing rows.
- `contentTypeDetector.ts` confidence threshold tuning.

---

## Open Questions

1. Should we gate writes at `high` confidence only (stricter) and let medium-confidence extractions go to a review queue? **Recommendation:** no, too slow for 14k mods, but keep the `--confidence-threshold` flag for ops flexibility.
2. Should the Wayback Machine fallback (strategy 6) be in v1? **Recommendation:** no — wait for Phase 2 metrics first.
3. Do we want the LLM fallback (strategy 7) at all? **Recommendation:** defer — revisit if null-author rate > 5% after v1.

---

## Appendix: The "Watch CC" Example

> User's example: `/sims-4-watch-cc` → should categorize as watches.

Today this fails because [mhmScraperUtils.ts:184](../lib/services/mhmScraperUtils.ts) checks exact patterns like `/watches-cc/` or `/watch-cc/` which may or may not exist in the map. With R1's tokenization:

1. Split on `-`, `/`: `[sims, 4, watch, cc]`
2. Drop stopwords (`sims`, `4`, `cc`): `[watch]`
3. Lookup in `facetVocabulary`: `watch` → `watches` (accessories subcategory)
4. Return `{ contentType: 'watches', confidence: 'high', strategy: 'url-slug-keyword' }`

This is exactly the weighting the user asked for, and it works for every facet in the vocabulary without writing individual patterns.
