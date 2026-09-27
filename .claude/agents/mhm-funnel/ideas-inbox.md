<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

Moved 2026-09-27 → archive: Q14/Q15/B3 (owned, in queue); runner paper-trail, blog host 301, bs_cache purge, launchd fallback (T2 / operator checklist); Edit-denied `.claude/`, merge-gate contention, gh-merge exit-1 (practised, no change pending); closed cass callbackUrl (MOOT), rio E125 #196, sage E121 #192, cass E123 #191, ops E126 #194 (history null, --incident name).

## Operator watch 2026-09-27 — ON LINE (sessions), run 1 of 2
Sessions 28d 08-29→09-25: 353,874 vs line 361,681 = 97.84% (first ≥97% since 09-21; prior 8 runs 96.76–97.07%); revenue $5,941.05 vs $5,721.26 = 103.8%; GA4 7d +5.5%. Re-weighting (Pip/Sage two AUDIENCE moves, no non-AUDIENCE Tier 1) is a declinable *recommendation* today and lifts after a second run ≥97% (09-28). Fastest lever: pin inflow (Q11-b).

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — needed for a real P&L; add here when known

- [ ] [ops] `scripts/agents/pinner-liveness-lib.ts:337-345` — the writer flag returns 🔴 whenever runway <3 d regardless of writer liveness (09-23: "🔴 writer" while 48 rows/24h were inserted). Make it inflow-only (rows/day carrying a real `Post Date`) and threshold the *allotment* rows dated into the next 7 d, not the point-in-time count. — Pip, 2026-09-23
- [ ] [ops] `deploy-verify.sh` runs whichever `smoke-render.ts` sits in the first tree that has playwright, not `$ROOT`'s — an agent worktree with an older script can grade production. Use `$ROOT`'s script with `NODE_PATH` pointing at the playwright tree. — Ops, 2026-09-23
- [ ] [ops] runner step 1b (revenue-guardrail rollback path) should act only on exit **1**; exit 2 is "could not run", never a verdict. — Ops, 2026-09-23
- [ ] [ops] `funnel-context-budget.test.ts`: Rio reports rio.md sat at 14,012 B (cap 10,000) with the suite green until #158 trimmed it; `context-budget.ts` checks 26 files and does flag playbooks, so confirm the unit test iterates the same glob (not a hand-written list) and add a vacuity guard (≥7 playbooks found). Sage also hit the cap on sage.md (9,619 B) mid-run and could not append — Quinn logged Sage's rows. — Rio/Sage via Quinn, 2026-09-23
- [ ] [ops] incident template: every `reports/funnel/incidents/*.md` tells the fixer to "smoke the preview URL", which has never been executable here — previews are cancelled by the Ignored Build Step and sit behind SSO. Replace with "smoke `next start` of the fix build locally" (Nova, 09-24, #168→#171).
- [ ] [nova] `scripts/agents/page-rpm-lib.ts` `bucketFor`: add `'creator'` to `OTHER_APP_PREFIXES` so `/creator/*` (534 pages, E97) is bucketed as app pages, not blog (Nova, 09-24).
- [ ] [nova] after the E97 read (10-22): fold `NON_CREATOR_SLUGS` (7 platform "authors" excluded hub-only) into `isJunkAuthorSlug` so the leaf pages and sitemap agree with the hub (Nova, 09-24).

- [ ] [ops] runner: log `cleanup: stale-prune found 0` when STALE_WTS is empty so every run has a start-of-run reap row, not just at EXIT (today `cleanup: reaped` = 0 matches is expected: trap fires only when Quinn exits) — Ops 09-25
- [ ] [quinn] `ownedAdds7d` in `funnel-scoreboard.ts` (~L879) is email + accounts only; Patreon free members (+24/day, 5,673) are owned audience per the charter and excluded from headline #1. Decide: include as a third line (not folded into the 120/wk target without re-baselining). Cass, 09-25.
- [ ] [ops] `funnel-scoreboard.ts` channel sessions: report each channel net of zero-pageview sessions (or carry `zeroPageviewSessions7d` per channel). E117: the whole `(not set)` landing slice (3,816/7d; Pinterest 2,327, Bing 868) has `screenPageViews = 0` and is 97% desktop — preview/prefetch noise inflating the Pinterest and Bing lines and the headline. `reports/funnel/not-set-audit-2026-09-26.md`. Pip, 09-26.
- [ ] [pip] pin-SEO board fit: 40 of 84 window rows fail only board fit after E103 (mean 88, ceiling without board moves); board reassignment is T1 (new-board territory). Also `--source hybrid` (keyword lead + writer's own sentence) to keep per-pin specificity. Pip, 09-25.
- [ ] [sage] hair-cc is indexed but not ranking (1 impr / 0 clicks 28d): needs inbound links from the male-long-hair / braids / short-hair blog posts — T2 package for the functions.php push process, not titles. Sage, 09-25.

- [ ] [sage] Bound the IndexNow POST and key-file fetch with AbortSignal.timeout; today only the new WP read is bounded. A hung api.indexnow.org would stall runner step 0c2 (T0) — Sage, 09-27

- [ ] [sage] One-time IndexNow push of guides with the most Bing sessions over the last 28d (not just recent edits) as a separate test group vs E121's edit-driven group (T0, after the 10-04 read) — Sage, 09-27

- [ ] [nova] T2 package: creator outreach template (reports/funnel/drafts/creator-outreach-template-2026-09-28.md) for the top 20 creators by downloads, each row with its /creator/<slug>/ page and claim URL from E122 — the on-site ask cannot reach creators who never visit their page; template needs operator approval, sending is T1 at 20/week — Nova, 09-27

- [ ] [nova] admin review affordance: when approving a source='Creator Claim' submission, promote the claimant's pending-<slug>-… CreatorProfile.handle to <slug> and set isCreator in one action (/admin/creators + /api/admin/submissions; T0 admin-only code) — today it is two manual edits — Nova, 09-27

- [ ] [nova] scoreboard request (Ops/Quinn): add "claim submissions 7d" (ModSubmission.source='Creator Claim') and "pending creator profiles" (handle LIKE 'pending-%') next to creators onboarded, so E122 reads from the scoreboard, not a manual query — Nova, 09-27

- [ ] [nova] E12 read on 10-09 should be graded against 0/15 adopted W36–W38 and closed as KILL of the weekly head-term brief format (playbook 09-21); do not write W39/W40 packs unless the writer asks — the operating-model §5 line "weekly brief pack" is out of date with the 09-22 charter and should be amended to "monthly, on request" — Nova, 09-27

- [ ] [pip] pin-SEO × top-up ordering: the 21 E124 rows scored 0–50/100 on today's page-source audit (titles 39 chars, descriptions 418–650 chars) — revival rows go out with the weakest copy in the queue. Add a `--source page` copy pass *inside* `pin-runway-topup.py` (before the re-date, same ledger) so the treatment is part of the top-up and never contaminates an open read; needs `pin-seo-audit.py --ids FILE` mode (Tier 0). — Pip, 09-27

- [ ] [pip] top-up treadmill: 3 consecutive floor-triggered top-ups (09-25/26/27), each +0.57 d vs ~0.6 d/day drain; runway will be <2.0 d again 09-28. The standing approval holds the floor but cannot reach 3.0 d (hard_cap_21 bound all three days). Quinn: fold into Monday's Q11-b 7-day-rule re-pitch as the number. — Pip, 09-27

- [ ] [ops] `npx vitest run __tests__/unit/pin-*` in the Pip ship protocol matches no file (exit 1, empty log); the pin tests are `pinner-liveness.test.ts` and `rank-pin-destinations-lib.test.ts` — fix the protocol glob in the dispatch prompt / runner or rename. — Pip, 09-27

- [ ] [quinn/ops] Add 'password_reset_complete' to the capture-events inListFilter in scripts/agents/funnel-scoreboard.ts:237 so it shows on the scoreboard. — Cass, 09-27

- [ ] [cass] Put a mode=reset|invite param on the emailed /set-password link (lib/services/authEmail.ts) so E123 can split resets from invites; today it counts both. Links there also lack the trailing slash. — Cass, 09-27

- [ ] [cass] The mod-detail email box (E10) has had 0 waitlist rows in 22 days. Grade it KILL/REWORK and try a "save your finds" (account) offer next to the favorite button instead of a bottom-of-page email form. Same check for creator-page (0 rows since 09-23). T0. — Cass, 09-27

- [ ] [rio] `scripts/_patreon-auth.ts` persists refreshed tokens to `.env.local` in the *cwd*: a 401-triggered refresh from an agent worktree rotates the single-use pair in the worktree copy only and strands the operator's refresh token in the operator repo's `.env.local`. Refuse to refresh outside the operator repo, or write back to a path from env. T0, before the next monthly expiry. — Rio, 09-27

- [ ] [rio] `patreonGet()` takes no `AbortSignal`; E125 bounds the pre-read by racing, so a hung fetch is abandoned, not cancelled. Add an optional `init` with `AbortSignal.timeout(ms)` and use it from the scoreboard's `pullPatreonApi`, which walks the same ~12 pages unbounded. T0. — Rio, 09-27

- [ ] [rowan] Detector class rule: a row that passes isBedroomTitle/isKitchenTitle/isBathroomTitle must never get a CAS contentType at ingest. Own PR with a whole-catalog before/after diff; E120 hand-fixed 76 of these. — Rowan, 09-27

- [ ] [rowan] Leftover room-theme rows typed `bathroom`(21)/`kitchen`(8)/`residential`(20)/`lot`(22)/`holidays`(6) — audit whether room-titled build sets belong in furniture/clutter, spot-check before any retag. — Rowan, 09-27

- [ ] [ops] `deploy-verify.sh` smoke set still does not render a `/games/sims-4/*` collection route; Rowan curled three by hand today. — Rowan, 09-27

- [ ] [ops] E126 follow-ups: `funnel-scoreboard.ts:885` still writes `nonAdRevenueMonthlyGross: 0` when patreon/db fail (make null; digest/md headline read the 0); the end-of-run WT→operator changelog mirror in `run-funnel-daily.sh` is still exact-text (route via `--merge-local`); `funnel-history.ts` carries `nonAdMonthly` forward on days with no scoreboard JSON — null needs a dashboard-owner call. — Ops, 09-27
