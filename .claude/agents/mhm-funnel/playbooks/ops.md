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

## 2026-09-30 — E148
- Tried: runner step `daily-pr-ledger` after Quinn exits — finds today's `funnel: daily run DATE (#N)` on origin/main, skips if main's ledger has an after-merge row (7-char commit, or `PR #N … daily run` label), else `deploy-verify --after-merge` from `$WT` with a `Quinn:` label; polls ≤600 s, fetch failure = UNKNOWN, in-flight verify = wait, never silent (T0).
- Before → after: daily PRs with a retroactive row 3 in 4 days (#190, #206, #224) → 0 expected; 9/9 tests red pre-fix. Real-data probe recognised #224/#206/#190 rows.
- Verdict: pending, read 2026-10-07 (`grep 'daily-pr-ledger:' logs/funnel-daily.log` every run; 0 retroactive daily rows).
- Next time: a row a later step "remembers" is a row that goes missing when that step is killed — put it in the step that outlives the session.

## 2026-09-29
E141: a runway override made the writer flag 🔴 on 6 of 7 mornings. On 09-29 it was 🔴 while the writer had inserted 20 rows in 24 h and 168 in 7 d. Re-graded with the inflow-only rule, the same 7 mornings give 0 🔴, 1 🟡 (09-24, 27.1 h since last insert) and 6 🟢. One flag should answer one question: depth belongs to assessRunway, inflow to assessWriterLiveness. PR #218 `4e8cbe9`, PASS 07:46; 4/36 tests red pre-fix. Ledger audit 7d: 73/73 merges on main have a row after a retroactive #190 row (`8835a89`); `check-pinner.sh` still carries the old override (inbox).

## 2026-09-28 — E133
- Tried: smoke-render renders 1 /games/sims-4/<slug>/ collection/run, rotated by UTC day over getCollectionsForGame('sims-4').map(collectionHref); expectations() grades anchors via AD_KINDS, not its own kind list; timeouts stay INCONCLUSIVE (T0, PR #200 c839ce7).
- Before → after: collection routes in the smoke 0/14 → 1/15 (vampire-cc 200, secondary=1, mv-ads=1, 7.3 s); smoke ≈59 s → ≈69 s; 7/11 new tests red on pre-fix main; after-merge verify PASS 07:21 with the new script. Run success 14d 10/14 (71.4%); ledger completeness since 09-21 67/69 (97.1%).
- Verdict: MORE DATA (read 2026-10-05: 1 collection per smoke JSON, ≥7 distinct slugs, 0 timeout-only rollbacks on it).
- Next time: ledger completeness since 09-21 is 67/69 — both gaps are Quinn's daily PRs (#138, #190); the row must come from the step that sees the merge, so make the runner write it after Quinn exits.

## 2026-09-27 — E126
- Tried: "section `ok:false` → null" in a pure `deriveScoreboardFields()`; ledger rows keyed by identity — strict (when, mode-word, commit) for `--flush-pending`, supersede (same mode-word + commit) for the new `--merge-local` that the runner seed step now calls; `--incident` asserts `YYYY-MM-DD-HHMMSS.md` (exit 64).
- Before → after: replaying the real operator changelog into main appended 2 → 0 duplicate rows (200 skipped); 09-26 `nonAdMonthly` 0 → null in the subprocess test; 3/6 + 3/4 new tests red pre-fix, 126/126 guard suites green. PR #194 `b8732d1`, verify PASS 07:24.
- Verdict: pending, read 2026-10-04 (0 dup rows and 0 null→0 across 7 morning runs; runner log shows `ledger: flush skipped N`).
- Next time: an exact-text dedupe is not idempotency once a human relabels or corrects a row on main — key on (when, mode, commit), and never let a stale tree bring back a row main already accounts for. Source still writes `nonAdRevenueMonthlyGross: 0` (`funnel-scoreboard.ts:885`) — queued.

## 2026-09-26 — E111
- Tried: deploy-verify grades on positive evidence only — smoke-render retries a navigation timeout on ANY target and an unsettled slow 200 on a fresh page (60 s goto / 40 s idle / 3× settle); an independent network control (google/vercel/cloudflare, 8 s cap, ≥2 of 3 in ≤4 s) before and after; a twice-timed-out page gets a direct fetch as tie-breaker; control degraded → whole smoke INCONCLUSIVE (network), `failed` empty, `fail_and_fix` refuses to roll back, `--check` exits 2 with a WARN row and no incident (T0, PR #186).
- Before → after: false-alarm rollbacks 2 in 5 days (09-22 sitemap timeout, 09-26 four ad-page timeouts + homepage at 1,788 of ≈9,600 chars after 27.8 s while Vercel CLI/Prisma/Pinterest all timed out from the host) → 0 expected; guard tests 21/29 red on pre-fix main (5 behavioural: real smoke()/fail_and_fix() under bash 3.2 with the CLI stubbed).
- Verdict: MORE DATA (read 2026-10-03: 0 rows `ROLLED BACK` whose "was" is only `HTTP no response` / `anchors missing` with text < settled floor; count of `INCONCLUSIVE (network)` rows — if > 2 in 7d the control thresholds are too tight, not the site).
- Next time: the 06:58 log line said "smoke INCONCLUSIVE" and rolled back anyway — an INCONCLUSIVE that lives in a note string is not a state; make it a variable the destructive branch checks first.

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

_Older entries (up to 2026-09-10) live verbatim in `archive/playbooks/ops-2026-09.md`; nothing deleted._
