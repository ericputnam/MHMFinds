<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Pip — Distribution — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers channels: what pin/post types drive sessions, pinner incidents, format tests, new-channel results.

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

## 2026-10-13
- Tried: E195 (T0): `repair-pin-sections.py --stranded 63` — the top-up printed "repair them first: repair-pin-sections.py" for 2 rows that tool could not see (its window is [today−14, today]; a stranded row is before it by definition). Added the flag (query mirrors revive's `fetch_stranded` verbatim, pinned in --self-test), dry run, `--apply` (ledger `7a82b9b` on main): cleared dead section 5483319435714435392 on rows 7971/8019 (/black-sims-4-cc/, #2 sessions destination, dated 03-04). No top-up (#14) today per Quinn — scoreboard runway 2.8 d.
- Before → after: top-up dry run section drops 2 → 0; plan 19 → 21 rows with /black-sims-4-cc/ ×2 in it. Same 28 rows: tool 1.22 d (÷ 22.86 pinterest-14d) vs scoreboard 2.8 d (÷ 10.1 observed-7d). Pinterest 7d −4.9% is −2.5% Tue–Sun and −0.5% vs 4 wks ago; apex 54,401 → 52,994 (−2.6%), blog.* 2,471 → 61; worst single pages /sims-4-male-sim-download −229, /sims-4-coquette-cc −171 — broad drift with the posting rate (33.5 → 10.1/day observed), not host or landing class. Bing −7.8% is the same broad drift (engaged share 76 → 78%).
- Verdict: MORE DATA (read 2026-10-20)
- Next time: the runway basis is the tool's (pinterest-14d — "divide by the rate you want"); when the scoreboard reads ≥2 d and the tool reads <2 d, say so in line 1 and let Quinn gate. Writer still has 0 real-dated rows 10-18..20.

## 2026-10-12
- Tried: E188 top-up #13 (T0, SD-10 floor; apply ledger on main `cda6c05`): 21 sessions-ranked rows 7×10-15/16/17 — the cross-run cap skipped 10-12/13/14 (E181's 7/date); post-apply dry run plans 10-18..20. Fixed inbox [pip]: `count_writer_rows_for_date` used `Wordpress Post ID`; live read showed old 7 vs plugin-predicate 0 "writer rows" on each of 10-13..10-17 — all were Pip's own top-up rows. 5 new tests red pre-fix, 67/67 green.
- Before → after: runway 0.58 → 1.45 d (14 → 35 @ 24.14/day pinterest-14d); SEO 64 → 96 (0/21 → 21/21). Ranker: 15 dests/83 ids, 47 writer rows dropped upstream.
- Verdict: MORE DATA (read 10-19). Standing keep-if for every top-up from E181 on: treated-destination Pinterest WoW ≥ site Pinterest WoW (same GA4 def, freshly re-pulled base), never an absolute count.
- Next time: when a guard counts "someone else's rows", diff it against your own ledger ids first — 7 = exactly one top-up date was the tell.

## 2026-10-07
- Tried: E170 top-up #11 (T0, SD-10 floor; Supabase apply ledger on main `864d50f`; report files PR #268 `811705a`, verify PASS 07:17). 21 sessions-ranked rows, 7×10-07/08/09, 1/URL/day; tool counted 0 earlier top-up rows per date and a post-apply dry run skipped those dates and planned 10-10..12, so the #261 cross-run cap holds. 0 writer rows touched (1 dropped upstream in the ranker). Poster alive: 10-04's 7 rows all posted 10-06.
- Before → after: runway 0.00 → 0.63 d (0 → 21 @ 33.5/day; hard_cap_21 is the bound); SEO 64 → 89 (21/21). Reads: E135 KEEP (0/133 writer rows; 8 dests −4.6% vs site −2.4%, gap −2.3 ≥ −5; recorded baseline 2,996 ≠ fresh GA4 2,714, graded on the fresh pull); E81 KEEP (pv/s 1.506 = 99.7% of 1.51, blog.* 0.27%).
- Verdict: E170 MORE DATA (read 10-11 for #10, 10-14 for #11). Writer's 136 rows/7d (~19.4/day vs 33.5 posted/day) cannot hold runway alone; on 10-06 the 7 top-up rows were the only pins that posted.
- Next time: re-pull the baseline week before grading a destination set — a stored 2,996 was 10% above what GA4 returns for the same window today; and a 21-row cap buys 0.63 d, so say the ceiling in the digest instead of implying the floor can reach 2 d.

## 2026-10-04
- Tried: E170 top-up #10 (T0, SD-10 floor; Supabase apply ledger `e7f1e09`; PR held, circuit breaker 🔴). **Found the tool broke the written "≤7 rows/day":** its 7/day cap applied per posting date only *within one invocation*, so daily runs stacked. Ledgers show 21 top-up rows on every posting date 09-27→10-03 (7 days at 3× the bound) and 14 on 09-26 and 10-04. Fix on the branch: earlier top-up rows on a date count against its 7 (max of own ledgers and Supabase pre-Q11 rows on that date; unreadable → cap 0), plus a lower-only `--max-rows`. 7 new tests red on pre-fix, 62/62 green. Applied 7 rows, all on 10-06 (10-04/05 capped to 0), ranker 18 dests/113 ids, 0 plugin rows dropped.
- Before → after: runway 0.33 → 0.50 d (13 → 20 @ 40.0/day); SEO 61 → 86 (0/7 → 7/7) on `--ids` re-read; read-back 7/7. Grades (GA4 non-host Pinterest, 09-27→10-03): E116 treated +1.3% vs site +0.8% (gap +0.5 < +3), runway never ≥1.5 d → KILL. E124 pre −1.8% vs 0.0% → KILL-leaning. E103 pre +1.4% vs +2.0%, SEO 89/100 in 14d window → KEEP. E81 pv/s 1.518 (≥1.51), blog.* 0.20% → KEEP.
- Verdict: E170 MORE DATA (read 10-11: Pinterest sessions to the 7 dests vs 2,290/7d ranker basis 09-26→10-02).
- Next time: before trusting a cap, tally the ledgers by the date the cap is about, not by the run that wrote them. One `Counter(new_date)` would have shown the stacking on 09-27.

## 2026-10-03
- Tried: E164 top-up #9 (T0, SD-10 floor; Supabase only, tool unchanged since #222; PR HELD — circuit breaker 🔴 RED-RPM, no merge; ledger `f09532a`): 21 sessions-ranked rows (ranker 18 destinations/101 ids; 9 used) to 10-03/04/05, 1/URL/day. Selectivity: ranker dropped 1 plugin row of the 1000-row pool (18 managed destinations), top-up 0, 9 for unposted sections, 0 blog.*. Ranker run with `MHM_PROJECT_DIR` + `--out` pointed at the worktree (default still the operator's checkout).
- Before → after: runway 0.44 → 0.99 d (17 → 38 @ 38.57/day queue-posted-14d); SEO 63 → 88/100 (0/21 → 21/21) on `--ids` re-read; read-back 21/21, unposted, created_at ≤ 2026-02-22. Reads: E102 8 dests 3,328 → 3,501 Pinterest sessions/7d (+5.2%) vs site −3.5% → KEEP; E61 absolute bar 3,598 → 3,501 (−2.7%) → KILL the +10% bar; E117 `(not set)` 4,118 sessions / 0 pv → KEEP. E81 pulled forward (`pinterest-read-2026-10-03.md`): pv/s all hosts 1.51 → 1.552, blog.* share 31% → 0.43%, Tue–Thu Pinterest −2.4% WoW — the audience did not move the size of a −25% RPM day; the 09-28 20:48 host split moved ~30% of the channel to apex and is the only traffic-side change in the window.
- Verdict: E164 MORE DATA (read 10-10: Pinterest sessions to the 9 destinations vs 2,785/7d, ranker basis 09-25→10-01). E102 KEEP · E61 KILL (bar) · E117 KEEP.
- Next time: GA4 `landingPage` carries no trailing slash — an `inListFilter` built from the queue's `/…/` paths returns 0 rows silently; use FULL_REGEXP with `/?$`.

## 2026-10-02
- Tried: E156 top-up #8 (T0, SD-10 floor; Supabase only, tool unchanged since #222; PR #245 `80f97a1` PASS): 21 sessions-ranked rows (ranker 20 destinations/113 ids; 8 used) to 10-02/03/04, 1/URL/day. Selectivity: ranker dropped 1 plugin row of the 1000-row pool (17 managed destinations), top-up 0, 9 for unposted sections, 0 blog.*. Pre-read E102 from one GA4 pull before deciding.
- Before → after: runway 0.61 → 1.15 d (24 → 45 @ 39.29/day queue-posted-14d); SEO 61 → 90/100 (0/21 → 21/21) on `--ids` re-read; read-back 21/21, unposted, created_at ≤ 2026-02-22. E102 pre-read: 8 treated destinations 3,598 → 3,776 Pinterest sessions/7d (+4.9%, 6 of 8 up) vs site Pinterest −2.3% — first positive read for the sessions-ranked floor (E26 raw-recency was −7.6%).
- Verdict: E156 MORE DATA (read 10-09). E102 pre-read KEEP (grade Monday).
- Next time: pre-read the oldest pending top-up before running the next one — the +7-pt gap vs site is what justifies the treadmill; without it eight top-ups would just be eight ledger rows.

## 2026-10-01
- Tried: E149 top-up #7 (T0, SD-10 floor; Supabase only, tool unchanged since #222): 21 sessions-ranked rows (ranker 23 destinations/124 ids; 10 used) to 10-01/02/03, 1/URL/day. Selectivity: ranker dropped 1 plugin row of the 1000-row pool (16 managed destinations), top-up 0, 2 for unposted sections, 0 blog.*. Ranker writes to `MHM_PROJECT_DIR` (default the main checkout) — set it to the worktree.
- Before → after: runway 0.78 → 1.31 d (31 → 52 @ 39.79/day queue-posted-14d); SEO 56 → 88/100 (0/21 → 21/21) on `--ids` re-read; read-back 21/21, unposted, created_at ≤ 2026-03-25. E93: Bing 16,669/7d (09-24→09-30), zero-pv 763 = 4.6%, net 15,906 = 107.8% of 14,761.
- Verdict: E93 KEEP. E149 MORE DATA (read 10-08: Pinterest sessions to the 10 destinations vs 2,668/7d, both hosts).
- Next time: seven top-ups, runway never above 2.44 d — the floor is a treadmill until the plugin dates rows ahead (Q11).

_Older entries (up to 2026-09-30) live verbatim in `archive/playbooks/pip-2026-09.md`; nothing deleted._
