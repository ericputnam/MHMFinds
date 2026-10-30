<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Rio — Product & Revenue — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers revenue: Patreon tier changes and paid counts, membership conversion, sponsorship replies, affiliate EPC, ad-guardrail incidents.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-10-30 — E295 28d −5.18% decomposed; #391 Amazon block first read (#407, paper)
- Tried: 28d 10-01→10-28 $5,807.98 vs $6,125.49 = sessions +0.56% × RPM −5.71%; by week W1 −$276.05 = 86.9% of the gap (quarter CPM trough), W2/W3 Singapore mix (2.6% → 5.3% of sessions), W4 — the week with 49 deploys — RPM +4.4% raw / +2.0% ex-segment; 7d +4.1%; no deploy implicated; W1 rolls off by anchor 11-04. Mediavine MCP unavailable; `client.ts` earnings + GA4.
- Before → after: the operator's blog Amazon block (#391) took 31 `affiliate_click` in 3 days (10-27 13 / 10-28 5 / 10-29 13) vs the grid's 7 in 5 — a surface on 20+ posts beats a surface on 2 pages 10:1 on clicks; earnings operator-only.
- Verdict: MORE DATA (reads 11-04 / 11-06 / 11-11). Two gate attempts (1,180 s) could not land a paper PR behind 9 code merges.
- Next time: print the week table and the roll-off date before anyone reads the 28d headline as this week's deploys; register `source_type`/`partner` GA4 dimensions so the pipe read splits by parameter (Data API 400s today).

## 2026-10-29 — 28d −6.2% is one-week-old news; B2 second trip did not fire; #375 landed
- Tried: verdict 10-29 (T0 paper, `reports/funnel/rio-verdict-2026-10-29.md`) on the same PR as the stranded E271 (#375, merged origin/main, checks green); 28d decomposition from `client.ts` earnings 09-02→10-28 + GA4 segment by day; tracker run with Quinn's untracked 10-28/10-29 JSONs; `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-28`.
- Before → after: 28d $6,133.93 → $5,755.06 (−6.18%) = sessions +0.46% × RPM −6.61%; W1 09-30→10-06 −$300.33 = 79.8% of the gap (quarter-boundary rate, RPM −15.3%); W3 mix (segment 9,945 = 10.4%); W4 RPM +0.9% on 40 deploys; segment 2.60% → 5.25% predicts −2.7% RPM, ex-seg RPM $17.59 → $16.89 (−4.0%); E255 pair −$39.64 = 10.5%. Tracker HOLD 1/7 (10-21), 4 mornings absent → E262 leg 2 NOT MET, E241 earliest WIRE 11-01. affiliate_click 7d 16 ≥ 5 → B2 second trip not fired; pipe 25/19/0, $0, kill read 11-11. Non-ad $153 vs $450 line (MISSED).
- Verdict: GREEN, no deploy signature; E241 HOLD; E262 closed 2/3 MET; E271 NOT READ (10-26 MISSED) → 10-31; November B2 = Q34 draft (A: $3 skip-the-wait perk, B: creator rev-share), affiliates repair-only to 11-11.
- Next time: a 28d read anchored just after a quarter boundary carries the CPM trough for 28 days — print the week table first and the roll-off date (11-03), or a four-week-old demand dip gets read as this week's deploys.

## 2026-10-23 — E262: green Wednesday, flat on all three legs; E255 KEEP; the headline RPM +2.5% was the segment shrinking
- Tried: guardrail verdict 10-23 (T0 paper, `reports/funnel/rio-verdict-2026-10-23.md`); E255 graded; E241 tracker on Quinn's tree; `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-22`; Q32 (MV JWT renewal, T2) packaged. MV MCP down → `client.ts` direct; GA4 via the Data API MCP.
- Before → after: 10-21 $187.68 vs $186.84 = 14,410 mon_pv (+1.1%) × 13.19 imp/mon_pv (−0.4%) × $0.988 CPM (−0.2%); segment 139 = 1.25% vs 6.29% → mix predicts RPM +5.4%, printed +2.5%, ex-seg RPM $17.03 vs $17.09 (−0.3%), MV mon-RPM +0.5%. 3-day −6.4% = 10-19 70% + 10-20 32% of the gap, Monday rolls off 10-24. 10-20 finalized $179.30 = 93.96% of $190.82 (E255 KEEP); 28d 98.08% / 102.51% (run 20). Pipe 09-29→10-22: gtracing 18 / 13 / 0 (72.2%), Envato 9 / 0, $0; affiliate_click 7d 9. JWT 20 d → ≈ 11-12.
- Verdict: GREEN, no rollback; E255 KEEP; E241 HOLD (earliest WIRE 10-28); E213 Amazon leg unmeasurable (Q29 dropped).
- Next time: a headline RPM *gain* on a shrinking junk segment is mix too — print the ex-segment RPM on green days as on red ones, or a flat demand day gets booked as a lift.

## 2026-10-21 — E255: first yellow since the segment rule — demand, not mix, not a deploy; tracker HOLD
- Tried: yellow diagnosis 10-21 (T0 paper, `reports/funnel/rio-verdict-2026-10-21.md`, PR #358 PAPER PASS); E248 10-21 leg graded; E241 tracker run on Quinn's tree. MV MCP unavailable → `client.ts` direct incl. `advertisers` / `adUnits` / `devices` / `pages` (first verdict to use the breadth endpoints).
- Before → after: 10-19 Mon $161.82 vs $187.26 (86.4%); segment 11.38% vs 4.61% predicts −7.1% RPM, printed −17.5%; ex-seg RPM $13.55 vs $15.94 (−15.0%); MV mon-RPM −8.1%, CPM −3.8% with imp/mon-pv −2.9%; 10/10 partners down vs 10-12, both desktop units down; touched surfaces (/go, /creator, /games) earn 0% of the top-100 (posts 96.9% + home 3.1%); 10-20 partial $179.30, CPM $0.975. 28d 98.75% / 102.56% (run 19). Tracker: 10-21 gap 4.7 pt → HOLD; 10-24 WIRE unreachable (earliest 10-28).
- Verdict: Mediavine-side demand, no rollback; E248 KEEP (28d leg); E255 reads 10-22 (10-20 ≥90% of $190.82).
- Next time: `revenue = mon_pv × imp/mon_pv × CPM` reproduces the printed delta to the tenth — print that identity first; the mix share tells you how much of mon_pv is the segment and the other two legs are rate by construction. Mediavine's `pages`/`devices` rows lag the earnings line by >2 days (17% of mon_pv populated) — never read per-page concentration off them for a day-old verdict.

## 2026-10-20 — E248: verdict 10-20; E234 line legs closed; tracker 3/7 INSUFFICIENT
- Tried: guardrail verdict 10-20 (T0 paper, E248, `reports/funnel/rio-verdict-2026-10-20.md`); graded E234's line legs (10-18 $258.68 ≥ $141.22 MET; 28d 98.98% / 102.10%) and read the E241 tracker (3 of 7 agree, INSUFFICIENT). MV MCP unavailable → client.ts direct + guardrail JSON.
- Before → after: Singapore Direct share of the day 5.31% (controls) → 10.62% on 10-18, yet ex-segment RPM $17.29 → $17.57 (+1.6%) and MV monetizable-session RPM +5.0% — the RPM dip (−3.3%) is mix, not rate; Mediavine's own split confirms it without GA4.
- Verdict: KEEP (read E248 10-21; tracker gate 10-24).
- Next time: WIRE on 10-24 is reachable only if all four remaining mornings fire and print both lines — a single missed run moves the gate; say that in the verdict before the day, not after.

## 2026-10-19 — E241: E227 KEEP final (leg 2: 2.0 pt / 0.0 pt); the 10-24 wiring gate is a script
- Tried: guardrail verdict 10-19 (Tier 0) + `guardrail-agreement-tracker.ts` (+lib, 15 tests): one reading per guardrail JSON, MV-Δ vs GA4-raw-Δ gap, agree/disagree/absent, WIRE/HOLD/INSUFFICIENT with the rule printed first. MV MCP down → guardrail JSON + scoreboard only; `direct-bot-read.ts --start 2026-09-19 --end 2026-10-17 --out /tmp/…` as the hand read.
- Before → after: 10-17 $286.91 vs $262.51 (+9.3%), RPM −3.8% on sessions +13.6%; segment 1,888 = 11.20% vs 2.28% controls → mix alone predicts (1−.1120)/(1−.0228) = −9.1% RPM, so ex-segment RPM ≈ $19.46 vs $18.38 (+5.9%). Ex-segment sessions +5.0% (guardrail) = hand read +5.0% (controls 14,584.5 / 332 identical, 0.0 pt); GA4 raw +15.6% vs MV +13.6% (2.0 pt). 28d 99.03% / 102.1% (run 17). Tracker: 2 of 7 mornings (0.9 pt, 2.0 pt) → INSUFFICIENT, 5 more; 10-24 is the 7th only if every run 10-20→10-24 prints both lines. 10-18 not finalized; needs ≥ $141.22 for 97% on 10-20.
- Verdict: GREEN; E227 KEEP final; E234 MORE DATA (10-20, 10-29); E241 reads 10-24.
- Next time: write the counter the day a "N mornings of agreement" gate is set, not the day it is read — two of the seven mornings were already behind me before the tracker existed, and any missed run before 10-24 moves WIRE to 10-25 by construction.

## 2026-10-18 — E234: a clean Friday; E227 leg 1 MET to the tenth; the pipe carries, the demand does not
- Tried: guardrail verdict 10-18 (Tier 0, docs PR). MV MCP unavailable again → `client.ts` direct; `direct-bot-read.ts --start 2026-09-18 --end 2026-10-16` as the E227 hand read; `affiliate-pipe-read.ts --start 2026-09-29 --end 2026-10-17`; read-only HEAD on the 5 live offers (4 gtracing.sjv.io, 1 envato.market — all 200, all `validated`).
- Before → after: 10-16 $207.61 vs $196.55 (+5.6%), RPM +2.8%, sessions +2.8% (MV) / +1.9% (GA4 raw) / +0.1% ex-segment; hand read ex-segment 11,812 vs 11,805.75 (+0.05%) = the guardrail's own numbers; MV mon-sess 57.7% vs 58.04%, mon-RPM +3.4%. 28d 98.87% / 101.57% (run 16). Pipe: gtracing 12 on-site / Impact 8 / 0 actions (66.7%), Envato 7 / 5; all clicks are the `grid` placement (/ 13, /games/sims-4/ 6 in 19 d ≈ 7/7d); affiliate_click 7d 5 on a ≥5 bar.
- Verdict: GREEN; E220 KEEP final (leg 2 MET); E227 leg 1 MET ×4 (leg 2 10-19); E234 MORE DATA (10-19 / 10-20 / 10-29). Amazon leg = unmeasurable (Q20 dropped).
- Next time: a hand read whose window is `end − 27` drops the 4th same-weekday control (09-18 for a 10-16 read) — pass `--start` = end − 28 when reproducing a 4-control mean, or you reconcile three controls against four and call a 0.0-pt match a drift.


_Older entries live verbatim in `archive/playbooks/rio-2026-09.md` (≤ 09-30) and `archive/playbooks/rio-2026-10.md` (10-01 → 10-04, 10-12 → 10-17); nothing deleted._
