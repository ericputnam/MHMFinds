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

## 2026-09-29
- Tried: E135 (T0, PR #222 `6b0b47a`) — "writer's own rows" cannot be read from `Wordpress Post ID`: it is set on 1610/1610 stranded rows and 1445/1445 placeholder rows, so the top-up's writer filter dropped 0 rows on every run and top-up #4 promoted 2 plugin-scheduled rows (11848 posted, 11849 reverted). The writer's schedule is placeholder date + (created_at ≥ 2026-09-21 OR destination has a row created since); the ranker now drops those at the source (1 of 1000 today, 16 managed destinations) and the top-up refuses (exit 2) if attribution cannot be read. Tests 6/6 red pre-fix.
- Before → after: top-up #5 with the guarded tool: 21 rows / 8 destinations / 0 plugin rows; runway 1.13 → 1.67 d (44 → 65 @ 39.0/day, queue-posted-14d basis); SEO 60 → 89 on re-read. Pre-reads 09-30: E76 4 false 🔴 in 7 mornings (fix is Ops #218); E82 writer rows/day 25/48/0/24/28/0/48/20, 107 plugin rows posted in 7d.
- Verdict: MORE DATA (read 2026-10-07). QUEUED-T2: writer Upcoming pin-SEO apply, 353 rows, mean 54/100.
- Next time: check a filter's selectivity (rows dropped per run) before trusting it — 0 dropped on 4 runs was the tell.

## 2026-09-28
- Tried: E127 — moved the E103 `--source page` pin-SEO rewrite INSIDE `pin-runway-topup.py` so it runs on exactly the plan's rows before the re-date (fail-open, own undo file, `seo_pass` in the ledger); shipped PR #205 (deploy-verify PASS) and used it for SD-10 floor top-up #4 the same morning.
- Before → after: top-up rows scored mean 67/100 (2/21 passing) → 89/100 (21/21 passing) on a re-read of the changed field; runway 1.34 → 1.89 d (52 → 73 rows ÷ 38.71/day); 21 re-dated 7×09-28/29/30 over 9 destinations; 19 rewritten, 0 skipped, 9/9 destination pages resolved.
- Verdict: pending (read 2026-10-06 — sessions to the 9 destinations vs 2,644 baseline). E66 EXTEND to 10-05 (Tue–Fri 7,776/day = 97.2%), E70 KEEP (4 applies 21/21). The floor mechanics: four 21-row top-ups have never lifted runway above 2.44 d; the cap is a treadmill, not a fix.
- Next time: a copy pass that shares rows with a scheduling tool must (1) re-read the rows with its own columns so the rollback carries the real old description, (2) be fail-open to the scheduler, and (3) verify with a separate `--ids` read of the changed field, not the dry-run preview. Grade E66/E70 with the GA4 daily series and quote the rule's window exactly (Tue–Fri), not the visually nicer week.

## 2026-09-26 (E116 / E117)
- Tried: E116 top-up #2 (T0, SD-22): 21 sessions-ranked rows (`rank-pin-destinations.ts` GA4 7d/28d → 23 destinations, 144 ids) to 09-26/27/28, 1 per URL per day, Pinterest API untouched (`--rate-source queue`, `--sections-from-queue`). E117 `(not set)` audit from one GA4 read.
- Before → after: runway 63 ÷ 36.0/day (posted rows by Post Date, 14d) = 1.75 d → 84 ÷ 36 = 2.33 d (09-26 0→7, 09-27 14→21, 09-28 7→14). Tool bug: Pinterest fetch got 1 page (100 pins) then timed out; 100 ÷ 14 = 7.14/day read as "runway 8.8 d, no-op" — a truncated sample is a floor on rate = ceiling on runway. `(not set)` 3,816/7d: 73/73 rows zero-pageview, 97% desktop, 86 engaged, sources named (Pinterest 2,327, Bing 868) → noise; a UTM fix would move nothing.
- Verdict: E116 MORE DATA (read 10-04); E117 decision — never count `(not set)` toward the headline; the ~413/day gap is real.
- Next time: a partial API page is `unknown`, never a rate; print the basis label with the number. One positive Pinterest read (12:19Z: last pin 10:40Z, 69/24h) is the day's liveness evidence when the host goes dark afterwards — don't retry into it, say "API unreachable after HH:MMZ".

## 2026-09-25 (E102 / E103)
- Before → after: E26 graded KILL with a number (treated 6,325 → 5,842 Pinterest sessions, −7.6% vs site −0.1%); runway 1.83d → ~2.44d via 21 sessions-ranked rows (tool-gated, 7/day, cap-bound); pin-SEO mean 52 → 88/100 on 83 writer rows using the destination post's own copy instead of the template.
- Verdict: **E26 KILL**. E102 and E103 pending (reads 10-03 and 10-05).
- Next time: grade a revival by the destinations it pointed at, not by channel total — the channel was flat while the treated set fell 7.6%, and the same read would have called it a win. When a copy rule demands a keyword verbatim, check what the keyword actually is first: WordPress's "-2" dedupe suffix made "Sims 4 Couple Poses 2" the target and no real title could ever pass. Page copy beats template copy for the keyword rule but can erase per-pin specificity the writer put there; a hybrid that prepends a keyword lead to the writer's own sentence is the next iteration. The apex WP REST endpoint 308s without a trailing slash (`trailingSlash: true` applies to `/wp-json/*` too).

## 2026-09-24
- Tried: E75 shipped (T1, veto closed; PR #140 rebased onto main, merged `7554037`). E93 (T0 read + decision): Bing real-vs-bot, GA4 09-16→09-22.
- Before → after: bing_organic 15,623/7d = 14,761 with pageviews + 862 zero-pageview `(not set)` landings (5.5%). Real part: 79% engaged, 1.8 pv/session, 393 s, 51% returning, desktop Edge across 263 device×browser×country rows, weekend-peaking. Runway 70 ÷ 33.4/day = 2.10 d ≥ 2.0 → no write; ≈1.9 d tomorrow.
- Verdict: KEEP counting Bing net of the zero-pageview slice (read 2026-10-01). Writer cron fired 09-24 05:30 (`Inserted: 0, Duplicates: 294`): the 🔴 is the runway<3 d artifact, not inflow death.
- Next time: verify a bucket by its zero-pageview share before its size — 12.6× Google is Google's collapse, not a Bing anomaly.

## 2026-09-23
- Tried: E77 shipped (T1, veto expired; PR #139 merged `b94082d`, deploy-verify PASS) — `--apply` **withheld**: today's audit (77 rows, 1 passing, mean 53/100) proposes one identical template description for 76 writer rows ("Browse the best Best Sims 4 Hair CC…", unverifiable "no dead links" claim) — machine copy on the writer's own pins, so the guard (re-scores clean) is not a quality gate. E82 (T0 read + decision): writer inflow vs drain.
- Before → after: writer rows since the 09-21 cron: 268/25/48 per day (341), **341/341 dated `2025-01-01`** (Aug 1–Sep 4: 25/474 = 5%) → window inflow **0/day**. Forward queue = Q12 slice only, 7/day 09-24→10-04 (77 rows, dry **2026-10-05**); pins/24h already 35 → 15. Top-up formula 77 ÷ 32.5 = 2.37 d ≥ 2.0 → no write. No queue change.
- Verdict: E82 decision row — runway is NOT self-healing; the cron writes drafts, not scheduled pins (`posts_2_supabase_server.py:401` hard-codes `post_date = '2025-01-01'`, "placeholder so n8n doesn't pick up entries prematurely"). Q11 follow-up is Tier 2 (operator's script) — package `reports/funnel/drafts/q11-writer-post-date-2026-09-23.md`. E77 MORE DATA (read 2026-10-05) only if a non-template proposal mode ships first.
- Next time: a runway formula that divides inventory by the *trailing* drain reads healthier as the drip starves (77 ÷ 15 = 5.1 d) — threshold the allotment (rows/day dated ahead vs the posted rate you want), not the residue. Same conflation makes the 🔴 writer flag fire on runway <3 d with an insert 0.1 h old ([ops] request filed).

## 2026-09-21 (writer-liveness)
- Tried: E76 — writer-liveness monitor for Q11 (T0, PR #142, in-repo half only per the operator's server-touch lockout while the Q11 scp was in progress). `assessWriterLiveness()`/`writerLivenessExitC…
- Before → after: no writer-liveness signal existed before today. Real `check-pinner.sh` run, 2026-09-21T11:57Z: newest writer-attributed row `id 11420`, `created_at 2026-09-04T08:46:31.894735+00:00`…
- Verdict: MORE DATA (read 2026-09-22: does the flag flip to 🟢 within one scoreboard run of the Q11 cron landing, or of a manual schedule press; keep if 0 false 🔴/🟡 on any morning a writer row actuall…
- Next time: queue depth (runway) and queue inflow (writer liveness) are different failure modes with very different lag — depth can hide a dead writer behind borrowed inventory for two-plus weeks, ex…

## 2026-09-21 (pin SEO)
- Tried: E77 (PR #139) — `scripts/agents/pin-seo-audit.py` (T1): scores the next 14 d of `n8n_pinterest_posts` on title 40-100 chars + slug keyword, description 100-400 chars, alt text (= Post Title at send time), board fit. `--apply` writes only `Post Title`/`AI Text Slug` on rows whose template proposal re-scores clean; `Is Posted=false` guard; rollback ledger first.
- Before → after: 09-21 audit `reports/funnel/pin-seo-audit-2026-09-21.md`: 37 rows, 1/37 passing, mean 72/100; no write.
- Verdict: MORE DATA (read 2026-10-05; keep if mean ≥90 after apply, treated sessions hold).
- Next time: writer descriptions run 400-800+ chars — length fails before quality is scored; root cause is the writer's prompt, out of scope.

_Older entries (up to 2026-09-21) live verbatim in `archive/playbooks/pip-2026-09.md`; nothing deleted._
