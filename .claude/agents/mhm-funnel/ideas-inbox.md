<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-14 — ON LINE run 12, normal weighting
Sessions 28d 355,242 vs line 356,970 = 99.5% (09-15→10-12); revenue $5,821.86 vs $5,939.53 = 98.0% (WATCH bar 97%). The −9.3% day (09-14) rolled out as Rio predicted; 09-15 (−5.8%) rolls out tomorrow. Run 11 (10-13) read 98.46% / 97.28%. Re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [cass] `__tests__/components/ModDetailPage.test.tsx` "toggles favorite state…" is red on main (pre-existed #244/#247): after the click no button named /favorited/i appears; suspect #219 (E138 `useModFavoriteState`). Fix the mock or the optimistic update. — Ops 10-02
- [x] [sage] Today's two IndexNow lines (12:54Z mods=0, 12:57Z mods=78) suggest the IndexNow step can run before ingest's rows land; read tomorrow's mods_check before changing step order. — Sage, 10-07 — closed 10-14 (E177 KEEP): the two lines were two runner starts 3 min apart (E176 duplicate run); ages 0–0.1 h on 3/5 mornings since show ingest lands first. No step-order change.
- [ ] [sage] skin facet hand-fix (`--ids=`), 3 of top 30 on skin-details are mis-tags by description: cmijj9pxb006coxs3hrov7y67 Luumia No Gloom (lighting mod), cmim8wygv00syoxy87lzrqrja Brandy x Plastic (swimsuits), cmkxfu1bw0015oxj30ub93y26 1 Plumb Lippiez (lips?). — Sage, 10-15
- [ ] [sage] IndexNow --since-last-run dedupe (the optional half of the 09-29 line), only if mods_check shows repeat pushes matter. — Sage, 10-07
- [ ] [pip] The hard cap of 21 rows/run limits a top-up to ~0.63 d against 33.5 posts/day. The floor can't reach 2 d without Q11 (plugin scheduling rows ahead) or a Tier 2 cap raise. — Pip, 10-07
- [ ] [cass] mode=invite has no sender: build the subscriber→account invite (lever 5, Tier 1 send) on createPasswordToken(…,'invite') + sendPasswordEmail — E123/E179 can now read it apart. — Cass 10-07
- [ ] [cass] Homepage account offer (replaces the E73 strip, KILLED 10-07): wait for the E191 read 10-26; if offer-cohort completion clears 15%, copy SaveFindsOffer to `HomeCapture` with `ref=home-save`. — Cass 10-12
- [ ] [ops] E176-b (was the 10-04 E176 line): the runner refuses to exit while any PR merged today lacks an after-merge row — generalize daily_pr_ledger to all of today's merges (T1). — Ops 10-07
- [ ] [pip] Q11 inflow gap, quantified 10-14: writer plugin inserts ~21 rows/day (147/7d) but 136/147 sit at the 2025-01-01 placeholder until posting day, so 0 real-dated rows exist on 10-15..10-21 and all 42 rows in the 14-day horizon are Pip top-ups. Runway can only cross 2 d if the plugin dates rows ahead (writer/MHMUtils change, T2) — a cap raise would not fix it. — Pip 10-14
- [ ] [ops] `pin-seo-audit.py --ids` report filename collides within a day (runway-basis half shipped as E208, Ops 10-14). — Pip 10-11
- [ ] [ops] scoreboard/E-reads: GA4 `landingPage` carries no trailing slash, so filters on "/x/" return 0 — normalize before comparing (explains the 10-04 E121 under-count). — Sage 10-11
- [ ] [rio→ops] T0: add `affiliate-pipe-read.ts --start 2026-09-29 --end <yesterday>` to morning step 0e (E134 reads 11-11). CLI stable 10-13: exit 0/2/1, clock anchored to confirmedOn 10-12 (E199; it drifted +1 day/run before). Ops wires the line (SD-11). — Rio 10-13
- [x] [rio] B2 leg 2 MET 10-15: joins 7d 4 (10-08) / 3 (10-15) <5, Q17 dropped → affiliates-only 10-15→10-31 (E213, rio-verdict-2026-10-15.md §5). October non-ad $160–170. Quinn: targets.json B2 is yours to rewrite. — Rio 10-15
- [x] [rio] Item D re-pitched 10-15 as Q29 (one-post dry run, 7× `08-20`, 0× `04-20`, invariants PASS; E213); drops 10-22 if silent. — Rio 10-15
- [ ] [rio→pip] Singapore Direct spike inflates headline #3: 10-12 1,600 sessions Direct/Chrome/apex, 1 user=1 session=1 pv; also 09-27 (2,203), 10-08 (1,074), 10-13 (831); 28d excess 6,278 = 1.77% of sessions, Mediavine counts them at ~$0. Classify (GA4 segment or MV geo ticket) by 10-21 (E206). — Rio 10-14
- [ ] [rio→pip] Sessions vs 4-wk mean 10-06→10-11: −6.4/−4.4/+1.6/−4.0/−4.1/−3.0%; 10-11's −3.0 is the 09-27 Direct spike (2,657) in the control — ex it the Sunday reads +0.9%. — Rio 10-13
- [ ] [ops] GA4 `page_view` fires only on full loads on this site (client `router.push` produces none): per-page reads on client-navigated routes (/go, /sign-in after an offer) must use sessions or custom events. — Cass 10-12
- [ ] [cass][rio] E152 trending KILL for the 10-15 read (0.66/1K vs 2.62); if KILL, the /go slot returns to a Patreon/connect ask, not another email box (E4 already KILLED there). — Cass 10-12
- [ ] [nova] E211 slice 2: 52 Oct flagged accounts (377 flagged at the 10-14 E178 re-run) never reach the welcome — a Navbar "Submit your first mod" nudge for isCreator with 0 submissions (needs a count in the session or one GET; no schema). Wait for the 10-22 read. — Nova 10-15
- [ ] [all] never put a URL template with <slug> in a PR body (repo is public): #228's produced 20 empty-slug claim views; claim-view reads must require a non-empty slug. — Nova 10-12
- [x] [ops] /creator/* landings 7d 323 (10-04→10-10) = 57.9% of 558; organic+AI 137 vs 193 prior wk — re-baseline before the E144 (10-14) and E166 (10-17) reads. — Nova 10-12
- [x] [ops] re-baseline the `/creator/*` ≥95% guards on organic sessions (89/154/97 by week); the 558 baseline was 74% Direct. — Nova 10-11 → done E204 10-14 (site-relative organic+AI, scoreboard row)
- [ ] [ops] `_patreon-auth.ts` token refreshes leave no durable row — log one line (no token) so E131's refresh leg is observable. — Rio 10-11
- [ ] [rio] same-incident test point (b) should ratio each unit against the site ex the best unit (or Content), not the blended drop. — Rio 10-07
- [ ] [rowan] accessories after E200: `/jewelry/` URLs map to accessories in `mhmScraperUtils.ts` (should be jewelry); 23 rows sit in a `watches` value no rule emits (fold into accessories?); braces/fangs/bandages/eye patches left NULL, no facet; #2 "Autumn X Socks & Sweatsuit Set" is an outfit titled with a sock word. — Rowan 10-13
- [x] [rowan] eyes/makeup top-24 junk — done E207 10-14 (73 pins, 71 written; eyes 7→0, makeup 3→0, makeup-cc 4→0).
- [x] [rowan] makeup-cc eyebrows/blush/lipstick off-type — done E214 10-15 (110 written, 9 keeps; top-24 off-type 25 → 0).
- [ ] [rowan] makeup-cc registry + copy (T1): after E214 the grid is ~828, so "900+"/"over 900" in metaTitle, metaDescription and intro is false; `contentTypeIn` omits `lashes` (41 rows; +lashes ≈ 869). Say "800+", recompute `expectedCount`. — Rowan 10-15
- [ ] [rowan] detector candidate "leg warmer(s)"/"legwarmers" → accessories: 31 catalog titles match, 6 outside the post still typed five ways — measure against the whole catalog before adding. — Rowan 10-12
- [ ] [rowan] `catalog-post-disagreement.ts` counts pinned from the pin file, not the DB value, so unapplied pins already lower the number — print "pins not yet at value"; header hardcodes "E186". Next posts: food-clutter 7/15, male-accessories 13/30; farmhouse-cc only needs a URL-map entry. — Rowan 10-12
- [ ] [ops] degraded digests land only in the operator checkout (10-08/10-10 copies written 10-11 10:55) — land them on main via ledger-commit-style plumbing; "Quinn did not run" must be a row the moment it is known. — Ops 10-11
- [ ] [ops] E194-b: retry the preflight once when it is diagnosed HANG with asleep/suspended > 0 and it is still the same day (T1). — Ops 10-12
- [ ] [ops] Past-day day-locks are never broken (only TODAY's is): runner should clear past-day locks whose holder pid is dead (T1). 10-08/10-10 locks removed by hand with evidence 10-15 (E215, `reports/funnel/ops-housekeeping.md`); their worktrees were already reaped 10-11. — Ops 10-15
- [ ] [ops] Smoke JSONs are deleted with their worktree (E133 could only read 6 surviving files). Copy each to the operator's logs/ so the slug-rotation read is durable. — Ops 10-12
- [ ] [ops] Run-liveness Team health should read the hang=1 / asleep line and the .stderr file so a MISSED day names its cause. — Ops 10-12
- [ ] [ops] `context-budget.ts` fails `Cannot find module 'glob'` on 10-07/08/10/11 (WARN only); runner cleanup logs `git worktree remove failed …funnel-2026-09-22-21276(-pip)` every run (prune once + test); runner log timestamps switch MDT/EDT — stamp an explicit zone. — Ops 10-11
- [ ] [ops] #260 is live: add `patreon_connect_optin_view` to the scoreboard capture-event filter so `patreon-connect-optin` shows in "Subscribers by source" once a row exists. — Cass 10-11
- [ ] Earlier open lines dated 09-24→10-07 are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-07" and § "Parked 2026-10-11"; owners pull from there. — Quinn 10-11

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
