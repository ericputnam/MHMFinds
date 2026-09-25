<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
# Ops — Platform & Reliability — Playbook

Your memory across runs. Append one dated entry per run, newest at the top,
**with a number**. Covers the runner, the ledger, deploy-verify, liveness
monitors, scheduled-task health, and the nightly compound pipeline.

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

_Seeded 2026-09-22 from Quinn's playbook: ledger/runner/monitor learnings
moved here because plumbing is now Ops's, not Quinn's. Full originals in
`archive/playbooks/quinn-2026-09.md` and the live `playbooks/quinn.md`._

## 2026-09-25 — E110
- Tried: deploy-verify ensure_promoted() promotes only forward — git merge-base --is-ancestor served vs candidate, createdAt fallback; newer served → SUPERSEDED row, production graded as served, exit 0; "can't tell what's serving" → no promote (T0, PR #174).
- Before → after: backwards promotions 1 (09-24, bedroom-cc 404 with a PASS row) → 0 expected; guard test 7/12 red on pre-fix main. Merged last of 7 today (06:50→07:16), 0 collisions under the dispatch merge order.
- Verdict: MORE DATA (read 2026-10-02: 0 `vercel promote` in logs/deploy-verify.log not preceded by "older than the new build").
- Next time: a promote is a write like a rollback; give it the same "unknown ≠ go" state. And gh pr merge exit 1 ≠ not merged hit again (#174), so fix the ship protocol before it costs a verify.

## 2026-09-24 — E101
- Tried: runner `cleanup()` waits for processes with cwd inside a worktree (lsof), SIGTERMs past 1800 s, leaves a tree whose process survives or cannot be enumerated; stale prune uses the same check (T0, PR #166).
- Before → after: worktrees deleted under a live process 1 (09-22 orphan) → 0 expected; new test fails 4/6 on pre-fix main.
- Verdict: MORE DATA (read 2026-10-01: `cleanup: reaped` on every run in `logs/funnel-daily.log`, 0 `left in place` without a follow-up).
- Next time: a behavioural test that extracts the real shell function beats a grep; and `gh pr merge --delete-branch` exit 1 ≠ not merged — read the PR state.

## 2026-09-23 — E91
- Tried: incident forensics for the 09-22 run (T0) + PR: `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS` exported in the runner (default 2 h), secondary-URL navigation retry in smoke-render, empty `check-blog-sidebar` → INCONCLUSIVE, curl failure → `[WARN]` + exit 2. Landed #147 + #142 rows and `incidents/2026-09-22-0655.md` on `main` via `ledger-commit.sh` before the PR.
- Before → after: runs killed at the 600 s ceiling 3 of the last 5 (09-18, 09-19, 09-22) → 0 expected; ledger rows on `main` for 09-22 morning merges 0 of 2 → 2 of 2; false-alarm rollbacks 1 (09-22 07:10, harmless: identical app code, functions.php re-push failed on a missing path).
- Verdict: MORE DATA (read on 2026-09-30: `grep -c "Background tasks still running" logs/funnel-daily.log` unchanged at 3, run success 14d ≥ 85%, 0 rollbacks whose "was" is a secondary-URL timeout or an empty blog check).
- Next time: the deleted-worktree orphan is the real lesson — `cleanup()` removes trees while children may run; and deploy-verify still runs whichever `smoke-render.ts` sits in the first tree with playwright (the operator tree's stale 7-target copy on 09-22). Both filed as `[ops]`.

## 2026-09-21
- Tried: five agents shipping in parallel with a 4-minute merge-serialization rule stated in the prompt; 7 PRs merged in 24 minutes (#130–#137), 5 of them Tier 0 site or script changes.
- Before → after: ledger rows 7 of 7 merges (all PASS, 5xx = 0), but `deploy-verify.sh` graded PASS against a build that did not contain the merged sha on 2 of 7 (#132 at 07:05, #136 at 07:09) — produ…
- Verdict: a post-merge check that matches a deployment by timing is decoration once merges overlap; the prose rule ("wait 4 min") was chained into the same command as `gh pr merge` by one agent and c…
- Next time: `deploy-verify.sh --after-merge` compares the alias build's sha to `origin/main` HEAD and promotes HEAD's build (Tier 0, 09-22); the serialization check becomes its own command that exits…

## 2026-09-20
- Tried: first digest to reach `main` since 09-16 — landed the operator's 09-17 "approve all #2 items" reply (stranded on two unmerged Quinn branches, `ce7c111` → `65e1756`), the 09-18/09-19 digest sk…
- Before → after: ledger rows on `main` for the 7 PRs merged 09-18/09-19: 1 of 7 → 7 of 7; experiments registered for them: 0 of 5 → 5 of 5; the operator's Tier 2 approval existed on `main`: no → yes.…
- Verdict: KEEP "paper trail first, merges second" — the skeleton + part-1 commit took 25 minutes and needed no agent; FIX the tool: the Edit tool is denied on every `.claude/` path in this session (6…
- Next time: when a stranded branch is based on an older `main`, never `git merge` it — `git checkout <branch> -- <file>` for report files, and reconcile the team registries by hand (main had rolled E…

## 2026-09-15
- Tried: the run that follows a budget-exhausted run (09-14 shipped 6 merges, 0 ledger rows, no digest). Backfilled the missing #101 ledger row, registered E46–E50, then ran today's five as normal: 4…
- Before → after: ledger rows per merge 0/6 (09-14) → 1/1 on every merge today; two 24h-veto items (#94, #96) resolved in the registry 1 day late instead of never.
- Verdict: KEEP (read on 2026-09-16: the daily PR must be the first thing merged after the agent PRs, not the last, so the digest survives even if the run dies)
- Next time: three of today's five agent moves were "the number the team was reading was wrong" (pinner 🟡 = threshold, not outage; paid-and-connected 0 of 35 is real, not an email artifact; issue #1 w…

## 2026-09-12
- Tried: eighth full loop on a green day (09-10 revenue +3.5%, RPM +9.2%, sessions −5.2%), first run to fire since 09-10 (09-11 never launched). First thing: verified Q7 by grepping `logs/funnel-daily…
- Before → after: runner fixes executed 0/4 (09-10) → 4/4 today; veto-expired PRs left unmerged 2 → 0; merges today spaced ≥4 min (07:27 / 07:32 / 07:39 / 07:43) → 4 distinct deployments, 4 ledger row…
- Verdict: KEEP re-validating a veto-expired PR on today's main before merging (both passed, but the base had moved 6 commits). KEEP the dispatch-prompt rule "leave experiments.md / operator-queue.md…
- Next time: (1) a 24h veto whose only executor is a job that can silently not fire is not a promise — check `gh pr list --state open` against the veto dates in operator-queue.md every run, first thin…

## 2026-09-10
- Tried: seventh full loop, green day (09-08 revenue +7.8% on RPM +14.9%, sessions −6.0%) — 5 of 5 agents returned complete move reports (0 rejected). Merged the T1 whose veto expired (#69 Pip pin rev…
- Before → after: runner fixes that actually executed 0/4 → still 0/4 until Q7 is done (the tracked copy and the prompt-from-`$WT` change ship in the daily PR); mid-run reinstalls 0 (but only because…
- Verdict: KEEP the ship protocol (7/7 merges verified, 0 rollbacks, 0 incidents this week); KEEP asking T1 agents to leave the two registry files to the daily PR — make it a dispatch-prompt rule tomo…
- Next time: (1) confirm Q7 by checking `logs/funnel-daily.log` for `prompt=` and the step-0d `operator-did` line — if absent, the stale copy ran again and the digest must say so; (2) the evening chec…

## 2026-09-09
- Tried: sixth full loop, green day — 5 of 5 agents reported with complete move reports (0 rejected); 4 T0 merges (#70 Cass CAN-SPAM guard, #71 Sage /llms-full.txt, #72 Rio churn read, #73 Nova ingest…
- Before → after: mid-run reinstalls 4 (09-07) → 2 (09-08) → **0** today; agent merges landed 06:51 / 06:55 / 06:59 / 07:01 — ≥4 min apart, 4 distinct deployments, 4 ledger rows 1:1 (vs 4 merges in 49…
- Verdict: KEEP central experiment IDs in the dispatch prompt (E26–E30 assigned, 0 collisions vs 2 agents claiming E15 on 09-07) and KEEP one ready-made priority order per agent — all five picked Quin…
- Next time: (1) check `vercel env ls production --cwd <operator tree>` (names only) before repeating any "N of M vars" line — Cass carried yesterday's 0/5 because her worktree is not Vercel-linked; (…

## 2026-09-08
- Tried: normal Tuesday loop on a green day — 7 merges through the ship protocol before 07:20 (#58 Quinn, #60 Pip, #59 Cass, #48 Sage T1-veto-expired, #62 Rio, #49 Cass T1-veto-expired, #61 Nova) plus…
- Before → after: post-rollback builds serving production 0/3 → 3/3 (06:50); after-merge PASS rows whose deployment == what `musthavemods.com` actually serves: 3/6 on 09-07 → 7/7 today. Same-day unfor…
- Verdict: KEEP (E25; read 2026-09-15 — 0 un-promoted READY builds >5 min in 7 days). Rule from today: a ledger PASS is only evidence about the deployment it checked; the row must name the deployment…
- Next time: (1) Rio merged a Tier 1 fix (#62) the same day instead of holding the 24h veto — right call for a one-line fix that makes an already-approved Tier 2 package (Q5) do what the approval said…
