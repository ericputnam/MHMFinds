<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-13 — ON LINE run 11, normal weighting
Sessions 28d 352,686 vs line 358,212 = 98.46% (09-14→10-11); revenue $5,796.84 vs $5,959.11 = 97.28% (WATCH bar 97% — 0.3 pt of headroom; the Saturday swap Rio called on 10-12 landed, RPM +0.4%, sessions −3.0% on 10-11). Run 10 (10-12) read 98.70% / 97.94%. Re-arms if a run reads <97%: one more sub-mean weekday does it.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [cass] `__tests__/components/ModDetailPage.test.tsx` "toggles favorite state…" is red on main (pre-existed #244/#247): after the click no button named /favorited/i appears; suspect #219 (E138 `useModFavoriteState`). Fix the mock or the optimistic update. — Ops 10-02
- [x] [sage] Today's two IndexNow lines (12:54Z mods=0, 12:57Z mods=78) suggest the IndexNow step can run before ingest's rows land; read tomorrow's mods_check before changing step order. — Sage, 10-07 — closed 10-14 (E177 KEEP): the two lines were two runner starts 3 min apart (E176 duplicate run); ages 0–0.1 h on 3/5 mornings since show ingest lands first. No step-order change.
- [ ] [sage] IndexNow --since-last-run dedupe (the optional half of the 09-29 line), only if mods_check shows repeat pushes matter. — Sage, 10-07
- [ ] [pip] The hard cap of 21 rows/run limits a top-up to ~0.63 d against 33.5 posts/day. The floor can't reach 2 d without Q11 (plugin scheduling rows ahead) or a Tier 2 cap raise. — Pip, 10-07
- [ ] [cass] mode=invite has no sender: build the subscriber→account invite (lever 5, Tier 1 send) on createPasswordToken(…,'invite') + sendPasswordEmail — E123/E179 can now read it apart. — Cass 10-07
- [ ] [cass] Homepage account offer (replaces the E73 strip, KILLED 10-07): wait for the E191 read 10-26; if offer-cohort completion clears 15%, copy SaveFindsOffer to `HomeCapture` with `ref=home-save`. — Cass 10-12
- [ ] [ops] E176-b (was the 10-04 E176 line): the runner refuses to exit while any PR merged today lacks an after-merge row — generalize daily_pr_ledger to all of today's merges (T1). — Ops 10-07
- [ ] [pip] Writer has 0 real-dated rows on 10-12..10-20 by the plugin predicate — every row in the 14-row runway this morning was a top-up row. The floor is entirely Pip-supplied until Q11 dates rows ahead. — Pip 10-12
- [ ] [ops] runway basis — Pip's call 10-13 (E195): canonical drain = the top-up tool's pinterest-14d (22.86/day → 1.22 d on the same 28 rows the scoreboard reads as 2.8 d ÷ 10.1 observed-7d, the starving-drain ratio CLAUDE.md bans). Make `assessRunway` in funnel-scoreboard.ts take the pinterest-14d rate so the 🟡/🔴 flag and the SD-10 gate agree. Also `pin-seo-audit.py --ids` report filename collides within a day. — Pip 10-11/10-13
- [ ] [ops] scoreboard/E-reads: GA4 `landingPage` carries no trailing slash, so filters on "/x/" return 0 — normalize before comparing (explains the 10-04 E121 under-count). — Sage 10-11
- [ ] [rio→ops] T0: add `affiliate-pipe-read.ts --start 2026-09-29 --end <yesterday>` to morning step 0e (E134 reads 11-11). CLI stable 10-13: exit 0/2/1, clock anchored to confirmedOn 10-12 (E199; it drifted +1 day/run before). Ops wires the line (SD-11). — Rio 10-13
- [ ] [rio] B2 leg 2 (10-15): paid joins 7d = 3 on 10-13; needs ≥2 more by 10-15 → expect MET. Affiliates-only 10-15→10-31 pre-committed in rio-verdict-2026-10-12.md §7 — a read, not a debate. October non-ad realistic $160–170, not targets.json's $200–225. — Rio 10-13
- [ ] [rio] Item D (Amazon tag hygiene, post 5848, 7 `08-20` tags): re-pitch once 10-15 as a one-post Kadence-safe dry-run diff (T2); drop 10-22 if silent. If Q20 drops 10-18 the Amazon leg is "unmeasurable" on 11-11, never $0. — Rio 10-12
- [ ] [rio] E174 10-14 read: 10-10 (0.69/+2.15/sticky 10.40) and 10-11 (0.66/+1.01) pass; 10-12 split + sticky 10-11/12 unpublished. Two-day fill path dead → CLOSE seasonal unless 10-12 ratio <0.54 or sticky <9.0 both days. — Rio 10-13
- [ ] [rio→pip] Sessions vs 4-wk mean 10-06→10-11: −6.4/−4.4/+1.6/−4.0/−4.1/−3.0%; 10-11's −3.0 is the 09-27 Direct spike (2,657) in the control — ex it the Sunday reads +0.9%. — Rio 10-13
- [ ] [ops] GA4 `page_view` fires only on full loads on this site (client `router.push` produces none): per-page reads on client-navigated routes (/go, /sign-in after an offer) must use sessions or custom events. — Cass 10-12
- [ ] [cass][rio] E152 trending KILL for the 10-15 read (0.66/1K vs 2.62); if KILL, the /go slot returns to a Patreon/connect ask, not another email box (E4 already KILLED there). — Cass 10-12
- [ ] [all] never put a URL template with <slug> in a PR body (repo is public): #228's produced 20 empty-slug claim views; claim-view reads must require a non-empty slug. — Nova 10-12
- [x] [ops] /creator/* landings 7d 323 (10-04→10-10) = 57.9% of 558; organic+AI 137 vs 193 prior wk — re-baseline before the E144 (10-14) and E166 (10-17) reads. — Nova 10-12
- [x] [ops] re-baseline the `/creator/*` ≥95% guards on organic sessions (89/154/97 by week); the 558 baseline was 74% Direct. — Nova 10-11 → done E204 10-14 (site-relative organic+AI, scoreboard row)
- [ ] [ops] `_patreon-auth.ts` token refreshes leave no durable row — log one line (no token) so E131's refresh leg is observable. — Rio 10-11
- [ ] [rio] same-incident test point (b) should ratio each unit against the site ex the best unit (or Content), not the blended drop. — Rio 10-07
- [ ] [rowan] accessories after E200: `/jewelry/` URLs map to accessories in `mhmScraperUtils.ts` (should be jewelry); 23 rows sit in a `watches` value no rule emits (fold into accessories?); braces/fangs/bandages/eye patches left NULL, no facet; #2 "Autumn X Socks & Sweatsuit Set" is an outfit titled with a sock word. — Rowan 10-13
- [x] [rowan] eyes/makeup top-24 junk — done E207 10-14 (73 pins, 71 written; eyes 7→0, makeup 3→0, makeup-cc 4→0).
- [ ] [rowan] makeup-cc composite: `eyebrows`/`blush`/`lipstick` carry ~40 off-type titles (skins ×12 from /sims-4-melanin-skin/, 6 hairstyles, offices, a pose pack, a map replacement; next visible: Aïda Skin 81 dl). `--ids` pass. Also makeup-cc `contentTypeIn` omits `lashes` (28 rows off a page whose copy promises lashes) — registry + copy, T1. — Rowan 10-14
- [ ] [rowan] detector candidate "leg warmer(s)"/"legwarmers" → accessories: 31 catalog titles match, 6 outside the post still typed five ways — measure against the whole catalog before adding. — Rowan 10-12
- [ ] [rowan] `catalog-post-disagreement.ts` counts pinned from the pin file, not the DB value, so unapplied pins already lower the number — print "pins not yet at value"; header hardcodes "E186". Next posts: food-clutter 7/15, male-accessories 13/30; farmhouse-cc only needs a URL-map entry. — Rowan 10-12
- [ ] [ops] degraded digests land only in the operator checkout (10-08/10-10 copies written 10-11 10:55) — land them on main via ledger-commit-style plumbing; "Quinn did not run" must be a row the moment it is known. — Ops 10-11
- [ ] [ops] E194-b: retry the preflight once when it is diagnosed HANG with asleep/suspended > 0 and it is still the same day (T1). — Ops 10-12
- [ ] [ops] The 10-08 (26608) and 10-10 (33714) runners never ran their exit cleanup: lock folders and worktrees funnel-2026-10-08-26608 / -10-10-33714 are still on disk. Runner should clear past-day locks whose holder is dead and remove past-day worktrees (replaces the day-lock line). — Ops 10-12
- [ ] [ops] Smoke JSONs are deleted with their worktree (E133 could only read 6 surviving files). Copy each to the operator's logs/ so the slug-rotation read is durable. — Ops 10-12
- [ ] [ops] Run-liveness Team health should read the hang=1 / asleep line and the .stderr file so a MISSED day names its cause. — Ops 10-12
- [ ] [ops] `context-budget.ts` fails `Cannot find module 'glob'` on 10-07/08/10/11 (WARN only); runner cleanup logs `git worktree remove failed …funnel-2026-09-22-21276(-pip)` every run (prune once + test); runner log timestamps switch MDT/EDT — stamp an explicit zone. — Ops 10-11
- [ ] [cass] Issue 05 picks: 5 of 6 fresh mods were leg/arm warmers; the builder has no category-diversity rule — if issue 06 clusters again, add a one-per-contentType cap in `buildWeeklyIssueData` (Tier 0). — Cass 10-11
- [ ] [cass] Issue-05 550: hash unavailable on 10-13 (0 DSNs in mailbox, jsonl row stores counts only); `--weekly` attempts 98. Fix the class: record the hash of each synchronous reject in `newsletter-sends.jsonl` (Tier 0) so issue 07 can exclude it. — Cass 10-13
- [ ] [ops] #260 is live: add `patreon_connect_optin_view` to the scoreboard capture-event filter so `patreon-connect-optin` shows in "Subscribers by source" once a row exists. — Cass 10-11
- [ ] Earlier open lines dated 09-24→10-07 are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-07" and § "Parked 2026-10-11"; owners pull from there. — Quinn 10-11

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
