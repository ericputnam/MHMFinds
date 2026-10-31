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

## 2026-10-31 — E300 top-up #20 + E301 social batch + #417 red-main fix
- Tried: E300 top-up #20 (T0, SD-10 floor; ledger 3c264807, artifacts #418): gate 1.23 d (17 ÷ 13.79 pinterest-14d). Ranker at the default --min-sessions 50 gave 5 dests/50 ids; 25 gave 20/145 — the 10-30 lesson held. 21 rows over 6 dates, bound hard_cap_21, 11-01..03 already carried #19's rows. Also fixed red main from #410 (#417, test asserted the page source instead of the helper's value).
- Before → after: runway 1.23 → 2.76 d (17 → 38 rows); SEO 45 → pass (21/21). Bing corroboration (GA4 10-23→10-29): bing desktop 14,626 sessions / 10,219 users / 79.5% engaged / 1.81 pv/session / 362 s avg vs Google desktop 87.3% / 1.57 / 185 s; landings are real content pages; the only non-traffic is the (not set) landing slice (US 384 sessions / 8 engaged / 0 pageviews, UK 95/1/0 ≈ 3% of Bing).
- Verdict: MORE DATA (E300 read 11-07); Bing can be counted in the non-Pinterest headline minus the zero-pageview slice.
- Next time: a source-level guard that greps a page for a template string breaks the moment the value moves into a lib — assert the helper's output for every registry entry and that the page calls the helper.

## 2026-10-30 (scheduled run) — E291 wedding-cc launch pin + E298 collection og:image (#410)
- Tried: same-day pin for a page that went live at 11:09Z (Supabase id 12538, 10-30 holds 8 rows ≤ 13.7/day) + IndexNow 82 URLs; then found all 35 collection pages shipped ~4 months with `twitter:card=summary_large_image` and no `og:image` while 330 shared-link sessions per 14 d landed on them as text-only cards.
- Before → after: wedding-cc Pinterest landings 0 (page 2 h old); shared-link landings on `/games/sims-4/*` 330 per 14 d (simmersguide 131, tumblr 111, URL-saves ≈57) → read 11-16 at ≥380.
- Verdict: MORE DATA (reads 11-14 / 11-16). Three gate attempts to merge one PR behind 9 sibling merges.
- Next time: check `og:image` the day a new page type ships, with a per-registry test, not after the traffic arrives; 13 of 33 collections have ever been pinned and 8 of the top-10 by sessions have not (Q39).

## 2026-10-30 (10-29 evening re-run)
- Tried: E282 top-up #19 (T0, SD-10 floor; E274 leg; apply ledger on main 631ac76a): tool gate 0.51 d (7 ÷ 13.71 pinterest-14d) while the 10-29 scoreboard read 2.1 d on 27 rows — the poster shipped 50 pins in 24 h, so the morning buffer was gone by evening. 17 ranked rows 6×11-01, 6×11-02, 5×11-03, 6 dests 1/dest/date; the ranker found only 6 dests/52 ids ≥50 sess/7d (tattoos 588 + gshade 126 now writer-managed, dropped upstream). Post-apply 1.75 d still <2.0; a second pass was REFUSED by the tool (one --apply per UTC day), so the floor re-fires 10-31. E283: social draft batch 2026-10-29 (6 drafts, Tier 2 until 11-07). Graded E258 KEEP, E244 KEEP (tool, read 10-30; E251's keep-if now met: E209 + E244 graded with 0 hand pulls).
- Before → after: runway 0.51 → 1.75 d after #19 (7 → 24 rows; bound hard_cap_21 then 1/dest/date). E258: treated 1,235 vs 1,184 (+4.3%) vs site −2.5%, post window +7.2% vs −0.1%, 5/9 dests up. E244: 1,099 vs 1,058 (+3.9%) vs site −2.5%, post window +8.3% vs −2.9%, 4/7 up. Lift record 3 of 6 ≥ site.
- Verdict: E258 KEEP (lift); E244 KEEP (lift); E251 KEEP; E282 MORE DATA (read 11-06 by the tool)
- Next time: a 1/dest/date cap with 6 live destinations caps a top-up at 6/day under the 7 allowed and the tool's "~2.04 d" target lands at 1.75 — when the ranker returns <7 dests, lower `--min-sessions` to 25 before the dry run, or the floor refills below the daily budget.

## 2026-10-23
- Tried: E258 top-up #17 (T0, SD-10 floor; E244 leg; apply ledger on main 801e7b5, artifacts #365 5c48da0 PASS): tool gate 1.31 d (15 ÷ 11.43 pinterest-14d) = scoreboard ≈1.3 d. 20 ranked rows 6×10-26 + 7×10-27/28 (ranker 10 dests/55 ids, 94 writer rows dropped upstream, 0 in tool); cross-run cap skipped 10-23..25 (E244). Same PR: `topup-grade.ts` default `--end` T−1 → T−2 (`defaultGradeEnd`, 2 tests red pre-fix). Graded E209 KILL (lift), E223 KEEP.
- Before → after: runway 1.31 → 3.06 d (15 → 35 rows; bound seven_per_day_cap); SEO 51 → 86 (0/20 → 20/20); day-trace 10-24..28 = 7/7/7/7/7 all top-up. E209: 1,116 vs 1,133 (−1.5%) vs site +4.8% at end 10-21, but −4.1% vs +4.6% at end 10-22 — 2.6 pts from one provisional GA4 day; MCP spot check = tool exactly.
- Verdict: E258 MORE DATA (read 10-30 by the tool); E209 KILL (lift); E223 KEEP. Lift record now 1 of 4 ≥ site.
- Next time: a grader's default window is part of the rule — anchor it at the finalized day in code, or two reads of one ledger disagree by more than the effect being graded.

## 2026-10-21
- Tried: E251 (T0, #357): `scripts/agents/topup-grade.ts` + `-lib` + 12 tests — one grader for every SD-10 top-up (treated set from the tool's undo ledger, hosts + trailing slash folded, 7 d vs prior 7 d, post window same weekdays −7 d clipped at `--end`, rule printed first). Graded E202, re-ran E216. No top-up: tool gate 2.36 d (29 ÷ 12.29 pinterest-14d) ≥ 2.0.
- Before → after: E202 treated 1,736 vs 1,849 (−6.1%) vs site Pinterest +2.3% (10-13→19 vs 10-06→12) → KILL as lift; tool = hand pull on all 9 dests; cap 7/7/7; read-back 21/21, 0 blog.*. E216: `automated` (1.001 users/sess, 99.4% fingerprint), segment 21,308 = 5.82% of 366,160 (28d; was 4.10%), 7d all +9.8% → ex seg +3.0% → KEEP. Floor lift record: E181 −2.7% vs −1.1%, E188 +5.6% vs +5.0%, E202 −6.1% vs +2.3% — 1 of 3 ≥ site.
- Verdict: E202 KILL (lift); E216 KEEP; E251 MORE DATA (read 10-27 — E209/E244 graded by the tool)
- Next time: three grades say revived rows ride the site's Pinterest curve rather than bend it — the floor is inventory insurance; sessions upside needs new destinations (catalog/collection pins), not re-dates.

## 2026-10-20
- Tried: E244 top-up #16 (T0, SD-10 floor; E209's next leg; apply ledger on main 7fd30bc, artifacts #350): tool gate 1.51 d (18 ÷ 11.93/day pinterest-14d), scoreboard ≈1.5 d on the same basis. 18 sessions-ranked rows 3×10-23 + 7×10-24/25 + 1×10-26 (ranker 10 dests/63 ids, 94 writer rows dropped upstream, 0 in the tool); cross-run cap left 3 slots on 10-23 (E209 holds 4) and skipped 10-21/22. E195 graded KEEP: `--check --stranded 63` 63/63 live.
- Before → after: runway 1.51 → 3.02 d (18 → 36 rows; bound seven_per_day_cap, stopped at the ~3-day target); SEO 58 → 94 (0/18 → 18/18); read-back 18/18, created_at 2025-06-11..2026-01-27, 1/dest/date (E223 default held). Day-trace: plugin 0 real-dated rows on 10-21..27 — the 14-day horizon is again 100% top-ups (Q28).
- Verdict: MORE DATA (read 10-27; treated WoW ≥ site WoW, re-pulled)
- Next time: at ≈12 pins/day the floor fires every ~5 days and the trailing rate is now set by the top-ups themselves, so each refill buys the same 3 days for fewer sessions — only Q28 (plugin dates ahead) changes the slope.
