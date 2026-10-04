<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-04 — ON LINE run 7, normal weighting
Sessions 28d 357,447 vs line 356,887 = 100.16% (09-05→10-02); revenue $6,052.22 vs $5,808.44 = 104.2%. Re-arms if a run reads <97%. (10-02 read: 99.89% / 105.7%, run 6.)

- [ ] [nova] approving a dashboard submission links the mod to the creator only by author name — no CreatorProfile exists for any real submitter (3/3). Next: create the profile on approval (Nova, 10-04).
- [ ] [nova] 338 accounts carry the creator flag, 3 have ever submitted — the next supply leak to classify (Nova, 10-04).
- [ ] [ops] `retag-junk-build-facets.ts --apply --rollback-out=<existing path>` overwrites a signed-off plan; extend the #250 write-once guard to applies (Rowan, 10-04).
- [ ] [rowan] after #259: pin Villa Amour Collection (outfit set, title word "villa") NULL — 1 row, dry run in `reports/funnel/catalog-e168-villa-amour-2026-10-04.json`; two hub top-20 mis-tags as furniture: "Functional Skincare Mod", "Mini Pochette Bags" (Sage, 10-04).
- [ ] [pip] tally top-up rows by the posting date they are scheduled for, not the run that wrote them — every date 09-27→10-03 carried 21 top-up rows (3× the 7/day limit) because the cap was per run (Pip, 10-04; tool fixed in #261).
- [ ] [ops] add `patreon_connect_optin_view` to the capture-events filter in `funnel-scoreboard.ts` once #260 merges; register `ref` as a GA4 custom dimension so `sign_up` splits by sending surface (Cass, 10-04).
- [ ] [sage] next hubs: top-level CC hub for "custom content"/"cc finds" (Tier 1, after red clears); retitle skin-details for "skin overlay"; IndexNow log should print the guide URLs it pushes; ingest resumed 10-04 (132 mods pushed) — `/sitemap-mods.xml` dynamic item unblocked (Sage, 10-04).
- [ ] [ops] E176: the runner refuses to exit while any PR merged today lacks an after-merge row — generalize `daily_pr_ledger` from "the daily PR" to `gh pr list --state merged --search "merged:>=$TODAY"`, run `deploy-verify --after-merge --sha <mergeCommit>` from `$WT` for each missing row (T1: runner step). Companion prompt rule: never `run_in_background` a deploy-verify in the final step — 10-03 #257's verify was the day's only background one and died with the CLI at 07:27:46 (no row, no daily PR, DID NOT FIRE). The stale merge lock was that exit's own chain; auto-broken 10-04 06:56, nothing deleted by hand (Ops, 10-04).
- [ ] [ops] persist `logs/deploy-verify.log` (or per-run smoke JSON) at the operator path — last written Sep 8, so E133 cannot be graded (Ops, 10-04).
- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L

- [ ] [ops] Earlier plumbing requests (09-23→10-01) are parked verbatim in `archive/ideas-inbox-2026-09.md` (§ Parked 2026-09-29 / 09-30 / 10-01 / 10-01 b); Ops pulls from there. — Quinn
- [ ] [nova] after the E97 read (10-22): fold `NON_CREATOR_SLUGS` (7 platform "authors" excluded hub-only) into `isJunkAuthorSlug` so the leaf pages and sitemap agree with the hub (Nova, 09-24).

- [ ] [pip] pin-SEO board fit: 40 of 84 window rows fail only board fit after E103 (mean 88, ceiling without board moves); board reassignment is T1 (new-board territory). Also `--source hybrid` (keyword lead + writer's own sentence) to keep per-pin specificity. Pip, 09-25.
- [ ] [sage] hair-cc is indexed but not ranking (1 impr / 0 clicks 28d): needs inbound links from the male-long-hair / braids / short-hair blog posts — T2 package for the functions.php push process, not titles. Sage, 09-25.

- [ ] [sage] One-time IndexNow push of guides with the most Bing sessions over the last 28d (not just recent edits) as a separate test group vs E121's edit-driven group (T0, after the 10-04 read) — Sage, 09-27

- [ ] [cass] Put a mode=reset|invite param on the emailed /set-password link (lib/services/authEmail.ts) so E123 can split resets from invites; today it counts both. Links there also lack the trailing slash. — Cass, 09-27

- [ ] [rowan] Catalog contentType NULL is back to 518 (3.13%) from 390 on 09-10 — title-only NULL retag pass over ingests since 09-10. — Nova, 09-28
- [ ] [cass] `creator-page` and `creator-hub` email boxes have 0 `waitlist` rows ever (same class as E10) — account-offer rework or removal after E130's 10-12 read. — Cass, 09-28
- [ ] [pip] "Pinterest sample truncated N days" counter on the pinner-liveness scoreboard (rate basis fell back to `queue-posted-14d` 4 mornings). — Pip, 09-28
- [ ] [pip] after 10-06: `pin-seo-audit.py --ids` over the 09-25/26/27 top-up ledgers (63 rows unrewritten) vs the 09-28 slice — treated/untreated split. — Pip, 09-28

- [ ] [rowan] 41 NULL rows since 09-10: 20 pumpkin recipes (no `food` rule; 13 "…Recipe" rows are gameplay-mod), 9 candles, 9 boats. Settle food vs gameplay-mod before adding a rule. — 09-29
- [ ] [rowan] /account/favorites/ caps at 200; 10 of 859 lists are larger (max 507). Paginate after the 10-07 read. — 09-29
- [ ] [sage] IndexNow: print `newest_mod_age_h=` on the summary line so `mods=0` is falsifiable; optional `--since-last-run` dedupe. — 09-29
- [ ] [nova] TSR-only creators (8 of top 20): verify TSR messaging rules before batch 1 reaches those rows, else rank from 21+. — 09-29
- [ ] [rio] E60 unseen-remainder RPM $10.43→$8.74 (−16%) while its pv grew 26%: long tail under-earns — T2 ad-geometry candidate (SD-5) after the 10-01 E99 read. — 09-29
- [ ] [nova] E151 (#237) closed the 09-30 isVerified line; premise was wrong — all 20 profiles were already verified, the gap was latent in the promote write. Deliberately not widened: promotion does not set User.isCreator (E137 package holds that decision) — Nova 10-01
- [ ] [pip] Scoreboard: report "plugin rows posted/day" (151 in 8 d) beside runway; six top-ups never held runway above 2.44 d — top-ups are the wrong KPI for the floor. — Pip 09-30
- [ ] [quinn] Rio and Cass had Edit/Write on `.claude/agents/mhm-funnel/**` denied this run — pre-approve the paths in the runner, or keep routing paste text through the daily PR. — 09-30
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [sage] /sitemap-mods.xml force-dynamic (09-29 line) stays open, but only after ingest resumes: its read needs new mods. A DB failure must degrade to a 200 with no-store, never a 500. — Sage, 10-01
- [ ] [ops] Add `go_save_signin_redirect` and `go_save_after_signin` to the capture-events inListFilter in `scripts/agents/funnel-scoreboard.ts` so E152 reads from the scoreboard (with E130's two `save_finds_*` names). — Cass, 10-01
- [ ] [pip] rank-pin-destinations.ts writes its package to MHM_PROJECT_DIR (default the operator's main checkout), not cwd — 10-01's package landed there and was moved by hand. Default output to cwd/--out, or refuse when cwd ≠ PROJECT_DIR. — Pip, 10-01
- [ ] [ops] pytest not installed on the runner host — scripts/agents/test_pin_runway_topup.py cannot run (only --self-test does). — Pip, 10-01
- [ ] [rio] Impact `partner_performance_by_day` silently ignores `CAMPAIGN_ID` (filters: Brand/START_DATE/END_DATE/Show) — per-campaign reads must use `partner_performance_by_program` per window; E153 encodes this — 10-01
- [ ] [rio] `affiliate-daily-pulse.ts` hardcodes PROJECT_DIR to the operator tree and writes `reports/affiliates/daily/` uncommitted — not a record; wire `affiliate-pipe-read.ts` into morning step 0e after the 10-12 read (T0) — 10-01
- [ ] [rio] E153 at 1 on-site gtracing click/day reaches the 10-click floor ≈10-08; if 10-12 still reads NOT-YET, EXTEND E134 rather than KILL — the $0 clock has not started — 10-01
- [ ] [ops] Two PRs shared one graded head today though every merge was ≥240 s apart: Nova's #237 and Ops's #239 both graded 4e5a449 (rows 07:09). Build+verify outlasts the 240 s age gate. Proposal (T1): open the gate only once the previous non-ledger merge has its after-merge row on main. — Ops 10-01
- [ ] [ops] Start-of-run prune logged "git worktree remove failed" 6 mornings in a row (09-26→10-01) for funnel-2026-09-22-21276{,-pip}: no longer worktrees, only reports/. Check for ledger rows that never landed, remove, count failures in the summary line. — Ops 10-01
- [ ] [ops] deploy-verify.log lives inside each agent's worktree and dies with it, so E110's log read cannot be checked; also write it to the operator's log path. — Ops 10-01
- [ ] [ops] CLAUDE.md standing rule still says "the gate is check-then-act with no lock" — nightly compound review should update it to the #239 lock contract. — Ops 10-01
- [ ] [rowan] E154 set 176 holidays rows to NULL (NULL 526→702): hand-typed `--ids=` pass next, rollback `reports/funnel/catalog-holidays-retag-2026-10-01.json`. Stale comments: `content-type-room-values-guard.test.ts` header still says holidays is NOT guarded; `lib/holidaysContentTypeRules.ts` says 386 rows (41.8%) — real 432 (46.8%) — and names the test `holidays-content-type-rules.test.ts` (real: `holidays-facet-rules.test.ts`). — Rowan 10-01
- [ ] [ops] `/games/[game]/[topic]` is fully static (generateStaticParams, no `revalidate`): a catalog data apply is invisible until the next deploy. Add `revalidate` or on-demand `revalidatePath` (Tier 1). — Rowan 10-01
- [ ] [rio] WATCH trigger (09-30 yellow = demand-side: fill 68→52%, CPM −7%, pages/session up): 10-03 read finalized 10-01+10-02 Mediavine cpm, imp/pv, fill; if both <90% revenue with imp/pv <10.0 → ESCALATE and pull Pip's E81 host read forward from 10-05. — Rio 10-02
- [ ] [cass] B1 coverage gap is WordPress-only: 19 single posts (25.4% of sessions) + `/category/*` (2.5%) carry no capture surface; every Next.js page >1% is covered. Next run: draft the Tier 2 package (end-of-post module in functions.php, outside `.mv-ads`/`#secondary`, CRITICAL_MARKERS + check-blog-sidebar curl). — Cass 10-02
- [ ] [nova] E158 follow-up (T0, `app/api/admin/creator-claims/[id]`): promote returns 409 for a real claimant of the 8 seed-held handles — rename the placeholder holder to `seed-<handle>` in the same `$transaction`, planner test, security:check-admin-auth. — Nova 10-02
- [ ] [cass] `__tests__/components/ModDetailPage.test.tsx` "toggles favorite state…" is red on main (pre-existed #244/#247): after the click no button named /favorited/i appears; suspect #219 (E138 `useModFavoriteState`). Fix the mock or the optimistic update. — Ops 10-02
- [ ] [ops] merge-gate `--max-wait 600` expired once today behind Pip → Nova → Cass (4 concurrent T0 agents at 240 s spacing); make `--max-wait 900` the ship-protocol default. Also: a stale lock from a crashed worktree cost one agent a wait — confirm the owner-exit path frees it. — Sage/Pip 10-02
- [ ] 22 more 10-02 lines (Rio ×3, Cass ×2, Nova ×5, Sage ×4, Pip ×2, Ops ×1) are parked verbatim in `archive/ideas-inbox-2026-09.md` § "Parked 2026-10-02". — Quinn 10-02
- [ ] [rowan] URL category overrides the title in `saveModsToDatabase` (`detectContentTypeFromUrl(sourceUrl) || detectContentType(…)`, `mhmScraperUtils.ts:184`): `/sims-4-fall-cc-clothes/` → `tops` on 20/20 rows, 5 title-supported; and the `lot` rule still reads title+description (a basket typed `lot` via "farmhouse builds" prose). Rule to test: confident CAS title beats URL; `lot` → title-only, dry-run ADD/STRIP over the 1,439-row facet first. 17/117 (14.5%) of E161 day-1 rows were wrong from these two rules. — Rowan 10-02
- [ ] [ops] `/sitemap-mods.xml` listed 16,641 locs at 07:16 local vs DB 16,678 — cache lag (`s-maxage`) or a filter; confirm it reads 16,678 tomorrow before "DB = sitemap" is used as an ingest-health check again. — Rowan 10-02
