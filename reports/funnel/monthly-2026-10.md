# MHM funnel — monthly review, written 2026-10-01 (September graded, October set)

First monthly report. Sources: `reports/funnel/history.json` (Mediavine days 09-01→09-30, 29 reported), today's scoreboard `reports/funnel/2026-10-01.md`, `reports/funnel/changelog.md`, `experiments.md` + `archive/experiments-2026-09.md`, `targets.json` baseline (pulled 2026-09-01).

## 1. September against the targets

| Metric | Baseline (Aug, targets.json) | September | Target | Grade |
|---|---|---|---|---|
| Mediavine sessions, calendar month | 401,901 (Aug) | 369,600 on 29 reported days (09-01→09-30 per history.json) = 12,745/day vs 13,369/day in Aug (−4.7 %/day) | 400,000 line | 96.3 % of the line pace — WATCH band; last 28d 99.5 % ON LINE run 5 |
| Mediavine revenue, calendar month | $6,216.24 (Aug, history.json) · $6,066.16 (targets.json) | $6,292.72 on 29 reported days = $217.0/day vs $200.5/day in Aug (+8.2 %/day) | ≥95 % of prior 28d | 102.0 % of the expectation line — HIT |
| Session RPM | $15.09 (Aug) | $17.13 (28d to 09-29) | — | +13.5 % |
| Owned-audience adds / wk | ≈63 | 121 (09-29, 09-30), 119 (10-01) | 120 | B1 HIT at month end; the quarter floor is 190 |
| Email subscribers | 17 | 59 (+42 in 30d: signup-optin 28, footer 17, go-interstitial 6, collection-page 3) | — | 3.5× |
| Registered accounts | 1,522 | 1,815 (+296 in 30d) | — | +19 % |
| Non-ad revenue / mo | $100–129 (49 paid) | $155 public (57 paid: $1×11, $3×43, $5×3) | $200 | B2 MISSED (78 %) |
| Paid-and-connected Patreon accounts | 0 | 1 of 111 linked | ≥1/3 of paid (Q4 gate) | not met; Q4 closed won't-do 09-22 |
| GSC clicks 28d | 2,097 | 2,607 (+25 % vs prior 28d) | — | +24 % |
| google_organic sessions 7d | ≈1,373/wk (17,661/90d) | 2,806 (+7.1 % WoW) | — | ≈2× |
| ai_referral sessions 7d | ≈139/wk (1,790/90d) | 379 (+32 % WoW; E27/E42 final 10-07 at ≥385) | +25 % by 09-30 | B3 HIT |
| Pinterest sessions 7d | ≈61,000/wk (756,886/90d organic) | 59,670 (+1.7 % WoW) | — | flat; runway 0.8 d today |
| Catalog | 15,888 mods | 16,561 (+673) · new mods 7d 27 (prior 78) | 208 new/wk | ingest thin in the last week |
| Creators onboarded (≥1 submission) | 0 | 0 (20 profiles, 4 submissions, 0 Creator-Claim rows ever) | 10 by 12-31 | not started — Q23 awaits approval |
| Returning-visitor share 7d | 52 % | 52.0 % | 55 % by 12-31 | flat |

Verdict on September: revenue grew (+8 %/day on an RPM gain), sessions did not (−4.7 %/day vs August, 96.3 % of the line over the month), and the operator's 09-19 rule says that is not growth until both are ≥97 %. The last five runs are ON LINE on the 28-day window because the line itself steps down into the seasonal trough; the calendar month still reads below the 400,000 target.

## 2. What the team shipped

- Ledger rows 2026-09: 209 after-merge rows (Quinn 56, Nova 25, Cass 24, Pip 23, Rio 22, Sage 20, manual/operator ≈20, Ops 10, Rowan 7 — Rowan exists since 09-22). 19 rollback/rolled-back rows, 8 incident files (09-02, 09-04, 09-05, 09-07, 09-21, 09-22, 09-24, 09-26); none since 09-26.
- Experiments registered: E1–E148 (140 distinct IDs). Graded so far: 21 KEEP/CLOSED-KEEP, 9 KILL, 5 EXTEND; the rest read in October.
- Structural changes that held: tiered autonomy with the ship protocol (09-01); seven-persona restructure + Ops cap (09-22); funnel page with the expectation line (09-19, operator); "agents return rows, Quinn writes the registry" (09-30); per-agent allowed-file lists (09-29: incidents per merge 2/8 → 0/5 → 0/11).
- What failed and was closed: E4 /go email box (1.45/1K), E54 re-permission (2/387), E40/Q4 Patreon tier copy (gate never met; closed won't-do), E76 top-up KPI (six top-ups never held runway above 2.44 d), E82 writer-row diagnosis (the placeholder rows were the plugin's waiting state, not dead inventory).

## 3. What we learned (the three that change October)

1. **Capture compounds, the runway does not.** Owned adds went 63 → 121/wk by adding surfaces that stay (footer, signup opt-in, collection pages, /go interstitial, favorites page). Pin runway went 0.94 → 1.46 → 0.8 d through six top-ups because the only inflow that holds is the writer plugin's (151 rows in 8 d). October's traffic lever is plugin inflow and writer-row SEO (Q24), not top-ups.
2. **The Patreon membership leg had no population.** 1 of 111 linked accounts is paid; 43 of 47 Patreon-linked accounts were never in the campaign. Every non-ad dollar in October has to come from a lever that does not need a connected patron: the hub-slot sponsorship (Q17), affiliates repair (E134), and the creator program (Q23).
3. **Check-then-act needs the check to hold while you act.** The merge gate has no lock (3 PRs graded on 1 head on 09-30), a cron route failed open with its secret unset (E145), and the one-off top-up filter dropped 0 rows on 4 runs before anyone asked why. Ops's October job is the lock and the label check (E155).

## 4. October bets (targets.json `bets`, month 2026-10)

| Bet | Owner | Target | Kill rule |
|---|---|---|---|
| B1 Owned audience 200/wk — offer on every >1 % page (/go slot → account offer E152), favorites loop (#223 read 10-07), newsletter on Q18 | Cass (Rowan) | 160/wk by 10-15, 200/wk by 10-31 | <130 on 10-15 with full coverage → copy, not coverage |
| B2 Non-ad $450/mo inside the Tier 2 fence — Q17 hub slot, /go Connect leg (E74/E99), affiliates A–D (E134), creator program (Q23) | Rio (Nova) | $450 per targets.json; Rio's realistic read $200–225 (Patreon $156.50 + ≈$15/wk net joins; affiliates $0 until the pipe reads; $450 needs Q17 and one $300/mo sponsor) | joins 7d <5 on 10-08 and 10-15 AND Q17 dropped → affiliates only |
| B3 Sessions on the 415,000 line — plugin inflow, writer-row SEO (Q24), collections + freshness, organic + AI (E27/E42 final 10-07) | Pip (Sage, Rowan) | ≥97 % of the line every run; 415,000 for the month | two runs <92 % → AUDIENCE-only dispatch |

Competitor-intel moves (reports/funnel/competitors-2026-10.md, first read; 11 of 20 head queries lost in the top 5, all bare category terms; ModTheSims publishes 15,277 Sims 4 uploads vs our 16,561):
1. Close the 7-query category-hub gap (hair cc, poses, build cc, clothes cc, skin overlay, custom content, cc finds) — Sage, Tier 0/1 — folded into B3; we surface in 0 results where our long-tail pages already rank top 10.
2. Add the 8 favorites-ranked creators missing from the E137 batch, lead BADDDIESIMS (on 3 of 4 competitor sites, no profile here) — Nova, paper Tier 1, sending stays Q23 — folded into B2.
3. Paid perk that skips the /go countdown (TSR and SimsFinds both sell it) — Rio, Tier 2 — PARKED: Q4 closed tier changes won't-do on 09-22; only the operator reopens it.
Next month: the UX sample was 1 mod per competitor, not 3; complete it in November.

## 5. What the operator decides this month

- Q17 hub-slot sponsorship email (drops 10-07), Q18 newsletter cron line (drops 10-07), Q23 creator outreach batch 1 (re-pitched 10-06), Q24 writer-row pin SEO, Q19–Q22 affiliate specs. Three of the four B2 levers and one B3 lever are behind these replies.
- Infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) are still unknown; the P&L in this report is gross revenue only.

## 6. Risks carried into October

- Pin runway 0.8 d with writer inflow 0 in 24 h (120 in 7 d): if the plugin stops, Pinterest (64 % of sessions) starts drawing down within two days.
- Catalog ingest has stalled: Sage found 0 eligible mods created since 2026-09-26 10:42Z (DB 16,524 = live mod sitemap 16,524); new mods 7d 27 vs 78 the week before against a 208/wk long-range target. Freshness feeds collections, feeds, sitemaps and IndexNow at once, so this is the first thing to diagnose in October (scraper stopped vs verification backlog).
- Run success 14d 78.6 % vs 95 %: the loop that writes this report fails one run in five.
- Quarter test on 12-31: owned adds ≥190/wk (now 119), non-ad ≥$1,000/mo (now $155), Mediavine sessions on the 450,000 pace (now 96 % of 400,000).
