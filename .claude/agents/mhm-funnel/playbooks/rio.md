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

## 2026-10-31 — E306 October closes $144 (MISSED); pipe read prints Impact and Amazon as two lines (#416); E271 KEEP
- Tried: `affiliate-pipe-read.ts` GA4 leg (T0, #416 5b6f1b4c) — `affiliate_click` by date × pagePath, grid = `/` + `/games/*`, else blog block; status rules never read it (test). Verdict file (#420 paper) + 28d decomposition anchor 10-29 from `client.ts` + GA4.
- Before → after: pipe read one Impact sum → two lines: Impact 20 clicks / 0 actions $0 (confirmed, kill read 11-11) · grid 31 over 32 d (0.97/day) · block 44 on 36 posts over 4 live days (11/day). 28d −3.75% = sessions +0.64% × RPM −4.36%; W1 −$254.58 = 111% of the gap, W4 (34 deploys) +$75.28 / RPM +9.5%; 10-29 rate day (ex-seg RPM +10.4% on top of +7.0% mix). Non-ad $144/mo vs $450 line and my $160–170 band → MISSED both (−1 $3 patron). E271 first print matched the hand read → KEEP.
- Verdict: E271 KEEP; E306 MORE DATA (read 11-11); Nov proposal $250/mo = $148 hold + Q37-A +$96 at 0.5% free→$3 (announce on Patreon, never on `/go` — E40), else $155.
- Next time: `timeout` is not on this shell's PATH — `deploy-verify` silently did not run on the first call (exit 127); use `gtimeout`/`perl -e 'alarm'` and check the log before claiming a verify. A "no digits" guard must exempt the product name (`GA4`).

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
