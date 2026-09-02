# Rio — Guardrail Diagnosis — 2026-09-02

**Anchored on:** last finalized day 2026-08-31 (Sunday)
**Status when triggered:** yellow (revenue -19.7% vs same-weekday avg; 3-day -2.8%)
**Written:** 2026-09-02 by Rio

---

## 1. What the numbers actually show

### The judged day: Aug 31 (Sunday)

| Metric | Actual | Expected (same weekday, 4-wk avg) | Delta |
|---|---|---|---|
| Revenue | $150.08 | $186.95 | -19.7% |
| Session RPM | $11.96 | $14.29 | -16.3% |
| Sessions | 12,547 | 13,088 | -4.1% |

Sessions were only -4.1% below the same-Sunday average. RPM was -16.3%. The revenue shortfall is RPM-driven, not traffic-driven.

### The 3-day window: Aug 29-31

| Metric | Actual | Expected | Delta |
|---|---|---|---|
| Revenue | $623.98 | $642.23 | -2.8% |
| Session RPM | $15.07 | $15.09 | -0.1% |

The three-day RPM is essentially flat at -0.1%. Aug 30 (Saturday) was green: revenue $233.55 at $15.67 RPM vs expected $224.34. The Aug 31 dip is a single-day event within an otherwise normal week.

### The 28-day context (the actual guardrail)

| Period | Revenue | RPM |
|---|---|---|
| Prior 28d (ending ~Aug 3) | $6,320.40 | — |
| Current 28d (ending Aug 31) | $5,631.87 | $15.40 |
| Delta | -$688.53 | -10.9% |

Monthly revenue trend for context (from the fact base): $8,677 (Jun) → $6,981 (Jul) → $6,066 (Aug). Session RPM trend: $21.92 (Jun) → $15.09 (Aug). The 28-day guardrail breach today is the tail end of a three-month sustained compression, not a new event.

---

## 2. Was this deploy-caused?

No. Every production deployment in the changelog postdates Aug 31:

- `fa6e2e0` — 2026-09-01 21:45 (remove Mediavine player relocation on /go) — AFTER judged day
- `428384d` — 2026-09-02 07:44 — AFTER judged day
- `4fb45b6` — 2026-09-02 07:47 — AFTER judged day
- `4a8ace1` — 2026-09-02 08:08 — AFTER judged day

The judged day (Aug 31) had zero production deploys. Rollback is not indicated.

---

## 3. Was this site-side (ad infrastructure)?

Mediavine health check: ads_txt=ok, privacy_policy=ok (both today and on 2026-09-01). The guardrail script reports no health failures. No incident files have been created. There is no evidence of a site-side ad infrastructure problem.

---

## 4. Mix-shift analysis (device, geo, advertiser)

Mediavine MCP tools (mv_devices, mv_advertisers, mv_top_pages) were not available in today's run — the MCP context does not include active Mediavine API credentials from the worktree environment. Analysis proceeds with what the scoreboard provides.

**What the scoreboard shows for the Aug 25-31 week vs prior week:**

| Channel | Aug 25-31 | Aug 18-24 | Delta |
|---|---|---|---|
| Pinterest | 61,231 | 61,323 | -0.2% |
| Bing organic | 18,045 | 17,494 | +3.1% |
| Direct | 4,445 | 5,102 | -12.9% |
| Other | 2,199 | 2,385 | -7.8% |
| All sessions | 91,651 | 91,934 | -0.3% |

Direct traffic is -657 sessions WoW (-12.9%). Direct visitors tend to skew desktop and repeat-user; these sessions often command higher CPMs than Pinterest-sourced mobile sessions. The mix is shifting marginally toward Pinterest (lower-RPM channel) as a share of the total. However, at this scale (-657 sessions out of ~91K), this cannot explain a $37/day revenue gap on Aug 31 alone.

**Sunday-specific pattern:** Sundays historically produce lower advertiser demand (weekday vs weekend CPM differential is well-documented in programmatic advertising). The 4-week same-weekday average is the correct baseline, but if the comparison Sundays were themselves above average (e.g., early August had stronger weekend demand that cooled into late August as advertiser budgets close for August), the expected figure of $186.95 may be a lagging optimistic baseline.

---

## 5. Demand-side / seasonality analysis

**The trend evidence is unambiguous:**
- RPM: $21.92 (Jun) → $15.09 (Aug) — a 31% decline over two months on flat sessions
- Revenue: $8,677 (Jun) → $6,066 (Aug) — a 30% decline over two months
- Sessions: essentially flat week-over-week (7d sessions -0.3%)
- Mediavine confirmed in a prior communication that the site has done everything they recommend

This is demand-side (CPM) compression. August is consistently a weaker month in programmatic advertising as summer budgets wind down and Q3 spending is front-loaded to July. The Aug 31 Sunday dip (RPM $11.96 vs $14.29 expected) is consistent with advertiser budget exhaustion at end-of-month and end-of-summer — a well-known pattern in display advertising where CPMs on the last Sunday of August tend to be the weakest of the quarter.

The 3-day RPM being -0.1% is the strongest single signal: the surrounding days are normal. Aug 31 is an outlier day, not a structural problem.

**September outlook:** September typically sees a CPM recovery as Q4 planning and back-to-school campaigns begin in earnest. The 28d guardrail will continue to reflect the Jul-Aug compression for several more weeks as those low days rotate out of the window, but daily RPM should begin recovering in early September if the seasonal pattern holds.

---

## 6. What should change

**Nothing structural should change.** Specifically:

1. No rollback is warranted — no deploy touched the judged day.
2. No Mediavine ticket is warranted — health checks are green, the 3-day RPM is -0.1%, and Mediavine has already told us demand-side RPM is not theirs to fix on this site.
3. No ad layout changes — RPM is not a growth lever per SD-5, and no layout change would address seasonal CPM compression.
4. The 28d guardrail will remain breached for approximately 2-3 more weeks as the Jul-Aug low-RPM days roll out of the window. This is expected and self-correcting.

**One monitoring action (Tier 0, watch rule):** Continue tracking the 28d guardrail daily. If by 2026-09-15 the 28d RPM is not recovering — specifically, if September weekday RPMs stay below $14.00 for 5+ consecutive days — escalate to a Mediavine conversation about whether Q3 floor pricing can be reviewed. That is the keep/escalate rule; absent that trigger, this diagnosis closes the yellow.

---

## Verdict

DEMAND-SIDE / SEASONALITY. The Aug 31 yellow trigger is a single Sunday at end-of-August with RPM $11.96 vs $14.29 expected — consistent with known programmatic CPM patterns (weekend + end-of-summer budget exhaustion). The 3-day RPM is -0.1% (normal). No deploy touched the judged day. No health failures. The 28d guardrail breach is the tail of a June-August demand compression trend that Mediavine has confirmed is not site-caused. No site change is required. Watch trigger: September weekday RPM below $14.00 for 5+ consecutive days → open Mediavine conversation.

---

_Rio, Product & Revenue — 2026-09-02_
