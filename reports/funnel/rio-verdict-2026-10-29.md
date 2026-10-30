# Rio — verdict 2026-10-29 (evening re-run; morning MISSED, preflight=HANG)

Circuit breaker 🟢 GREEN, action none. Judged day 2026-10-27: $190.69 vs $187.53 (+1.7%), RPM $15.53 (−4.9%), sessions 12,278 (+6.6%), ex-Singapore 11,990 vs 11,237 (+6.7%), segment 4.13% vs 3.49%. 3-day revenue +6.4%. Health ok. Guardrail source: `guardrail-2026-10-29.json` (Quinn's tree). Mediavine daily series: `scripts/mcp-mediavine/client.ts` → `earnings('2026-09-02','2026-10-28')` direct (the Mediavine MCP did not connect in this session either). GA4 via the Data API MCP, property 437117335, filter `country = Singapore AND sessionSource = (direct)` (E216 rule; 10-27 = 516, identical to the guardrail's own print).

## (a) Mediavine 28d −6.2% — decomposed

Windows anchored at the last finalized day: **current 09-30→10-27 $5,755.06**, **prior 09-02→09-29 $6,133.93**, gap **−$378.87 (−6.18%)**. Both windows start on a Wednesday, so day *i* vs day *i* is weekday-matched.

| | prior 28d | current 28d | Δ |
|---|--:|--:|--:|
| revenue | $6,133.93 | $5,755.06 | −6.18% |
| sessions (MV) | 358,054 | 359,707 | **+0.46%** |
| session RPM | $17.13 | $16.00 | **−6.61%** |
| monetizable pv | 450,374 | 438,409 | −2.66% |
| paid imp / mon pv | 14.643 | 13.242 | −9.57% |
| CPM | $0.9301 | $0.9913 | +6.58% |
| Singapore (direct) sessions, GA4 | 9,303 (2.60%) | 18,894 (5.25%) | ×2.03 |
| sessions ex-segment | 348,751 | 340,813 | −2.28% |
| RPM ex-segment | $17.59 | $16.89 | **−3.99%** |

**Sessions vs RPM.** Sessions are flat (+0.46%); the whole gap is RPM. Counterfactual: current sessions at the prior RPM = $6,162 (+0.5%); prior sessions at the current RPM = $5,729 (−6.6%).

**Mix vs rate.** The segment doubled (2.60% → 5.25% of MV-counted sessions), which by itself predicts (1−.0525)/(1−.0260) − 1 = **−2.7% RPM**. The remaining **−4.0%** is rate (ex-segment RPM $17.59 → $16.89). Identity: mon_pv −2.66% × imp/mon_pv −9.57% × CPM +6.58% = −6.2% — fewer paid impressions per monetizable pageview, partly offset by a higher CPM.

**Which weeks.** Week 1 is the gap; weeks 2–4 net to −$78.

| week pair (current vs prior) | prior $ | current $ | Δ$ | Δ% | sessions Δ | RPM Δ | segment |
|---|--:|--:|--:|--:|--:|--:|--:|
| W1 09-30→10-06 vs 09-02→09-08 | 1,546.14 | 1,245.81 | **−300.33** | −19.4% | −4.9% | **−15.3%** | 1,621 → 2,155 |
| W2 10-07→10-13 vs 09-09→09-15 | 1,501.11 | 1,503.42 | +2.31 | +0.2% | +2.6% | −2.4% | 1,642 → 4,944 |
| W3 10-14→10-20 vs 09-16→09-22 | 1,490.45 | 1,484.64 | −5.81 | −0.4% | +10.5% | −9.8% | 1,583 → 9,945 |
| W4 10-21→10-27 vs 09-23→09-29 | 1,596.23 | 1,521.19 | −75.04 | −4.7% | −5.6% | **+0.9%** | 4,457 → 1,850 |

- **W1 = 79.8% of the gap** (09-30→10-05 pairs −$302.37). That is the quarter-boundary CPM trough already diagnosed Mediavine-side in the 10-01 and 10-02 verdicts (all partners down, RPM $12.30–$14.99 on $14.64–$19.11 controls). The five worst day pairs of the 28 are 10-01→10-05. The segment was small that week (2,155), so W1 is rate, not mix.
- **W3 = mix, not rate.** Sessions +10.5% and RPM −9.8% net to −0.4%; the segment was 9,945 of 95,450 (10.4%) vs 1,583 (1.8%) — the 10-12→10-19 Singapore spike (1,600 / 1,845 / 2,074 / 1,888 / 1,748 / 1,533 per day). Ex-segment W3 sessions 85,505 vs 84,833 = +0.8%.
- **E255 (10-19/10-20 dip)** = −$39.64 on its two pairs = **10.5% of the gap**; it was Mediavine-side demand (verdict 10-21: 10/10 partners down) and finalized at 93.96% of expected (E255 KEEP).
- **W4 (latest) RPM +0.9%** on 40 in-window deploys. The −4.7% is sessions −5.6%, and half of that is the segment shrinking (4,457 → 1,850 = −2,607 of the −5,199); ex-segment W4 sessions 89,180 → 86,588 = **−2.9%** (Pip's leg; the scoreboard's 7d-on-7d read is −8.0% raw / direct_ex_sg_bot +7.2%, pinterest −1.0%).
- Weekend pairs −$200.78 vs weekday −$178.09: no weekday/weekend skew beyond W1.

**Is anything a deploy did in it?** No signature. (1) W1, 80% of the gap, is 09-30→10-05 — before every deploy in the current guardrail window (10-24→) and already attributed to Mediavine's quarter boundary on 10-01/10-02 with no rollback candidate. (2) The week with the most production deploys (W4: #388 Launcher redesign, #390/#395/#396 homepage + game pages, #391 blog Amazon block incl. `functions.php`, Cass E279 hearts, Nova badge, Sage E267) has the **best** RPM of the four (+0.9% vs prior, $17.20 7d vs $15.55). (3) Mediavine health ok all 28 days; `check-blog-sidebar.sh` markers present after the one `functions.php` push (#391 10-27 00:45, ledger row PASS). Verdict: **Mediavine-side rate (W1) + Singapore mix (W3) + a −2.9% ex-segment sessions dip in W4. No rollback, no ad-surface change. The 28d number will stop carrying W1 on 2026-11-03** (09-30→10-06 rolls off); if W2–W4 hold, the 28d read turns ≥ −1.5% by then with no action from us.

## (b) Guardrail-agreement tracker legs due

`npx tsx scripts/agents/guardrail-agreement-tracker.ts --mornings 7 --tol 3` on the JSONs on `main` plus Quinn's untracked 10-28/10-29 copies (not committed here):

| Morning | Judged | MV Δ | GA4 raw Δ | Gap | State |
|---|---|--:|--:|--:|---|
| 10-19 | 10-17 | +13.6% | +15.6% | 2.0 pt | agree |
| 10-20 | 10-18 | +1.6% | +2.3% | 0.6 pt | agree |
| 10-21 | 10-19 | +4.7% | +9.4% | **4.7 pt** | disagree |
| 10-22 | 10-20 | +0.6% | −0.6% | 1.2 pt | agree |
| 10-23 | 10-21 | −2.4% | −4.4% | 2.0 pt | agree |
| 10-28 | 10-26 | −5.3% | −5.8% | 0.5 pt | agree |
| 10-29 | 10-27 | +6.6% | +7.4% | 0.8 pt | agree |

Tracker verdict: **HOLD** — 1 of 7 disagree (10-21). Mornings 10-24, 10-25, 10-26, 10-27 have no guardrail JSON on `main` (10-24 and 10-26 MISSED; 10-25 ran but the daily PR did not merge; 10-27 ran unlanded) — a missing JSON is a missed run, not a reading, so the 7-morning window is 10-19→10-29 by file presence and 10-21 is still inside it.

- **E241 HOLD re-read 10-28 → HOLD** (diagnostic only, no wiring). Earliest WIRE: seven landed mornings after 10-21 = 10-22, 10-23, 10-28, 10-29 + 10-30, 10-31, 11-01 → **11-01**, only if all three land with both lines.
- **E262 legs:** 10-24 leg MET (10-22 $179.97 ≥ $138.15; 28d 97.7% of the old line, verdict 10-25). 10-28 leg (tracker 7/7 present) **NOT MET** — 4 absent mornings; HOLD stands, no PR. 10-29 leg (affiliate_click 7d ≥ 5) **MET**: 16 (DB `AffiliateClick`, scoreboard) / 19 (GA4 capture events).

## (c) B2 second-trip gate (targets.json, verbatim)

> `killIf`: "MET 2026-10-15 (joins 7d 4 / 3 < 5; Q17 dropped) -> Rio is affiliates-only 10-15 -> 10-31. Second trip: affiliate_click 7d < 5 on 10-29 with Q29 unanswered -> affiliates are also paper-only and November's B2 is a creator-rev-share bet"

Reading on 10-29: **affiliate_click 7d = 16 (DB) / 19 (GA4) ≥ 5 → the second trip did NOT fire.** Q29 is unanswered (dropped: the Amazon leg was unmeasurable), but the rule is a conjunction and the click leg holds. Consequence: **affiliates continue into November as repair-only (E134 scope)**, and November's B2 is **not** forced to the creator-rev-share bet. What the pipe says (`affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-28`, out `reports/funnel/affiliate-pipe-read-2026-10-28.md`): on-site gtracing 25 (all 25 on the repaired `sjv.io` links), Impact clicks 19, **actions 0, $0**, share 76.0%, status confirmed, kill clock started 10-12, **kill read 2026-11-11**. 45 clicks/30d site-wide, all the `grid` placement on `/` and `/games/sims-4/` (no new placement — E55 stands). New since 10-27: the operator's blog Amazon pack block (#391, "first tracked blog affiliate") — its clicks and the tag it carries are not in this read; measuring it is the Q29 leg reopened by the operator's own ship, PENDING a source.

October B2 grade: **MISSED** on the $450 line (non-ad $153/mo gross: Patreon 59 paid = 14×$1 + 43×$3 + 2×$5; affiliates $0; sponsorship $0; membership $0); inside the `_rioOctoberRead` band's floor ($160–170 forecast on 10-16, 60 paid → 59 now, −$9 vs the forecast's low end).

### November B2 proposal — Q-item draft for the operator queue (Tier 2 where it touches money; nothing here ships)

**Q34 (draft) — November non-ad bet: pick one of two, both need your word.**
Numbers: non-ad $153/mo (Patreon only), $450/mo line missed by $297; $3-tier joins 0.29/day (2 in 7d), cancels 1/7d; paid-and-connected 5 of 326 (1.5%); affiliates 45 clicks/30d → $0 (pipe confirmed, kill read 11-11); creator program 2 creators onboarded, 0 submissions 7d, 7 pending (Nova).
- **Option A — "skip the wait" perk on the $3 tier (reopens Q4, Tier 2 pricing/perks).** The one perk two of four competitors sell (TSR VIP, SimsFinds Premium); the site already has `member_skip_countdown` (11 events 7d) behind Patreon OAuth, so the build is copy + the tier description on Patreon (operator's voice). Case: 6,341 free members; a 0.5% free→$3 conversion = 32 × $3 = **+$96/mo gross** (sourced: free count 6,341 public page; conversion is an assumption, not a measurement — the E40 read cut `patreon_click` from 8.75 to 3.57 users/day when `/go` led with checkout, so the perk must be announced on Patreon, not on `/go`). Keep if $3-tier joins ≥ 1/day over the first 14 days (vs 0.29). Cost of waiting: $0 — nothing else is on this line.
- **Option B — creator rev-share (Tier 2 agreements, Nova + Rio).** Only if you want to skip A. No revenue number exists yet: 0 hosted paid mods, 0 creators with an agreement. PENDING a term sheet from Nova before it can carry a dollar line.
- **Recommendation: A.** It is the smallest real product (membership lever #2 of my charter), the audience already pays this tier (43 × $3), and B has no measurable base yet. Affiliates stay repair-only in both options until the 11-11 kill read; if $0 persists, KILL back to E13's stance and the line goes to zero on the scoreboard.
Decision needed by: 11-05 (same day as the Q32 JWT re-pitch) so November has three measured weeks. Silence = affiliates-only continues and the $450 line is re-set by Quinn on 11-01 without a product behind it.

## Grades (rows I own, read date ≤ 10-29)

- **E241** (read 10-28): HOLD — 1/7 disagree (10-21, 4.7 pt); 4 mornings absent 10-24→10-27; earliest WIRE 11-01. Stays diagnostic, no wiring PR.
- **E262** (reads 10-24 / 10-28 / 10-29): leg 1 MET (10-22 $179.97 ≥ $138.15; 28d 97.7%), leg 2 NOT MET (tracker 7/7 absent → HOLD), leg 3 MET (affiliate_click 7d 16 ≥ 5). Closed: paper verdicts carried; no action owed.
- **E271** (PR #375, read 10-26 morning): NOT READ — the 10-26 run MISSED and #375 was not on `main`, so no guardrail morning has printed the line yet. Read moves to the first guardrail morning after merge (10-31); keep rule unchanged.
- E208 / E257 are Ops rows, E258 is Pip's — not graded here.

— Rio, Product & Revenue
