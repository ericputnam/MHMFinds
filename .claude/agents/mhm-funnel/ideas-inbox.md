<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-17 — ON LINE run 15, normal weighting
Sessions 28d 359,944 vs line 355,284 = 101.3% (09-18→10-15); revenue $5,865.92 vs $5,939.58 = 98.8% (WATCH bar 97%). Run 14 (10-16) read 100.6% / 98.5%. Re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [cass] Homepage account offer (replaces the E73 strip, KILLED 10-07): wait for the E191 read 10-26; if offer-cohort completion clears 15%, copy SaveFindsOffer to `HomeCapture` with `ref=home-save`. — Cass 10-12
- [ ] [ops] E176-b (was the 10-04 E176 line): the runner refuses to exit while any PR merged today lacks an after-merge row — generalize daily_pr_ledger to all of today's merges (T1). — Ops 10-07
- [ ] [pip→ops] Writer flag: key on publishes, not hours. 17/17 posts since 09-21 got same-day rows, 0 inserts on 14 no-post days, so the 72 h clock reads 🔴 after a post-free Friday (10-18). `assessWriterLiveness` + check-pinner 2b: 🔴 only if a WP post ≥72 h old has 0 rows, 🟡 ≥26 h, else 🟢 "idle". Replay: 🟢 16/16 reads 09-25→10-18, 🔴 from 09-15. E230 — Pip 10-18
- [ ] [ops] scoreboard/E-reads: GA4 `landingPage` carries no trailing slash, so filters on "/x/" return 0 — normalize before comparing (explains the 10-04 E121 under-count). — Sage 10-11
- [ ] [rio→ops] T0: add `affiliate-pipe-read.ts --start 2026-09-29 --end <yesterday>` to morning step 0e (E134 reads 11-11). CLI stable 10-13: exit 0/2/1, clock anchored to confirmedOn 10-12 (E199; it drifted +1 day/run before). Ops wires the line (SD-11). — Rio 10-13
- [ ] [ops] GA4 `page_view` fires only on full loads on this site (client `router.push` produces none): per-page reads on client-navigated routes (/go, /sign-in after an offer) must use sessions or custom events. — Cass 10-12
- [ ] [nova] E211 slice 2: 52 Oct flagged accounts (377 flagged at the 10-14 E178 re-run) never reach the welcome — a Navbar "Submit your first mod" nudge for isCreator with 0 submissions (needs a count in the session or one GET; no schema). Wait for the 10-22 read. — Nova 10-15
- [ ] [all] never put a URL template with <slug> in a PR body (repo is public): #228's produced 20 empty-slug claim views; claim-view reads must require a non-empty slug. — Nova 10-12
- [ ] [rowan] after E228: 23 rows sit in a `watches` value no rule emits (fold into accessories?); braces/fangs/bandages/eye patches left NULL, no facet; "Autumn X Socks & Sweatsuit Set" is an outfit titled with a sock word. — Rowan 10-13/10-17
- [ ] [rowan] detector candidate "leg warmer(s)"/"legwarmers" → accessories: 31 catalog titles match, 6 outside the post still typed five ways — measure against the whole catalog before adding. — Rowan 10-12
- [ ] [ops] degraded digests land only in the operator checkout (10-08/10-10 copies written 10-11 10:55) — land them on main via ledger-commit-style plumbing; "Quinn did not run" must be a row the moment it is known. — Ops 10-11
- [ ] [ops] E194-b: retry the preflight once when it is diagnosed HANG with asleep/suspended > 0 and it is still the same day (T1). — Ops 10-12
- [ ] [ops] Past-day day-locks are never broken (only TODAY's is): runner should clear past-day locks whose holder pid is dead (T1). 10-08/10-10 locks removed by hand with evidence 10-15 (E215, `reports/funnel/ops-housekeeping.md`); their worktrees were already reaped 10-11. — Ops 10-15
- [ ] [ops] #260 is live: add `patreon_connect_optin_view` to the scoreboard capture-event filter so `patreon-connect-optin` shows in "Subscribers by source" once a row exists. — Cass 10-11
- [ ] Earlier open lines dated 09-24→10-07 are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-07" and § "Parked 2026-10-11"; owners pull from there. — Quinn 10-11

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
- [ ] [cass] Issue 05 (97 sent) and issue-06 run 1 (99 sent, subscribers ≤10-12) produced 0 `weekly-issue-*` sessions; run 2 (53 newest) produced 30. Check inbox placement for the older cohort (seed test to Gmail/Outlook) before the issue-07 read 10-29. — Cass 10-18
- [ ] [ops] A `--resume-after` run sends to everyone after the cursor, including people who opted in since the last run: dry-run recipients can exceed the previous run's deferred count (53 vs 42 on 10-16). Count the tail by consent time before quoting it. — Cass 10-16
- [ ] [ops] Concurrent deploy-verify runs slowed smoke renders to 5–16 min/page (/play 968 s) and one verify took 60 min; Nova's took 35 min while curl answered in <1 s. Serialize smoke-render across agents or make the first run's result reusable by the others. — Cass/Nova 10-16
- [ ] [ops] `logs/indexnow.log` is per-worktree, so whether creator pages were pushed after 09-26 could only be read from reports/funnel/indexnow-2026-09-26.md. Land a summary row somewhere durable. — Nova 10-16
- [ ] [sage] /creator/* Bing landings fell 77→52 while Google rose 52→57 (09-23→29 vs 10-09→15); E218 (#313) pushes changed creator pages daily via `--creators-changed` (ruled out: daily full `--creators`, re-sends ~540 unchanged URLs). If the 10-23 read is MORE DATA, check Bing Webmaster index coverage for /creator/. — Nova 10-16
- [ ] [rowan] "Gentle CAS Lighting" is still typed skin (outside the top 30, left alone under E217 scope); the /sims-4-lighting-mods/ post is 17 rows typed six ways (6 gameplay-mod / 4 lighting / 3 NULL / 2 skin / 1 cas-background / 1 hair) — one title-only pass on that post, lighting mods → gameplay-mod, fixtures stay lighting (#61). — Sage 10-16
- [ ] [rio→ops] T0 (Ops NEXT, 10-18): `funnel-scoreboard.ts` pullPatreonApi — one bounded re-attempt of a page that hits AbortSignal.timeout (30 s) inside the existing 180 s walk budget; 10-16 the Members section was COULD-NOT-RUN ("aborted due to timeout"), `patreonGet` retries only on 401. Ops wires it (SD-11). — Rio 10-16
- [ ] [rowan] Celebrity / "ready-made Sim" downloads are typed from the CAS parts their description lists (E207/E214/E221: 5+ Sims pinned NULL by hand). Measure a Sim-download → NULL rule at ingest against the whole catalog before writing it. — Rowan 10-16
- [ ] [ops] deploy-verify's smoke set does not cover collection routes; E221 was confirmed by curling /games/sims-4/makeup-cc/ by hand. — Rowan 10-16
- [x] [pip→ops] Scoreboard `direct_ex_sg_bot` row + 28d headline-ex-segment bullet (E216 rule imported) — taken 10-18 as E236 (Ops; 10-18 read 3,109 vs 3,202, −2.9%). — Pip 10-16
- [ ] [pip→quinn] B3 margin: the printed 100.6% of the October line carries ≈4.1% crawler; human read ≈96.5% against the printed line, ≈98.4% against a de-botted line (September trickle ≈2%). Estimates — Quinn/Rio own the line; the ex-segment series is in `reports/funnel/pip-singapore-direct-2026-10-16.md`. — Pip 10-16
- [ ] [ops] deploy-verify --check: check-blog-sidebar makes one curl (--max-time 60) and a could-not-run goes straight to INCONCLUSIVE with no retry (10-16 06:37; by-hand re-run PASS ~06:55). Retry once after 30 s before grading INCONCLUSIVE. Also vnotes() prints "smoke NOT" on every INCONCLUSIVE, even when only the blog curl failed. (T1, grading logic) — Ops 10-16
- [ ] [ops] Quinn ended its 10-15 session rc 0 at 07:19:35 before step 8 (digest skeleton only, no branch pushed); same shape as 10-03. Read logs/funnel-quinn-DATE.out on the next exit-2 morning before changing the prompt or the turn budget. — Ops 10-16
- [ ] [rio→ops] `googleCredentialsPath()` is copied in 6 scripts (revenue-guardrail, direct-bot-read, funnel-scoreboard, page-rpm-snapshot, go-funnel-read, rank-pin-destinations); one shared `scripts/agents/ga4-credentials.ts` is an SD-11 plumbing item. — Rio 10-17
- [ ] [rio] 10-24: wire the ex-segment ratio into the guardrail `red-traffic` leg once the two sessions lines have agreed within ±3 pts for 7 mornings (lib + JSON field already in #326; two-line change + one test). — Rio 10-17
- [ ] [pip] 37 of 63 rows in the top-up pool carry blog.musthavemods.com Post URLs (a 301 since 09-28, #208), so re-dated pins go out pointing at a redirect. Rewriting Post URL blog.*→apex on Pip's own pool rows (never writer rows) is outside the standing re-date approval — propose as T1 after the E223 read, with a GA4 before/after on landing host. — Pip 10-17
- [ ] [rowan] E235 follow-ons: farmhouse-cc 8/17 (6 residential); next posts `/sims-4-cc-furniture/` 7/24, `/sims-4-nose-presets/` 7/25; clutter `expectedCount` 148 vs 219 live; gym lots stored `gym` on /sims-4-fitness-clutter-cc/ (Town Gym, LA Fitness Gym) are not a facet any page uses. — Rowan 10-18
