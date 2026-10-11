<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-11 — ON LINE run 9, normal weighting
Sessions 28d 352,961 vs line 356,601 = 98.98% (09-12→10-09); revenue $5,843.16 vs $5,926.16 = 98.60%. Run 8 (10-07) read 98.74% / 98.34%. Runs 10-08/09/10 never reached Quinn (host asleep), so this is the first read since 10-07; re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [cass] `__tests__/components/ModDetailPage.test.tsx` "toggles favorite state…" is red on main (pre-existed #244/#247): after the click no button named /favorited/i appears; suspect #219 (E138 `useModFavoriteState`). Fix the mock or the optimistic update. — Ops 10-02
- [ ] [sage] Today's two IndexNow lines (12:54Z mods=0, 12:57Z mods=78) suggest the IndexNow step can run before ingest's rows land; read tomorrow's mods_check before changing step order. — Sage, 10-07
- [ ] [sage] IndexNow --since-last-run dedupe (the optional half of the 09-29 line), only if mods_check shows repeat pushes matter. — Sage, 10-07
- [ ] [pip] The hard cap of 21 rows/run limits a top-up to ~0.63 d against 33.5 posts/day. The floor can't reach 2 d without Q11 (plugin scheduling rows ahead) or a Tier 2 cap raise. — Pip, 10-07
- [ ] [cass] mode=invite has no sender: build the subscriber→account invite (lever 5, Tier 1 send) on createPasswordToken(…,'invite') + sendPasswordEmail — E123/E179 can now read it apart. — Cass 10-07
- [ ] [cass] E73 KILLED 10-07: swap the homepage email strip for the session-aware account offer (E130/E152 pattern); retire the home-hero source name. — Cass 10-07
- [ ] [ops] E176-b (was the 10-04 E176 line): the runner refuses to exit while any PR merged today lacks an after-merge row — generalize daily_pr_ledger to all of today's merges (T1). — Ops 10-07
- [ ] [pip] re-gate top-ups relative to site Pinterest WoW (or a freshly re-pulled baseline): 8 of 9 top-ups read KILL on absolute bars while site Pinterest fell −3.9% WoW; E170's stored base 2,290 re-pulls as 2,138 (selection bias). — Pip 10-11
- [ ] [pip] `count_writer_rows_for_date` counts any row with a WordPress Post ID, so it reported Pip's own 7 rows as "writer rows"; use the plugin's predicate. — Pip 10-11
- [ ] [ops] runway basis disagrees 2.8×: topup tool 26.07 posts/day vs scoreboard 9.3/day on the same morning — pick one canonical drain rate for both. Also `pin-seo-audit.py --ids` report filename collides within a day. — Pip 10-11
- [ ] [ops] scoreboard/E-reads: GA4 `landingPage` carries no trailing slash, so filters on "/x/" return 0 — normalize before comparing (explains the 10-04 E121 under-count). — Sage 10-11
- [ ] [sage] hair-cc JSON-LD `#webpage` `@id` resolves to the site-root node; give each page its own. — Sage 10-11
- [ ] [nova] 20 of 22 claim views arrive with an empty `?creator=` — trace the source before building on E144. Backfill `creatorId` for the 4 old approvals (only doree qualifies) needs its own Tier 0 item. — Nova 10-11
- [ ] [ops] re-baseline the `/creator/*` ≥95% guards on organic sessions (89/154/97 by week); the 558 baseline was 74% Direct. — Nova 10-11
- [ ] [ops] `_patreon-auth.ts` token refreshes leave no durable row — log one line (no token) so E131's refresh leg is observable. — Rio 10-11
- [ ] [rio] watch `sticky_sidebar_ads` — 9.35 on 10-08 is the lowest since 09-18; E174's REOPEN branch trips at <9.0 two days. — Rio 10-11
- [ ] [rio] same-incident test point (b) should ratio each unit against the site ex the best unit (or Content), not the blended drop. — Rio 10-07
- [ ] [rowan] E186 next: makeup-clutter 13/23, body-presets-2024 11/21, eyes-cc 15/32; "Skylar Nose Preset" sits in the makeup-cc top 24. URL map in mhmScraperUtils categorises only 389 of 2,900 posts (5,413 of 16,822 rows); bags-cc and farmhouse-cc→lot are misses — measure a pattern against the catalog before adding it. — Rowan 10-11
- [ ] [rowan] 10-10 ingest typed /sims-4-leg-warmers-cc/ 27 rows five ways (shoes/bottoms/tops/accessories/full-body); no legwear facet — pick one or NULL. — Rowan 10-11
- [ ] [ops] degraded digests land only in the operator checkout (10-08/10-10 copies written 10-11 10:55) — land them on main via ledger-commit-style plumbing; "Quinn did not run" must be a row the moment it is known. — Ops 10-11
- [ ] [ops] preflight stderr is discarded (next OTHER diagnosis cannot say why) and its 240 s `alarm` did not fire across sleep — capture stderr and add a wall-clock watcher outside the preflight. — Ops 10-11
- [ ] [ops] `context-budget.ts` fails `Cannot find module 'glob'` on 10-07/08/10/11 (WARN only); runner cleanup logs `git worktree remove failed …funnel-2026-09-22-21276(-pip)` every run (prune once + test); runner log timestamps switch MDT/EDT — stamp an explicit zone. — Ops 10-11
- [ ] [cass] Issue 05 picks: 5 of 6 fresh mods were leg/arm warmers; the builder has no category-diversity rule — if issue 06 clusters again, add a one-per-contentType cap in `buildWeeklyIssueData` (Tier 0). — Cass 10-11
- [ ] [cass] One synchronous 550 in issue 05; its hash goes on `sendExclusions.ts` after the ≥20 h DSN read (`mailbox-dsn-count.py --hashes --since 2026-10-11`); until then `--weekly` attempts 98, not 97. — Cass 10-11
- [ ] [ops] #260 is live: add `patreon_connect_optin_view` to the scoreboard capture-event filter so `patreon-connect-optin` shows in "Subscribers by source" once a row exists. — Cass 10-11
- [ ] Earlier open lines dated 09-24→10-07 are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-07" and § "Parked 2026-10-11"; owners pull from there. — Quinn 10-11

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
