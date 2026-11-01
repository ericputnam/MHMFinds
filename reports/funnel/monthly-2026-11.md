# MHM funnel — monthly review, written 2026-11-01 (October graded, November set)

Second monthly report. Sources: `reports/funnel/history.json` (Mediavine days 10-01→10-30, 30 reported; 10-31 not finalized), today's scoreboard `reports/funnel/2026-11-01.md`, `reports/funnel/changelog.md`, `experiments.md` + `archive/experiments-2026-10.md`, `targets.json`, `growth-plan.md` (operator directive 10-24), `reports/funnel/rio-verdict-2026-10-31.md`, `reports/funnel/competitors-2026-11.md` (§4). The Mediavine MCP did not connect this session; every Mediavine number below is the breaker's or the scoreboard's.

## 1. October against the targets

| Metric | September | October | Target | Grade |
|---|---|---|---|---|
| Mediavine sessions, calendar month | 380,812 on 30 days = 12,694/day | **382,432 on 30 reported days = 12,748/day** (+0.4%/day); 31-day projection ≈395,200 | 415,000 | **95.2% of target — MISSED**; per-day expectation line 100.1% (381,950) |
| Mediavine revenue, calendar month | $6,444.48 = $214.82/day | **$6,218.51 on 30 days = $207.28/day** (−3.5%/day) | ≥95% of prior 28d (guardrail) | 99.0% of the per-day line; 28d to 10-30 −2.0% vs prior — guardrail HIT, never 🔴 after 10-03 |
| Session RPM | $16.92 | $16.26 (month); 7d to 10-30 $17.72 (+11% WoW) | — | −3.9% on the month, recovering in W4 (ex-segment RPM read "rate" 10-29, 10-30) |
| The operator's ramp (28d to 10-30, `history.json` `expectation`) | — | sessions 359,583 vs 451,004 = **79.7%** · revenue ≈$6,063 vs $7,296 = **83.1%** | 500,000 Nov / 600,000 Dec | BELOW LINE, red 39 days; gap widens ≈3.5 pp per two weeks while sessions stay flat |
| Owned-audience adds / wk | 119 (10-01) | **135** (108 accounts + 27 email); peak 247 on 10-17 | 200 (B1) | **MISSED** (68%); B1 killIf fired 10-15 logic: coverage done, copy is the lever |
| Email subscribers | 59 | 285 (+223 in 30d; signup-optin 236 of them) | — | 4.8× |
| Registered accounts | 1,815 | 2,364 (+539 in 30d) | — | +30% |
| Non-ad revenue / mo | $155 (57 paid) | **$144 gross** (56 paid: 14×$1, 40×$3, 2×$5); Members API $153.50 | $450 (B2) | **MISSED** (32%); affiliates $0 (Impact 20 clicks / 0 actions); sponsorship $0 (no outreach approved) |
| Paid-and-connected Patreon | 1 of 111 | 5 of 342 linked (9% of paid) | ≥1/3 (Q4 gate) | not met; Q4 closed |
| GSC clicks 28d | 2,607 | 3,131 (+17.4% vs prior 28d; impressions 95,004) | — | +20% MoM |
| google_organic sessions 7d | 2,806 | 3,144 (+21.9% WoW) | — | +12% MoM |
| ai_referral sessions 7d | 379 | 812 (+38.8% WoW) | ≥385 by 10-07 (E27/E42) | **HIT**, 2.1× |
| Pinterest sessions 7d | 59,670 | 58,766 (−0.4% WoW) | — | flat; runway 2.1 d; 1,706 stranded rows; writer 173 rows/7d |
| Non-Pinterest share 7d (adjusted, ex-crawler) | 17.3% | 16.6% | 160,000/mo = 32% (Nov) | ≈14.8k/wk now vs 37k/wk needed |
| Catalog | 16,561 | 17,132 (+571; new mods 7d 126 from 5 posts + 15 other) | 208/wk | ingest ≈60% of the long-range rate |
| Creators onboarded (≥1 submission) | 0 | 2 (1 with an approved mod); 7 submissions pending 29 d → E304 apply today | 10 by 12-31 | started; badge (#372) 0 uses |
| Returning-visitor share 7d | 52.0% | 54.2% | 55% by 12-31 | on track |
| Run success 14d | 78.6% | 71.4% (1 MISSED in the last 7: 10-26, laptop asleep) | 95% | MISSED |

Verdict on October: the team shipped more than in September and moved revenue per session, not sessions. Sessions were flat month over month (+0.4%/day) against a +4% target and against a ramp that now asks for +25%; revenue fell 3.5%/day on a CPM trough in W1 (10-02→10-08, −16%) that W4 (+5.1%) did not fully recover. Google and AI referral doubled off a small base and are the only channels growing; Pinterest, 66% of sessions, is flat and inventory-bound. All three October bets closed MISSED (B1 68%, B2 32%, B3 95.2% of the calendar target). The operator's 10-24 ruling stands: the Dec 600k target is not re-based.

## 2. What the team shipped

- Ledger rows 2026-10: **184 after-merge rows** (Quinn 24, Rowan 23, Pip 23, Nova 23, Sage 21, Ops 20, Rio 19, Cass 19, operator/interactive/manual 11). One ROLLED BACK row and 6 incident files (10-03 red-RPM breaker, 10-05, 10-08, 10-12 ×2, 10-24) — none after 10-24. Ops share stayed under the 20% cap every week (8.2% on 11-01).
- Experiments registered in October: E149–E308 (160 ids). Grades are in `archive/experiments-2026-10.md` and the daily digests; the live registry carries 21 PENDING rows into November, 2 graded KEEP on 10-31 (E271 ex-segment RPM print, E302's first leg pending).
- Structural changes that held: the operator's growth plan and stepped ramp (10-24); AUDIENCE-only re-weighting under the watch block (10-24, 10-29, 10-31); title-only theme rules for every room/holiday facet (bedroom, kitchen, bathroom, halloween, christmas); ownership-gated creator approval (E304, #421); deploy-verify grading the READY build that contains the sha with a 600 s smoke cap (E308); the merge-gate lock (E155 → TTL break observed this morning after a 24.8 h stale hold); the social-draft pipeline with the voice rule (3 batches drafted, 0 posted — channel accounts do not exist).
- What failed and was closed: B2's Patreon leg (0 → 2 paid joins per week; the second free→paid trip never fired); six pin top-ups that never held runway above 2.8 d (SD-10); the Mediavine MCP (CONNECTION_CLOSED on most runs since 10-20 — Rio reads via the client script); the evening guardrail task (retired 09-22; morning `--check` instead).

## 3. What we learned (the three that change November)

1. **Rate is not growth.** W4's RPM +9.5% put the 28d revenue line within −2% while sessions sat at 79.7% of the ramp. The ramp needs ≈16.9k sessions/day in mid-November against 12.8k now; at $17 RPM that is $70/day the rate cannot supply. November is graded on sessions brought within 14 days (operator watch 10-31), and every non-AUDIENCE Tier 1 waits.
2. **Pages without a source do not pay back in a month.** October added ≈12 collection/creator pages; the one with a same-week source (halloween-cc, pinned) went 15 → 53 sessions, the rest wait on Google (14–28 d). The only same-week levers are pins onto existing pages (Q39, 20 never-pinned pages, 8 in the top-10 by sessions) and the social channels — both gated by operator replies that have been silent since 10-23. The cheapest "yes" in the queue is Q39.
3. **Capture surfaces are done; copy and cadence are the lever.** Coverage reached every >1% page, adds peaked at 247/wk (10-17) and settled at 135 once the newsletter and invite sends stopped. A/B copy on the Patreon-connect return (E305, #414) is the first copy test and is held under the AUDIENCE-only rule.

## 4. November bets (targets.json `bets`, month 2026-11)

| Bet | Owner | Target | Kill rule |
|---|---|---|---|
| B1 Owned audience 300/wk — copy, not coverage: the biweekly newsletter on cadence, the sign-up opt-in (236 of 285 subs) copy test, invite-02 to accounts without email consent, E305 when the AUDIENCE hold lifts | Cass (Rowan favorites loop) | 200/wk by 11-15, 300/wk by 11-30 (135 on 11-01) | <180 on 11-15 → stop new surfaces, one copy test per week only |
| B2 Non-ad: Rio's line $250/mo with Q37-A + the E294 post, $155/mo if Q37 is unanswered; the $750 target stands as the line (needs ≈200 more $3 patrons or two $300 sponsors) — levers: Q37-A perk (Tier 2), E294 members post (Tier 2), affiliates read 11-11 (Impact $0 → KILL; Amazon block ≥5 clicks/day keeps the leg pending operator earnings), creator supply via E304 + badge (Nova) | Rio (Nova) | $250 by 11-30 | Q37 unanswered 11-05 → affiliates + post only; $3 joins 7d after the post <4 → kill the perk pitch; Impact $0 on 11-11 → E13 stance |
| B3 Sessions on the 500k ramp and non-Pinterest 160k — fresh pins onto existing pages (Q39), social channels (Q34/Q40 → Tier 1 proposal after 11-07), Bing + IndexNow coverage of every new page, hubs on the Google/AI legs (Sage), traffic pages only with a same-week link source (Rowan), EA release calendar | Pip (Sage, Rowan) | ≥90% of the ramp by 11-30 (79.7% on 11-01); non-Pinterest ex-crawler ≥100k | AUDIENCE-only dispatch until ≥97%; non-Pinterest 28d <80k on 11-15 → Pip's move becomes diagnosis of the channel mix |

Competitor-intel moves (`reports/funnel/competitors-2026-11.md`, second read; 10 of 20 head queries lost in the top 5 vs 11 in October; CurseForge now discloses 139,202 Sims 4 projects = 8.1× our catalog): (1) Sage — extend the narrow long-tail hub pattern against the aggregator terms where we sit 22–50 (folds into B3); (2) Nova — Seoulsoul-sims joins BADDDIESIMS in the next outreach batch, 3 of 4 competitor sites each and no profile here (existing cadence, Q38 is the open ask); (3) Rio — read the skip-countdown perk (shipped 10-16 from October's report) against non-ad revenue before any further /go or pricing change, Tier 2 either way (folds into B2/Q37). Recorded in `targets.json` `bets.competitorMoves`. October's three: move 1 (category-hub gap) is in progress under Sage's hub work (E302/E303 and today's E311), move 2 (8 favorites-ranked creators) stayed paper because Q23/Q38 outreach is unapproved, move 3 (skip-the-wait perk) became Q37-A.

## 5. What the operator decides this month

- Q39 (20 catalog pins, drops 11-06) and Q34/Q40 (social batches; accounts do not exist) are the only same-week session levers the team has. Q37 (A/B, by 11-05) sets B2's line. Q36 (Patreon post) is the free test of Q37-A. Q32 (Mediavine JWT, ≈11-12) keeps the breaker alive. Q38 (badge outreach) and Q35 (gallery-poses redirect) drop 11-06.
- Outside the repo: channel accounts (TikTok/YouTube/Instagram/Tumblr), GA4 custom dimensions, Amazon Associates earnings for 10-27→11-11, `claude auth login` before 11-15, the laptop on AC by 06:30, the stale worktree holding `main`.
- Infra costs are still unknown; this report is gross revenue only.

## 6. Risks carried into November

- Pin runway 2.1 d with 1,706 stranded rows and the writer idle 49 h: Pinterest draws down within two days if the plugin stops; top-ups only re-date.
- The Mediavine JWT expires ≈11-12: from then the breaker cannot grade and every Tier 1 merge stalls.
- Run success 71.4%: one morning in seven does not run; the loop's own liveness rows are its only record.
- The ramp climbs ≈1.1k sessions/day every two weeks; flat traffic reads 75% by 11-30 and 66% by 12-31.
- Quarter test on 12-31: owned adds ≥190/wk (135), non-ad ≥$1,000/mo ($144), sessions on the 600k pace (79.7%).
