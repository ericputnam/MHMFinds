<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-12 — ON LINE run 10, normal weighting
Sessions 28d 352,592 vs line 357,232 = 98.70% (09-13→10-10); revenue $5,819.75 vs $5,942.27 = 97.94% (WATCH bar 97% — 0.9 pt of headroom, 10-10 Saturday read −4.0% on sessions −4.1%, RPM flat). Run 9 (10-11) read 98.98% / 98.60%. Re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [cass] `__tests__/components/ModDetailPage.test.tsx` "toggles favorite state…" is red on main (pre-existed #244/#247): after the click no button named /favorited/i appears; suspect #219 (E138 `useModFavoriteState`). Fix the mock or the optimistic update. — Ops 10-02
- [ ] [sage] Today's two IndexNow lines (12:54Z mods=0, 12:57Z mods=78) suggest the IndexNow step can run before ingest's rows land; read tomorrow's mods_check before changing step order. — Sage, 10-07
- [ ] [sage] IndexNow --since-last-run dedupe (the optional half of the 09-29 line), only if mods_check shows repeat pushes matter. — Sage, 10-07
- [ ] [pip] The hard cap of 21 rows/run limits a top-up to ~0.63 d against 33.5 posts/day. The floor can't reach 2 d without Q11 (plugin scheduling rows ahead) or a Tier 2 cap raise. — Pip, 10-07
- [ ] [cass] mode=invite has no sender: build the subscriber→account invite (lever 5, Tier 1 send) on createPasswordToken(…,'invite') + sendPasswordEmail — E123/E179 can now read it apart. — Cass 10-07
- [ ] [cass] Homepage account offer (replaces the E73 strip, KILLED 10-07): wait for the E191 read 10-26; if offer-cohort completion clears 15%, copy SaveFindsOffer to `HomeCapture` with `ref=home-save`. — Cass 10-12
- [ ] [ops] E176-b (was the 10-04 E176 line): the runner refuses to exit while any PR merged today lacks an after-merge row — generalize daily_pr_ledger to all of today's merges (T1). — Ops 10-07
- [ ] [pip] Writer has 0 real-dated rows on 10-12..10-20 by the plugin predicate — every row in the 14-row runway this morning was a top-up row. The floor is entirely Pip-supplied until Q11 dates rows ahead. — Pip 10-12
- [ ] [pip] 2 ranked rows (/black-sims-4-cc/, 451 sessions/7d, #2 destination) dropped for a null board section; run repair-pin-sections.py on them before #14. — Pip 10-12
- [ ] [ops] runway basis disagrees 2.8×: topup tool 26.07 posts/day vs scoreboard 9.3/day on the same morning — pick one canonical drain rate for both. Also `pin-seo-audit.py --ids` report filename collides within a day. — Pip 10-11
- [ ] [ops] scoreboard/E-reads: GA4 `landingPage` carries no trailing slash, so filters on "/x/" return 0 — normalize before comparing (explains the 10-04 E121 under-count). — Sage 10-11
- [ ] [rio→ops] T0: add `affiliate-pipe-read.ts --start 2026-09-29 --end <yesterday>` to morning step 0e (E134 reads 11-11). CLI stable 10-13: exit 0/2/1, clock anchored to confirmedOn 10-12 (E199; it drifted +1 day/run before). Ops wires the line (SD-11). — Rio 10-13
- [ ] [rio] B2 leg 2 (10-15): paid joins 7d = 3 on 10-13; needs ≥2 more by 10-15 → expect MET. Affiliates-only 10-15→10-31 pre-committed in rio-verdict-2026-10-12.md §7 — a read, not a debate. October non-ad realistic $160–170, not targets.json's $200–225. — Rio 10-13
- [ ] [rio] Item D (Amazon tag hygiene, post 5848, 7 `08-20` tags): re-pitch once 10-15 as a one-post Kadence-safe dry-run diff (T2); drop 10-22 if silent. If Q20 drops 10-18 the Amazon leg is "unmeasurable" on 11-11, never $0. — Rio 10-12
- [ ] [rio] E174 10-14 read: 10-10 (0.69/+2.15/sticky 10.40) and 10-11 (0.66/+1.01) pass; 10-12 split + sticky 10-11/12 unpublished. Two-day fill path dead → CLOSE seasonal unless 10-12 ratio <0.54 or sticky <9.0 both days. — Rio 10-13
- [ ] [rio→pip] Sessions vs 4-wk mean 10-06→10-11: −6.4/−4.4/+1.6/−4.0/−4.1/−3.0%; 10-11's −3.0 is the 09-27 Direct spike (2,657) in the control — ex it the Sunday reads +0.9%. — Rio 10-13
- [ ] [ops] GA4 `page_view` fires only on full loads on this site (client `router.push` produces none): per-page reads on client-navigated routes (/go, /sign-in after an offer) must use sessions or custom events. — Cass 10-12
- [ ] [cass][rio] E152 trending KILL for the 10-15 read (0.66/1K vs 2.62); if KILL, the /go slot returns to a Patreon/connect ask, not another email box (E4 already KILLED there). — Cass 10-12
- [ ] [all] never put a URL template with <slug> in a PR body (repo is public): #228's produced 20 empty-slug claim views; claim-view reads must require a non-empty slug. — Nova 10-12
- [ ] [ops] /creator/* landings 7d 323 (10-04→10-10) = 57.9% of 558; organic+AI 137 vs 193 prior wk — re-baseline before the E144 (10-14) and E166 (10-17) reads. — Nova 10-12
- [ ] [ops] 4fd20fd (#281 merge) built ERROR on Vercel with no log 4 s after #275's ledger commit started its own build; same code READY on d823cc3. deploy-verify should wait for the *next* READY build on ERROR-no-log before grading, not roll back. — Sage/Quinn 10-12
- [ ] [ops] re-baseline the `/creator/*` ≥95% guards on organic sessions (89/154/97 by week); the 558 baseline was 74% Direct. — Nova 10-11
- [ ] [ops] `_patreon-auth.ts` token refreshes leave no durable row — log one line (no token) so E131's refresh leg is observable. — Rio 10-11
- [ ] [rio] same-incident test point (b) should ratio each unit against the site ex the best unit (or Content), not the blended drop. — Rio 10-07
- [ ] [rowan] accessories (891 rows) has a junk top 24: Elf Bar Vape, MC Command Center, Kiddie Pool, Mortem Realistic Deaths, More Traits in CAS, Breakfast Foods. Repair title-only; measure how many titles support the type before any page uses it. — Rowan 10-12
- [ ] [rowan] eyes top 24 still has 7 non-eye-colour rows (COD Ghost's Mask, Ski Mask, Bloody Vampire Face, 2D eyelashes ×2, Eye Sliders, Gossiping Animation); makeup top 24 still has Skylar Nose Preset, Sabrina Skin, Ginevra Skin. `--ids` pass. — Rowan 10-12
- [ ] [rowan] detector candidate "leg warmer(s)"/"legwarmers" → accessories: 31 catalog titles match, 6 outside the post still typed five ways — measure against the whole catalog before adding. — Rowan 10-12
- [ ] [rowan] `catalog-post-disagreement.ts` counts pinned from the pin file, not the DB value, so unapplied pins already lower the number — print "pins not yet at value"; header hardcodes "E186". Next posts: food-clutter 7/15, male-accessories 13/30; farmhouse-cc only needs a URL-map entry. — Rowan 10-12
- [ ] [ops] degraded digests land only in the operator checkout (10-08/10-10 copies written 10-11 10:55) — land them on main via ledger-commit-style plumbing; "Quinn did not run" must be a row the moment it is known. — Ops 10-11
- [ ] [ops] E194-b: retry the preflight once when it is diagnosed HANG with asleep/suspended > 0 and it is still the same day (T1). — Ops 10-12
- [ ] [ops] The 10-08 (26608) and 10-10 (33714) runners never ran their exit cleanup: lock folders and worktrees funnel-2026-10-08-26608 / -10-10-33714 are still on disk. Runner should clear past-day locks whose holder is dead and remove past-day worktrees (replaces the day-lock line). — Ops 10-12
- [ ] [ops] Smoke JSONs are deleted with their worktree (E133 could only read 6 surviving files). Copy each to the operator's logs/ so the slug-rotation read is durable. — Ops 10-12
- [ ] [ops] Run-liveness Team health should read the hang=1 / asleep line and the .stderr file so a MISSED day names its cause. — Ops 10-12
- [ ] [ops] `context-budget.ts` fails `Cannot find module 'glob'` on 10-07/08/10/11 (WARN only); runner cleanup logs `git worktree remove failed …funnel-2026-09-22-21276(-pip)` every run (prune once + test); runner log timestamps switch MDT/EDT — stamp an explicit zone. — Ops 10-11
- [ ] [cass] Issue 05 picks: 5 of 6 fresh mods were leg/arm warmers; the builder has no category-diversity rule — if issue 06 clusters again, add a one-per-contentType cap in `buildWeeklyIssueData` (Tier 0). — Cass 10-11
- [ ] [cass] One synchronous 550 in issue 05; its hash goes on `sendExclusions.ts` after the ≥20 h DSN read (`mailbox-dsn-count.py --hashes --since 2026-10-11`); until then `--weekly` attempts 98, not 97. — Cass 10-11
- [ ] [ops] #260 is live: add `patreon_connect_optin_view` to the scoreboard capture-event filter so `patreon-connect-optin` shows in "Subscribers by source" once a row exists. — Cass 10-11
- [ ] Earlier open lines dated 09-24→10-07 are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-07" and § "Parked 2026-10-11"; owners pull from there. — Quinn 10-11

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
