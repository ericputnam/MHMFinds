<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-10-01 — ON LINE run 5, normal weighting
Sessions 28d 358,054 vs line 359,702 = 99.54% (09-02→09-29); revenue $6,134 vs $5,803 = 105.7%. Re-arms if a run reads <97%.

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — for a real P&L

- [ ] [ops] 6 monitor/plumbing requests filed 09-23→09-25 (§ "Parked 2026-09-29"), 5 filed 09-30 (§ "Parked 2026-09-30") 8 filed 09-27→09-29 (§ "Parked 2026-10-01") and 3 filed 09-25→09-29 (§ "Parked 2026-10-01 b", incl. the Nova scoreboard request and the E12 10-09 grading note) are parked verbatim in `archive/ideas-inbox-2026-09.md`; Ops pulls from there. — Quinn, 09-29/30/10-01
- [ ] [nova] after the E97 read (10-22): fold `NON_CREATOR_SLUGS` (7 platform "authors" excluded hub-only) into `isJunkAuthorSlug` so the leaf pages and sitemap agree with the hub (Nova, 09-24).

- [ ] [pip] pin-SEO board fit: 40 of 84 window rows fail only board fit after E103 (mean 88, ceiling without board moves); board reassignment is T1 (new-board territory). Also `--source hybrid` (keyword lead + writer's own sentence) to keep per-pin specificity. Pip, 09-25.
- [ ] [sage] hair-cc is indexed but not ranking (1 impr / 0 clicks 28d): needs inbound links from the male-long-hair / braids / short-hair blog posts — T2 package for the functions.php push process, not titles. Sage, 09-25.

- [ ] [sage] One-time IndexNow push of guides with the most Bing sessions over the last 28d (not just recent edits) as a separate test group vs E121's edit-driven group (T0, after the 10-04 read) — Sage, 09-27

- [ ] [cass] Put a mode=reset|invite param on the emailed /set-password link (lib/services/authEmail.ts) so E123 can split resets from invites; today it counts both. Links there also lack the trailing slash. — Cass, 09-27

- [ ] [rowan] Catalog contentType NULL is back to 518 (3.13%) from 390 on 09-10 — title-only NULL retag pass over ingests since 09-10. — Nova, 09-28
- [ ] [cass] `creator-page` and `creator-hub` email boxes have 0 `waitlist` rows ever (same class as E10) — account-offer rework or removal after E130's 10-12 read. — Cass, 09-28
- [ ] [pip] "Pinterest sample truncated N days" counter on the pinner-liveness scoreboard (rate basis fell back to `queue-posted-14d` 4 mornings). — Pip, 09-28
- [ ] [pip] after 10-06: `pin-seo-audit.py --ids` over the 09-25/26/27 top-up ledgers (63 rows unrewritten) vs the 09-28 slice — treated/untreated split. — Pip, 09-28

- [ ] [rowan] Correct: aiFacetExtractor wrote 2/76 E120 rows, not 74; 55/76 carry a CAS value in the old `category` field (Jan-2026 backfill, code deleted 01-20). A guard there changes 0 rows. — 09-29
- [ ] [rowan] 41 NULL rows since 09-10: 20 pumpkin recipes (no `food` rule; 13 "…Recipe" rows are gameplay-mod), 9 candles, 9 boats. Settle food vs gameplay-mod before adding a rule. — 09-29
- [ ] [rowan] /account/favorites/ caps at 200; 10 of 859 lists are larger (max 507). Paginate after the 10-07 read. — 09-29
- [ ] [cass] `SaveFindsOffer` tells signed-in non-savers to "Create a free account" — split copy by session status; link saved state to `/account/favorites/` once #223 merges. — 09-29
- [ ] [sage] IndexNow: print `newest_mod_age_h=` on the summary line so `mods=0` is falsifiable; optional `--since-last-run` dedupe. — 09-29
- [ ] [sage/nova] Who bumps `Mod.updatedAt` 685×/day with 0 creates? It inflates every updatedAt-sorted surface. catalog-ingest created 0 rows on 5 of 7 days (new mods 7d 50 vs 83). — 09-29
- [ ] [nova] TSR-only creators (8 of top 20): verify TSR messaging rules before batch 1 reaches those rows, else rank from 21+. — 09-29
- [ ] [rio] E60 unseen-remainder RPM $10.43→$8.74 (−16%) while its pv grew 26%: long tail under-earns — T2 ad-geometry candidate (SD-5) after the 10-01 E99 read. — 09-29
- [ ] [pip] 11848 (fall-decor-cc) was posted by top-up #4 before its scheduled day — irreversible; 1 extra early pin on that destination. — 09-29
- [ ] [quinn] E55 keep-rule cell is truncated in the live file and the archive — restore the full rule from PR #107's body. — Rio 09-29
- [ ] [nova] E151 (#237) closed the 09-30 isVerified line; premise was wrong — all 20 profiles were already verified, the gap was latent in the promote write. Deliberately not widened: promotion does not set User.isCreator (E137 package holds that decision) — Nova 10-01
- [ ] [ops] merge-gate contention: four agents (#237/#239/#241/#242) polled the same 240 s window; a 30 s poll lost three windows in a row, a 3 s poll won. The gate has no lock and `--wait` polls at 20 s — a lockfile or a claimed-slot (`MERGE_GATE_WHO`) would stop the hot-loop arms race — Nova 10-01
- [ ] [pip] Scoreboard: report "plugin rows posted/day" (151 in 8 d) beside runway; six top-ups never held runway above 2.44 d — top-ups are the wrong KPI for the floor. — Pip 09-30
- [ ] [quinn] Rio and Cass had Edit/Write on `.claude/agents/mhm-funnel/**` denied this run — pre-approve the paths in the runner, or keep routing paste text through the daily PR. — 09-30
- [ ] [quinn] Older `/api/cron/*` routes fail open when `CRON_SECRET` is unset (`if (cronSecret && …)`). One PR + scanner test over `app/api/cron/**`; pattern in #226. — Cass 09-30
- [ ] [sage] Catalog ingest stalled: 0 eligible mods (isNSFW=false, isVerified=true) created since 2026-09-26 10:42:55Z; DB 16,524 = live /sitemap-mods.xml 16,524. This explains IndexNow mods=0 and blocks every freshness read. Find out whether the scraper stopped or verification is backed up before any sitemap freshness move. — Sage, 10-01
- [ ] [sage] /sitemap-mods.xml force-dynamic (09-29 line) stays open, but only after ingest resumes: its read needs new mods. A DB failure must degrade to a 200 with no-store, never a 500. — Sage, 10-01
- [ ] [ops] Add `go_save_signin_redirect` and `go_save_after_signin` to the capture-events inListFilter in `scripts/agents/funnel-scoreboard.ts` so E152 reads from the scoreboard (with E130's two `save_finds_*` names). — Cass, 10-01
- [ ] [pip] rank-pin-destinations.ts writes its package to MHM_PROJECT_DIR (default the operator's main checkout), not cwd — 10-01's package landed there and was moved by hand. Default output to cwd/--out, or refuse when cwd ≠ PROJECT_DIR. — Pip, 10-01
- [ ] [ops] pytest not installed on the runner host — scripts/agents/test_pin_runway_topup.py cannot run (only --self-test does). — Pip, 10-01
- [ ] [rio] Impact `partner_performance_by_day` silently ignores `CAMPAIGN_ID` (filters: Brand/START_DATE/END_DATE/Show) — per-campaign reads must use `partner_performance_by_program` per window; E153 encodes this — 10-01
- [ ] [rio] `affiliate-daily-pulse.ts` hardcodes PROJECT_DIR to the operator tree and writes `reports/affiliates/daily/` uncommitted — not a record; wire `affiliate-pipe-read.ts` into morning step 0e after the 10-12 read (T0) — 10-01
- [ ] [rio] Item D residue: post 5848 has 27 `amzn.to` short links never resolved to a tag — inventory each before the Kadence-safe edit (T0, no prod write) — 10-01
- [ ] [rio] E153 at 1 on-site gtracing click/day reaches the 10-click floor ≈10-08; if 10-12 still reads NOT-YET, EXTEND E134 rather than KILL — the $0 clock has not started — 10-01
- [ ] [ops] Two PRs shared one graded head today though every merge was ≥240 s apart: Nova's #237 and Ops's #239 both graded 4e5a449 (rows 07:09). Build+verify outlasts the 240 s age gate. Proposal (T1): open the gate only once the previous non-ledger merge has its after-merge row on main. — Ops 10-01
- [ ] [ops] The lock only protects merges that run the new gate: Rio's #241 (old gate) merged 2 s after Ops's gate opened (07:01:15/17); GitHub rejected the second merge. Agents must check out merge-gate.sh + deploy-verify.sh from origin/main before merging; `funnel-daily-prompt.md` L24 still has the pre-gate chain — replace with Ops's 10-01 dispatch text (autonomy.md step 4). — Ops/Quinn 10-01
- [ ] [ops] Start-of-run prune logged "git worktree remove failed" 6 mornings in a row (09-26→10-01) for funnel-2026-09-22-21276{,-pip}: no longer worktrees, only reports/. Check for ledger rows that never landed, remove, count failures in the summary line. — Ops 10-01
- [ ] [ops] deploy-verify.log lives inside each agent's worktree and dies with it, so E110's log read cannot be checked; also write it to the operator's log path. — Ops 10-01
- [ ] [ops] CLAUDE.md standing rule still says "the gate is check-then-act with no lock" — nightly compound review should update it to the #239 lock contract. — Ops 10-01
- [ ] [rowan] E154 set 176 holidays rows to NULL (NULL 526→702): hand-typed `--ids=` pass next, rollback `reports/funnel/catalog-holidays-retag-2026-10-01.json`. Stale comments: `content-type-room-values-guard.test.ts` header still says holidays is NOT guarded; `lib/holidaysContentTypeRules.ts` says 386 rows (41.8%) — real 432 (46.8%) — and names the test `holidays-content-type-rules.test.ts` (real: `holidays-facet-rules.test.ts`). — Rowan 10-01
- [ ] [ops] `/games/[game]/[topic]` is fully static (generateStaticParams, no `revalidate`): a catalog data apply is invisible until the next deploy. Add `revalidate` or on-demand `revalidatePath` (Tier 1). — Rowan 10-01
- [ ] [ops] `__tests__/unit/play-page.test.ts` has 2 failures (smoke-render `/play` coverage) in files Rowan's diff did not touch — likely already red on `main`; confirm and fix or quarantine. — Rowan 10-01
