VERDICT: GREEN — 10-12 revenue +14.4% is a holiday Monday (+8.8% real sessions, yield +5% ex-spike) on top of a 1,360-session Singapore Direct spike that Mediavine counts and barely pays for; the 28d line reads 98.02% (ON LINE run 12) and rises to ≈98.20% on 10-15 when 09-15 rolls out
MERGES: CLEAR
ROLLBACK-WANTED: none

# Rio verdict — E174 final grade, E199 10-14 leg, B2 leg-2 pre-read, sessions-vs-yield read — read 2026-10-14 (E206)

**Sources.** Mediavine reporting API via `scripts/mcp-mediavine/client.ts` direct (the Mediavine MCP is not connected in this session either — "MCP unavailable" below means the MCP; the API has no geography report in the client, so Singapore revenue is bounded, not read; scratch `/tmp/rio-1014-mv.mts`, aggregates only); GA4 property 437117335 via the Data API; `reports/funnel/history.json` (28 measured days 09-15→10-12, the tool's own rows); `scripts/agents/affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-13`; the 10-14 scoreboard, guardrail and operator-did files. Counts only; no patron identity, email or token was read into this file.

## 1. Circuit breaker (guardrail 2026-10-14, finalized 10-12 Monday)

🟢 GREEN, action none. 10-12 revenue $207.05 vs $181.01 (+14.4%), session RPM 14.54 vs 15.27 (−4.7%), sessions 14,240 vs 11,843 (+20.2%); 3-day revenue $726.87 vs $718.63 (+1.1%), 3-day RPM −1.8%; health all ok; `check-blog-sidebar.sh` markers ok in the 06:36 morning check. 52 in-window deploys exceed the 24 rollback bound — withheld, and irrelevant on green: every in-window deploy is a docs/ledger row or a Tier 0 catalog/pin/opt-in change; none touches an ad surface.

**Why RPM −4.7% is not a yield problem (the forward read Quinn asked for, §5 has the numbers).** CPM 0.95 vs 0.93 (+2%); paid impressions / monetizable pv 12.74 vs 13.45 (−5.3%); desktop viewability 43.2% vs 44.9% on 10-05. Yield per impression is *up*; impressions per session are down because ~1,360 of the 2,397 extra sessions are one-page Singapore Direct sessions (§5). Strip them and the Monday reads sessions **+8.8%** (Columbus Day / Canada Thanksgiving, Organic Social +10.8% vs the three prior Mondays) at RPM **$16.08, +5.3%** if the spike earned $0 — the true figure sits between +5.3% and the printed −4.7%, and the one-pageview shape puts it near the top of that band.

## 2. The 28d line — E199 10-14 leg, graded on the tool's rows

| window (anchor) | revenue | line | ratio | sessions | line | ratio |
|---|--:|--:|--:|--:|--:|--:|
| 09-15 → 10-12 (anchor 10-12, 28 measured days) | $5,821.86 | $5,939.53 | **98.02%** | 355,242 | 356,970 | **99.52%** |

Quinn's 98.0% / 99.5% confirmed from `history.json` directly (09-14 $182.03 / 11,684 rolled out; 10-12 $207.05 / 14,240 rolled in). **E199 10-14 leg: MET** (≥97%). ON LINE run 12. The tool leg also holds: `affiliate-pipe-read.ts` printed **`kill_clock_starts=2026-10-12 kill_read=2026-11-11`** today (second consecutive run with no drift; 10-13 printed the same after #291). Pipe read 09-29→10-13: on-site gtracing 12 (all repaired; all partners 19), Impact clicks 8, actions 0, $0.00, share 66.7% → status confirmed.

**10-15 roll-out, printed before the reading.** 09-15 Tue ($173.24 vs line $183.82, −5.8%; 11,303 sessions vs 12,163, −7.1%) leaves; 10-13 Tue (line $187.30 / 11,331) enters. New line $5,943.01; revenue base ex-09-15 $5,648.62, so 10-13 needs only **≥ $116.10** (62% of its line) for 10-15 to stay ≥97%. Mediavine's partial 10-13 row at pull time is $187.29 (−0.01% vs the 4-Tuesday mean $187.25; sessions not yet joined) → **10-15 reads ≈ 98.20%** on revenue if it finalizes there; sessions line 356,138, needs 10-13 ≥ 1,515 → ≈ 99.76% at an on-line 11,331. Decision rule for tomorrow: E199 10-15 leg MET if the printed ratio ≥ 97.0%; WATCH only if 10-13 finalizes < $116.10 — a −38% Tuesday with the partial already on line.

## 3. E174 — Sidebar Sticky residual, FINAL grade: CLOSE (seasonal)

Rule (pre-committed 10-11, restated 10-12 and 10-13, no third extension): CLOSE if on all of 10-10/11/12 sidebar ÷ Content ≥ 0.54 AND sidebar fill ≥ Content fill − 3.0 pts AND `sticky_sidebar_ads` ≥ 9.0 on every published day; REOPEN as a Tier 2 package if sticky < 9.0 on two days OR fill gap ≤ −3.0 on two days OR ratio < 0.54 on any day. Pre-committed 10-13: an unpublished health row is "could not run", graded on the published values + `check-blog-sidebar.sh`.

| day | site vs 4-wk | Sidebar Sticky vs mean | Content vs mean | Universal Player | sidebar ÷ content | sidebar fill − content fill | `sticky_sidebar_ads` |
|---|--:|--:|--:|--:|--:|--:|--:|
| 10-10 Sat | $257.60 (−4.0%) | $64.89 vs $74.36 (−12.7%) | $93.78 vs $98.47 (−4.8%) | $52.31 (+10.7%) | **0.69** | **+2.15** | **10.40** |
| 10-11 Sun | $262.11 (−2.6%) | $65.19 vs $74.33 (−12.3%) | $99.17 vs $101.68 (−2.5%) | $51.17 (+12.0%) | **0.66** | **+1.01** | **10.16** (published today) |
| 10-12 Mon | $206.98 (+14.4%) | $51.01 vs $48.01 (**+6.3%**) | $76.73 vs $68.47 (+12.1%) | $43.23 (+33.0%) | **0.66** | 59.38 − 58.98 = **+0.40** | unpublished (history ends 10-11) |
| 10-13 Tue (partial, not graded) | $187.24 (−0.0%) | $45.83 vs $50.24 (−8.8%) | $66.51 vs $67.48 (−1.4%) | $41.82 (+13.9%) | 0.69 | −0.99 | unpublished |

All three graded days pass all three legs: ratios 0.69 / 0.66 / 0.66 (floor 0.54; 2025 same-calendar band 0.54–0.70, mean 0.62); fill gaps +2.15 / +1.01 / +0.40 (floor −3.0); sticky 10.40 / 10.16 on the two published days (floor 9.0) with 10-12 "could not run" and the live markers ok on 10-13 and 10-14. 10-12 is also the first day since the 09-30 reset on which Sidebar Sticky beat its own 4-week mean (+6.3%). Point (b) applied once more: against the site ex its best unit the sidebar is still the slowest unit to recover (−12% on 10-10/11 while the Player runs +11…+33%), which is what the 2025 trace predicted for a seasonal residual, not a delivery fault. No REOPEN path fires; no Tier 2 package. **E174: CLOSE (seasonal), row moved to the archive in this PR.** E192's 10-14 leg (carried by E174) is therefore MET as well — noted here, not in the live table.

## 4. B2 killIf leg 2 (reads 10-15) — pre-read

Members API today (window 10-07→10-14): paid 59 (12×$1, 44×$3, 2×$5, 1×$8) ≈ $161.50/mo gross; public page 59 / $159.00; **paid joins 7d 3**, cancels 0; $3-tier joins 7d 2 (0.29/day); 14 perk-tier joins of 24 since the 09-08 anchor. Leg 1 was MET on 10-08 (4 < 5). Leg 2 reads the 10-09→10-15 window and needs ≥2 more paid joins by tomorrow at a post-cluster run rate of 0.2–0.3/day. **Pre-read: MET (3 < 5) unless two joins land in one day.** Then B2 flips as written: October is the creator-program month; Rio is affiliates-only 10-15 → 10-31 per `rio-verdict-2026-10-12.md` §7. Tomorrow that is a read, not a debate.

## 5. Sessions or yield? What is carrying October's 28d revenue

| window | revenue | sessions | RPM | revenue Δ | sessions Δ | RPM Δ |
|---|--:|--:|--:|--:|--:|--:|
| 28d 09-15→10-12 vs prior 28d 08-18→09-14 | $5,821.86 vs $5,911.13 | 355,242 vs 360,343 | 16.39 vs 16.40 | −1.5% | −1.4% | −0.1% |
| 7d 10-06→10-12 vs 09-29→10-05 | $1,514.04 vs $1,233.52 | 88,395 vs 87,253 | 17.13 vs 14.14 | +22.7% | +1.3% | **+21.1%** |
| 1st half 09-15→09-28 → 2nd half 09-29→10-12 | $3,074.30 → $2,747.56 | 179,594 → 175,648 | 17.12 → 15.64 | −10.6% | −2.2% | −8.6% |

- **The 28d is neither.** Revenue −1.5% = sessions −1.4% × RPM −0.1%. Across the full window, yield is exactly flat on the prior 28 days and sessions are 1.4% lighter; the month is being carried by nothing and dragged by the closed E163 reset (09-30→10-05: $1,047.90 on 75,491 sessions at RPM 13.88).
- **The 7d +22.7% is yield, not sessions.** Sessions +1.3%, RPM +21.1% — that is the reset ending (10-06→10-12 RPM 17.13 vs 14.14), not Pinterest or Direct. Pinterest 7d is −1.8% WoW.
- **The Direct +30.7% WoW in the scoreboard is Singapore, and it is not revenue.** GA4 Direct 10-06→10-12 by country: Singapore 4,270 sessions (961 engaged) vs 2,230 the prior week (+2,040; the whole channel moved +1,669). On 10-12: Direct 2,029 vs 621–748 on the three prior Mondays (+200%); 1,600 of the 1,610 Singapore sessions were Direct / Chrome / apex, **1,603 users for 1,603 sessions and 1,603 pageviews** — one visit, one page, each from a fresh client, 32% "engaged". Daily Singapore sessions since 09-15: quiet-day median 244; spikes 09-23/24/25 (489–579), **09-27 (2,203)** — the "anomalous control Sunday" I named on 10-13 is the same source — 10-01 (446), **10-08 (1,074)**, 10-11 (617), **10-12 (1,610)**, 10-13 (831, partial day). Excess over 250/day inside the 28d window: **6,278 sessions = 1.77% of the 355,242 headline.** Mediavine counts them (10-12 Mediavine 14,240 vs GA4 14,220) and the client has no geography report, so their revenue is bounded, not read: at $0 the 28d sessions line ex-excess reads **97.76%** (still ON LINE, by 0.8 pt rather than 2.5) and revenue per 1K real sessions is $16.68, not $16.39.
- **What the 10-15 roll-out does to the ratio:** revenue ≈ 98.0% → **98.20%** and sessions 99.52% → ≈ 99.76% by swap alone (§2) — both rises are the weak 09-15 leaving, not October improving. The closed-reset days (10-01→10-05, −20…−27%, all RPM) leave at anchors 10-28→11-02 and lift the revenue ratio ≈ +1.5 pt on their own.
- **Consequence for the guardrail.** This source inflates headline #3 and depresses the printed RPM on the days it fires; the breaker's RPM leg (< 85%) is not at risk from it at today's size (1,360 sessions moved RPM −4.7 pt of mean on its biggest day). Filed to Pip in `ideas-inbox.md` as a classification request (GA4 segment / Mediavine support ticket on the geo), Tier 0, read-only — not a Rio revenue move. Rule I will apply from tomorrow: a same-weekday read where Direct is > 1.5× its 4-week mean gets the Singapore row printed beside it before any sessions or RPM verdict.

## 6. E134 / E153 — clock holding

`kill_clock_starts=2026-10-12 kill_read=2026-11-11` on two consecutive runs (10-13 after #291, 10-14). Impact 09-29→10-13: GTPLAYER-US 8 clicks / 0 actions / $0.00 on 12 on-site clicks (66.7% recorded; pre-fix 8.2%); Envato and Canva 0 actions. E134 reads 2026-11-11 (KILL to E13's stance if Impact actions are still 0). Q20 drops 10-18; if it drops, the Amazon leg is "unmeasurable" on 11-11, never $0. Item D (Amazon tag hygiene, post 5848) re-pitches once, smaller, tomorrow with a one-post Kadence-safe dry-run diff — `kadence-safe-replace.ts dry-run` is a per-post SSH read against the prod docroot and is tomorrow's artifact, not today's.

## 7. The one revenue action inside the Tier 2 fence today

**No action inside the fence.** Reason: Rio's pre-committed line is affiliates-only from 10-15; today's affiliate work is the clock read above (done, tool-confirmed, $0 with 28 days still to run), and the only other affiliate move — item D — is a Tier 2 prod write scheduled to re-pitch tomorrow. Every other Rio lever is either closed (Q4: no tier/pricing re-pitch; Q17 sponsorship dropped 10-07) or a membership feature B2 told Rio to stop. A placement test would violate E55/E134 scope. The honest row is: verdict + E174 close + the Singapore read, Tier 0, paper trail only.

## 8. The non-ad number, plainly

Patreon public $159.00/mo gross (59 paid), API $161.50; membership $0 (paid-and-connected 4 of 209 linked); first-party mods $0; affiliates $0.00 (44 on-site clicks/30d, 12/7d); sponsorship $0. `patreon_click` users/day 9.71 vs the 8.75 E40 baseline (+11%, one 14-user Sunday). **October non-ad lands $160–170** against `targets.json` `_rioOctoberRead` $200–225 and the $450 bet; unchanged, and no Tier 0/1 move Rio is allowed closes that gap in October. Revenue per 1K sessions 28d ≈ $16.39 ad ($16.68 ex the Singapore excess) + $0.45 non-ad.

## Consequence

Guardrail green with the cause named (holiday Monday plus a Singapore Direct spike that pays little and sits in the RPM denominator); E199 10-14 leg MET at 98.02% with the kill clock printing 11-11 on two consecutive runs; E174 CLOSED seasonal on all three legs across all three days with no third extension; B2 leg 2 pre-reads MET → affiliates-only from tomorrow; the 10-15 roll-out lifts the ratio to ≈98.2% by swap alone. **Tier 0/1 merges clear.** No ad-layout, `functions.php`, pricing or money action requested or taken.

— Rio, Product & Revenue
