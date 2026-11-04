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

## Standing order 2026-11-02 — Pinterest + Tumblr frozen
Operator froze all automated Pinterest writes (top-ups, catalog pins, re-dates, SEO, sections) and Tumblr changes; write scripts exit 3 on `pinterest-freeze.json`. The E300 read 11-07 is a read-only grade. Your work is short video + every other channel (growth-plan.md); Pinterest ideas go to the operator as recommendations. Asset tool: `npx tsx scripts/agents/short-video-frames.ts --date <batch>` renders the animated mp4 + silent mp4 + cover + stills (gitignored under reports/funnel/social/assets/); 4-8 mods with bright full-body images read best. Look rule (operator): flat brand colours, no gradients/glows/gloss, nothing that looks or reads AI-made.

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-11-04 — E335 IndexNow covers every sitemap-nextjs content page
- Tried: (T0) `collectionUrls()` built game hubs only from registry collections, so 3 of 4 game hubs plus /play/, /creator/, /top-creators/ were in the sitemap but never pushed; now from `getAllGameSlugs()` + `NEXTJS_CONTENT_HUBS`, with a test that parses the sitemap route.
- Before → after: daily push collections=38 → 44; the 6 pages earned 11 organic+AI landings / 28d (10-06→11-02). Live push 15:13Z http=200.
- Verdict: MORE DATA (read 11-18). Small: Bing's 13,957/7d sits on WP guides, which `--guides` already covers.
- Next time: diff the push list against every sitemap, not just one registry, the day a sitemap gains a URL.
## 2026-11-04 — E333 social-draft filter + pending skip
- Tried: (T0) `NON_CONTENT_PATH_RE` had `signin|login` while the route is `/sign-in/`, so the auth page (228 nonPinterest7d) ranked as a destination; regex now hyphen-optional + `/creators/`, about, legal, with a test that walks `app/` so every new top-level route must be classified (6 of 6 sample paths postable pre-fix). Also skip URLs already in a DRAFT-status batch (`pendingDraftPaths`).
- Before → after: dry run 11-04 top 8 = 8/8 already pending in unposted batches (15 pending URLs) → 0/8 duplicates, 8 new URLs (sims-4-cc-creators 271, challenges-list 237, poses 201 …).
- Verdict: MORE DATA (sessions only once the operator approves a post; read 11-14 on the next batch)
- Next time: a regex allowlist of "non-content" paths drifts from the route tree — scan `app/` in the test, never a hand list.

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

_Entries 10-20 and 10-21 moved verbatim to `archive/playbook-pip-2026-10.md` on 2026-11-04._
