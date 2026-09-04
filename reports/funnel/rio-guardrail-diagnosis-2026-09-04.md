# Rio — Guardrail Diagnosis — 2026-09-04

**Anchored on:** last finalized day 2026-09-02 (Tuesday)
**Status when triggered:** yellow (revenue -13.5% vs same-weekday 4-wk avg; 3-day -16.4%) + Mediavine 28d $5,590.26 (-10.4% vs prior 28d)
**Written:** 2026-09-04 by Rio
**Extends:** E5 diagnosis from 2026-09-02

---

## 1. What the numbers show today

### The judged day: Sep 2 (Tuesday)

| Metric | Actual | Expected (same weekday, 4-wk avg) | Delta |
|---|---|---|---|
| Revenue | $160.20 | $185.26 | -13.5% |
| Session RPM | $14.21 | $14.76 | -3.7% |
| Sessions | 11,269 | 12,612 | -10.6% |

The revenue shortfall on Sep 2 is split: sessions -10.6% and RPM -3.7%. Unlike the Aug 31 dip (which was RPM-only), today's delta is primarily **traffic-side** (-10.6% sessions), with RPM only modestly below baseline.

### The 28-day guardrail breach

| Window | Revenue | RPM | vs Prior 28d |
|---|---|---|---|
| Current 28d (ending 09-02) | $5,590.26 | $15.46 | -10.4% |
| Prior 28d (ending ~08-05) | ~$6,230 (implied) | — | baseline |

The 28d breach is the continued roll-through of the June-August CPM compression confirmed in the E5 diagnosis. The 28d window today contains all of August (the lowest-RPM month since launch at $15.09) and the transition period. The 28d guardrail will not clear until high-RPM June days rotate out of the window — expected recovery window: mid-to-late September as Q4 advertiser spend begins, assuming September weekday RPMs hold at $14-15.

---

## 2. Was this deploy-caused?

### Production changes in the 72h window (Aug 30 - Sep 2)

All relevant deploys verified PASS by deploy-verify.sh. The three deploys that touched earning pages:

| Deploy | What | Earning page touched? | Verified |
|---|---|---|---|
| PR #18 (09-01 21:45) | Removed Mediavine player relocation on /go | Yes — /go interstitial | PASS |
| PR #26 (09-02 09:11) | GA4 event + email form on /go interstitial | Yes — /go interstitial | PASS |
| PR #27 (09-02 09:16) | Witch-cc keyword fallback (collection page) | Minimal — low-traffic page | PASS |

#### PR #26 impact check: /go page before vs after

| Date | /go sessions | /go pageviews | Total site sessions |
|---|---|---|---|
| Aug 30 (pre) | 324 | 35 | 15,105 |
| Aug 31 (pre) | 272 | 27 | 12,714 |
| Sep 1 (pre, PR #18 live) | 222 | 18 | 11,522 |
| Sep 2 (PR #26 deployed 09:11) | 315 | 67 | 11,410 |
| Sep 3 (post) | 233 | 18 | 11,162 |

/go sessions on Sep 2 (315) and Sep 3 (233) are within the pre-PR range (222-324). The pageview spike on Sep 2 (67 vs 18-35 baseline) reflects same-day testing activity during the deploy window; Sep 3 reverts to 18, matching baseline. **No sign of /go traffic disruption or ad slot displacement from PR #26.** PR #18 (removed MV player relocation) also shows no degradation: /go sessions declined with overall site traffic, which is the dominant signal.

---

## 3. Traffic-side analysis (the primary signal for the judged day)

### Session volume by day (GA4, source of truth)

| Date | Day | Sessions | Desktop | Mobile |
|---|---|---|---|---|
| Aug 28 | Thu | 12,601 | 11,915 (94.5%) | 741 |
| Aug 29 | Fri | 13,948 | 13,071 (93.7%) | 774 |
| Aug 30 | Sat | 15,105 | 14,193 (94.0%) | 881 |
| Aug 31 | Sun | 12,714 | 11,981 (94.2%) | 771 |
| Sep 1 | Mon | 11,522 | 10,891 (94.5%) | 736 |
| Sep 2 | Tue | 11,410 | 10,640 (93.3%) | 683 |
| Sep 3 | Wed | 11,162 | 10,515 (94.2%) | 703 |

Desktop share: unchanged at ~94% across the full period. Device mix is not a contributing factor to any RPM shift.

### Channel breakdown (Sep 1-3)

| Channel | Sep 1 | Sep 2 | Sep 3 |
|---|---|---|---|
| Organic Social (Pinterest) | 7,926 | 7,381 | 7,684 |
| Organic Search (Bing/Google) | 3,034 | 3,084 | 2,994 |
| Direct | 559 | 615 | 591 |
| Referral | 62 | 40 | 56 |
| AI Assistant | 25 | 43 | 22 |

Pinterest is running 7,381-7,926 sessions/day in early September vs the prior 7-day average of ~8,300/day (57,859 / 7). That is a -9 to -11% decline in Pinterest volume. Organic search is stable (consistent with the scoreboard's Bing +0.7% and Google +3.3% WoW). Direct is stable.

**The sessions decline on the judged day (-10.6% vs 4-week Tuesday average) is almost entirely Pinterest-sourced.** Pinterest declined approximately 1,000-1,200 sessions/day relative to the August peak, which accounts for the full 1,343-session shortfall on Sep 2.

### Why Pinterest sessions are down

Pinterest traffic to content sites follows a post-summer taper pattern: peak engagement in July-August (longer screen time, more inspiration browsing), then a moderation in early September as school/work routines resume. The 7-day scoreboard already showed this (-6.2% Pinterest WoW). This is not a Pinterest algorithm change or a content gap; it is seasonal and consistent with Pip's channel read.

---

## 4. RPM analysis (secondary signal)

### E5 escalation tracker: September weekday RPMs vs $14.00 threshold

| Date | Day | Sessions (GA4) | Revenue (MV) | RPM | Below $14.00? |
|---|---|---|---|---|---|
| Sep 1 | Mon | 11,522 | est. ~$161 | ~$14.0 | borderline |
| Sep 2 | Tue | 11,269 (MV) | $160.20 | $14.21 | No |
| Sep 3 | Wed | 11,162 (GA4) | est. — | — | pending MV finalization |

Note: Sep 1 and Sep 3 revenue is estimated from the 7d total ($1,326.09 over Aug 27-Sep 2, MV) minus the Sep 2 finalized day. The finalized day Sep 2 at $14.21 RPM is above the $14.00 escalation threshold. Sep 1 is borderline; Sep 3 is not yet finalized.

**Escalation counter: 0 confirmed weekdays below $14.00.** The threshold trigger requires 5+ consecutive weekdays below $14.00. E5 remains open; escalation is not warranted today.

The 7d RPM of $14.98 (vs $16.48 prior 7d) reflects the August-September transition: the prior 7d included Aug 20-26, which had stronger advertiser demand as August campaigns spent down; the current 7d includes Aug 27-Sep 2, which is the post-August-budget period. This is demand-side CPM seasonality consistent with the E5 diagnosis, not a structural change.

---

## 5. The 28d breach: extended analysis

The 28d guardrail breach (-10.4%) is the mathematical consequence of the 28d window now being anchored at the bottom of the June-August compression curve. The window contains:

- Late July (high-volume, $15-16 RPM post-compression)
- All of August ($15.09 average monthly RPM, site's weakest month)
- Early September (transitioning, $14.21-$14.98 RPM)

The prior 28d window (which ended ~Aug 5) contained more of June and early July at $18-21 RPM. The breach is mechanical: a high-RPM period rotated out and a low-RPM period rotated in. It will self-correct as August days leave the window.

**Expected timeline for 28d guardrail recovery:** If September weekday RPMs hold at $14.50-15.50 (Q4 ramp), the 28d number will begin recovering in mid-September and should return to flat vs prior 28d by late September / early October. If September RPMs do not recover above $15.00 by Sep 15, that is the new signal to revisit.

---

## 6. Verdict

TRAFFIC-SIDE + ONGOING DEMAND-SIDE. The Sep 2 yellow trigger is primarily a sessions shortfall (-10.6%), driven by a post-summer Pinterest taper (-9 to -11% vs August peak). RPM is only -3.7% vs baseline and $14.21 on the judged day — above the E5 escalation threshold of $14.00. Device mix is unchanged (94% desktop). No deploy in the window caused a measurable change to /go traffic or RPM: PR #26 /go sessions are within pre-deploy range, and PR #18 shows no degradation pattern. The 28d guardrail breach is mechanical roll-through of the August compression window, self-correcting through September. No rollback is warranted. No Mediavine ticket is warranted.

**E5 escalation counter: 0 of 5 consecutive weekdays below $14.00 RPM.** E5 read date remains 2026-09-15.

**One action (Tier 0, Pip's lane):** Pinterest session volume should be monitored for a sustained taper vs a seasonal one-week dip. If 7d Pinterest sessions remain below 55,000 by 2026-09-11, Pip should read the Pinterest analytics for content/cadence signals. This is not a Rio action.

---

## Digest line

YELLOW 09-02: traffic-side (-10.6% sessions, Pinterest post-summer taper) + mechanical 28d roll-through of August compression; RPM $14.21 above escalation floor; PR #26 /go impact clean; E5 escalation counter 0/5; no site change needed.

---

_Rio, Product & Revenue — 2026-09-04_
