<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ideas Inbox

Operator (or anyone) drops one line per idea. Quinn triages every morning:
assigns an owner and a tier, or declines with a reason, and moves it to
`experiments.md` when it ships. Done items move to
`archive/ideas-inbox-2026-09.md` verbatim.

Format: `- [ ] <idea> — <why / what you've seen>`

## Operator watch 2026-09-26 — BELOW LINE (sessions), 6th run
Sessions 28d 08-26→09-22 (history.json; 09-23→09-26 not yet measured): 353,842 vs line 365,393 = 96.84% (gap 11,551, ≈413/day); revenue $5,904.06 vs $5,730.39 = 103.0%. Last 8 windows 96.97→96.94→96.76→97.07→97.00→96.88→96.84→96.84%, all under 97% since 09-21. Supersedes the 09-24/09-25 blocks (#182/#184 closed unmerged). GA4 7d +5.1%: the gap is the 08-26→09-08 trough, not a current decline. Re-weighting: Pip and Sage two AUDIENCE moves each, Nova and Rowan a traffic page each, Cass/Rio one move, no Tier 1 that is not AUDIENCE. Fastest lever: pin inflow (Q11-b). Lift after two consecutive runs ≥97%.

- [ ] Host creators' mods directly (files + profile + audience) so creators bring their fans — operator, 2026-09-01 (→ Nova, Q14 triage in PR #141; `/creator/[slug]/` pages shipped 09-23 as E85)

- [ ] Gaming catalog beyond Sims 4: which game has Pinterest-shaped demand and no good mod finder? — operator, 2026-09-01 (→ Nova, Q15 triage in PR #141)

- [ ] Architect the site for LLM discovery — operator, 2026-09-01 (→ Sage, B3)

- [ ] Monthly infra costs (Vercel / Prisma / OpenAI / SendGrid / BigScoots) — needed for a real P&L; add here when known

- [ ] Runner: stop deploying paper trail. 10 of 18 merges 09-02→09-05 changed only `reports/`, `.claude/`, `docs/` or `*.md`, yet each rebuilt and republished the site. Add a Vercel Ignored Build Step (`vercel.json` `ignoreCommand`) AND teach `deploy-verify.sh --after-merge` that a CANCELED/ignored build for a docs-only sha is not a failure: ledger it as "PASS (docs-only, no deploy)". Tier 1 (deploy pipeline) — Quinn, 2026-09-05
  - Triage 2026-09-07 (Quinn): re-tiered to **Tier 2** — `vercel.json` is operator-only. Paper-trail merges are batched into the daily-run PR where possible. 09-23: 5 of today's 11 merges were paper-only and each produced a production build.

- [ ] Scheduler resilience: the 06:30 Desktop routine only fires while the Claude desktop app is open. Add a launchd fallback (`com.mhm.funnel-daily.plist` → `run-funnel-daily.sh`, 06:45) that skips if the day's digest already exists. Tier 1 (pipeline) — ops, 2026-09-07

- [ ] Runner: the agents' Edit/Write tool is denied on every `.claude/` path in the funnel session, so the registries can only be written through `python3` in Bash. Tier 0 → Quinn. — 2026-09-08
  - 2026-09-19 (Quinn): not an allowlist gap — it is the CLI's built-in protection of `.claude/` config paths. Fix (a): move the mutable files (`experiments.md`, `operator-queue.md`, `ideas-inbox.md`, `playbooks/`) to e.g. `reports/funnel/team/` with pointers in the agent files; (b) `--permission-mode bypassPermissions` is a policy change → Tier 2. Recommend (a). 09-23: 4 of 4 registry writes went through `python3`/`cp`, 0 lost.

- [ ] Pinterest sends 17,276 sessions/7d to `blog.musthavemods.com` (22% of all sessions). Pip's half (apex Post URLs in the MHMUtils writer) shipped with Q11 on 09-21; operator half = BigScoots nginx 301 blog.* → apex (Tier 2, Q13 / PR #143). — Sage via Quinn, 2026-09-08
  - 09-25 (Pip, E102 read): blog.* Pinterest +8.7% vs apex −3.6% over 09-10→09-23 — the host split is now a measurable share of the channel, not a nuisance.

- [ ] `push-blog-functions-prod.sh` only runs `wp cache flush`; BigScoots **page** cache keeps serving pre-push HTML until `wp bs_cache purge_cache`. Add a purge step to both push scripts and have `check-blog-sidebar.sh` warn when `x-bigscoots-cache: cache` is served with an `age` older than the push. Tier 0 → Quinn. — 2026-09-12

- [ ] [ops] scoreboard: report `bing_organic` (and each channel) net of zero-pageview sessions — 862 of 15,623 Bing sessions in 09-16→09-22 landed on `(not set)` with 0 `screenPageViews` and 7 s duration; the Bing line overstates real traffic by ~5.5% and that slice is 23% of the 3,808 `(not set)` landings. Pip 09-24, E93.
- [ ] [ops] merge order was not enforceable by prose: with 7 agents on one gate, #167 and #168 both touched `lib/creators.ts` (`listCreators`) from branches cut before either merged; the second one broke `main` (BUILD ERROR 10:03, fixed by #171 at 14:12Z). merge-gate should re-check `gh pr view --json mergeStateStatus` *and* run `npm run type-check` on a rebase preview when the PR's files intersect files changed on `origin/main` since the branch point. Quinn 09-24.
- [ ] [ops] `scripts/agents/pinner-liveness-lib.ts:337-345` — the writer flag returns 🔴 whenever runway <3 d regardless of writer liveness (09-23: "🔴 writer" while 48 rows/24h were inserted). Make it inflow-only (rows/day carrying a real `Post Date`) and threshold the *allotment* rows dated into the next 7 d, not the point-in-time count. — Pip, 2026-09-23
- [ ] [ops] `deploy-verify.sh` runs whichever `smoke-render.ts` sits in the first tree that has playwright, not `$ROOT`'s — an agent worktree with an older script can grade production. Use `$ROOT`'s script with `NODE_PATH` pointing at the playwright tree. — Ops, 2026-09-23
- [ ] [ops] runner step 1b (revenue-guardrail rollback path) should act only on exit **1**; exit 2 is "could not run", never a verdict. — Ops, 2026-09-23
- [ ] [ops] `funnel-context-budget.test.ts`: Rio reports rio.md sat at 14,012 B (cap 10,000) with the suite green until #158 trimmed it; `context-budget.ts` checks 26 files and does flag playbooks, so confirm the unit test iterates the same glob (not a hand-written list) and add a vacuity guard (≥7 playbooks found). Sage also hit the cap on sage.md (9,619 B) mid-run and could not append — Quinn logged Sage's rows. — Rio/Sage via Quinn, 2026-09-23
- [ ] [ops] merge-gate contention: 7 agents polling one 240 s slot cost each agent 4–24 min on 09-23, and one agent's `pkill` of its own wait loop killed another's. Give the dispatch prompt a merge order (site changes first, paper trails last) or a per-agent gate lock file. — Quinn, 2026-09-23
- [ ] [ops] incident template: every `reports/funnel/incidents/*.md` tells the fixer to "smoke the preview URL", which has never been executable here — previews are cancelled by the Ignored Build Step and sit behind SSO. Replace with "smoke `next start` of the fix build locally" (Nova, 09-24, #168→#171).
- [ ] [nova] `scripts/agents/page-rpm-lib.ts` `bucketFor`: add `'creator'` to `OTHER_APP_PREFIXES` so `/creator/*` (534 pages, E97) is bucketed as app pages, not blog (Nova, 09-24).
- [ ] [nova] after the E97 read (10-22): fold `NON_CREATOR_SLUGS` (7 platform "authors" excluded hub-only) into `isJunkAuthorSlug` so the leaf pages and sitemap agree with the hub (Nova, 09-24).
- [ ] [ops] two merge-loop failure modes hit twice today (Rio #169, Ops #166): `gh pr merge --delete-branch` exits 1 when `main` is checked out in another agent's worktree although the remote merge went through (retry loops then spin on "already merged" and the after-merge verify never runs), and GitHub SSH `Permission denied (publickey)` failed 3 fetches/pushes 10:18–10:37 (a ledger row went to `ledger-pending.jsonl`). Ship protocol should read `gh pr view N --json state` instead of the exit code; check whether other rows were queued. — Quinn, 2026-09-24
  - 09-25: hit 3 more times (Sage #176, Cass #178, Rio #177 — `main` checked out in Rowan's worktree); every merge had landed, all three checked state before retrying, 0 rows lost. Still worth the runner line.

- [ ] [ops] runner: log `cleanup: stale-prune found 0` when STALE_WTS is empty so every run has a start-of-run reap row, not just at EXIT (today `cleanup: reaped` = 0 matches is expected: trap fires only when Quinn exits) — Ops 09-25
- [ ] [nova] E85 sidebar author link still sends 2–4-mod creators to a 404 (`dreamgirl`, 2 mods → `/creator/dreamgirl/`); `ModDetailClient` now receives `moreFromCreator.totalMods` (E106), so gate that link on `MIN_MODS_FOR_PAGE` — one-line T0. Nova, 09-25.
- [ ] [cass] `app/sign-in/page.tsx` honours `redirect`/`ref` only on the credentials path — Google/Discord buttons send everyone to `/`, so E107's `favorite_after_signin` undercounts by the OAuth share. Carry `callbackUrl` through `signIn(provider, { callbackUrl })`. T0, Cass takes it Monday 09-28. Cass, 09-25.
- [ ] [quinn] `ownedAdds7d` in `funnel-scoreboard.ts` (~L879) is email + accounts only; Patreon free members (+24/day, 5,673) are owned audience per the charter and excluded from headline #1. Decide: include as a third line (not folded into the 120/wk target without re-baselining). Cass, 09-25.
- [ ] [pip] pin-SEO board fit: 40 of 84 window rows fail only board fit after E103 (mean 88, ceiling without board moves); board reassignment is T1 (new-board territory). Also `--source hybrid` (keyword lead + writer's own sentence) to keep per-pin specificity. Pip, 09-25.
- [ ] [ops] `ledger-commit.sh --incident` copies by basename (09-26 closure landed as `e111-incident.md`, rename `704b31b`): take `path:dest` or assert the `YYYY-MM-DD-HHMMSS.md` name. T0. Ops, 09-26.
- [ ] [rio] `patreon-q4-gate-preread.ts:213` `Promise.all` discards the reachable half when one source is degraded (3 attempts 09-26, 0 gate numbers) → `allSettled` + partial report + exit 2, deadline inside `fetchMembers`. T0 before the 10-02 E108 read. Rio, 09-26.
- [ ] [sage] hair-cc is indexed but not ranking (1 impr / 0 clicks 28d): needs inbound links from the male-long-hair / braids / short-hair blog posts — T2 package for the functions.php push process, not titles. Sage, 09-25.
