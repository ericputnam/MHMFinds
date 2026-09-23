<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->

# Funnel Team Scorecard

Quinn appends one block every Monday. Newest at the top. Grading: 🟢 at/above
target · 🟡 within 10% · 🔴 more than 10% below. Silence is not green.

## Template

```markdown
## Week of <YYYY-MM-DD>

**Headline:** total revenue 28d $N vs expectation $N (🟢/🟡/🔴) · sessions 28d N vs expectation N (🟢/🟡/🔴) · owned-audience net adds N/wk vs target N (🟢/🟡/🔴) · non-ad revenue $N/mo vs $N (🟢/🟡/🔴)

| Agent | KPI | Target | Actual | Grade | Moves shipped (T0/T1) | Note |
|---|---|---|---|---|---|---|
| Pip | sessions by channel 7d | | | | | |
| Sage | organic + AI-referral sessions 28d | | | | | |
| Nova | pages shipped / creators onboarded | | | | | |
| Cass | owned-audience net adds 7d | | | | | |
| Rio | non-ad revenue / mo | | | | | |
| Rowan | returning-visitor share / engaged sessions | | | | | |
| Ops | run success rate / ledger completeness | | | | | |

**Experiments graded:** KEEP … · KILL … · EXTEND …
**Biggest risk:** …
**Top 3 bets next week:** 1) … 2) … 3) …
**Operator queue:** N open, oldest N days
```

---

## Week of 2026-09-21 (covers 2026-09-14 → 2026-09-20, judged on data to 09-19)

**Headline:** total revenue 28d $6,051 vs expectation $5,798 (🟢 104.4%; Mediavine $5,916 +5.4%) · sessions 28d 355,780 vs expectation 369,773 (🟡 96.2%, floor 97%) · owned-audience net adds 52/wk vs target 120 (🔴 43%) · non-ad revenue $148/mo ($150.50 API) vs $200 (🔴 74%)

| Agent | KPI | Target | Actual (7d to 09-19) | Grade | Moves shipped (T0/T1) | Note |
|---|---|---|---|---|---|---|
| Pip | sessions by channel 7d | hold ≥ Aug run-rate (~92K/7d) | 86,391 (−3.7%); Pinterest 56,542 (−4.5%) | 🟡 | 3 T0 (E61 host read-back, E66 decline read + Q12 package, E70 `--ids-from` mode); E56 revival rolled back by operator 09-19 | Runway 0.5 d, 10 pins/24h; every refill is Tier 2 (SD-10) and sits with the operator (Q12 or Q8+Q11 scp). 58% of the WoW drop was Labor Day. |
| Sage | organic + AI-referral sessions | +25% AI-referral by 09-30 (≥385/7d) | google_organic 2,660 (+34.3%); ai_referral 304 (−9.0%); GSC clicks 28d 2,408 (+20.6%) | 🟡 | 2 T0 (E62 link graph, E71 llms-full 20→676 guides) | Google recovering on collection pages; AI referral flat-to-noisy (chatgpt weekly 282). E18 homepage SSR grades 09-22: neither leg met, impressions −31% on brand queries. |
| Nova | pages shipped / creators onboarded | ≥1 page + 1 brief per week | 3 collection pages (jewelry-cc 439, nails-cc 145, kids-cc 686) + 1 facet class bug fixed; creators 0; brief adoption 0/15 | 🟢 pages · 🔴 briefs | 3 T0 (E67, E72 + ageGroups repair, E38 /play KILL) | Brief format KILLED: the writer publishes celebrity/aesthetic/single-item posts, briefs proposed head terms. |
| Cass | owned-audience net adds 7d | 120 | 52 (accounts +49, email +3) | 🔴 | 2 T0 (E68 bounce exclusion + DSN counter, E73 homepage strip); day-2 send held on its 7.0% gate (Q10) | E6/E10 bottom-of-page blocks KILLED (0.31 and 0/1K); footer still 17 of 26 subscribers. Patreon free +150/wk is not in the headline count (proposal open). |
| Rio | non-ad revenue / mo | $200 by 09-30 | $148 public / $150.50 API (54 paid) | 🔴 | 1 T0 (E69 Q4 gate pre-read) + 1 T1 queued (E74 /go post-connect, merges 09-22) | Q4 gate reads HOLD tomorrow: joins 22.5/mo pace PASS, paid-and-connected 0/54 FAIL. 48 of 52 linked accounts never followed the campaign. |

**Experiments graded:** KEEP E14, E15 (token), E16, E23 (issue-01), E29, E35, E44 · KILL E6, E10, E15 (pins), E3 (brief format) · EXTEND E23 re-permission leg → 09-30 · CLOSED (operator rollback 09-19) E46, E56 · pending tomorrow E18, E69.
**Biggest risk:** the pin queue is 0.5 days from empty and under SD-10 nobody on the team may refill it — Pinterest is 65% of sessions and sessions 28d are already below the 97% floor. Second: `deploy-verify.sh` graded PASS against the wrong build on 2 of today's 7 merges (it matches deployments by timing, not commit) — production was briefly behind `main` twice with no runner signal.
**Top 3 bets next week:** 1) Q12 approval → 98 sessions-ranked pins at 7/day in one command (Pip, built). 2) E74 `/go` "follow free first" — the first move aimed at the actual population (Rio, T1 merges 09-22). 3) E73 homepage capture strip read 09-28/10-05, and count Patreon free members in the headline adds (Quinn, scoreboard).
**Operator queue:** 3 open T2 decisions (Q12 1 day, Q10 5 days, Q9 31 days — closes 09-22 by its own rule) + 4 approved items waiting on operator hands (Q4 step 1, Q8+Q11 scp, evening task, `NEXT_PUBLIC_SITE_URL`).
**Missing block:** the Week of 2026-09-14 block was never written (the 09-14 run's grades live in `digest-2026-09-14.md` → `digest-2026-09-20.md`); not reconstructed here to avoid re-deriving numbers after the fact.

## Week of 2026-09-07 (covers 2026-09-01 → 2026-09-07, first graded week)

**Headline:** owned-audience net adds 44/wk vs target 120 (🔴, 37% of target; baseline was 63) · non-ad revenue $127/mo vs $200 (🔴, 64%) · MV 28d $5,628 vs prior $6,088 (guardrail 🟡 at 92.4%; circuit breaker 🟢 on 09-07 — 09-05 was +12% vs same-weekday avg) · **total revenue 28d ≈ $5,745 vs ≈ $6,207 prior (−7.4%) — the SD-8 number, 🔴**

| Agent | KPI | Target | Actual (7d to 09-05) | Grade | Moves shipped (T0/T1) | Note |
|---|---|---|---|---|---|---|
| Pip | sessions by channel 7d | hold ≥ Aug run-rate (~92K/7d) | 87,770 (−4.3%); Pinterest 57,522 (−6.5%) | 🔴 | 2 T0 (E1 read-back + 7 catalog pins; E14 liveness check) | Post-summer Pinterest taper, second week; pinner alive (112 pins/7d, backlog 1,901). Stored Pinterest token 401 → Q2. |
| Sage | organic + AI-referral sessions | +25% AI-referral by 09-30 | google_organic 1,846 (+31.7%); ai_referral 228 (−33.7%); GSC clicks 28d 2,171 (+3.5%) | 🟡 | 3 T0 (E2 robots, E8 diagnosis, E11 hydration fix) | B3 diagnosis delivered 4 days early. AI referral trending the wrong way; homepage SSR (T1) is the queued lever. |
| Nova | pages shipped / creators onboarded | ≥1 page + 1 brief per week | 2 collection pages (witch-cc 48, makeup-cc 922) + 2 briefs (W36, W37); creators 0 | 🟢 | 3 T0 (E3, E7, E12) | Brief adoption 0/1 so far (W36). |
| Cass | owned-audience net adds 7d | 120 | 44 (email +3, accounts +41) | 🔴 | 3 T0 (E4 /go, E6 collections, E10 mod detail) | 3 new surfaces → 3 signups; footer still 16 of 20 subscribers. Nothing sent to 1,553 accounts yet — SMTP transport is the unlock. |
| Rio | non-ad revenue / mo | $200 by 09-30 | $127 (47 paid patrons) | 🔴 | 3 T0 diagnoses (E5, E9, E13) + Q4 package | Three yellows all traffic-side; E5 counter 0/5. Q4 Patreon relaunch (+$348/mo case) unanswered 3 days. Affiliates $0 on 53 clicks → cut-or-kill 09-15. |

**Experiments graded:** none due (first read dates: E11 09-08, E14 09-12, E5/E9/E13 09-15, E1/E4 09-16). 14 rows open, 0 killed.
**Biggest risk:** the loop itself, not a channel — 09-03 and 09-06 runs never launched, the evening check has no ledger row since 09-04, and today's first launch (08:00) failed headless auth (keychain token expires 2026-09-07 16:00) before the 08:03 retry succeeded. A team that runs 4 days in 7 cannot ship 5 moves/week. Second: Pinterest taper (−6.5% WoW) is 89% of the revenue gap and nothing on the site fixes it.
**Top 3 bets next week:** 1) Sage's homepage SSR shell (T1) — the #1 historical click source is a blank shell to Googlebot. 2) Cass's SMTP newsletter transport + first send to the 20 subscribers, then re-permission to accounts (T1; needs the operator's 10-minute BigScoots step). 3) Rio: Patreon OAuth membership package (T2) so Q4 has a product the day it is approved.
**Operator queue:** 3 open T2 (Q1 stale main, Q2 tokens, Q4 Patreon tiers), oldest 6 days — Q1 and Q2 hit the 7-day re-pitch rule tomorrow.

## Week of 2026-09-01 (baseline, no grades yet)

**Headline:** owned-audience net adds ≈63/wk (baseline) · non-ad revenue ≈$100/mo (baseline) · MV 28d $6,066 (Aug), RPM $15.09

Baseline week. Team chartered 2026-09-01; first graded block lands Monday 2026-09-07.
Known reds carried in from the fact base: Google clicks −94% over 16 months
(undiagnosed), 17 email subscribers, GA4 has no conversion events, pinner is
unmonitored, `main` is 4+ weeks behind the feature branch.
