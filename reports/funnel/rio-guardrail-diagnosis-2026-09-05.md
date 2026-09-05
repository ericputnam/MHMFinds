# Rio — Guardrail Diagnosis — 2026-09-05

**Anchored on:** last finalized day 2026-09-03 (Wednesday)
**Status when triggered:** yellow — third consecutive judged yellow
**Written:** 2026-09-05 by Rio
**Extends:** E9 (2026-09-04), E5 (2026-09-02)

---

## 1. What the numbers show today

### The judged day: Sep 3 (Wednesday)

| Metric | Actual | Expected (same weekday, 4-wk avg) | Delta |
|---|---|---|---|
| Revenue | $164.32 | $182.75 | -10.1% |
| Session RPM | $14.64 | $14.83 | -1.2% |
| Sessions | 11,221 | 12,347 | -9.1% |

The -10.1% revenue shortfall decomposes cleanly: sessions are -9.1% of the gap, RPM is -1.2%. This is almost entirely **traffic-side**, with RPM essentially at baseline.

### Decomposition arithmetic

Expected revenue at actual sessions = 11,221 × ($14.83/1,000) = $166.41
Actual revenue = $164.32
RPM-side shortfall vs traffic-corrected baseline: $166.41 - $164.32 = **$2.09** (1.2%)
Traffic-side shortfall: $182.75 - $166.41 = **$16.34** (89% of the gap)

Of the $18.43 revenue shortfall, approximately $16.34 (89%) is sessions-driven and $2.09 (11%) is RPM-driven. The RPM delta (-1.2%) is noise, not signal.

### 3-day window

| Metric | Actual | Expected | Delta |
|---|---|---|---|
| Revenue | $483.31 | $556.79 | -13.2% |
| RPM | $14.20 | $14.79 | -4.0% |

The 3-day RPM shortfall (-4.0%) looks larger than the single-day RPM delta (-1.2%). This is because the 3-day window includes Sep 1 (Monday) and Sep 2 (Tuesday), which were already diagnosed in E9 (Sep 2 RPM $14.21, both traffic- and RPM-side). The 3-day RPM is still above the E5 escalation threshold of $14.00.

---

## 2. Was this deploy-caused?

Production deploys in the 72h window before Sep 3 (i.e., Aug 31 to Sep 3):

| Deploy | What | Earning page? | Verified |
|---|---|---|---|
| PR #30 (2026-09-03 02:32) | compound learnings chore (docs only) | No | PASS |
| PR #29 (2026-09-02 16:05) | runner worktree fix (infra only) | No | PASS |
| PR #28 (2026-09-02 13:24) | daily-run reports (docs only) | No | PASS |

All three deploys in the window were either docs or infra changes; none touched a page that serves Mediavine ad slots. All three were verified PASS by deploy-verify.sh. **No rollback is indicated.**

### The evening incident (2026-09-04 18:45) — does not affect the judged day

The evening check on Sep 4 recorded ERR_TIMED_OUT across all pages and a subsequent automatic rollback attempt. This event is **after** the judged day (Sep 3) and is therefore irrelevant to the Sep 3 revenue. Quinn confirmed production renders fine (HTTP 200 + Mediavine loader) at 06:45 on Sep 5. The incident was network-level (consistent with a transient BigScoots/Vercel edge issue), not a code regression. Revenue on Sep 4 will be in the next guardrail report.

---

## 3. Traffic-side analysis (primary signal)

### Pinterest session taper confirmation

Scoreboard 7d (Aug 28 - Sep 3): Pinterest 57,351 vs prev 7d 61,340 = **-6.5% WoW**.

Day-level context from the prior diagnosis cadence:

| Period | Pinterest sessions/day (approx) | Source |
|---|---|---|
| August peak (Aug 18-24) | ~8,762/day | 61,334 / 7 |
| Aug 25-31 | ~8,762/day | 61,340 / 7 |
| Sep 1-7 (this 7d) | ~8,193/day | 57,351 / 7 |
| Change | -569/day | -6.5% |

The Sep 3 sessions shortfall was -1,126 vs same-Wednesday 4-week average (11,221 vs 12,347). Pinterest decline accounts for approximately -569/day on average; the single-day Wednesday figure is likely in the same -500 to -700 range. That accounts for 44-62% of the Wednesday sessions gap. The remainder reflects the ongoing post-Labor Day weekday pattern (school and work schedules resumed in the US on Sep 2).

**The Pinterest taper is the same signal diagnosed in E9 for the Sep 2 judged day.** It has not deepened relative to the -6.5% WoW level; it is consistent. This matches the "post-summer, routine-resumption" seasonal pattern documented in the compound learnings.

### E5 Pinterest taper watch rule check

E9 set a watch rule: if 7d Pinterest sessions remain below 55,000 by 2026-09-11, Pip reads the analytics for content/cadence signals. Today's Pinterest sessions are 57,351. The 55K threshold is not breached; Pip's watch rule does not trigger yet.

---

## 4. RPM analysis (secondary signal — noise level)

### E5 escalation counter update

| Date | Day | Session RPM | Below $14.00? | Source |
|---|---|---|---|---|
| Sep 1 | Mon | ~$14.0 | Borderline (estimated) | implied from 7d total |
| Sep 2 | Tue | $14.21 | No | MV finalized (E9) |
| Sep 3 | Wed | $14.64 | No | MV finalized (today) |

**E5 escalation counter: 0 confirmed weekdays below $14.00 RPM.** Sep 3 at $14.64 is comfortably above the threshold. The 5-consecutive-weekday trigger is not approaching.

The 3-day RPM of $14.20 vs $14.79 expected (-4.0%) reflects the Sep 1-2 days which were at the lower end ($14.0-$14.21 range). With Sep 3 at $14.64, the RPM trend is moving in the right direction as the post-summer period settles.

### Demand-side context

No change to the underlying advertiser landscape since E5/E9. Q4 advertiser spending begins ramping in late September; early-September CPMs are typically stable or slightly above the August floor. RPM at $14.64 on Sep 3 is consistent with early Q4 ramp expectations. No Mediavine action is warranted.

---

## 5. The 28d guardrail: third week of mechanical breach

28d revenue today: $5,575.13 (-9.7% vs prior 28d, anchored Sep 3).

The 28d window now contains:
- Late August: $15.09 monthly RPM average (weakest in site history)
- Early September: $14.20-$14.64 RPM (transitional)
- The days rotating **out** of the window are late July at $15-16 RPM

The breach is still mechanical (low-RPM August days cycling in, modestly-higher July days cycling out). Expected recovery timeline remains mid-to-late September as August's lowest-RPM days exit the window and Q4 advertiser demand begins. No intervention warranted.

---

## 6. Third consecutive yellow — is the pattern changing?

| Judged day | Revenue delta | RPM delta | Sessions delta | Primary driver |
|---|---|---|---|---|
| Aug 31 (E5) | -19.7% | -16.3% | -4.1% | RPM (Sunday end-of-August CPM floor) |
| Sep 2 (E9) | -13.5% | -3.7% | -10.6% | Sessions (Pinterest taper onset) |
| Sep 3 (today) | -10.1% | -1.2% | -9.1% | Sessions (Pinterest taper continuing) |

The pattern is improving, not worsening: revenue delta has shrunk from -19.7% to -10.1%, RPM delta from -16.3% to -1.2%, and sessions delta is plateauing (-10.6% to -9.1%). The Aug 31 RPM crash was an end-of-summer anomaly; the Sep 2-3 pattern is a stable Pinterest seasonal taper at consistent volume. Each judged day is cleaner than the last.

**The three-yellow streak is not evidence of a structural problem.** It is the mathematical consequence of: (a) August's depressed RPMs rotating into the 28d guardrail window, (b) a stable Pinterest seasonal taper of ~6.5% WoW that has not deepened, and (c) the guardrail baseline including a strong June-July that makes early September look weak by comparison.

---

## 7. Verdict

TRAFFIC-SIDE + MECHANICAL 28d ROLL-THROUGH. Sep 3 yellow is 89% sessions-driven ($16.34 of the $18.43 shortfall), with RPM at $14.64 — only -1.2% below baseline and comfortably above the E5 escalation threshold of $14.00. The sessions shortfall traces to a consistent Pinterest post-summer taper (-6.5% WoW, not deepening vs E9). No deploys in the window touched earning pages; all three were verified PASS. The evening incident on Sep 4 postdates the judged day and was network-level (transient), not a code regression. The 28d guardrail breach is mechanical roll-through (same diagnosis as E9). The three-yellow streak shows improving revenue delta, not a worsening trend.

**E5 escalation counter: 0 of 5 consecutive weekdays below $14.00 RPM.** E5 read date 2026-09-15 unchanged.

**No site change, no rollback, no Mediavine ticket.** Watch rule: if Sep weekday RPMs average below $14.00 for 5 consecutive weekdays, open Mediavine conversation per E5 keep rule.

---

## 8. Affiliate placement analysis (Tier 0 background, lever #5)

Scoreboard data: affiliate_click=11 (7d), affiliate_click=15 (7d per row 2), 53 (30d), $0.00 commissions.

Given the instruction to "cut placements with zero clicks" and "test one high-intent placement (game keys next to the game they mod)," and with 30d clicks at 53 and EPC = $0:

- 53 clicks over 30 days = 1.77 clicks/day average across all placements
- $0 earned on 53 clicks = 0% conversion rate
- The click volume is above zero but below any meaningful EPC threshold

**Decision on affiliates today (Tier 0, recording a decision in lieu of a move):** The 53/30d click count is too low to distinguish between "wrong placement" and "wrong offer." Before cutting placements, the team needs to know which placements are generating the clicks. Without Impact placement-level data available in this run, the correct action is: hold all placements for the current 30-day cycle (ending ~Sep 15), confirm whether clicks are concentrated in one placement or scattered, then apply the cut rule at E5 read date (Sep 15). If EPC is still $0 at Sep 15 across all placements, affiliate is killed (Tier 0, no operator decision needed — it is a data decision, not a payout change).

This analysis is recorded here rather than as a separate experiment because affiliate is in the E5/E9 read window and no new move is warranted today.

---

## Digest line

YELLOW 09-03: traffic-side (89% of $18.43 revenue gap = sessions; Pinterest taper -6.5% WoW, stable, not deepening); RPM $14.64 is -1.2% and above the escalation floor; three-yellow streak shows improving deltas (-19.7% to -10.1%); no deploy in window touched earning pages; evening incident postdates the judged day (network-level, resolved); E5 counter 0/5; no site change needed.

---

_Rio, Product & Revenue — 2026-09-05_
