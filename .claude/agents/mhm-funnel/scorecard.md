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

Older blocks (Week of 2026-09-28, Week of 2026-09-21, Week of 2026-09-07, Week of 2026-09-01 baseline) live verbatim in `archive/scorecard-2026-09.md`.
