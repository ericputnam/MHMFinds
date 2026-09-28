<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-09-28 — ON LINE run 2 of 2, re-weighting lifted
Sessions 28d 355,144 vs line 360,796 = 98.43%; revenue $5,996 vs $5,757 = 104.2%. Normal weighting; re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L

- [ ] [ops] `scripts/agents/pinner-liveness-lib.ts:337-345` — the writer flag returns 🔴 whenever runway <3 d regardless of writer liveness (09-23: "🔴 writer" while 48 rows/24h were inserted). Make it inflow-only (rows/day carrying a real `Post Date`) and threshold the *allotment* rows dated into the next 7 d, not the point-in-time count. — Pip, 2026-09-23
- [ ] [ops] `deploy-verify.sh` runs whichever `smoke-render.ts` sits in the first tree that has playwright, not `$ROOT`'s — an agent worktree with an older script can grade production. Use `$ROOT`'s script with `NODE_PATH` pointing at the playwright tree. — Ops, 2026-09-23
- [ ] [ops] runner step 1b (revenue-guardrail rollback path) should act only on exit **1**; exit 2 is "could not run", never a verdict. — Ops, 2026-09-23
- [ ] [ops] `funnel-context-budget.test.ts`: Rio reports rio.md sat at 14,012 B (cap 10,000) with the suite green until #158 trimmed it; `context-budget.ts` checks 26 files and does flag playbooks, so confirm the unit test iterates the same glob (not a hand-written list) and add a vacuity guard (≥7 playbooks found). Sage also hit the cap on sage.md (9,619 B) mid-run and could not append — Quinn logged Sage's rows. — Rio/Sage via Quinn, 2026-09-23
- [ ] [ops] incident template: every `reports/funnel/incidents/*.md` tells the fixer to "smoke the preview URL", which has never been executable here — previews are cancelled by the Ignored Build Step and sit behind SSO. Replace with "smoke `next start` of the fix build locally" (Nova, 09-24, #168→#171).
- [ ] [nova] `scripts/agents/page-rpm-lib.ts` `bucketFor`: add `'creator'` to `OTHER_APP_PREFIXES` so `/creator/*` (534 pages, E97) is bucketed as app pages, not blog (Nova, 09-24).
- [ ] [nova] after the E97 read (10-22): fold `NON_CREATOR_SLUGS` (7 platform "authors" excluded hub-only) into `isJunkAuthorSlug` so the leaf pages and sitemap agree with the hub (Nova, 09-24).

- [ ] [ops] runner: log `cleanup: stale-prune found 0` when STALE_WTS is empty so every run has a start-of-run reap row, not just at EXIT (today `cleanup: reaped` = 0 matches is expected: trap fires only when Quinn exits) — Ops 09-25
- [ ] [ops] `ownedAdds7d` (funnel-scoreboard.ts ~L879): Quinn decided 09-28 — report Patreon free members (+24/day) as a *third* owned-audience line on the scoreboard, not folded into the 120/wk target (no re-baseline). Cass 09-25 / Quinn 09-28.
- [ ] [ops] `funnel-scoreboard.ts` channel sessions: report each channel net of zero-pageview sessions (or carry `zeroPageviewSessions7d` per channel). E117: the whole `(not set)` landing slice (3,816/7d; Pinterest 2,327, Bing 868) has `screenPageViews = 0` and is 97% desktop — preview/prefetch noise inflating the Pinterest and Bing lines and the headline. `reports/funnel/not-set-audit-2026-09-26.md`. Pip, 09-26.
- [ ] [pip] pin-SEO board fit: 40 of 84 window rows fail only board fit after E103 (mean 88, ceiling without board moves); board reassignment is T1 (new-board territory). Also `--source hybrid` (keyword lead + writer's own sentence) to keep per-pin specificity. Pip, 09-25.
- [ ] [sage] hair-cc is indexed but not ranking (1 impr / 0 clicks 28d): needs inbound links from the male-long-hair / braids / short-hair blog posts — T2 package for the functions.php push process, not titles. Sage, 09-25.

- [ ] [sage] One-time IndexNow push of guides with the most Bing sessions over the last 28d (not just recent edits) as a separate test group vs E121's edit-driven group (T0, after the 10-04 read) — Sage, 09-27

- [ ] [nova] T2 package: creator outreach template (reports/funnel/drafts/creator-outreach-template-2026-09-28.md) for the top 20 creators by downloads, each row with its /creator/<slug>/ page and claim URL from E122 — the on-site ask cannot reach creators who never visit their page; template needs operator approval, sending is T1 at 20/week — Nova, 09-27

- [ ] [nova] scoreboard request (Ops/Quinn): add "claim submissions 7d" (ModSubmission.source='Creator Claim') and "pending creator profiles" (handle LIKE 'pending-%') next to creators onboarded, plus claim views (GA4 `/submit-mod/?creator=`), so E122/E129 read from the scoreboard, not a manual query — Nova, 09-27/28

- [ ] [nova] E12 read on 10-09 should be graded against 0/15 adopted W36–W38 and closed as KILL of the weekly head-term brief format (playbook 09-21); do not write W39/W40 packs unless the writer asks — the operating-model §5 line "weekly brief pack" is out of date with the 09-22 charter and should be amended to "monthly, on request" — Nova, 09-27

- [ ] [ops] `npx vitest run __tests__/unit/pin-*` in the Pip ship protocol matches no file (exit 1, empty log); the pin tests are `pinner-liveness.test.ts` and `rank-pin-destinations-lib.test.ts` — fix the protocol glob in the dispatch prompt / runner or rename. — Pip, 09-27

- [ ] [quinn/ops] Add `password_reset_complete`, `save_finds_signin_redirect`, `save_finds_after_signin` to the capture-events inListFilter in `scripts/agents/funnel-scoreboard.ts:237` so E123/E130 read from the scoreboard. — Cass, 09-27/28

- [ ] [cass] Put a mode=reset|invite param on the emailed /set-password link (lib/services/authEmail.ts) so E123 can split resets from invites; today it counts both. Links there also lack the trailing slash. — Cass, 09-27

- [ ] [rowan] Leftover room-theme rows typed `bathroom`(21)/`kitchen`(8)/`residential`(20)/`lot`(22)/`holidays`(6) — audit whether room-titled build sets belong in furniture/clutter, spot-check before any retag. — Rowan, 09-27

- [ ] [ops] E126 follow-ups: `funnel-scoreboard.ts:885` still writes `nonAdRevenueMonthlyGross: 0` when patreon/db fail (make null; digest/md headline read the 0); the end-of-run WT→operator changelog mirror in `run-funnel-daily.sh` is still exact-text (route via `--merge-local`); `funnel-history.ts` carries `nonAdMonthly` forward on days with no scoreboard JSON — null needs a dashboard-owner call. — Ops, 09-27

- [ ] [rowan] Guard `aiFacetExtractor.ts` contentType with `guardRoomTitledContentType` — its substring match over title+desc typed 74 of 76 E120 rows (the ingest guard in E132 covers only 2); own PR, whole-catalog dry run. — Rowan, 09-28
- [ ] [rowan] E132 fallback picks furniture where E120 pins say decor/clutter on 3 rows (bedding, 2 kitchen sets) — pins win; revisit only if a bedding/clutter title rule is proposed. — Rowan, 09-28
- [ ] [rowan] Catalog contentType NULL is back to 518 (3.13%) from 390 on 09-10 — title-only NULL retag pass over ingests since 09-10. — Nova, 09-28
- [ ] [rowan] Favorites have no page (no `/account/favorites` route; Navbar Heart `components/Navbar.tsx:161` is a `<button>` with no href/onClick) — 1,522+ accounts save mods they cannot see, so E130 promises only the stored favorite. Also `/mods/[id]` sets `isFavorited=false` regardless of session; hydrate from the API. — Cass, 09-28
- [ ] [rowan/cass] `/go` GA4 pageviews fell 342→175/wk (−49%) while `/mods/[id]` held 6,375→6,098; the member CTA ceiling is `/go` reach — what stopped sending users to `/go`? (E99 reads 10-01.) — Rio, 09-28
- [ ] [nova] Operator decision to package with the outreach template: should promoting a claim also set `User.isCreator` (unlocks creator surfaces)? Today promote changes the handle only. — Nova, 09-28
- [ ] [cass] `creator-page` and `creator-hub` email boxes have 0 `waitlist` rows ever (same class as E10) — account-offer rework or removal after E130's 10-12 read. — Cass, 09-28
- [ ] [sage] IndexNow dry run at 10:47Z found mods=0 while the runner at 10:35Z found 27 (exactly 27 every day since 09-26) — check the `fetchNewModIds` window and cap. — Sage, 09-28
- [ ] [rio] `patreon-churn-read.ts`, `patreon-relaunch-read.ts`, `operator-did-probe.ts` still call `patreonGet` with no signal — 30 s per-page timeout each; add a commented `PATREON_ENV_FILE` line to `env.example` (T0). — Rio, 09-28
- [ ] [ops] deploy-verify graded #201 INCONCLUSIVE because the check-blog-sidebar curl failed on the runner network while a hand run passed a minute later — retry the blog fetch once, with the smoke's network control, before writing INCONCLUSIVE. — Rio, 09-28
- [ ] [pip] "Pinterest sample truncated N days" counter on the pinner-liveness scoreboard (rate basis fell back to `queue-posted-14d` 4 mornings). — Pip, 09-28
- [ ] [pip] after 10-06: `pin-seo-audit.py --ids` over the 09-25/26/27 top-up ledgers (63 rows unrewritten) vs the 09-28 slice — treated/untreated split. — Pip, 09-28
- [ ] [ops] `scripts/agents/test_pin_runway_topup.py` was edited outside Pip's allowed-file list — add `scripts/agents/test_pin_*.py` to Pip's list in the dispatch. — Pip, 09-28
- [ ] [ops] Daily-run PRs #138 (09-21) and #190 (09-26) have no after-merge ledger row (#181, #198 do). After Quinn exits, the runner should write the row for today's daily PR via ledger-commit.sh — the row belongs to the step that sees the merge. — Ops, 09-28
- [ ] [ops] smoke-render `--collection <slug>` override (registry-checked) so an agent shipping a collection change can pass it to deploy-verify; the daily rotation may not render the page they changed. — Ops, 09-28
