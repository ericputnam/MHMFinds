# PRD: Paywalled Patreon Mods → `isFree=false` + Tier-2 Author Recovery

**Status:** Phase 1 & 2 Completed · Phase 3 Not Started
**Created:** 2026-04-27
**Owner:** Scraper pipeline
**Scope:** New scrapes (live wiring) + retroactive backfill of all Patreon `/posts/{id}` mods.

---

## Problem Statement

The author extractor (`lib/services/scraperExtraction/authorExtractor.ts`) calls the public Patreon posts API at `https://www.patreon.com/api/posts/{id}`. Paid (membership-gated) posts respond with HTTP 403 and `code_name: "ViewForbidden"`. The extractor was correctly returning `{ candidate: null, isPaywalled: true }` for these — but the `isPaywalled` signal was not propagating to the persisted `Mod.isFree` column. Result:

- Paid mods got stored with `isFree: true` (the Mod schema default), mislabeling them as free in the UI and in search facets.
- Author column was null on every paid mod (public API can't see them), with no path to recovery short of manually editing each row.
- Real-world example: **Yuqi Hair** at `https://www.patreon.com/posts/yuqi-hair-138279450` — paid post, scraped with `isFree: true`, `author: null`.

This PRD ties three loose ends together: (1) live-scraper isFree wiring, (2) one-time backfill, and (3) Tier-2 cookie-auth author recovery for the paid posts the public API can't read.

---

## Root Cause

| # | Issue | Location |
|---|---|---|
| 1 | `extractAuthor()` orchestrator did not surface `isPaywalled` from `fromPatreonApi()` to its caller | [authorExtractor.ts](../lib/services/scraperExtraction/authorExtractor.ts) `ExtractAuthorResult` |
| 2 | `mhmScraper.ts` ignored the paywall signal — `isFree` was driven only by the description heuristic (`"early access"` / `"patreon exclusive"` substrings), which most paid posts don't include | [mhmScraper.ts:823](../lib/services/mhmScraper.ts) |
| 3 | No backfill existed for the ~1,700 already-scraped Patreon `/posts/` mods | — |
| 4 | The public API can never recover author for paid posts (403 ViewForbidden), so even with isFree fixed, `author` stays null forever without a cookie-authenticated path | — |

---

## Goals

1. **Persist `isFree=false` on every paid Patreon post** — both new scrapes and existing rows.
2. **Recover author for paid posts** via Tier-2 cookie auth (one-time login → cached session → JSON:API call with cookies).
3. **Keep the recovery logic consistent** with the public-API path (same full_name → campaign.name → vanity fallback chain, same denylist).

### Non-Goals

- Scraping Patreon's rendered HTML. The cookie-auth path uses the same JSON:API endpoint the public path uses; we just attach session cookies. No DOM scraping.
- Recovering paid posts on the live scraper (Tier-2 is offline-only — runs as a backfill against accumulated `isFree=false, author=null` rows).
- Charging the user a Patreon membership to access tiered content. The cookie auth uses an existing logged-in session; we don't subscribe to creators on the user's behalf.

---

## Requirements

### R1. Surface `isPaywalled` from extractor — ✅ COMPLETED

**Current:** `fromPatreonApi()` returns `{ candidate, isPaywalled }`. The `extractAuthor()` orchestrator passes `isPaywalled` through on its `ExtractAuthorResult`.

**Test coverage:**
- `__tests__/unit/authorExtractor.test.ts:1075` — flags `isPaywalled=true` on 403 ViewForbidden
- `__tests__/unit/authorExtractor.test.ts:1286` — surfaces on orchestrator result
- `__tests__/unit/authorExtractor.test.ts:1305` — stays undefined when API succeeds (no false positives)

**Files:**
- [`lib/services/scraperExtraction/authorExtractor.ts`](../lib/services/scraperExtraction/authorExtractor.ts) — `PatreonApiResult` + `ExtractAuthorResult.isPaywalled`

### R2. Live-scraper isFree wiring — ✅ COMPLETED

**Current:** [`mhmScraper.ts:784-823`](../lib/services/mhmScraper.ts) reads `v2Result.isPaywalled` from every `extractAuthor()` call. The persisted `isFree` is now:

```typescript
const descSaysPaid =
  description.toLowerCase().includes('early access') ||
  description.toLowerCase().includes('patreon exclusive');
const isFree = !descSaysPaid && !isPaywalledFromApi;
```

The Patreon API signal is authoritative — it overrides description-based heuristics in either direction.

**Files:**
- [`lib/services/mhmScraper.ts`](../lib/services/mhmScraper.ts:823)

### R3. One-time backfill of existing rows — ✅ COMPLETED

**Current:** [`scripts/backfill-mhm-authors.ts:140-180`](../scripts/backfill-mhm-authors.ts) walks every mod, calls `extractAuthor()`, and applies `isFree: false` whenever the API returns `isPaywalled: true`. Two paths:

- Author recovered via campaign/vanity fallback → write both `author` and `isFree: false`.
- Author unrecoverable but post confirmed paywalled → write `isFree: false` only; `author` stays null for Tier-2.

**Verification (run 2026-04-27):**

| Metric | Count |
|---|---|
| Total Patreon `/posts/{id}` mods | 6,189 |
| Marked `isFree: true` | 4,512 |
| Marked `isFree: false` (paywalled detected) | 1,677 |
| Paywalled with author recovered (campaign/vanity) | 1,672 |
| Paywalled with `author: null` (Tier-2 backlog) | 5 |
| Mods still `isFree: true, author: null` (extractor edge cases) | 3 |

The Yuqi Hair example now stores `isFree: false`. Author remains null pending R4.

### R4. Tier-2 cookie-auth author recovery — 🟡 BUILT BUT UNRUN

**Current:** [`scripts/resolve-paywalled-patreon.ts`](../scripts/resolve-paywalled-patreon.ts) exists. It uses Playwright to log in once (interactive `--login` flow), saves cookies to `.playwright-state/patreon-state.json`, then re-runs the same JSON:API request with cookies attached. Paid posts come back fully populated; we run them through the same `isValidAuthor` denylist as the public path.

**Outstanding work:**
- [ ] 4.1 First-run interactive login: `npx tsx scripts/resolve-paywalled-patreon.ts --login`
- [ ] 4.2 Dry run on the 5 known paywalled+null-author rows: `npx tsx scripts/resolve-paywalled-patreon.ts --limit 5`
- [ ] 4.3 Verify spot-check: at least 4/5 recover a real-looking creator name
- [ ] 4.4 Apply to DB: `npx tsx scripts/resolve-paywalled-patreon.ts --apply`
- [ ] 4.5 Schedule monthly cookie refresh — Patreon sessions expire; add a calendar reminder or wire into the compound automation

**Why not automated yet:** the interactive `--login` step requires a human to type a password into a Playwright-controlled browser. Until we have a stored secret + headless login flow, this stays manual.

### R5. Edge-case investigation — 🟡 OPEN

**Current state:** 3 mods still hold `isFree: true, author: null` for `patreon.com/posts/` URLs. These didn't trigger `isPaywalled` during backfill, suggesting either:
- The API returned 200 with no `included[].user` block (rare / corrupted post)
- The post was deleted between scrape and backfill (would return 404, not 403)
- The URL pattern slipped past `fromPatreonApi()` (e.g., trailing query strings or non-numeric IDs)

**Outstanding work:**
- [ ] 5.1 Identify the 3 affected mod IDs and inspect their downloadUrls
- [ ] 5.2 If URL parser missed them, tighten the regex in `fromPatreonApi()` and add a test fixture
- [ ] 5.3 If posts are deleted, mark them inactive (`isActive: false`) instead of fixing isFree

---

## Acceptance Criteria

- ✅ Live MHM scrapes write `isFree: false` for any post where the Patreon API returns 403 ViewForbidden.
- ✅ Backfill has been run and 1,677 existing paid Patreon mods are correctly flagged.
- 🟡 Tier-2 resolver has been run end-to-end at least once; ≤ 10 paywalled+null-author rows remain.
- 🟡 The 3 anomalous `isFree: true, author: null` mods have been investigated and either fixed or marked inactive.
- ✅ No regression: `% paywalled mods correctly flagged` ≥ 99% (currently 1,677 / ~1,680 expected = 99.8%).

---

## Out of Scope

- WeWantMods scraper paywall handling. WWM uses a different content model — most paid mods are linked from external Patreon posts, but the WWM scraper itself doesn't call the Patreon API yet. See [PRD-mhm-wwm-extraction-fixes](./PRD-mhm-wwm-extraction-fixes.md) R2 for the broader author-extraction unification work.
- Aggregator paths (CurseForge, Tumblr direct ingest). These don't use the Patreon API.
- UI changes — the existing free/paid badge already reads from `Mod.isFree`; no client-side work needed.

---

## Risks

| Risk | Mitigation |
|---|---|
| Patreon's public API rate-limits us during backfill | Throttle 1.5s/request (already implemented in backfill script) |
| Cookie session expires mid-run | Resolver detects 401/403 with auth and prints a "re-run --login" message; safe to resume |
| Patreon changes the JSON:API shape | Tests in `authorExtractor.test.ts` lock the expected shape. Resolver shares the parsing logic, so a single fix updates both paths |
| `code_name: "ViewForbidden"` definition shifts | Treat any 403 with the cookie path as paywall-and-still-blocked; log for manual review |
| Tier-2 cookies leak into git | `.playwright-state/` is gitignored. Verified before merge. |

---

## Implementation Notes

- **Why we don't trust description heuristics alone:** Most paid Patreon posts don't include the literal strings "early access" or "patreon exclusive" in their public preview text. Examples in the DB show paid posts with previews like "Hi friends! Here's the new hair 💕" — purely descriptive, no monetization signal. The API's 403 ViewForbidden is the only reliable indicator.
- **Why a separate Tier-2 script vs. inline in the live scraper:** Cookie-auth is fragile (session expiry, login walls, Cloudflare bot challenges) and slow (Playwright init ~3-5s). Keeping it offline lets the live scraper stay fast and headless, while the resolver runs as a periodic backfill against accumulated null-author paid mods.
- **`updateMany` vs. `update`:** Some scripts use `updateMany` because `downloadUrl` is non-unique in the DB schema (the same Patreon post can be linked from multiple MHM blog posts). `update({ where: { id } })` is preferred when targeting a specific row.
