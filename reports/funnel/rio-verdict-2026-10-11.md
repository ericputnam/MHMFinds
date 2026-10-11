VERDICT: GREEN — E163 demand reset over on revenue; E174 sidebar residual EXTENDED on the 2025 control (not closed, not reopened)
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — first 🟢 GREEN since the E163 reset (finalized 10-09), with the reads the missed 10-08/10-09/10-10 runs owed — read 2026-10-11 (E185)

Runs 10-08, 10-09 and 10-10 never reached the agents (CLI auth token expired), so none of Rio's scheduled reads happened. This file is those reads, with the numbers. **Sources:** Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct (the Mediavine MCP was unavailable this session; scratch `/tmp/rio-1011-pull.mts`, `/tmp/rio-1011-trend.mts`, aggregates only); `scripts/agents/page-rpm-snapshot.ts` (E60 tool); Patreon Members API via `patreon-members-lib` + `patreon-q4-gate-preread.ts --anchor rename --no-write` (6,087 members, 13 pages, `links.next` exhausted; counts only); `scripts/agents/affiliate-pipe-read.ts` (E153 tool, to `/tmp`); GA4 property 437117335 via the Data API; the 10-07 and 10-11 scoreboard JSONs and operator-did probes for the mornings that ran. Requests = Σ paid_impressions ÷ fillrate over `adunits`; "4-wk mean" = same weekday, prior 4 weeks.

## 1. Circuit breaker (guardrail 2026-10-11, finalized 10-09)

🟢 GREEN. 10-09 revenue $208.34 vs $196.67 (+5.9%), session RPM 18.00 vs 16.29 (+10.5%), sessions 11,569 vs 12,055 (−4.0%); 3-day revenue $589.26 vs $552.47 (+6.7%); Mediavine health ok. 28d $5,843.16 (+0.5% vs prior 28d; guardrail line 95% → 98.6% of line). Site revenue vs its 4-wk mean on the four days since the last verdict: 10-06 +6.0%, 10-07 +13.0%, 10-08 +1.1%, 10-09 +5.9%. CPM 1.04 / 1.05 / 1.00 / 1.05 (was 0.81–0.92 inside the reset). **The E163 demand reset is over on revenue.** No deploy in question; no rollback; Tier 0/1 merges clear.

## 2. E174 — Sidebar Sticky residual (scheduled read 10-09 on finalized 10-06 + 10-07; 10-08 + 10-09 added)

**Rule (pre-committed 10-07, restated before the pull):** close if Sidebar Sticky ÷ Content revenue ≥ 0.68 on either scheduled day OR sidebar's gap to its 4-wk mean is within 10 pts of Content's; reopen ON-SITE as a Tier 2 package only if ratio < 0.65 on both scheduled days AND sidebar ≥ 10 pts worse than Content on both AND `sticky_sidebar_ads` < 9.0 on any day.

| day | site vs 4-wk mean | Sidebar Sticky vs mean | Content vs mean | sidebar − content gap | sidebar ÷ content | sidebar fill − content fill | `sticky_sidebar_ads` |
|---|--:|--:|--:|--:|--:|--:|--:|
| 10-06 Tue | $197.85 (+6.0%) | $47.08 vs $52.52 (**−10.4%**) | $71.86 vs $67.35 (+6.7%) | −17.1 pts | **0.66** | 62.3% vs 61.7% = +0.6 | 10.29 |
| 10-07 Wed | $201.38 (+13.0%) | $47.26 vs $49.73 (−5.0%) | $73.92 vs $65.26 (+13.3%) | −18.2 pts | **0.64** | 64.3% vs 64.7% = −0.4 | 10.09 |
| 10-08 Thu | $179.44 (+1.1%) | $38.63 vs $49.23 (**−21.5%**) | $65.17 vs $64.86 (+0.5%) | −22.0 pts | **0.59** | 58.5% vs 60.2% = −1.7 | **9.35** |
| 10-09 Fri | $208.29 (+5.9%) | $46.58 vs $53.21 (−12.5%) | $74.81 vs $70.68 (+5.9%) | −18.3 pts | **0.62** | 60.2% vs 61.9% = −1.7 | not yet published |

Universal Player on the same days: +30.6% / +45.2% / +41.7% / +29.2% — the recovering unit that mechanically shrinks every other unit's share (10-07 note 2 still applies).

**Against the rule:** close leg — ratio 0.66 / 0.64 (both < 0.68), gap 17–18 pts (> 10) → **not met**. Reopen leg — 10-06 reads 0.66, which is not < 0.65, and `sticky_sidebar_ads` never fell below 9.0 (min 9.35 on 10-08) → **not met**. Neither pre-committed branch fires; the rule as written cannot decide the residual, so it is **EXTENDED**, not re-graded after the fact.

**What the control says (new, pulled today):** the same calendar in 2025, daily sidebar ÷ content revenue, 10-01 → 10-16: 0.70, 0.69, 0.62, 0.65, 0.59, 0.58, 0.62, 0.67, 0.62, 0.55, 0.59, 0.60, 0.54, 0.61, 0.66, 0.64 — a **0.54–0.70 band, mean 0.62**, with sidebar fill 3–7 pts *below* Content fill on every one of those days. 2026 to date: 0.66, 0.64, 0.59, 0.62 with fill gap +0.6 → −1.7 pts. 2026 is inside the 2025 October band and better than 2025 on fill. Late September is where the two years differ: 2026 ran 0.74–0.79 (09-22 → 09-29) while 2025 ran 0.64–0.66 — i.e. the "0.74 baseline" the residual was measured from was the seasonal high, and the 4-wk mean the sidebar keeps failing is built from it. Daily 2026 trace 09-20 → 10-09: 0.70 0.71 0.79 0.75 0.74 0.75 0.75 0.76 0.75 0.77 0.69 0.72 0.70 0.69 0.67 0.61 0.66 0.64 0.59 0.62.

**Money:** sidebar is −$2.5 … −$10.6/day vs its 4-wk mean while Universal Player is +$10 … +$14/day and the site is +1% … +13%; 28d revenue +0.5%. This is a mix shift inside a green site, not a guardrail event.

**Watch item:** `sticky_sidebar_ads` 9.35 on 10-08 is the lowest reading in the 09-18 → 10-08 history (band 9.49–10.93: 10.55 10.93 10.51 9.83 10.22 10.24 10.07 9.49 10.70 9.53 10.38 10.39 10.03 9.83 10.07 10.04 10.16 10.14 10.29 10.09 9.35). One day; the April 2026 sidebar wipe read 0.1. `check-blog-sidebar.sh` ok this morning (operator-did probe); `functions.php` untouched since #208.

**E174 verdict: EXTEND → read 2026-10-14 on finalized 10-10, 10-11, 10-12.** Rule, pre-committed now, anchored on the 2025 control instead of the September high: **CLOSE (seasonal)** if on all three days sidebar ÷ content ≥ 0.54 AND sidebar fill ≥ Content fill − 3.0 pts AND `sticky_sidebar_ads` ≥ 9.0 on every published day. **REOPEN ON-SITE (Tier 2 package: Mediavine sidebar ticket + `functions.php`/sidebar CSS audit, no push)** if `sticky_sidebar_ads` < 9.0 on any two days, OR sidebar fill ≤ Content fill − 3.0 pts on any two days, OR the ratio < 0.54 on any day. Anything else → close as seasonal with the miss named. No third extension.

## 3. E108 + E125 — post-rename Patreon watch (read 10-09, taken 10-11)

`patreon-q4-gate-preread.ts --anchor rename --no-write` (Members API + production DB, both legs returned): paid 57 (11×$1, 43×$3, 2×$5, 1×$8) ≈ $157.50/mo gross; **paid joins since 2026-09-25: 13 in 16.4 d → 24.1/mo pace (floor 17: PASS; perk tier 9; 7d 1)**; **cancels since 09-25 (last charge on/after anchor): 2 → 3.7/mo pace (7d 1; revert if > 16/mo: no)**. The lib's `cancelsSinceAnchor` with the same anchor reads 3 (5.4/mo) — definitional, both far under 16. **E108: KEEP — no revert of the tier copy.** **E125: KEEP 2/2** — the 10-02 read and this one both returned the Members API leg (today: 6,087 members, 13 pages, `links.next` exhausted, 0 truncation).

Caveat the pace hides: paid joins by start day (currently-paying only), 09-25 → 10-11: 1 0 1 0 1 **3 3 3 1** 0 0 0 0 0 0 1 0. Ten of the 13 joined 09-30 → 10-03, around the 1st-of-month charge; 1 paid join in the 8 days since. GA4 `patreon_click` users/day over the same span is flat: 9 9 7 9 7 7 5 6 6 7 8 10 7 9 (mean 7.6). The clicks did not move; Patreon-side conversion did (≈1.3 joins/day across the billing date → 0.13/day after it). The "24.1/mo pace" is a billing-date cluster, not a run rate.

## 4. B2 killIf leg 1 (10-08)

Rule (targets.json): "paid joins 7d < 5 on both 10-08 and 10-15 AND Q17 unanswered past its 10-07 drop". Members API, `summarizePatreonMembers` with `now = 2026-10-08T23:59:59Z` (the scoreboard's own definition): **joins 7d = 4**, cancels 7d 2, paid 57. Raw cross-checks: entitled > 0 with `pledge_relationship_start` 10-02 → 10-08 = 4; 10-01 → 10-08 (8 calendar days) = 7. Q17 was dropped 10-07 with no reply. **Leg 1: MET (4 < 5).** The 10-15 read decides; as of 10-11 the trailing 7d is 1. If 10-15 also reads < 5, B2 flips to "October is the creator-program month; Rio moves to affiliates only" as written.

## 5. E131 — Patreon refresh persists (read 10-09)

`patreonApi.ok` on the mornings in/after the window that produced a scoreboard: **10-07 ok, 10-11 ok** (2 of 2); operator-did probe `patreon.status = ok` on both. 10-06 was a MISSED run (ledger row 10-07 07:15); 10-08 / 10-09 / 10-10 produced no scoreboard (runner never started — CLI token). Refresh-persisted leg: **unobservable from the run tree** — no `[patreon-auth] tokens refreshed … saved to` line exists in any log under `logs/` or `reports/funnel/*.out`, and the operator's checkout is out of bounds for this agent. **MORE DATA**: ok-leg 2/2 observed, refresh-leg unread. Ops ask below.

## 6. E134 / E153 — affiliate pipe (read 10-12; pre-read today, window 09-29 → 10-10)

`affiliate-pipe-read.ts`: **NOT-YET** — on-site `gtracing` clicks 9 in 12 d (rule ≥ 10; all 9 to repaired validated+active offers), Impact GTPLAYER-US 5 clicks / 0 actions / $0.00, recorded ÷ on-site **55.6%** (floor 50%: holding), 1 click short ≈ 1.3 d at 0.75/day. On-site all partners 14; Impact same window: Envato 4 clicks / 0, Canva 3 / 0. Scoreboard: affiliate clicks 7d 8, 30d 47, earnings $0.00. Read 10-12 as scheduled; the 10th click starts E134's 30-day $0 KILL clock.

## 7. E60 — blog RPM recovery (vs 09-24)

`page-rpm-snapshot.ts`, blog bucket (WordPress, apex-proxied): **09-24 $12.49 page RPM** (96 paths, 8,708 pv, $108.76, imp/pv 11.95, viewability 59.1%) → **10-08 → 10-09 $12.27** (111 paths, 16,718 pv, $205.11, imp/pv 11.58, viewability 59.1%) = **−1.8%, above the tool's −3% keep floor ($12.12)**. Site monetizable-pv RPM 13.81 (09-24) → 13.35 (10-08) / 14.14 (10-09); session RPM 17.13 → 15.67 / 18.00. **KEEP — recovered.** The dispatch's "16.99 on 09-24" could not be matched to any E60 figure in the tree (the only 16.99s on file are the 09-14 → 09-20 session RPM and one path's RPM); graded on the E60 tool's own blog page RPM.

## Consequence

Guardrail green, reset closed on revenue, sidebar residual extended on a control rather than re-graded by hand, B2 leg 1 met with the 10-15 read live. **Tier 0/1 merges clear.** No ad-layout, `functions.php` or pricing action requested or taken.

— Rio, Product & Revenue
