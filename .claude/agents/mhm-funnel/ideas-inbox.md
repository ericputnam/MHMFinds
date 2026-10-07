<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-07 — ON LINE run 8, normal weighting
Sessions 28d 354,478 vs line 358,999 = 98.74% (09-08→10-05); revenue $5,831.56 vs $5,930.10 = 98.34%. Both slipped from 100.16% / 104.2% on 10-04 (run 7); re-arms if a run reads <97%. Runs 10-05 and 10-06 did not fire, so this is the first read since 10-04.

- [ ] [nova] approving a dashboard submission links the mod to the creator only by author name — no CreatorProfile exists for any real submitter (3/3). Next: create the profile on approval (Nova, 10-04).
- [ ] [ops] `retag-junk-build-facets.ts --apply --rollback-out=<existing path>` overwrites a signed-off plan; extend the #250 write-once guard to applies (Rowan, 10-04).
- [ ] [rowan] after #259: pin Villa Amour Collection (outfit set, title word "villa") NULL — 1 row, dry run in `reports/funnel/catalog-e168-villa-amour-2026-10-04.json`; two hub top-20 mis-tags as furniture: "Functional Skincare Mod", "Mini Pochette Bags" (Sage, 10-04).
- [ ] [pip] tally top-up rows by the posting date they are scheduled for, not the run that wrote them — every date 09-27→10-03 carried 21 top-up rows (3× the 7/day limit) because the cap was per run (Pip, 10-04; tool fixed in #261).
- [ ] [ops] add `patreon_connect_optin_view` to the capture-events filter in `funnel-scoreboard.ts` once #260 merges; register `ref` as a GA4 custom dimension so `sign_up` splits by sending surface (Cass, 10-04).
- [ ] [sage] next hubs: top-level CC hub for "custom content"/"cc finds" (Tier 1, after red clears); retitle skin-details for "skin overlay"; IndexNow log should print the guide URLs it pushes; ingest resumed 10-04 (132 mods pushed) — `/sitemap-mods.xml` dynamic item unblocked (Sage, 10-04).
- [ ] [ops] E176: the runner refuses to exit while any PR merged today lacks an after-merge row — generalize `daily_pr_ledger` from "the daily PR" to `gh pr list --state merged --search "merged:>=$TODAY"`, run `deploy-verify --after-merge --sha <mergeCommit>` from `$WT` for each missing row (T1: runner step). Companion prompt rule: never `run_in_background` a deploy-verify in the final step — 10-03 #257's verify was the day's only background one and died with the CLI at 07:27:46 (no row, no daily PR, DID NOT FIRE). The stale merge lock was that exit's own chain; auto-broken 10-04 06:56, nothing deleted by hand (Ops, 10-04).
- [ ] [ops] persist `logs/deploy-verify.log` (or per-run smoke JSON) at the operator path — last written Sep 8, so E133 cannot be graded (Ops, 10-04).
- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [ops] pytest not installed on the runner host — scripts/agents/test_pin_runway_topup.py cannot run (only --self-test does). — Pip, 10-01
- [ ] [cass] `__tests__/components/ModDetailPage.test.tsx` "toggles favorite state…" is red on main (pre-existed #244/#247): after the click no button named /favorited/i appears; suspect #219 (E138 `useModFavoriteState`). Fix the mock or the optimistic update. — Ops 10-02
- [ ] [ops] merge-gate `--max-wait 600` expired once today behind Pip → Nova → Cass (4 concurrent T0 agents at 240 s spacing); make `--max-wait 900` the ship-protocol default. Also: a stale lock from a crashed worktree cost one agent a wait — confirm the owner-exit path frees it. — Sage/Pip 10-02
- [x] (done 10-07, #271 E176) [ops] 10-07: two runners fired 3 min apart from two scheduled-task Claude sessions (pids 78149 06:52, 80394 06:55); the second launched a duplicate Quinn at 07:00 that Quinn(78149) SIGTERMed at 07:03 before it spawned a team. The runner needs a per-day lock: a second start on the same `TODAY` exits 0 with a `DUPLICATE RUN` log line. Runs 10-05 and 10-06 did not fire at all (no preflight JSON, no ledger row, no scoreboard). — Quinn 10-07
- [ ] [sage] Today's two IndexNow lines (12:54Z mods=0, 12:57Z mods=78) suggest the IndexNow step can run before ingest's rows land; read tomorrow's mods_check before changing step order. — Sage, 10-07
- [ ] [sage] IndexNow --since-last-run dedupe (the optional half of the 09-29 line), only if mods_check shows repeat pushes matter. — Sage, 10-07
- [ ] [pip] The hard cap of 21 rows/run limits a top-up to ~0.63 d against 33.5 posts/day. The floor can't reach 2 d without Q11 (plugin scheduling rows ahead) or a Tier 2 cap raise. — Pip, 10-07
- [ ] [pip] pin-seo-audit --ids can't score posted rows, so every top-up's copy-score read is at-apply only. Add a --include-posted read mode (T0). — Pip, 10-07
- [x] (done 10-07, #267 E180) [rowan] Sage 10-07 handoff: hub mis-tags "Functional Skincare Mod" (cmim8s8h2004koxy8ajzs531l) is now gameplay-mod and "Mini Pochette Bags" (cmim8wmne00q6oxy8comhg52b) is accessories; if either still shows in the build-cc union it comes from another field, not contentType. — Sage, 10-07
- [ ] [cass] mode=invite has no sender: build the subscriber→account invite (lever 5, Tier 1 send) on createPasswordToken(…,'invite') + sendPasswordEmail — E123/E179 can now read it apart. — Cass 10-07
- [ ] [cass] E73 KILLED 10-07: swap the homepage email strip for the session-aware account offer (E130/E152 pattern); retire the home-hero source name. — Cass 10-07
- [ ] [ops] E148 false negative: daily_pr_ledger only matches subjects starting "funnel: daily run DATE"; #264 ("funnel(quinn): daily run 2026-10-04 — …") read as DID NOT FIRE while its row was on main. Match a "funnel(...)?: daily run DATE" prefix plus "(#N)" at the end, and add a test case for the scoped subject (T0). — Ops 10-07
- [ ] [ops] E176-b (was the 10-04 E176 line): the runner refuses to exit while any PR merged today lacks an after-merge row — generalize daily_pr_ledger to all of today's merges (T1). — Ops 10-07
- [ ] [ops] run-success monitor: the scoreboard should print a MISSED line for any of the last 7 days with no preflight file. This morning's run is the watcher, so 10-05/10-06 would have been flagged automatically on 10-07 instead of by hand (T0). — Ops 10-07
- [ ] [nova] T1, after Q23: send isCreator sign-ups to /creators/ once (app/sign-in/page.tsx returnPath); read /creators/ users per flagged signup from 18/145 (12.4%, 90d). Expected yield is low (~1 submission per 100 flagged). — Nova, 10-07
- [ ] [rowan] lighting facet has 26 rows: 4 "CAS Lighting" mods + "Hidden Lighting System" are lighting mods, not fixtures — consider a separate facet or NULL (E22 read 10-07). — Nova, 10-07
- [ ] [rowan] Many legacy cmim8 posts are mis-typed post by post (E180: 34 of 41 rows on bags/realistic-mods posts). Next: rank posts by share of rows whose contentType disagrees with the post's URL category and audit the worst 3 with --ids. — Rowan 10-07
- [ ] [ops] merge-gate lock sat "owner not written yet" ~10 min on 10-07 07:23–07:33 and failed a --wait; stale-by-mtime should have freed it sooner (Nova's first gate attempt also expired at 600 s). — Rowan/Nova 10-07
- [ ] [rio] The same-incident test's point (b) should ratio each unit against the site *ex the best unit* (or against Content), not the blended site drop — a recovering unit inflates every other unit's ratio mechanically (10-05: Sidebar 1.56× blended, 1.27× ex-Player). — Rio 10-07
- [ ] Earlier open lines dated 09-24→10-02 (Pip ×6, Sage ×5, Rowan ×5, Nova ×4, Cass ×3, Rio ×5, Ops ×8) are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-07"; owners pull from there. — Quinn 10-07

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
