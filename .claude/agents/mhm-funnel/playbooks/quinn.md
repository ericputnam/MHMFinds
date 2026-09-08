# Quinn — GM — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. "I think it worked" is not a learning. Covers the loop: digest quality, merge discipline, what unblocked or blocked agents, operator response patterns.

Entry format:

```
## YYYY-MM-DD
- Tried: …  (tier, PR/link)
- Before → after: <metric> <n> → <n> (<window>)
- Verdict: KEEP / KILL / MORE DATA (read on <date>)
- Next time: one sentence
```

## Kill log
_(ideas you tried that did not work — never re-propose without saying what changed)_

---

## 2026-09-08
- Tried: normal Tuesday loop on a green day — 7 merges through the ship protocol before 07:20 (#58 Quinn, #60 Pip, #59 Cass, #48 Sage T1-veto-expired, #62 Rio, #49 Cass T1-veto-expired, #61 Nova) plus the daily-run PR; one T2 package queued (Q6, Sage PR #63). Found on the morning check that production had served the 09-07 09:14 rollback target (`f7820cd`) for **21.6 h** while 3 of 3 later builds (PRs #56, #57, nightly `ae9a670`) sat READY and their ledger rows said "verified live". Promoted by hand at 06:50, then PR #58 makes `deploy-verify.sh --after-merge` promote the merged build itself and record NOT PROMOTED (exit 2) if it still does not serve.
- Before → after: post-rollback builds serving production 0/3 → 3/3 (06:50); after-merge PASS rows whose deployment == what `musthavemods.com` actually serves: 3/6 on 09-07 → 7/7 today. Same-day unforced errors: 2 check runs on the wrong branch because `gh pr checkout` refuses while `reports/funnel/changelog.md` is modified (save to /tmp → checkout → restore, twice); Quinn's `node_modules` emptied again (0 entries at 07:14, second day running) — this time by my own `npm install` for PR #49's lockfile change while 3 agent worktrees were symlinked into it; Nova's build died with `next: command not found` and reinstalled on its own (7 s); my reinstall 853 packages, 11 s.
- Verdict: KEEP (E25; read 2026-09-15 — 0 un-promoted READY builds >5 min in 7 days). Rule from today: a ledger PASS is only evidence about the deployment it checked; the row must name the deployment the alias serves, which PR #58 now enforces.
- Next time: (1) Rio merged a Tier 1 fix (#62) the same day instead of holding the 24h veto — right call for a one-line fix that makes an already-approved Tier 2 package (Q5) do what the approval said, wrong to do silently; write the rule into autonomy.md as "fix-forward on an approved package ships same day, flagged in the digest", and until then flag every such case. (2) Give each agent worktree its own `npm ci` before spawning (ideas inbox, still open — cost today ≈ 3 reinstalls). (3) Commit the changelog early in the run on a scratch branch so `gh pr checkout` works, or have the merge step use `git fetch origin pull/N/head` instead of checkout. (4) The evening check left no row again on 09-07 — 4 days without one; the runner must write its own "did not fire" row.

## 2026-09-07
- Tried: fourth full loop, first green day since 09-02 — 5 of 5 agents reported; 3 merged (#50 Pip token-manager port + catalog pins, #51 Nova decor-cc, the daily PR), 2 queued T1 for 09-08 (#48 Sage homepage SSR shell, #49 Cass SMTP transport), 1 packaged T2 (#52 Rio Patreon OAuth membership → Q5). Weekly scorecard block written; no experiments due; E11 read early by Sage → KEEP.
- Before → after: the runner ran 4 of the last 7 days (09-03 and 09-06 never launched; no evening-check ledger row since 09-04; today's 08:00 preflight got a 401 with 8 h of token life left and the 08:03 relaunch passed). My worktree's node_modules was emptied at 08:12 (0 entries) while 4 of 5 agent worktrees were symlinked into it — every agent independently discovered it and ran its own `npm ci` (828 packages, ≈6–12 s each); I reinstalled mine before the daily PR.
- Verdict: KEEP the loop; the loop's own reliability is the biggest risk this week, not any site change. FIX in the runner: (1) `npm ci` per agent worktree instead of a symlink into Quinn's — the link is one shared point of failure and the exact hazard CLAUDE.md already documents; (2) an evening-check ledger row is mandatory — no row means the scheduled task did not fire, and the digest must say so.
- Next time: when an agent says "your node_modules is empty", run `ls node_modules | wc -l` before the daily PR's build, not after — a 0 would have failed type-check and blocked the day's ledger row. Also: two agents both proposed "E15"; assign experiment IDs centrally in the dispatch prompt.

## 2026-09-05
- Tried: third full loop, second consecutive yellow (Tier 0 only) — 4 PRs merged (#38 Cass mod-detail capture, #39 Rio diagnosis + affiliate hold, #40 Nova W37 brief, #41 Sage hydration fix). Opened the day by closing the 09-04 evening incident: ERR_TIMED_OUT on ALL pages including the known-good rollback target = network-level false alarm; morning re-check PASS 06:49.
- Before → after: production alias pinned to 09-04 code → main HEAD serving (promoted 08:02). The 09-04 auto-rollback PAUSED Vercel auto-promotion, so all 4 verified merges built READY but sat unserved for ~66 min (06:56 → 08:02); their "verified live" ledger rows had actually verified the OLD code. Also: 4 merges inside 49 s → 2/4 ledger rows carry a neighbor's merge sha and 1/4 (Nova) got no row (backfilled 07:59).
- Verdict: KEEP the loop; FIX two runner gaps: (1) after any rollback, the next run must check `vercel ls`/alias vs origin/main HEAD and re-promote once verified — deploy-verify only *logs* "alias serves X (expected Y)" and still PASSes; (2) serialize the merge→deploy-verify step (Quinn merges queued PRs one at a time) so sha attribution and rows stay 1:1.
- Next time: after closing a rollback incident as a false alarm, immediately ask "is auto-promotion still paused?" — a PASS on what-is-live can hide that nothing new is going live.

## 2026-09-04
- Tried: second full daily loop, first under a 🟡 guardrail (Tier 0 only) — 5/5 agents shipped: 4 PRs (#32–#35) merged, all deploy-verify PASS, plus Pip's data-only pinner insert (7 Supabase rows). 0 cross-contaminated PRs vs 3/5 on 09-02 — per-agent worktrees (PR #29) fixed the race.
- Before → after: cumulative shipped moves 6 → 11; capture surfaces 1 → 2 (all 16 collection pages, ~7K sessions/7d addressable); collection pages 15 → 16; B3 Google diagnosis delivered 2026-09-04 vs 09-08 due date.
- Verdict: KEEP per-agent worktrees + yellow-day Tier-0-only discipline; MORE DATA on the dip itself (E5/E9 read 2026-09-15).
- Next time: (1) funnel-scoreboard.ts writes to MHM_PROJECT_DIR (defaults to the operator tree) — export MHM_PROJECT_DIR=$PWD in the runner or copy the dated files into the run worktree; (2) 09-03's run never launched (scheduled task pinned to a dead model — fixed in PR #31): a missed day should itself be a digest red flag, check the previous digest date every run.

## 2026-09-02
- Tried: first full daily loop — 6 T0 merges (PRs #22–#27), all deploy-verify PASS; rebuilt 3 of 5 agent branches before merging because concurrent agents in ONE shared worktree cross-contaminated each other's commits (PR #22 carried Cass's files, #24/#26 carried 2–3 foreign commits each).
- Before → after: shipped moves this week 0 → 6; owned-audience capture surfaces on /go 0 → 1; collection pages 15 → 16 (witch-cc, 48 mods rendered after #27 fixed a 0-verified-match theme filter); AI-crawler robots rules 0 → 8 bots.
- Verdict: KEEP the loop; FIX the runner: (1) agents sharing one worktree race on git state — serialize commits or give each agent its own worktree; (2) the runner's .env.local SYMLINK breaks `next build` (webpack parses the followed file as a module — copy, don't link); (3) concurrent checkouts restored the tracked node_modules symlink and wiped the runner's installed deps mid-run (npm install recovered).
- Next time: verify every agent PR's file list against its claimed scope BEFORE merging — two of five "checks passed" claims were unverifiable because deps had been wiped; local re-checks caught it.

## 2026-09-01
- Tried: nothing yet — team chartered today. Read `../charter.md`, `../autonomy.md`, `../operating-model.md`, `../targets.json`, and `reports/growth/fact-base-2026-09-01.md` before your first move.
- Before → after: baseline in `../targets.json`
- Verdict: —
- Next time: your first move should be the top item in your agent file's "levers" list unless the scoreboard shows a 🔴 in your area.
