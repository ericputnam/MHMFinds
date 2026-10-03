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

## 2026-10-03 — E169
- Tried: revenue-guardrail pages `vercel ls --next` until a READY prod deploy older than the window start (or API exhausted; cap 30 pages / 240 s), prints `vercel coverage: COMPLETE|TRUNCATED (…)`; TRUNCATED → in-window UNKNOWN → `investigate` + `actionDetail: vercel coverage unknown`. Pure lib `revenue-guardrail-lib.ts`, 18 tests on a real 10-page replay. HELD-RED (T0).
- Before → after: 10-03 RED-RPM saw 1 page (20 rows, oldest 10-02 06:55 > window 09-28 00:00) → 0 of 114 in-window deploys, `investigate`; fixed: 200 rows / 10 pages / 12.5 s, COMPLETE, `rollback` → lr7rk0e3o (91866e4). Pre-fix: all 18 red (no lib), 3 wiring red with lib; 4 mutations each red.
- Verdict: pending, read 10-10 (7/7 coverage lines, 0 TRUNCATED-without-UNKNOWN).
- Next time: any "is X in the window" read off a paged API needs a coverage grade before its answer can drive an action — `action` stays one word because the runner `read -r`s it.

## 2026-10-02 — E162
- Tried: replacing a whole-object-literal source match (`{ path: '/play/', kind: 'game' }`) in `play-page.test.ts` with a field-level parse, plus an import of the real constant (`AD_KINDS`); the gated merge chain into `funnel-daily-prompt.md` L24 (10,777 → 10,985 B of 12,000). PR #244 `c3cce17`, verify SUPERSEDED-PASS 06:46. CLAUDE.md 100 B trim (60,077 → 59,977) handed to Quinn's daily PR under the one-merge cap.
- Before → after: main red 6 days (since #186 on 09-26) with ~30 merges past it; failing files 3 → 2 (→ 1 with the CLAUDE.md trim; `ModDetailPage.test.tsx` left, a behaviour failure → Cass). 4 of 4 one-line mutations still turn the test red. E110 graded KEEP: 93 ledger rows 09-25→10-02, 5 SUPERSEDED (correct), 0 backward promotions.
- Verdict: KEEP (read 10-05).
- Next time: when a source-guard test asserts a literal, ask which field it actually protects, and run the full `npx vitest run` before every Ops merge, not just the targeted suites.

## 2026-10-01 — E155
- Tried: merge-gate mkdir lock in the git common dir, held through the caller's `&&` merge (frees on merge landing / shell exit / TTL ≤600 s); deploy-verify refuses a `PR #N` label not MERGED (T0, #239).
- Before → after: PRs graded on one head 3 (09-30) → 0 expected; 15/20 tests red pre-fix. E101 KEEP.
- Verdict: pending, read 10-08.
- Next time: key a lock to the caller's shell pid, not a TTL alone.

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

_Older entries (up to 2026-09-24) live verbatim in `archive/playbooks/ops-2026-09.md`; nothing deleted._
