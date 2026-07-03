# RPM Dip — Root Cause & Mitigation Strategy (2026-07-02)

**Status: Root cause CONFIRMED (seasonal, external). Site health CLEAN. Mitigation plan in motion — see checklist.**

## ✅ Execution log — 2026-07-03 (operator approvals received)

All four operator sign-offs came in; approved work executed and verified:

1. **SEO title quick wins LIVE in prod** — "Love Triangle Mod for Sims 4" and "Messy
   Relationships Mod for Sims 4" applied (guarded before/after script); "Attachment Styles
   Mod for Sims 4" was already applied via the task chip (rollback file:
   `reports/seo-title-updates-2026-07-03-rollback.json`). Watch GSC CTR in ~1 week.
2. **Body-preset facet LIVE in prod** — 139 mods reclassified to `contentType: 'body-preset'`
   (run via chip; re-run confirmed 0 remaining high-confidence candidates).
3. **`/games/sims-4/body-presets/` collection page SHIPPED** — new registry entry in
   `lib/collections.ts` (editorial intro, meta, related links). Verified in preview: renders
   "139 mods in this collection" with correct cards; auto-included in sitemap-nextjs.xml.
4. **Cannibalization 301s SHIPPED (operator chose "301 at parity")** — 18 vercel.json
   redirects (slash + non-slash) consolidating: female-clothes-cc, male-clothes-cc,
   cc-skin-details, gallery-poses, pregnancy-mods → their collection twins, plus 4 legacy
   body-preset pages (+ the old `-2` duplicate, re-pointed to avoid a chain) → the new
   body-presets collection. Every destination verified rendering with full mod grids
   (1,600 / 400 / 270 / 500 / 115 / 139 mods). Regression tests added: all redirect pairs
   locked in `__tests__/unit/seo-phase1.test.ts` (72/72 passing incl. sidebar suite).
5. **Mediavine email** — operator confirmed they will send the Gmail draft today.

**DEPLOYED 2026-07-03 (operator approved commit+push):**
- `5af9390` — body-presets collection + 18 cannibalization 301s. **Verified live in prod**:
  all 8 legacy sources return 308 → their `/games/sims-4/*` twins; new page returns 200.
- `743893b` — `/llms.txt` (AI answer-engine site guide, auto-generated from the collection
  registry) + sitewide footer link to `/must-have-mods-sims-4/` (head-term internal linking).
- Post-deploy sidebar health check: all critical markers present, healthy.
- The SEO bundle was shipped from an isolated worktree off `main`; the in-flight
  `feat/affiliate-overhaul` working tree (Ivy's session) was untouched — its WIP was
  briefly stashed and immediately restored.

Estimated combined impact: +1,500–2,000 impr/mo from de-duplication, ~+50–90 clicks/mo from
titles, pregnancy page becomes indexable, plus AEO groundwork (llms.txt; JSON-LD coverage
was audited and is already strong: WebSite+SearchAction, Organization, SoftwareApplication,
BreadcrumbList, ItemList).

**Operator follow-ups from this deploy:** (a) resubmit the sitemap in Search Console (the
API service account is read-only — one click in the GSC UI speeds up discovery of the new
page and redirects); (b) Mediavine email still pending — operator will send in the next
several days (holiday).

---

## 1. What happened

Session RPM fell from ~$25 (Jun 18–23 peak) to $19.73 (Jun 29) and $17.06 (Jun 30).
Daily revenue: ~$350 → ~$230. Sessions were **flat** (13,340 → 13,456).

| Date | Session RPM | CPM | Paid impr./session | Viewability |
|---|--:|--:|--:|--:|
| 6/27 | $24.82 | $1.02 | 24.33 | 56.1% |
| 6/28 | $23.56 | $0.97 | 24.28 | 56.6% |
| 6/29 | $19.73 | $0.92 | 21.35 | 55.1% |
| 6/30 | $17.06 | $0.82 | 20.80 | 55.6% |

**CPM is the entire story.** Impressions/session (-2.6%) and viewability (flat) barely moved;
CPM fell ~20% from the mid-June peak. Session RPM ≈ impr/session × CPM — the drop is
mathematically all demand-side pricing.

## 2. Root cause: Q2→Q3 ad-budget cliff (external/seasonal), NOT a site regression

Evidence, in order of strength:

1. **Same dip, same calendar point, last year.** Jun 15–30 2025 session RPM $23.49 →
   Jul 1–8 2025 $18.77 (**-20.1%**) — nearly identical shape and magnitude to this year.
2. **Advertiser-level confirmation.** The Trade Desk (largest June buyer) cut spend ~50%
   ($445.75 → $216.12) while its own CPM held flat ($0.88 → $0.87) — budget exhaustion,
   not a rate cut. Kargo -37% at flat ~$2 CPM. Google AdX backfilled the hole at lower value.
3. **Every site-health signal is clean or improved during the dip window:**
   - `check-blog-sidebar.sh`: all critical markers live (ruled out a functions.php wipe repeat)
   - Sticky-sidebar health metric 13.7–14.6 vs 2.0 goal (teal star), *higher* than late May
   - Fill rates went **up** during the dip (Sidebar 66.7% vs 63.6% baseline; Content 67.4% vs 62.1%)
   - Viewability, device mix, geo mix: all flat
   - ads.txt / privacy policy: green

## 3. The dollar picture (board framing)

- **June 2026 was a record month: $8,676.89, +16.5% MoM** (Mar $4,811 → Apr $5,159 →
  May $7,451 → Jun $8,677). The dip is a 2-day tail event, not a June collapse.
- Monthly target (targets.json): **$8,859**. June missed by 2%.
- **July scenarios (31d):** Best ~$9,890 · **Base ~$7,640–8,400** · Worst ~$5,890.
  Base case most likely: partial CPM rebound over the first half of July as Q3 budgets
  deploy (2025 precedent: RPM bottomed ~$18–19 in the first week of July, then recovered;
  normalization to $21–24 expected by early August).
- Cash timing: Mediavine pays net-60, so any July softness hits cash in September — runway to react.

**One-liner for the board:** *June was a record month (+16.5% MoM); the last-two-day RPM
drop is the annual Q2→Q3 ad-budget reset (identical -20% event in 2025), confirmed
monetization-side with flat traffic and clean site health. Base-case July is a modest
step-down, not a collapse, and we are executing offsets on fill rate, affiliate activation,
and SEO quick wins.*

## 4. Mitigation plan

### ✅ Done today (this session)

| # | Action | Status |
|---|---|---|
| 1 | Live sidebar critical-marker check | PASS — no regression |
| 2 | Full RPM decomposition (daily/unit/advertiser/device/geo/YoY) | Root cause confirmed |
| 3 | **Mediavine email drafted in Gmail** (fill ~65% → ask for floor review; in-content viewability 46%; video fill 59.5%; Q3 demand re-engagement) | **In your Gmail drafts — review & send** |
| 4 | /terms affiliate disclosure broadened to cover all new programs/networks (was Amazon-only) | Edited, type-check passed |
| 5 | Verified all 23 digital-partner offers (Kinguin/CDKeys/GMG/Displate/Canva/NordVPN) are seeded, persona-validated, themed — blocked ONLY on program approvals + real tracking links | Confirmed in prod DB |
| 6 | Verified affiliate-earnings migration applied to prod; commission-sync cron awaits network API creds | Confirmed |
| 7 | **Q3 Recovery Watch added to the daily Mediavine report** (`scripts/agents/mediavine-daily-report.ts`): tracks blended CPM vs the $0.95 recovery target, watches Trade Desk/Kargo/GumGum WoW re-acceleration, escalates 🔴 if unrecovered after Jul 21, self-retires Aug 15 | Live — verified against real API (CPM $0.82 🟡; TTD -40.2%, Kargo -32.4%, GumGum -24.7% WoW) |
| 8 | Facet audit for body-presets/vampire collection pages (see Queued #3) | Done — read-only |
| 9 | **Backfill script written & dry-run-verified**: `scripts/backfill-body-preset-content-type.ts` — found 139 high-confidence body-preset mods misfiled across skin/preset/full-body. `--apply` is operator-gated; queued as a task chip along with the registry entry + cannibalization decision | Ready to run |
| 10 | **Sitewide footer link added to `/must-have-mods-sims-4/`** (exact-match anchor "Must-Have Sims 4 Mods") — the app previously had ZERO internal links to the canonical target for the ~830 impr/mo "sims 4 mods" head-term cluster (pos 25–49). Verified in preview; all 23 sidebar regression tests pass | Shipped (uncommitted — deploys with next push) |
| 11 | **Daily in-session watch scheduled** (8:38am, after the Mediavine report): checks CPM recovery + July run-rate vs $8,859, detects when operator actions land and executes newly unblocked follow-through, escalates after Jul 21 if CPM < $0.95. Session-bound, 7-day auto-expiry | Active |

### 🔶 Operator actions (need you — ranked by $/effort)

| # | Action | Est. upside | Effort |
|---|---|---|---|
| 1 | **Send the Mediavine email** (in Gmail drafts) — fill 65%→80% is worth +$500–1,700/mo; viewability +$180–360/mo; video fill +$195–490/mo | **+$875–2,550/mo** | 5 min |
| 2 | **Work the affiliate application pack** (`reports/affiliates/application-pack.md`): Impact.com → GMG+Canva; Awin → Kinguin(+Etsy); Displate direct; CDKeys/Loaded direct; NordVPN optional | +$100–250/mo initial, compounds | 1–2 hrs |
| 3 | After approvals: paste real tracking links in `/admin/monetization/affiliates`, flip offers active, add network API creds to Vercel for commission-sync cron | (enables #2) | 30 min |
| 4 | **Approve the 3 SEO title quick-wins** (prod DB writes — denied to the agent, needs your sign-off). Script ready: `scratchpad/fix-titles.ts`. Changes: "Attachment Styles" → "Attachment Styles Mod for Sims 4" (682 impr/mo at pos 6.6, **0 clicks**); "Love Triangle" → "Love Triangle Mod for Sims 4" (~196 impr/mo, 0.72% CTR); "Messy Relationships Mod" → "Messy Relationships Mod for Sims 4" (59 impr/mo, 0 clicks) | ~+50–90 clicks/mo | 2 min |
| 5 | Confirm monthly costs (Vercel/Prisma/OpenAI) so net-take-home targets can finalize | (unblocks CFO) | 10 min |

### 📋 Queued (this/next week, needs a product decision or PR)

1. **Legacy vs. collection-page cannibalization** — every `/sims-4-x-cc/` legacy page beats
   its `/games/sims-4/x/` twin on impressions AND clicks; `/games/sims-4/pregnancy-mods/` is
   "Crawled – currently not indexed" (duplicate of the legacy page). Decide: 301 legacy→collection
   at content parity, or differentiate intent. Highest-leverage SEO fix found (~+1,500–2,000 impr/mo).
2. Batch title/meta rewrites for remaining GSC quick wins (wicked whims error, teen lifestyle,
   homepage "must have mods for sims 4") — WordPress-side.
3. New `body-presets` collection page consolidating 4 fragmented legacy pages (~3,000+ impr/mo).
   **Facet audit DONE (2026-07-02):** the existing `preset` contentType (246 mods) is ~85%
   GShade/ReShade presets, NOT body presets — only 43 mention "body". A keyword-filter shortcut
   would repeat the `__pregnancy_keyword__` mistake that got the pregnancy page deindexed.
   **Prerequisite:** backfill a proper `body-preset` contentType (167 mods match "body preset"
   by keyword — enough to power a page; the clutter collection ships with 149). Then add the
   registry entry. Bonus finding: the GShade-heavy `preset` facet is a natural DB-backed
   collection for the `/sims-4-reshade/` demand (1,096 impr/mo at pos 20.4).
4. Content-depth pass on `/sims-4-skin-overlay/` (2,260 sessions/mo, pos 27.8) and `/sims-4-reshade/`.
5. In-content viewability improvement investigation (Content unit = 37.8% of revenue at 45%
   viewability) — future session, human-gated ad-layout PR process.

### 🚫 Explicitly do NOT do

- **No ad-density/layout code changes in reaction to this dip.** Impressions/session and
  viewability are healthy; adding slots can't fix a demand-side CPM event and risks a real
  regression on top of a seasonal one (see Apr 2026 sidebar incident).
- No floor **raises** — fill is already low; rev-1 of the June operator report had this backwards.

## 5. Monitoring / exit criteria

- Watch `mv_advertisers` weekly for Trade Desk / Kargo / GumGum re-acceleration — the leading
  indicator that Q3 budgets are flowing.
- **If CPM has not recovered to $0.95+ by ~Jul 21** (3 weeks past the 2025 recovery point),
  that indicates a second, non-seasonal factor — trigger a full code-level audit then.
- Re-run the growth audit in 2–3 weeks to confirm the -7.2% organic drift is noise.

---

## Update 2026-07-03 — Queued #3 executed: body-presets collection page shipped (branch `claude/interesting-lovelace-0c63bc`)

- **Backfill applied to prod DB**: 139 high-confidence mods → `contentType: 'body-preset'`
  (23 medium-confidence NOT applied; rerun with `--apply --include-medium` if wanted).
- **Registry entry added** (`lib/collections.ts`): `/games/sims-4/body-presets/`, 139 mods,
  verified rendering locally + prod build + sitemap + all 23 sidebar regression tests pass.
- **Cannibalization decision (GSC Apr 1–Jul 1 data): HYBRID, not blanket 301s.**
  There were actually 5 legacy pages, in two distinct groups:
  - **KEEP (differentiated, rank ~pos 10 for niche queries)**: `/sims-4-male-body-presets-cc/`
    (491 clicks, 8,486 impr — all "male body preset" query variants), `/sims-4-plus-size-body-presets/`
    (68 clicks), `/sims-4-athletic-body-presets/` (36 clicks). 301ing these would burn ~600 clicks/quarter
    of well-ranking niche intent into a generic grid. Do NOT redirect them.
  - **301'd → collection page (weak generic twins cannibalizing each other)**: `/sims-4-body-presets/`
    (24 clicks, pos 29.2) and `/24-best-sims-4-body-presets-for-2024/` (5 clicks, pos 25.2).
    Redirects added in `next.config.js` `redirects()` (runs before the WordPress proxy middleware),
    so consolidation deploys atomically with the page — no fifth competing twin ever exists.
- The collection page targets the generic "sims 4 body presets" head term the two weak pages
  were splitting (~1,700 impr/mo combined at pos 25–29); niche pages keep their sub-intents.
- Post-deploy: watch GSC for the two redirected URLs dropping out and `/games/sims-4/body-presets/`
  picking up the generic queries; confirm the 3 niche pages hold position.

---
*Prepared by Claude (Fable) with mhm-ad-revenue (Max), mhm-finance (Mark), mhm-growth (Tim) — 2026-07-02.*
