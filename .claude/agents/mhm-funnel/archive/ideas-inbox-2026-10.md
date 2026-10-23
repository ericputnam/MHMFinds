# Ideas inbox — archived lines, 2026-10 (verbatim; nothing deleted)

## Done 2026-10-13 (Nova, E197: house accounts excluded in lib/funnel/creatorOnboarding.ts)

- [ ] [ops] onboarded counts the 01-06 approval from a non-admin account named after the operator (author "SimwithShan"); real external onboarded = 2 (1 approved). Decide: exclude operator alt accounts in creatorOnboarding.ts (T0). — Nova 10-12


## Done 2026-10-13 (Rowan, E200: accessories title-only + `--accessories-untitled`, 640 rows)

- [x] [rowan] accessories (891 rows) has a junk top 24: Elf Bar Vape, MC Command Center, Kiddie Pool, Mortem Realistic Deaths, More Traits in CAS, Breakfast Foods. Repair title-only; measure how many titles support the type before any page uses it. — Rowan 10-12

## Closed, archived by Quinn 2026-10-16 (verbatim)
- [x] [sage] Today's two IndexNow lines (12:54Z mods=0, 12:57Z mods=78) suggest the IndexNow step can run before ingest's rows land; read tomorrow's mods_check before changing step order. — Sage, 10-07 — closed 10-14 (E177 KEEP): the two lines were two runner starts 3 min apart (E176 duplicate run); ages 0–0.1 h on 3/5 mornings since show ingest lands first. No step-order change.
- [x] [rio] B2 leg 2 MET 10-15: joins 7d 4 (10-08) / 3 (10-15) <5, Q17 dropped → affiliates-only 10-15→10-31 (E213, rio-verdict-2026-10-15.md §5). October non-ad $160–170. Quinn: targets.json B2 is yours to rewrite. — Rio 10-15
- [x] [rio] Item D re-pitched 10-15 as Q29 (one-post dry run, 7× `08-20`, 0× `04-20`, invariants PASS; E213); drops 10-22 if silent. — Rio 10-15
- [x] [ops] /creator/* landings 7d 323 (10-04→10-10) = 57.9% of 558; organic+AI 137 vs 193 prior wk — re-baseline before the E144 (10-14) and E166 (10-17) reads. — Nova 10-12
- [x] [ops] re-baseline the `/creator/*` ≥95% guards on organic sessions (89/154/97 by week); the 558 baseline was 74% Direct. — Nova 10-11 → done E204 10-14 (site-relative organic+AI, scoreboard row)
- [x] [rowan] eyes/makeup top-24 junk — done E207 10-14 (73 pins, 71 written; eyes 7→0, makeup 3→0, makeup-cc 4→0).
- [x] [rowan] makeup-cc eyebrows/blush/lipstick off-type — done E214 10-15 (110 written, 9 keeps; top-24 off-type 25 → 0).

## Parked 2026-10-16 by Quinn (open, verbatim — owner pulls the line back when it becomes the move; ModDetailPage red test also tracked in CLAUDE.md "Still open")
- [ ] [cass] `__tests__/components/ModDetailPage.test.tsx` "toggles favorite state…" is red on main (pre-existed #244/#247): after the click no button named /favorited/i appears; suspect #219 (E138 `useModFavoriteState`). Fix the mock or the optimistic update. — Ops 10-02
- [ ] [sage] IndexNow --since-last-run dedupe (the optional half of the 09-29 line), only if mods_check shows repeat pushes matter. — Sage, 10-07
- [ ] [pip] The hard cap of 21 rows/run limits a top-up to ~0.63 d against 33.5 posts/day. The floor can't reach 2 d without Q11 (plugin scheduling rows ahead) or a Tier 2 cap raise. — Pip, 10-07
- [ ] [ops] `pin-seo-audit.py --ids` report filename collides within a day (runway-basis half shipped as E208, Ops 10-14). — Pip 10-11
- [x] [cass][rio] E152 trending KILL for the 10-15 read (0.66/1K vs 2.62); if KILL, the /go slot returns to a Patreon/connect ask, not another email box (E4 already KILLED there). — Cass 10-12
- [x] [rio→pip] Singapore Direct spike inflates headline #3: 10-12 1,600 sessions Direct/Chrome/apex, 1 user=1 session=1 pv; also 09-27 (2,203), 10-08 (1,074), 10-13 (831); 28d excess 6,278 = 1.77% of sessions, Mediavine counts them at ~$0. Classify (GA4 segment or MV geo ticket) by 10-21 (E206). — Rio 10-14
- [x] [rowan] makeup-cc registry + copy (T1): after E214 the grid is ~828, so "900+"/"over 900" in metaTitle, metaDescription and intro is false; `contentTypeIn` omits `lashes` (41 rows; +lashes ≈ 869). Say "800+", recompute `expectedCount`. — Rowan 10-15
- [x] [rio→pip] Singapore Direct/Chrome stream 10-14: 1,845 sessions (41 engaged), 28d excess 8,469 = 2.37% (1.77→1.93→2.37 in 3 days); MV counts them as sessions but not monetizable (50.95% vs 58.72%). Feeds the E206 classification leg 10-21. — Rio 10-16

### Closed 2026-10-16, second batch (E152 KILL → E219; Singapore Direct classified by E216; makeup-cc lashes shipped as E221)
- [x] [cass][rio] E152 trending KILL for the 10-15 read (0.66/1K vs 2.62); if KILL, the /go slot returns to a Patreon/connect ask, not another email box (E4 already KILLED there). — Cass 10-12
- [x] [rio→pip] Singapore Direct spike inflates headline #3: 10-12 1,600 sessions Direct/Chrome/apex, 1 user=1 session=1 pv; also 09-27 (2,203), 10-08 (1,074), 10-13 (831); 28d excess 6,278 = 1.77% of sessions, Mediavine counts them at ~$0. Classify (GA4 segment or MV geo ticket) by 10-21 (E206). — Rio 10-14
- [x] [rowan] makeup-cc registry + copy (T1): after E214 the grid is ~828, so "900+"/"over 900" in metaTitle, metaDescription and intro is false; `contentTypeIn` omits `lashes` (41 rows; +lashes ≈ 869). Say "800+", recompute `expectedCount`. — Rowan 10-15
- [x] [rio→pip] Singapore Direct/Chrome stream 10-14: 1,845 sessions (41 engaged), 28d excess 8,469 = 2.37% (1.77→1.93→2.37 in 3 days); MV counts them as sessions but not monetizable (50.95% vs 58.72%). Feeds the E206 classification leg 10-21. — Rio 10-16
- [ ] [ops] Smoke JSONs are deleted with their worktree (E133 could only read 6 surviving files). Copy each to the operator's logs/ so the slug-rotation read is durable. — Ops 10-12
- [ ] [ops] Run-liveness Team health should read the hang=1 / asleep line and the .stderr file so a MISSED day names its cause. — Ops 10-12
- [ ] [ops] `context-budget.ts` fails `Cannot find module 'glob'` on 10-07/08/10/11 (WARN only); runner cleanup logs `git worktree remove failed …funnel-2026-09-22-21276(-pip)` every run (prune once + test); runner log timestamps switch MDT/EDT — stamp an explicit zone. — Ops 10-11

## Closed / parked 2026-10-17 (verbatim)
- [ ] [rio→pip] Sessions vs 4-wk mean 10-06→10-11: −6.4/−4.4/+1.6/−4.0/−4.1/−3.0%; 10-11's −3.0 is the 09-27 Direct spike (2,657) in the control — ex it the Sunday reads +0.9%. — Rio 10-13
- [x] [cass] Issue-06 reject hash → `EXCLUDED_RECIPIENT_HASHES` → E226 #320 (10-17).
- [x] [pip→rio] guardrail sessions line subtracts the whole SG segment → E227 #326 (10-17).
- [x] [quinn] /creator/* guard basis — **decided 10-17:** source-matched (E225) becomes the verdict basis from 10-25 if E225 prints on ≥5/7 mornings; until then the row shows both and E144's 10-28 grade cites both. A site control must match the slice's source mix. — Quinn 10-17
- [ ] [ops] `_patreon-auth.ts` token refreshes leave no durable row — log one line (no token) so E131's refresh leg is observable. — Rio 10-11
- [ ] [rio] same-incident test point (b) should ratio each unit against the site ex the best unit (or Content), not the blended drop. — Rio 10-07

## Done 2026-10-18 (moved verbatim by Pip — superseded by the Q28 10-18 addendum and E230)

- [ ] [pip] Q11 inflow gap, quantified 10-14: writer plugin inserts ~21 rows/day (147/7d) but 136/147 sit at the 2025-01-01 placeholder until posting day, so 0 real-dated rows exist on 10-15..10-21 and all 42 rows in the 14-day horizon are Pip top-ups. Runway can only cross 2 d if the plugin dates rows ahead (writer/MHMUtils change, T2) — a cap raise would not fix it. — Pip 10-14

## Done 2026-10-20 (moved verbatim by Quinn — E243/E240/E236/E239 shipped; isNSFW pass → E242; Bing landings → E245)

- [ ] [rowan] isNSFW pass on the 8 adult-themed SFW-flagged titles in the gameplay-mod/script-mod top 25 (ids in `playbooks/sage.md` 2026-10-18) — unblocks a /games/sims-4/gameplay-mods/ hub worth ≈570 impr/28d; a Mediavine first-paint exposure today. — Sage 10-18 via Quinn
- [x] [ops] T0: `funnel-context-budget.test.ts` should also fail on any `<<<<<<<`/`=======`/`>>>>>>>` line under `.claude/agents/mhm-funnel/**` — #330 landed 12 marker lines on main 10-18 (fixed forward by #337); a marker must fail the paper PR's own gate. — Quinn 10-18 — taken 10-19 as E243 (Ops)
- [x] [cass] (→ E240 10-19) Issue 05 (97 sent) and issue-06 run 1 (99 sent, subscribers ≤10-12) produced 0 `weekly-issue-*` sessions; run 2 (53 newest) produced 30. Check inbox placement for the older cohort (seed test to Gmail/Outlook) before the issue-07 read 10-29. — Cass 10-18
- [ ] [sage] /creator/* Bing landings fell 77→52 while Google rose 52→57 (09-23→29 vs 10-09→15); E218 (#313) pushes changed creator pages daily via `--creators-changed` (ruled out: daily full `--creators`, re-sends ~540 unchanged URLs). If the 10-23 read is MORE DATA, check Bing Webmaster index coverage for /creator/. — Nova 10-16
- [x] [pip→ops] Scoreboard `direct_ex_sg_bot` row + 28d headline-ex-segment bullet (E216 rule imported) — taken 10-18 as E236 (Ops; 10-18 read 3,109 vs 3,202, −2.9%). — Pip 10-16
- [x] (E239 shipped 10-19) [nova] catalog-ingest re-fetches the same 2 posts every morning (nursery-cc, y2k-cc-finds-for-2025: 9 runs 10-10→10-18, 0 created): `--refreshed` compares sitemap lastmod to max(Mod.createdAt), which never advances on a 0-create re-scrape. T0: bump `lastScraped` on the skip path and compare to max(lastScraped, createdAt). ~2 pages + ~40 author fetches/day; not an inflow cause (E232). — Nova 10-18

## Closed / parked 2026-10-21 (Quinn) — verbatim lines from ideas-inbox.md
- [x] [sage] `OFF_TYPE_RE.gameplay` `nails?` matched "Nail Technician" (career mod, #29 of the gameplay top 30) on the 10-20 E238 read — exempt career/job titles or drop `nails?`; measure against the whole facet first. — Sage 10-20 → done E252 PR #359 (1/544 gameplay hits; off-type 1 → 0) — Sage 10-21
- [x] [rowan] furniture top 24 off-facet: Bed Cuddle cmim8uhmm00d4oxy8txx74wqw (#20, gameplay interaction, also on the woohoo post — Sage NSFW look) and Designer Swimsuits cmim8wwzj00saoxy87rv0xev9 (#24, swimwear) — next --ids pass; then /sims-4-nose-presets/ (7/25). — Rowan 10-20 → closed by E256 10-21 (also Got2bVanity #26, Oasis Springs Villa #28, 5 swimsuit-post swimwear rows; /sims-4-nose-presets/ 7 → 0). — Rowan 10-21
- [x] [ops] A `--resume-after` run sends to everyone after the cursor, including people who opted in since the last run: dry-run recipients can exceed the previous run's deferred count (53 vs 42 on 10-16). Count the tail by consent time before quoting it. — Cass 10-16 → addressed for issue 07 by E254 (tail counted with a resume dry run: 202 recipients, 100 + 100 + 2). — Cass 10-21
- [x] [ops] Quinn ended its 10-15 session rc 0 at 07:19:35 before step 8 (digest skeleton only, no branch pushed); same shape as 10-03. Read logs/funnel-quinn-DATE.out on the next exit-2 morning before changing the prompt or the turn budget. — Ops 10-16 → closed: report-before-verify + step-8-before-exit have held 10-16→10-21 (6/6 daily PRs landed). — Quinn 10-21
- [x] [ops] `logs/indexnow.log` is per-worktree, so whether creator pages were pushed after 09-26 could only be read from reports/funnel/indexnow-2026-09-26.md. Land a summary row somewhere durable. — Nova 10-16 → parked 10-21 (no owner move since 09-26; pull back if a creator-page push must be audited). — Quinn 10-21

## Parked 2026-10-23 (Quinn, byte room — verbatim; owners pull from here)

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [pip→quinn] B3 margin: the printed 100.6% of the October line carries ≈4.1% crawler; human read ≈96.5% against the printed line, ≈98.4% against a de-botted line (September trickle ≈2%). Estimates — Quinn/Rio own the line; the ex-segment series is in `reports/funnel/pip-singapore-direct-2026-10-16.md`. — Pip 10-16
- [ ] [rowan] detector candidate "leg warmer(s)"/"legwarmers" → accessories: 31 catalog titles match, 6 outside the post still typed five ways — measure against the whole catalog before adding. — Rowan 10-12
- [ ] [rowan] "Gentle CAS Lighting" is still typed skin (outside the top 30, left alone under E217 scope); the /sims-4-lighting-mods/ post is 17 rows typed six ways (6 gameplay-mod / 4 lighting / 3 NULL / 2 skin / 1 cas-background / 1 hair) — one title-only pass on that post, lighting mods → gameplay-mod, fixtures stay lighting (#61). — Sage 10-16
- [ ] [rowan] Celebrity / "ready-made Sim" downloads are typed from the CAS parts their description lists (E207/E214/E221: 5+ Sims pinned NULL by hand). Measure a Sim-download → NULL rule at ingest against the whole catalog before writing it. — Rowan 10-16
- [x] [sage] CLOSED: sitemap "0 indexed" = deprecated API field (contents[].indexed, "Deprecated; do not use"); drop it from any charter/fact-base reading. — Sage 10-23
- [ ] [rowan] the preset facet is now ~97 face presets + GShade/ReShade presets mixed and backs no page. Split or leave alone; measure before proposing a face-presets page. — Rowan 10-21
- [ ] [rowan] 4 Manual admin rows added 10-21 03:45–03:52Z (Mummy Costume ts2, Waste soil set, Mummy Outfit II, Mummy Costume S08) have creatorId null and sit on no writer post; if they are meant for a Halloween hub, check their facets. — Nova 10-21
- [ ] [ops→quinn] `reports/funnel/2026-10-15.md` never landed on main (digest exists), so every 7-morning keep-if counts 10-15 as missing; the daily PR must `git add` the day's scoreboard .md — add a scanner test that each digest date has its scoreboard file. — Nova/Quinn 10-21
