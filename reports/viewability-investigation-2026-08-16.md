# Viewability Investigation — 2026-08-16

**Status:** Investigation + fix plan only. Nothing shipped. Every fix below requires
separate board sign-off before any code/config change ships (per operator directive
2026-08-16 and charter.md autonomy rules — any Mediavine ad-layout change needs
explicit approval).

**Trigger:** Board-flagged overall Mediavine viewability of 55.77% vs the ~65-70%
healthy benchmark.

---

## 1. Headline numbers (live Mediavine MCP pull, site 14318, last 30 days: 2026-07-18 to 2026-08-16)

- Overall viewability: **55.04%** (blended across all ad units/devices) — consistent
  with the board's 55.77% figure (small variance = snapshot timing).
- Revenue: $5,976.49 · Sessions: 381,563 · Paid impressions: 7,421,331 · Session-RPM: $15.66
- **This is NOT a new regression.** The 2026-06-22 baseline (`targets.json`) already
  recorded overall viewability 57.57% / desktop viewability 45.9%, and explicitly
  noted it as Mediavine's Optimized Ad Experience (OAE) territory, "no action needed."
  Two months later it has drifted slightly further down (57.57% → 55.04%), not
  cliffed. `mv_health_history` (2026-07-18 to 2026-08-14, daily) shows
  desktop_viewability flat in a 43-46% band and mobile_viewability noisy 36-52%
  with no inflection point — this is a **chronic, structural pattern**, not an
  acute break to hunt for in a specific commit/deploy.

## 2. Breakdown by ad unit (30-day, `mv_ad_units`)

| Ad unit | Viewability | Revenue | Revenue share | Impressions | Impr. share |
|---|---|---|---|---|---|
| **Content** (in-content, `.mv-ads`) | **44.2%** | $2,393.82 | 40.1% | 2,952,428 | 39.8% |
| Sidebar Sticky | 62.2% | $1,735.10 | 29.0% | 2,742,682 | 37.0% |
| Adhesion (bottom bar) | 87.7% | $1,064.42 | 17.8% | 1,160,015 | 15.6% |
| Universal Player (video) | 82.0% (84.8% desktop) | $783.14 | 13.1% | 566,700 | 7.6% |

**Root cause #1 (primary): the "Content" in-content ad unit is simultaneously the
single largest revenue/impression unit AND the single lowest-viewability unit
(44.2%, ~13-40pp below every other unit).** Because it's 40% of both revenue and
impression volume, it single-handedly pulls the blended site average down from what
would otherwise be a healthy 65-75% (Adhesion + Universal Player + even
below-benchmark Sidebar Sticky average well above 55%). Desktop overall viewability
in `mv_devices` (44.2%) is numerically identical to the Content unit's desktop
figure — expected, since desktop is 96%+ of sessions/revenue and Content is desktop's
largest ad-count unit.

Device split (`mv_devices`, 30-day): desktop 44.2%, mobile 43.3%, tablet 47.5%. All
three device types show roughly the same depressed viewability — this is a
**placement/density pattern, not a device-specific bug.** (Mobile/tablet sample is
small: 22,410 + 1,588 sessions vs 357,559 desktop, so don't over-index on the
mobile number.)

Sidebar Sticky (62.2%) is below the 65-70% benchmark too, but nowhere near as far
off, and the site is independently confirmed **teal-star** on Mediavine's own
primary sidebar health metric (ads-per-session 11.3-14.3 vs goal 1.5,
`mv_health_history` summary). Treat Sidebar Sticky as secondary/monitor-only, not a
fire.

## 3. Page-level cross-check (`mv_top_pages`, ~100 pages pulled)

A clear correlation shows up between **in-content ad density per pageview** (a proxy
for how many `.mv-ads` injections Mediavine made on a page) and viewability:

| Page type example | Impressions/pageview | Viewability |
|---|---|---|
| `/category/sims-4/sims-4-mods/` (short listing) | 1.52 | 83.0% |
| `/category/sims-4/sims-4-cc/` (short listing) | 1.29 | 79.4% |
| `/category/.../page/3/` (short listing) | 1.08 | 80.3% |
| `/sims-4-wedges-cc/` (long mod grid) | 8.18 | 45.5% |
| `/sims-4-eyes-cc/` (long mod grid) | 8.64 | 52.6% |
| `/sims-4-male-urban-clothes/` (long mod grid) | 14.83 | 56.5% |
| `/sims-4-cc-tattoo/` (long mod grid) | 16.06 | 56.6% |
| `/new-sims-4-mods-2026/` (long mod grid) | 19.94 | 63.5% |
| `/black-sims-4-cc/` (long mod grid, high revenue) | 24.18 | 58.9% |

Pages with a handful of ads (~1-1.5/pageview — short category listing templates)
consistently show 79-83% viewability. Pages built around the long, dense mod grid
(8-25+ ads/pageview) mostly cluster 45-65%, with a long tail of high-traffic
collection pages (`/sims-4-male-urban-clothes/`, `/sims-4-skin-overlay/`,
`/sims-4-wedges-cc/`, `/sims-4-cas-background-cc/`) sitting in the 45-56% range —
below even the Content unit's own 44.2% average in some cases, above in others. This
is directional, not deterministic (`/must-have-mods-sims-4/` bucks the trend at
24.86 ads/pageview and 65.8% viewability), but the pattern is strong enough across
dozens of long-tail pages to treat grid length/ad density as the dominant lever.

**No `/go/[modId]` interstitial URLs appear in the top-100 `mv_top_pages` pull** —
either grouped elsewhere in Mediavine's reporting or under a low enough
volume/threshold not to surface individually. Its below-the-fold risk (see §4) is a
structural hypothesis from the code, not something directly confirmed in the
Mediavine data pulled today.

## 4. Codebase cross-reference

- **`components/ModGrid.tsx:104`** — `.mv-ads` is applied to a *single* container
  wrapping the entire mod grid:
  ```tsx
  <div className={`grid ${getGridClasses(gridColumns)} gap-x-6 gap-y-10 mv-ads`}>
  ```
  Mediavine injects Content ad units between the direct children of this one
  container. With the default page size (see next bullet), that's a 4-column ×
  5-row grid (20 mod cards) in one flat `.mv-ads` block — several of the resulting
  ad injections land in rows 3-5, which are below a typical above-the-fold viewport
  on both desktop and mobile. This is the single container responsible for the
  largest share of "Content" unit impressions site-wide (grid/category pages
  dominate `mv_top_pages` volume).
- **`app/page.tsx:34,366-374`** — `modsPerPage` defaults to `20`, user-selectable
  `[20, 50, 100]`. Selecting 50 or 100 stretches the same single `.mv-ads` grid to
  12-25 rows, compounding the same below-the-fold pattern for any user who picks a
  larger page size.
- **`app/go/[modId]/GoClient.tsx:454-521`** — two separate `.mv-ads` anchors:
  1. `displayFallbackRef` (video/display fallback, lines 454-460) sits directly
     under the primary CTA card, above the fold — matches the healthy 82-85%
     desktop Universal Player number.
  2. The **content-hub `.mv-ads` block** (install guide + Pinterest CTA, lines
     478-521) sits *below* the video ad, further down the page. The countdown is
     10s (`useState(10)`, line 42) and the CTA (`canProceed`) activates as soon as
     it hits zero — a real risk that a meaningful share of users click "Continue to
     Download" and leave before ever scrolling to this second `.mv-ads` block. This
     is a plausible contributor to the Content unit's low viewability but is **not
     confirmed by Mediavine page-level data** (see §3) — flagging as a hypothesis
     needing GA4 scroll-depth data before committing to a specific fix.
- **Sidebar (`<aside id="secondary">`)** — confirmed intact and correctly configured
  on all four required page types (`npm test -- sidebar-sticky-health`, 23/23
  passing today). No `position: sticky/fixed`, no placeholder divs, `lg:` breakpoint
  correct. Sidebar Sticky's 62.2% viewability is not a config bug.
- **`docs/MEDIAVINE_AD_STRATEGY.md`** is a pre-launch (Dec 2024) planning doc, not a
  description of the current live implementation — several of its placement
  recommendations (leaderboard, custom `data-ad-unit` wrappers) were superseded by
  the actual Mediavine Script Wrapper / OAE integration. Not used as evidence here.

## 5. Ranked fix plan

All items below touch either Mediavine ad-layout (`mv-ads`) or a
revenue-generating page structure and therefore require **explicit board sign-off**
before any code ships, per charter.md. Each states the guardrail it must respect.

### 1. Escalate Content-unit viewability to the Mediavine account rep (OAE density review)
- **Est. impact:** Hard to size precisely — pure account-management lever, zero
  dev cost. If OAE tuning lifts Content-unit viewability even 10pp (44.2% → ~54%)
  and viewable impressions carry a modest CPM premium (5-15% is a commonly cited
  publisher range, not confirmed for this specific demand mix), that's roughly
  **+$120 to +$360/mo** on the $2,394/mo Content-unit revenue base. Treat as a wide,
  unproven range pending Mediavine's response — do not present to the board as a
  precise number.
- **Effort:** S (email/support ticket, no code).
- **Evidence:** `targets.json` baseline note (2026-06-22): "Mediavine OAE ENABLED —
  desktop/mobile viewability + in-content ads are Mediavine-managed... NOT a
  code-side issue." That framing is 2 months old and the number hasn't improved on
  its own; time to actively ask the rep rather than passively accept "OAE handles
  it," especially since Content is the single largest revenue unit.
- **Risk:** None — informational ask, no site change.
- **Guardrail:** N/A (no code/layout change). This is the correct-sequence first
  move: confirm with Mediavine whether they've already tuned for us before building
  anything.

### 2. Reduce default mod-grid page size (`modsPerPage`) from 20 → a smaller default (e.g. 12-16)
- **Est. impact:** Grid/category pages are ~85% of pageview volume in
  `mv_top_pages`. Shortening the default grid reduces how many `.mv-ads` Content
  injections land 3+ rows below the fold, at the cost of more pagination clicks
  (which are themselves fresh pageviews / fresh ad opportunities, so may be RPM-
  neutral-to-positive, not just a viewability play). Rough estimate, same
  uncertainty caveats as #1: **+$150 to +$300/mo** if it moves the Content unit
  meaningfully toward the 55-60% viewability band that mid-density category pages
  already show. This is the one recommendation with a plausible mechanism we can
  actually test (SD-2 measurement protocol: before-snapshot, 2-week measurement
  window, keep/kill on viewability + session-RPM, not just viewability alone).
- **Effort:** S — one line change (`app/page.tsx:34`) plus updating the `[20, 50,
  100]` selector default.
- **Evidence:** `components/ModGrid.tsx:104` (single `.mv-ads` spanning the whole
  grid); `mv_top_pages` density correlation (§3).
- **Risk:** Low-medium. More pagination clicks could mildly hurt session length/UX
  if pushed too far — start with 16, not something aggressive like 8. Does **not**
  change ad density/count (Mediavine's OAE still decides how many ads to show) —
  it changes page length, a legitimate UX lever, not a "cram more ads in" trick.
- **Guardrail:** Must preserve `.mv-ads` class and ≥2 children on the grid
  container (already true); must not touch `<aside id="secondary">` or sidebar
  breakpoints. Cite this guardrail explicitly in the PR since it touches the
  `mv-ads`-bearing grid component.

### 3. Validate the `/go/[modId]` content-hub block position with real scroll-depth data before changing it
- **Est. impact:** Unknown — this page type doesn't surface in `mv_top_pages`
  today, so there's no page-level Mediavine viewability number to size against. Do
  **not** commit to a layout change on unconfirmed data.
- **Effort:** S to instrument (GA4 scroll-depth event on `/go/[modId]`), M if a
  layout change is later warranted.
- **Evidence:** `app/go/[modId]/GoClient.tsx:478-521` — content-hub `.mv-ads` block
  sits below the video ad, and the 10s countdown may let users leave before
  scrolling to it.
- **Risk:** N/A yet — this is a "get more data" recommendation, not a shippable
  fix. Any eventual layout change here must not shorten or manipulate the honest
  10s countdown (charter.md: "No dark patterns... fake countdowns beyond the
  honest download timer") and must keep the CTA above the fold per the existing
  "download interstitial CTA above the fold" pattern already validated in
  compound learnings.
- **Guardrail:** Any change to this page's `.mv-ads` block or CTA ordering is a
  Mediavine ad-layout change and needs board sign-off; must keep ≥2 children in
  the `.mv-ads` wrapper.

### 4. Sidebar Sticky (62.2%) — monitor only, no layout change recommended
- **Est. impact:** N/A — not recommending a fix.
- **Rationale:** Sidebar is independently teal-star on Mediavine's primary
  ads-per-session metric (11.3-14.3 vs goal 1.5). 62.2% viewability is below the
  65-70% benchmark but far closer to healthy than the Content unit, and the CLAUDE.md
  forbidden-patterns list (`position: sticky/fixed` on ad containers,
  `min-h-[250px]` placeholder divs inside `<aside id="secondary">`) covers exactly
  the changes a well-intentioned dev might reach for here — both are explicitly
  banned because they've previously hurt this metric. **Recommend leaving sidebar
  code untouched**; if the grid-length fix (#2) improves overall session
  scroll-depth, Sidebar Sticky viewability likely improves incidentally.
- **Guardrail:** No sticky/fixed CSS, no placeholder divs, `lg:` breakpoint — do
  not reintroduce any of these while investigating.

## 6. What needs board sign-off to ship

Per charter.md, **all four items above require explicit human approval before any
code/config ships** — none are exempt:
- #1 (Mediavine escalation) needs sign-off to send on the account's behalf, but is
  otherwise zero-risk/zero-code — the fastest one to approve.
- #2 (`modsPerPage` default change) is a Mediavine ad-layout-adjacent change
  (touches the `.mv-ads`-bearing grid) and must go through: draft on a feature
  branch + PR citing this report and the guardrail respected, board approval to
  merge, then a recorded before/after snapshot (session-RPM, Content-unit
  viewability, session-RPM) per SD-2 before calling it a keep.
- #3 (GA4 instrumentation) is lower-risk (analytics only, no visible change) but
  still touches a revenue page — flag to board before adding.
- #4 is a decision not to act — no sign-off needed, but recorded here so it isn't
  re-investigated as a "missing fix" next time viewability comes up.

---

*Filed by Max, Ad Revenue Ops. Read-only investigation — `mv_ad_units`,
`mv_devices`, `mv_health_status`, `mv_health_history`, `mv_metrics_summary`,
`mv_top_pages` (Mediavine reporting MCP, site 14318); `npm test -- sidebar-sticky-health`
(23/23 pass); source read of `components/ModGrid.tsx`, `app/page.tsx`,
`app/go/[modId]/GoClient.tsx`, `docs/MEDIAVINE_AD_STRATEGY.md`. No code changed, no
scripts run beyond the test suite, no deploys.*
