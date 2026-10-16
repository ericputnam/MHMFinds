<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-16 — ON LINE run 14, normal weighting
Sessions 28d 357,818 vs line 355,599 = 100.6% (09-17→10-14); revenue $5,854.60 vs $5,944.43 = 98.5% (WATCH bar 97%). Run 12 (10-14) read 99.5% / 98.0%; 10-15's run finished but its daily PR never landed, so run 13 has no digest on main. Re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [cass] mode=invite has no sender: build the subscriber→account invite (lever 5, Tier 1 send) on createPasswordToken(…,'invite') + sendPasswordEmail — E123/E179 can now read it apart. — Cass 10-07
- [ ] [cass] Homepage account offer (replaces the E73 strip, KILLED 10-07): wait for the E191 read 10-26; if offer-cohort completion clears 15%, copy SaveFindsOffer to `HomeCapture` with `ref=home-save`. — Cass 10-12
- [ ] [ops] E176-b (was the 10-04 E176 line): the runner refuses to exit while any PR merged today lacks an after-merge row — generalize daily_pr_ledger to all of today's merges (T1). — Ops 10-07
- [ ] [pip] Q11 inflow gap, quantified 10-14: writer plugin inserts ~21 rows/day (147/7d) but 136/147 sit at the 2025-01-01 placeholder until posting day, so 0 real-dated rows exist on 10-15..10-21 and all 42 rows in the 14-day horizon are Pip top-ups. Runway can only cross 2 d if the plugin dates rows ahead (writer/MHMUtils change, T2) — a cap raise would not fix it. — Pip 10-14
- [ ] [ops] scoreboard/E-reads: GA4 `landingPage` carries no trailing slash, so filters on "/x/" return 0 — normalize before comparing (explains the 10-04 E121 under-count). — Sage 10-11
- [ ] [rio→ops] T0: add `affiliate-pipe-read.ts --start 2026-09-29 --end <yesterday>` to morning step 0e (E134 reads 11-11). CLI stable 10-13: exit 0/2/1, clock anchored to confirmedOn 10-12 (E199; it drifted +1 day/run before). Ops wires the line (SD-11). — Rio 10-13
- [ ] [rio→pip] Sessions vs 4-wk mean 10-06→10-11: −6.4/−4.4/+1.6/−4.0/−4.1/−3.0%; 10-11's −3.0 is the 09-27 Direct spike (2,657) in the control — ex it the Sunday reads +0.9%. — Rio 10-13
- [ ] [ops] GA4 `page_view` fires only on full loads on this site (client `router.push` produces none): per-page reads on client-navigated routes (/go, /sign-in after an offer) must use sessions or custom events. — Cass 10-12
- [ ] [nova] E211 slice 2: 52 Oct flagged accounts (377 flagged at the 10-14 E178 re-run) never reach the welcome — a Navbar "Submit your first mod" nudge for isCreator with 0 submissions (needs a count in the session or one GET; no schema). Wait for the 10-22 read. — Nova 10-15
- [ ] [all] never put a URL template with <slug> in a PR body (repo is public): #228's produced 20 empty-slug claim views; claim-view reads must require a non-empty slug. — Nova 10-12
- [ ] [ops] `_patreon-auth.ts` token refreshes leave no durable row — log one line (no token) so E131's refresh leg is observable. — Rio 10-11
- [ ] [rio] same-incident test point (b) should ratio each unit against the site ex the best unit (or Content), not the blended drop. — Rio 10-07
- [ ] [rowan] accessories after E200: `/jewelry/` URLs map to accessories in `mhmScraperUtils.ts` (should be jewelry); 23 rows sit in a `watches` value no rule emits (fold into accessories?); braces/fangs/bandages/eye patches left NULL, no facet; #2 "Autumn X Socks & Sweatsuit Set" is an outfit titled with a sock word. — Rowan 10-13
- [ ] [rowan] detector candidate "leg warmer(s)"/"legwarmers" → accessories: 31 catalog titles match, 6 outside the post still typed five ways — measure against the whole catalog before adding. — Rowan 10-12
- [ ] [rowan] `catalog-post-disagreement.ts` counts pinned from the pin file, not the DB value, so unapplied pins already lower the number — print "pins not yet at value"; header hardcodes "E186". Next posts: food-clutter 7/15, male-accessories 13/30; farmhouse-cc only needs a URL-map entry. — Rowan 10-12
- [ ] [ops] degraded digests land only in the operator checkout (10-08/10-10 copies written 10-11 10:55) — land them on main via ledger-commit-style plumbing; "Quinn did not run" must be a row the moment it is known. — Ops 10-11
- [ ] [ops] E194-b: retry the preflight once when it is diagnosed HANG with asleep/suspended > 0 and it is still the same day (T1). — Ops 10-12
- [ ] [ops] Past-day day-locks are never broken (only TODAY's is): runner should clear past-day locks whose holder pid is dead (T1). 10-08/10-10 locks removed by hand with evidence 10-15 (E215, `reports/funnel/ops-housekeeping.md`); their worktrees were already reaped 10-11. — Ops 10-15
- [ ] [ops] #260 is live: add `patreon_connect_optin_view` to the scoreboard capture-event filter so `patreon-connect-optin` shows in "Subscribers by source" once a row exists. — Cass 10-11
- [ ] Earlier open lines dated 09-24→10-07 are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-07" and § "Parked 2026-10-11"; owners pull from there. — Quinn 10-11

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
- [ ] [cass] Add the issue-06 reject hash (code null) to `EXCLUDED_RECIPIENT_HASHES` before issue 07. — Cass 10-16
- [ ] [ops] A `--resume-after` run sends to everyone after the cursor, including people who opted in since the last run: dry-run recipients can exceed the previous run's deferred count (53 vs 42 on 10-16). Count the tail by consent time before quoting it. — Cass 10-16
- [ ] [ops] Concurrent deploy-verify runs slowed smoke renders to 5–16 min/page (/play 968 s) and one verify took 60 min; Nova's took 35 min while curl answered in <1 s. Serialize smoke-render across agents or make the first run's result reusable by the others. — Cass/Nova 10-16
- [ ] [ops] `logs/indexnow.log` is per-worktree, so whether creator pages were pushed after 09-26 could only be read from reports/funnel/indexnow-2026-09-26.md. Land a summary row somewhere durable. — Nova 10-16
- [ ] [sage] /creator/* Bing landings fell 77→52 while Google rose 52→57 (09-23→29 vs 10-09→15); E218 (#313) pushes changed creator pages daily via `--creators-changed` (ruled out: daily full `--creators`, re-sends ~540 unchanged URLs). If the 10-23 read is MORE DATA, check Bing Webmaster index coverage for /creator/. — Nova 10-16
- [ ] [rowan] "Gentle CAS Lighting" is still typed skin (outside the top 30, left alone under E217 scope); the /sims-4-lighting-mods/ post is 17 rows typed six ways (6 gameplay-mod / 4 lighting / 3 NULL / 2 skin / 1 cas-background / 1 hair) — one title-only pass on that post, lighting mods → gameplay-mod, fixtures stay lighting (#61). — Sage 10-16
- [ ] [rio→ops] T0: `funnel-scoreboard.ts` pullPatreonApi — one bounded re-attempt of a page that hits AbortSignal.timeout (30 s) inside the existing 180 s walk budget; 10-16 the Members section was COULD-NOT-RUN ("aborted due to timeout"), `patreonGet` retries only on 401. Ops wires it (SD-11). — Rio 10-16
- [ ] [rowan] Celebrity / "ready-made Sim" downloads are typed from the CAS parts their description lists (E207/E214/E221: 5+ Sims pinned NULL by hand). Measure a Sim-download → NULL rule at ingest against the whole catalog before writing it. — Rowan 10-16
- [ ] [ops] deploy-verify's smoke set does not cover collection routes; E221 was confirmed by curling /games/sims-4/makeup-cc/ by hand. — Rowan 10-16
- [ ] [pip→ops] Scoreboard: add a `direct_ex_sg_bot` row to the Audience table and a 28d "headline ex segment" note. Segment = GA4 andGroup {country EXACT 'Singapore', sessionSource EXACT '(direct)'} — identical to `bySource`'s `src === '(direct)'` test, so it subtracts cleanly; import `SG_DIRECT_RULE` from `scripts/agents/direct-bot-lib.ts`, don't restate it. On 10-16 this prints Direct 3,034 vs 3,277 (−7.4%) instead of +78.5%. — Pip 10-16
- [ ] [pip→rio] Guardrail sessions line: subtract the whole Singapore Direct segment, not "excess over 250/day" — the quiet-day trickle (116–262/day since 09-15) is the same two fingerprints, 1:1:1. 28d 09-17→10-14 = 14,740 (4.10%), not 6,863 (1.93%); `direct-bot-read.ts --json` has daily rows. — Pip 10-16
- [ ] [pip→quinn] B3 margin: the printed 100.6% of the October line carries ≈4.1% crawler; human read ≈96.5% against the printed line, ≈98.4% against a de-botted line (September trickle ≈2%). Estimates — Quinn/Rio own the line; the ex-segment series is in `reports/funnel/pip-singapore-direct-2026-10-16.md`. — Pip 10-16
- [ ] [ops] deploy-verify --check: check-blog-sidebar makes one curl (--max-time 60) and a could-not-run goes straight to INCONCLUSIVE with no retry (10-16 06:37; by-hand re-run PASS ~06:55). Retry once after 30 s before grading INCONCLUSIVE. Also vnotes() prints "smoke NOT" on every INCONCLUSIVE, even when only the blog curl failed. (T1, grading logic) — Ops 10-16
- [ ] [ops] Quinn ended its 10-15 session rc 0 at 07:19:35 before step 8 (digest skeleton only, no branch pushed); same shape as 10-03. Read logs/funnel-quinn-DATE.out on the next exit-2 morning before changing the prompt or the turn budget. — Ops 10-16
