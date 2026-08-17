# Traffic Drop Diagnosis — 2026-08-16

**Scope: diagnosis only. No fixes, no deploys, no publishing (per board directive).**
**Prepared by:** Mark, CFO — mhm-team

## Bottom line up front

**The reported 18.4% week-over-week session drop (76,643 vs 93,896) is substantially a
Mediavine data-pipeline artifact, not a real traffic collapse.** GA4 (an independent traffic
source) shows the real decline is **~5%**, and ad revenue actually **rose 2.8% WoW**
($1,351.36 → $1,389.78) with paid impressions essentially **flat** (-1.4%). A genuine 18%
session collapse would show a corresponding drop in impressions/revenue — it doesn't. Net
take-home is not at meaningful risk from this event.

## 1. Is it a step change or gradual? (mv_metrics_daily, 21 days)

Neither, cleanly — it's a **measurement artifact stacked on a mild gradual softening**.

Mediavine's own daily breakdown (`mv_metrics_daily`, 2026-07-27 to 2026-08-16) shows
**sessions = 0 and pageviews = 0 for 2026-08-15**, despite that same day recording
**$244.67 in revenue** (the 2nd-highest day in the 21-day window), 283,201 impressions,
and a session RPM component (`monetizable_session_rpm`) of $28.31 — the **highest** of
the entire period. 2026-08-16 (today) is also zero across the board, which is expected
since the day isn't over.

This means Mediavine's `sessions`/`pageviews` fields had not finished ingesting for
2026-08-15 at the time of this pull, while its revenue/impression fields (which come from
a faster real-time bidding pipeline) were already populated. Summing Mediavine's own daily
session figures for 8/9–8/14 gives exactly 76,643 — **Aug 15 contributes zero**, which is
what drags the "last 7 days" total down.

**Cross-check via GA4** (independent of Mediavine's pipeline) confirms this — daily sessions,
last 14 days + today:

| Date | GA4 sessions | Date | GA4 sessions |
|---|--:|---|--:|
| 08/02 | 13,955 | 08/09 | 14,641 |
| 08/03 | 13,743 | 08/10 | 12,884 |
| 08/04 | 13,458 | 08/11 | 13,080 |
| 08/05 | 14,095 | 08/12 | 12,526 |
| 08/06 | 13,424 | 08/13 | 12,149 |
| 08/07 | 13,786 | 08/14 | 12,258 |
| 08/08 | 12,617 | **08/15** | **13,470** ← real, not 0 |
|  |  | 08/16 (partial, today) | 7,803 |

GA4 shows a **real day** on 8/15 with 13,470 sessions — near the period's Aug-9 peak, not a
collapse. Recomputing the WoW comparison with GA4's complete data:
- Prior week (Aug 3–9): **95,764 sessions**
- Current week (Aug 9–15): **91,008 sessions**
- **Real decline: ~5.0%**, not 18.4%.

There is a genuine, mild, gradual softening visible from ~13,900/day (late Jul–early Aug)
down to ~12,100–12,900/day across Aug 10–14, before rebounding on Aug 15. This is a soft
dip, not a cliff.

## 2. Where is it concentrated? (mv_top_pages, mv_devices, mv_countries)

**Broad-based, not concentrated — and largely disappears once normalized per real day of
data.** Comparing the buggy "last 7 days" window (Aug 10–16, which itself contains the same
two zero/partial days) against the prior week (Aug 2–8) on raw totals makes every top page
look down 25–40% (homepage, `/new-sims-4-mods-2026/`, `/blog/`, category pages, and most
`/sims-4-*-cc/` pages all in that range). But that comparison is 5 real days of data vs 7
real days. Normalizing to per-day rates:

| Page | Prior wk/day | Current wk/day (normalized) | Δ |
|---|--:|--:|--:|
| `/` (homepage) | 759 | 750 | -1.2% |
| `/new-sims-4-mods-2026/` | 275 | 269 | -2.4% |
| `/blog/` | 277 | 264 | -4.6% |
| `/sims-4-cc-furniture/` | 231 | 243 | +5.2% |
| `/sims-4-skin-overlay/` | 231 | 222 | -4.2% |
| `/sims-4-male-urban-clothes/` | 279 | 241 | -13.9% |

No page shows the ~25–40% headline decline once you account for the missing days — most are
flat to single-digit down, one (furniture) is up. No single page or cluster stands out as an
indexing/ranking casualty, which argues against a targeted algorithmic or technical hit on
specific content.

**Devices:** Same normalization issue applies (5 real days vs 7). Per-day mobile sessions:
current ~765/day vs prior ~771/day — flat. Desktop share of sessions actually held/rose
slightly (no shift toward mobile-specific SERP/Discover loss).

**Geos:** US per-day sessions ~4,657 (current) vs ~4,801 (prior), UK ~790 vs ~820 — both
roughly -3 to -4%, consistent with the mild broad softening, no single geo standing out.

**Conclusion:** the drop (to the extent it's real) is diffuse across the whole site — a
demand-side/seasonal signature, not a page-specific ranking loss or a single-market SERP
change.

## 3. Revenue/impressions reconciliation (the strongest evidence)

| Metric | Prior wk (Aug 3–9) | Current wk (Aug 9–15) | Δ |
|---|--:|--:|--:|
| Sessions (Mediavine, as reported) | 94,008 | 76,643 | -18.5% |
| Sessions (GA4, complete) | 95,764 | 91,008 | -5.0% |
| **Paid impressions** | 1,751,766 | 1,726,656 | **-1.4%** |
| **Revenue** | $1,351.36 | $1,389.78 | **+2.8%** |
| Session RPM | $14.37 | $18.13 | +26.2% |

If sessions genuinely fell 18.4%, impressions (which scale with pageviews/sessions) should
have fallen by a similar order of magnitude. They didn't — impressions are flat and revenue
is **up**. This is the clearest confirmation that the headline number is a measurement
artifact: the "sessions" denominator was undercounted for the current week, which
mechanically inflates the computed session RPM and makes the session count look worse than
the underlying ad-serving activity actually was.

## 4. Context checks

- **Seasonality:** mid-August is back-to-school season; a mild single-digit session
  softening is consistent with normal seasonal cooling and matches the magnitude (not the
  shape) of prior seasonal dips documented in `reports/rpm-dip-mitigation-2026-07-02.md`
  (which found a similar external, ad-demand-driven "dip that looks scarier than it is"
  pattern in early July — that one was CPM-driven, not session-driven, but the diagnostic
  lesson — check the underlying components before reacting — applies directly here).
- **Deploys:** `git log --all` for Aug 1–16 shows exactly 2 merges to `main`, both dated
  **Aug 1** (`feat(seo): catalog mod cross-links from ranking listicles`,
  `docs(seo): listicle refresh queue`) — over a week before the Aug 10–14 dip window, and
  both are internal-linking additions (net positive for crawlability), not regressions. No
  deploy correlates with the timing of the dip. `check-blog-sidebar.sh`-style regression
  concerns (functions.php wipes, sidebar health) are out of scope here since nothing shipped
  in the dip window.
- **Prior known pattern:** commit `195436d` (already on this branch, pre-existing before this
  task) — *"fix(agents): anchor daily-report rolling windows at last fully-finalized day"* —
  is the exact same class of bug: rolling "last N days" windows that include a day Mediavine
  hasn't finished ingesting yet produce artificially low totals. That fix was applied to the
  automated daily-report script; it does **not** cover ad-hoc/manual Mediavine MCP pulls
  (like the one that produced the 76,643 figure this diagnosis was asked to investigate) or
  the `mv_top_pages`/`mv_devices`/`mv_countries` tools, which have no equivalent guard.

## Ranked causes

1. **Mediavine session/pageview reporting lag on the most recent 1–2 days (primary, ~13
   points of the 18.4%).** Confirmed by: Aug 15 = 0 sessions but $244.67 revenue and peak
   RPM; GA4 shows Aug 15 = 13,470 real sessions; impressions/revenue flat-to-up WoW.
2. **Mild genuine seasonal softening (~5%, real, GA4-confirmed).** Broad-based across pages,
   devices, and geos — no concentration. Consistent with back-to-school timing. Not a
   crisis; matches normal week-to-week variance.
3. **Ruled out:** page-specific indexing/ranking loss (no page cluster stands out once
   normalized), device-specific SERP/Discover change (device mix flat), geo-specific event
   (no country stands out), and a code/deploy regression (no site changes shipped in the dip
   window; nearest deploy is Aug 1 and is a positive SEO change).

## Recommended recovery action

**No site fix is warranted — this is a measurement/reporting issue, not a revenue problem.**

1. **Re-pull the WoW comparison in 2–3 days** once Mediavine finalizes Aug 15–16 data, to
   confirm the true number lands near the GA4-implied ~-5%, not -18.4%.
2. **Apply the same "anchor at last fully-finalized day" guard** (pattern from `195436d`) to
   any ad-hoc Mediavine MCP pulls used for WoW reporting/board updates going forward — this
   is a process fix (how we read the data), not a code fix to the site. Recommend Ivy/Max
   adopt this convention for the growth/ad-revenue dashboards too.
3. **Keep watching the mild ~5% GA4 softening** for another 1–2 weeks; if it's seasonal
   noise (my base case, consistent with Aug-15's rebound to 13,470) it should self-correct.
   If it deepens or fails to recover by early September, escalate for a deeper SEO/technical
   audit at that point (per the exit-criteria pattern used in the July RPM dip playbook).

## $/month at stake

The task's framing assumed ~$1,300/mo at stake if the full 18.4% "recovered." That figure is
**not supported by the data** — most of it was never lost. Using the GA4-confirmed real
decline (~5%) against the current revenue run-rate (~$1,350–1,390/week, i.e. ~$5,800–6,000/mo):
**≈ $250–350/month** is the actual amount attributable to the genuine seasonal softening —
and given impressions/revenue are already flat-to-up WoW, even that is likely to self-correct
without any team action. **This is a false alarm at the ~$1,300/mo level; treat as a
process/reporting fix, not a revenue emergency.**

— Mark, CFO
