<!-- context budget: archive file, not enforced by the budget test; verbatim moves out of scorecard.md -->
# Funnel Team Scorecard — Archive (2026-09)

Blocks moved verbatim out of `scorecard.md` on 2026-09-28 to stay under its 10000-byte cap. Nothing edited, only relocated.

## Week of 2026-09-28 (covers 2026-09-21 → 2026-09-27, judged on data to 09-26)

**Headline:** total revenue 28d $5,996 Mediavine (08-30→09-26) + ≈$146 non-ad vs expectation $5,757 (🟢 104.2%; Mediavine +6.5% vs prior 28d) · sessions 28d 355,144 vs expectation 360,796 (🟡 98.4%, floor 97% — ON LINE run 2 of 2, re-weighting lifted) · owned-audience net adds 110/wk vs target 120 (🟡 92%) · non-ad revenue $146/mo public ($153.50 API, 55 paid) vs $200 (🔴 73%)

| Agent | KPI | Target | Actual (7d to 09-26) | Grade | Moves shipped (T0/T1) | Note |
|---|---|---|---|---|---|---|
| Pip | sessions by channel 7d | hold ≥ Aug run-rate (~92K/7d) | 90,708 (+5.0% WoW); Pinterest 59,711 (+5.6%); Bing 16,337 (+3.2%) | 🟡 | 7 T0 merges 7d (E116, E117, E124, E127 + top-ups #2–#4 applied) | Runway 1.34 → 1.89 d after top-up #4; four 21-row top-ups never lifted it above 2.44 d — treadmill. Writer inflow still 0/day (Q11-b re-pitched today). E66 EXTEND, E70 KEEP. |
| Sage | organic + AI-referral sessions 28d | +25% AI-referral by 09-30 (≥385/7d) | google_organic 2,959 (+11.2%); ai_referral 332 (+9.2%, 86% of 385); GSC /games/sims-4/* 169 clicks pos 23.9 | 🟡 | 7 T0 merges 7d (E114, E115, E121, E128) | E47/E52 KILL: 13/13 IndexNow OK days and Bing still 16,337 < 17,032. E32 KEEP, E18 EXTEND (pos 37.49 vs ≤37). E2/E42 read 09-30 at 332 vs 385. |
| Nova | pages shipped / creators onboarded | ≥1 page + 1 brief per week; creators >0 | /creator/ hub + 534 pages live (E97/E113); claim path end-to-end (E122 T1 + E129 admin review); creators onboarded 0; claim subs 0 | 🟢 surfaces · 🔴 creators | 7 merges 7d (E113, E122, E129 + fixes) | "Onboarded 0" was 0 by construction until 09-28; now 0 because nobody is sent to the page — outreach template is the T2 ask. E33 KEEP closed (coverage 96.87%). |
| Cass | owned-audience net adds 7d | 120 | 110 (26 email + 84 accounts); capture 1.21/1K | 🟡 | 6 T0 merges 7d (E118, E123, E130) | E10 KILL (0 rows ever); E130 account offer under the /mods/[id] image reads 10-12. Q10 day-3 dropped under the 7-day rule; E54/E68 grade 09-30 on two batches. |
| Rio | non-ad revenue / mo | $200 by 09-30 | $146 public / $153.50 API (55 paid); joins 7d 3, cancels 1; connected 0/55 | 🔴 | 5 T0 merges 7d (E108, E125, E131) | Target will be missed 09-30. E55/E60 read 09-29: pre-read KEEP (page RPM floors pass). /go pageviews −49% WoW (342→175) is the member-CTA ceiling. Q16 drops 09-29, Q17 re-pitch 09-30. |
| Rowan | returning-visitor share / engaged sessions | — (no scoreboard line yet) | not read this week — no returning-visitor or engaged-sessions series on the scoreboard; 3 room pages shipped (bedroom 250, kitchen 160, bathroom 123 mods) | ⚪ unmeasured | 6 T0 merges 7d (E100, E109, E112, E120, E132) | Every room theme is now title-only; E132 stops CAS mistypes at ingest but 74 of 76 E120 rows came from aiFacetExtractor (queued). KPI needs an `[ops]` scoreboard line before it can be graded. |
| Ops | run success rate / ledger completeness | 100% / 100% | run success 14d 10/14 = 71.4% (09-14 no digest, 09-17 prompt too long, 09-18/09-22 600 s kill; 09-23→09-28 6/6); ledger completeness since 09-21 67/69 = 97.1% (gaps #138, #190 — both daily PRs; #198 backfilled 09-28) | 🟡 | 6 merges 7d (E101, E110, E111, E126, E133) — 11.8% of 51 (cap 20%) | Not-measured now stays null (E126). Open: #201 INCONCLUSIVE on a curl leg with no network control; `nonAdRevenueMonthlyGross: 0` at the source. |

**Experiments graded:** KEEP E32, E33 (closed), E70 (closed) · KILL E47, E52, E10 (lifetime 0) · EXTEND E18 → 10-06, E66 → 10-05 · CLOSED paper E79/E80 · pending reads 09-29 E55/E60, 09-30 E2/E27/E42/E54/E68/E76/E82/E91.
**Biggest risk:** pin inflow is still 0/day and the daily 21-row top-up is a treadmill (four mornings: 1.83→2.44, 1.75→2.33, 1.59→2.16, 1.34→1.89 d); the Q12 slice runs dry 10-05 and the ranked pool covers ~7 more top-ups. Pinterest is 66% of sessions and only Q11-b (operator scp) changes the slope. Second: non-ad revenue misses its 09-30 target with 0 of 55 paid patrons connected and `/go` reach halved.
**Top 3 bets next week:** 1) Q11-b approval → writer schedules 12 pins/day (Pip patch, operator scp). 2) E130 "Save this find" + a favorites page (Rowan) so the account offer has something to promise; read 10-12. 3) Creator outreach template (Nova, T2) — the first thing that sends anyone to the now-working claim path.
**Operator queue:** 4 open T2 decisions (Q11-b 5 d, Q16 6 d — drops 09-29, Q17 5 d, Q18 7 d) + Q4 dashboard steps (24 d) + 4 operator-only actions (`NEXT_PUBLIC_SITE_URL` 13 mornings, BigScoots, GA4 dimension, GSC).

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

<!-- rotated verbatim from scorecard.md on 2026-10-19 (Quinn) -->

## Week of 2026-10-12 (covers 2026-10-05 → 2026-10-11, judged on data to 10-10)

**Headline:** total revenue 28d $5,820 Mediavine (09-13→10-10) + ≈$146 non-ad ≈ $5,965 vs expectation $5,942 (🟡 Mediavine alone 97.9% of line; −0.6% vs prior 28d) · sessions 28d 352,592 vs expectation 357,232 (🟡 98.7% — ON LINE run 10) · owned-audience net adds 126/wk vs 160 by 10-15 (🔴 79%) · non-ad revenue $158/mo (58 paid) vs $450 (🔴 35%)

| Agent | KPI | Target | Actual (7d to 10-10) | Grade | Moves shipped (T0/T1) | Note |
|---|---|---|---|---|---|---|
| Pip | sessions by channel 7d | hold ≥ Aug run-rate (~92K/7d) | 85,714 (−5.4% WoW); Pinterest 56,506 (−3.0%); Bing 14,736 (−9.7%) | 🟡 93% | 2 T0 (#268 top-up #11 report, #273 E181 top-up #12) + 2 Supabase applies | Runway 1.30 → 1.4 d; 8 of 9 past top-ups graded KILL on absolute bars while the channel fell — gate is now relative (≥ site WoW). Writer 122 rows/7d. |
| Sage | organic + AI-referral sessions 28d | AI ≥385/7d by 10-19 (E71) | google_organic 2,783 (+3.2%); ai_referral 304 (−18.5%, 79% of 385); GSC clicks 28d 2,863 (+27.6%) | 🟡 | 1 T0 (#265 E177) + T1 #275 CC hub (merged 10-12) | E121 KILL, E104/E150 KEEP. "sims 4 cc" 439 impr/28d lands on the homepage at pos ~35 — the hub is the bet. |
| Nova | pages shipped / creators onboarded | creators >0 | creators 3 (2 with ≥1 approved); creator submissions 7d 0; 7 pending (Q26, 9 d) | 🔴 | 2 T0 (#270 E178, #274 E183) | Approval now mints the creator profile; 20/22 claim views had an empty slug (E122 KILL). Outreach stays T2 (Q23 drops 10-14). |
| Cass | owned-audience net adds 7d | 160 by 10-15 | 126 (99 accounts + 27 email); capture 1.47/1K | 🔴 79% | 3 T0 (#266 E179, #260 E173, #279 E184) + issue 05 sent 97/98 | First weekly issue ever. E107 KILL (0.28/1K), E123 KEEP. Q25 pilot unanswered (drops 10-17). |
| Rio | non-ad revenue / mo | $450 (B2) | $158 public ($160.50 API, 58 paid); joins 7d 2 / cancels 2; connected 3/192 | 🔴 35% | 2 T0 docs (#269, #277) | B2 killIf leg 1 MET (joins <5); leg 2 reads 10-15 → affiliates-only October if met. E174 sidebar EXTEND → 10-14, no third extension. |
| Rowan | returning-visitor share / engaged sessions | 55% by Dec (longRange) | returning 53.6%; pages/session 1.53; engagement 73.7%; favorites +546 | 🟡 97% | 2 T0 (#267 E180 34 pins, #276 E186 80 pins) + 2 applies | Post-URL disagreement 579 → 499 rows, 6 → 3 posts >50%. E161/E168/E132 KEEP, E43 KILL (123 engaged vs 200). |
| Ops | run success rate / ledger completeness | 100% / 100% | run success 14d 57.1%; liveness 2/7 (10-05/06/08/09/10 MISSED); ledger 16/16 merges have rows | 🔴 / 🟢 | 2 (#271 E176, #278 E187) — 12.5% of 16 (cap 20%) | All 16 merges landed on the 2 mornings that ran. Cause: host asleep on battery; 2 of 5 were preflight hangs with no captured cause. |

**Experiments graded (10-07, 10-11, 10-12):** KEEP E27/E42 (final), E104, E150, E123, E108, E161, E168, E132, E155, E169 · KILL E121, E122, E107, E43 + 8 of Pip's 13 top-up reads (absolute bars) · EXTEND E174 → 10-14 · MORE DATA E118, E131 · 10-12: KEEP E133, E153 (confirmed, pipe 60.0%), E74 (feature; lever retired at 12.7% share) · KILL E48 (parked) · EXTEND E130→10-26 (0.57/1K), E134→11-11, E148→10-18, E174→10-14
**Biggest risk:** the loop itself — 2 of 7 mornings ran, so a week's work landed in two bursts of 8 merges and five days of reads, sends and top-ups simply did not happen (issue 05 went 3 days late, runway hit 0.50 d). Second: B1 needs +34 adds/wk in 3 days and B2 is one read from "affiliates-only".
**Top 3 bets next week:** 1) Capture: session-aware account offer where E73's strip was, judged against 160 on 10-15 (Cass). 2) Pin runway: relative keep-if + writer-row predicate so top-ups stop being killed by the channel (Pip). 3) CC hub #275 indexed and "sims 4 cc" off the homepage (Sage, read 10-26).
**Operator queue:** 6 open T2 (Q-E21 hold → 11-02, Q20, Q23, Q24, Q25, Q26 — oldest Q26 9 days; Q23/Q24 drop 10-14, Q25 10-17, Q20/Q26 10-18).
**Missing block:** the Week of 2026-10-05 block was never written (the 10-05 run did not fire; that week's grades live in `digest-2026-10-07.md` and `digest-2026-10-11.md`); not reconstructed after the fact.
