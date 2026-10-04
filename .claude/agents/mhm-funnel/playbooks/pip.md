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

## 2026-09-30
- Tried: E142 top-up #6 (T0, SD-10 floor; Supabase only, tool unchanged since #222): 21 sessions-ranked rows (ranker 28 destinations/140 ids; 12 destinations used) to 09-30/10-01/10-02, 1/URL/day. Filter selectivity printed: plugin guard dropped 0 in the top-up but 1 in the ranker on the same 1000-row pool (16 managed destinations) — an upstream drop, not a blind filter.
- Before → after: runway 0.94 → 1.46 d (38 → 59 @ 40.50/day queue-posted-14d); SEO 58 → 87/100 (0/21 → 21/21 passing) on an `--ids` re-read; read-back 21/21, created_at max 2026-03-25, 0 plugin rows. E76 read: 6 of 7 mornings (09-23→09-29) 🔴 while the writer inserted 48/0/24/28/0/48/20 — every 🔴 was the runway<3 d clause. E82 read: inserts/day 48/0/24/28/0/48/20/0 (168 in 8 d), 44 real-dated at insert, 151 plugin rows posted on their day, 310 at placeholder, 0 dated ahead — inflow alive and lumpy (2–3 articles/wk), never ≥12/day dated ahead. Direct +38.5%: top-70 landing×hour cells 760 vs 740 → the +2k is long-tail (9,278 cells), no page/hour spike.
- Verdict: E142 MORE DATA (read 10-08: Pinterest sessions to the 12 destinations vs 4,500/7d (GA4 09-22→09-28)). E76 KILL as shipped (E141 #218 replaced the rule; 09-30 reads 🟡 correctly). E82 KILL the ≥12/day rule, KEEP the read.
- Next time: the cap is a treadmill — six 21-row top-ups and runway has never held above 2.44 d (0.94 d this morning). Grade the floor by rows the plugin dates on schedule, not by top-ups landed.

## 2026-09-29
- Tried: E135 (T0, PR #222 `6b0b47a`) — "writer's own rows" cannot be read from `Wordpress Post ID`: it is set on 1610/1610 stranded rows and 1445/1445 placeholder rows, so the top-up's writer filter dropped 0 rows on every run and top-up #4 promoted 2 plugin-scheduled rows (11848 posted, 11849 reverted). The writer's schedule is placeholder date + (created_at ≥ 2026-09-21 OR destination has a row created since); the ranker now drops those at the source (1 of 1000 today, 16 managed destinations) and the top-up refuses (exit 2) if attribution cannot be read. Tests 6/6 red pre-fix.
- Before → after: top-up #5 with the guarded tool: 21 rows / 8 destinations / 0 plugin rows; runway 1.13 → 1.67 d (44 → 65 @ 39.0/day, queue-posted-14d basis); SEO 60 → 89 on re-read. Pre-reads 09-30: E76 4 false 🔴 in 7 mornings (fix is Ops #218); E82 writer rows/day 25/48/0/24/28/0/48/20, 107 plugin rows posted in 7d.
- Verdict: MORE DATA (read 2026-10-07). QUEUED-T2: writer Upcoming pin-SEO apply, 353 rows, mean 54/100.
- Next time: check a filter's selectivity (rows dropped per run) before trusting it — 0 dropped on 4 runs was the tell.

_Older entries (up to 2026-09-28) live verbatim in `archive/playbooks/pip-2026-09.md`; nothing deleted._
