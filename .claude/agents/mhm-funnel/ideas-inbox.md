<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-09-29 — ON LINE run 3, normal weighting
Sessions 28d 357,910 vs line 361,547 = 98.99% (08-31→09-27); revenue $6,061 vs $5,802 = 104.5%. Re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L

- [ ] [ops] 6 monitor/plumbing requests filed 09-23→09-25 are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-09-29"; Ops pulls from there. — Quinn, 09-29
- [ ] [nova] after the E97 read (10-22): fold `NON_CREATOR_SLUGS` (7 platform "authors" excluded hub-only) into `isJunkAuthorSlug` so the leaf pages and sitemap agree with the hub (Nova, 09-24).

- [ ] [ops] `ownedAdds7d` (funnel-scoreboard.ts ~L879): Quinn decided 09-28 — report Patreon free members (+24/day) as a *third* owned-audience line on the scoreboard, not folded into the 120/wk target (no re-baseline). Cass 09-25 / Quinn 09-28.
- [ ] [ops] `funnel-scoreboard.ts` channel sessions: report each channel net of zero-pageview sessions (or carry `zeroPageviewSessions7d` per channel). E117: the whole `(not set)` landing slice (3,816/7d; Pinterest 2,327, Bing 868) has `screenPageViews = 0` and is 97% desktop — preview/prefetch noise inflating the Pinterest and Bing lines and the headline. `reports/funnel/not-set-audit-2026-09-26.md`. Pip, 09-26.
- [ ] [pip] pin-SEO board fit: 40 of 84 window rows fail only board fit after E103 (mean 88, ceiling without board moves); board reassignment is T1 (new-board territory). Also `--source hybrid` (keyword lead + writer's own sentence) to keep per-pin specificity. Pip, 09-25.
- [ ] [sage] hair-cc is indexed but not ranking (1 impr / 0 clicks 28d): needs inbound links from the male-long-hair / braids / short-hair blog posts — T2 package for the functions.php push process, not titles. Sage, 09-25.

- [ ] [sage] One-time IndexNow push of guides with the most Bing sessions over the last 28d (not just recent edits) as a separate test group vs E121's edit-driven group (T0, after the 10-04 read) — Sage, 09-27

- [ ] [nova] scoreboard request (Ops/Quinn): add "claim submissions 7d" (ModSubmission.source='Creator Claim') and "pending creator profiles" (handle LIKE 'pending-%') next to creators onboarded, plus claim views (GA4 `/submit-mod/?creator=`), so E122/E129 read from the scoreboard, not a manual query — Nova, 09-27/28

- [ ] [nova] E12 read on 10-09 should be graded against 0/15 adopted W36–W38 and closed as KILL of the weekly head-term brief format (playbook 09-21); do not write W39/W40 packs unless the writer asks — the operating-model §5 line "weekly brief pack" is out of date with the 09-22 charter and should be amended to "monthly, on request" — Nova, 09-27

- [ ] [ops] `npx vitest run __tests__/unit/pin-*` in the Pip ship protocol matches no file (exit 1, empty log); the pin tests are `pinner-liveness.test.ts` and `rank-pin-destinations-lib.test.ts` — fix the protocol glob in the dispatch prompt / runner or rename. — Pip, 09-27

- [ ] [quinn/ops] Add `password_reset_complete`, `save_finds_signin_redirect`, `save_finds_after_signin` to the capture-events inListFilter in `scripts/agents/funnel-scoreboard.ts:237` so E123/E130 read from the scoreboard. — Cass, 09-27/28

- [ ] [cass] Put a mode=reset|invite param on the emailed /set-password link (lib/services/authEmail.ts) so E123 can split resets from invites; today it counts both. Links there also lack the trailing slash. — Cass, 09-27

- [ ] [rowan] Leftover room-theme rows typed `bathroom`(21)/`kitchen`(8)/`residential`(20)/`lot`(22)/`holidays`(6) — audit whether room-titled build sets belong in furniture/clutter, spot-check before any retag. — Rowan, 09-27

- [ ] [ops] E126 follow-ups: `funnel-scoreboard.ts:885` still writes `nonAdRevenueMonthlyGross: 0` when patreon/db fail (make null; digest/md headline read the 0); the end-of-run WT→operator changelog mirror in `run-funnel-daily.sh` is still exact-text (route via `--merge-local`); `funnel-history.ts` carries `nonAdMonthly` forward on days with no scoreboard JSON — null needs a dashboard-owner call. — Ops, 09-27

- [ ] [rowan] E132 fallback picks furniture where E120 pins say decor/clutter on 3 rows (bedding, 2 kitchen sets) — pins win; revisit only if a bedding/clutter title rule is proposed. — Rowan, 09-28
- [ ] [rowan] Catalog contentType NULL is back to 518 (3.13%) from 390 on 09-10 — title-only NULL retag pass over ingests since 09-10. — Nova, 09-28
- [ ] [cass] `creator-page` and `creator-hub` email boxes have 0 `waitlist` rows ever (same class as E10) — account-offer rework or removal after E130's 10-12 read. — Cass, 09-28
- [ ] [sage] IndexNow dry run at 10:47Z found mods=0 while the runner at 10:35Z found 27 (exactly 27 every day since 09-26) — check the `fetchNewModIds` window and cap. — Sage, 09-28
- [ ] [ops] deploy-verify graded #201 INCONCLUSIVE because the check-blog-sidebar curl failed on the runner network while a hand run passed a minute later — retry the blog fetch once, with the smoke's network control, before writing INCONCLUSIVE. — Rio, 09-28
- [ ] [pip] "Pinterest sample truncated N days" counter on the pinner-liveness scoreboard (rate basis fell back to `queue-posted-14d` 4 mornings). — Pip, 09-28
- [ ] [pip] after 10-06: `pin-seo-audit.py --ids` over the 09-25/26/27 top-up ledgers (63 rows unrewritten) vs the 09-28 slice — treated/untreated split. — Pip, 09-28
- [ ] [ops] `scripts/agents/test_pin_runway_topup.py` was edited outside Pip's allowed-file list — add `scripts/agents/test_pin_*.py` to Pip's list in the dispatch. — Pip, 09-28
- [ ] [ops] Daily-run PRs #138 (09-21) and #190 (09-26) have no after-merge ledger row (#181, #198 do). After Quinn exits, the runner should write the row for today's daily PR via ledger-commit.sh — the row belongs to the step that sees the merge. — Ops, 09-28
- [ ] [ops] smoke-render `--collection <slug>` override (registry-checked) so an agent shipping a collection change can pass it to deploy-verify; the daily rotation may not render the page they changed. — Ops, 09-28

- [ ] [rowan] Correct: aiFacetExtractor wrote 2/76 E120 rows, not 74; 55/76 carry a CAS value in the old `category` field (Jan-2026 backfill, code deleted 01-20). A guard there changes 0 rows. — 09-29
- [ ] [rowan] 41 NULL rows since 09-10: 20 pumpkin recipes (no `food` rule; 13 "…Recipe" rows are gameplay-mod), 9 candles, 9 boats. Settle food vs gameplay-mod before adding a rule. — 09-29
- [ ] [rowan] /account/favorites/ caps at 200; 10 of 859 lists are larger (max 507). Paginate after the 10-07 read. — 09-29
- [ ] [cass] `SaveFindsOffer` tells signed-in non-savers to "Create a free account" — split copy by session status; link saved state to `/account/favorites/` once #223 merges. — 09-29
- [ ] [quinn] E4 reads KILL at 1.49/1K but beats the site rate 1.30/1K — replace with an E130-style account offer, don't just drop it. — Cass 09-29
- [ ] [ops] `next.config.js` puts `public, s-maxage=60` on every `/api/*` incl. session-dependent GETs; locally it replaced a route's `no-store`. Limit to public GETs (Tier 2). — Cass 09-29
- [ ] [sage] IndexNow: print `newest_mod_age_h=` on the summary line so `mods=0` is falsifiable; optional `--since-last-run` dedupe. — 09-29
- [ ] [sage] `/sitemap-mods.xml` is ○ static: new mods reach it only on the next deploy — `force-dynamic` as E37 did (T0). — 09-29
- [ ] [sage/cass] `components/ModJsonLd.tsx:63` dateModified = updatedAt — same class as E136; switch to `modLastmod()`. — 09-29
- [ ] [sage/nova] Who bumps `Mod.updatedAt` 685×/day with 0 creates? It inflates every updatedAt-sorted surface. catalog-ingest created 0 rows on 5 of 7 days (new mods 7d 50 vs 83). — 09-29
- [ ] [nova] TSR-only creators (8 of top 20): verify TSR messaging rules before batch 1 reaches those rows, else rank from 21+. — 09-29
- [ ] [rio] Re-run the page-rpm snapshot after #217: blog-bucket RPM since 09-23 included /creator/* pageviews. — Nova 09-29
- [ ] [rio] /go GA4 page_view records ~40% of /go `render` users weekly (205/531, 134/408, 248/613); use `render` users as the /go denominator until explained. — 09-29
- [ ] [rio] E60 unseen-remainder RPM $10.43→$8.74 (−16%) while its pv grew 26%: long tail under-earns — T2 ad-geometry candidate (SD-5) after the 10-01 E99 read. — 09-29
- [ ] [ops] "Writer's own rows" needs a data-backed definition: `Wordpress Post ID` is on 100% of stranded and placeholder rows, so pinner-liveness-lib counts top-up rows as writer inflow (84 so far). Use E135's predicate. — Pip 09-29
- [ ] [pip] 11848 (fall-decor-cc) was posted by top-up #4 before its scheduled day — irreversible; 1 extra early pin on that destination. — 09-29
- [ ] [pip] Direct 7,196 (+35.7% WoW) is the biggest unexamined headline mover; segment by landing page / hour before it counts as growth. — 09-29
- [ ] [quinn] E55 keep-rule cell is truncated in the live file and the archive — restore the full rule from PR #107's body. — Rio 09-29
- [ ] [ops] `check-pinner.sh` step 2b (~L430) still has the runway→RED writer override that E141 removed from `pinner-liveness-lib.ts`; exit code unaffected, but message and label now disagree with the scoreboard. Mirror the inflow-only rule + parity test. — Ops, 09-29
