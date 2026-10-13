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

## 2026-10-13 — E201
- Tried: deploy-verify grades an own-build ERROR/CANCELED only after waiting ≤20 m for a READY build that contains the sha (ancestry) with no app file changed (`same_code`: reports/, docs/, logs/, .claude/, *.md exempt); a `build-watch` row lands first so its ledger commit is the proving build on the day's last merge. Found → `BUILD ERROR (platform) → READY via <sha7> · <verdict>`, no incident; the path never rolls back or re-pushes functions.php. (T0)
- Before → after: 10-12 false BUILD ERROR incidents 2 of 2 ERRORs (4fd20fd, 817064a), each "No Tier 1 merges" until Quinn closed it by hand. New test 13 cases, 9 red on pre-fix main (4 green = old-behaviour controls). The first draft read `$PLATFORM_RES` bare and broke the E111 "positive evidence still rolls back" test under `set -u`. Caught by the existing suite, fixed with `${…:-}`.
- Verdict: MORE DATA (read 2026-10-20).
- Next time: grade on a READY build of the same code, never on the absence of a log. Every new global a helper reads needs `${X:-}`, because the tests extract helpers standalone.

## 2026-10-12 — E194
- Tried: preflight watch (T0): stderr to its own `logs/funnel-preflight-DATE.stderr` (redacted tail = excerpt); a wall-clock watcher in the runner's poll loop kills the CLI tree at 300 s (TERM, CONT, KILL — a stopped process ignores TERM) → `HANG`; poll gaps > 30 s summed as `asleep/suspended=Ns`; `preflight: start` and `preflight: rc=…` lines every run.
- Before → after: 2 of 5 MISSED mornings (10-08, 10-10) were 0-byte preflights diagnosed OTHER, no excerpt, hung ~2.5 d. New test 7/7 red on the pre-fix block (the SIGSTOPped CLI hung until the test's 25 s kill), 7/7 green after.
- Verdict: MORE DATA (read 2026-10-19: every preflight-failure morning names HANG/AUTH/CLI_TOO_OLD or quotes stderr; 0 hangs > 300 s wall without a `hang=1` line).
- Next time: a timeout that lives inside the process it times out shares that process's fate — put the clock in the caller and measure its gaps.

## 2026-10-07
- Tried: E176 — per-day runner lock (atomic mkdir, holder pid, dead-holder break, released by the exit trap after the reap); PR #271 `983a046`, PASS 07:25. New test 7/7 red on the pre-fix runner. Landed MISSED rows for 10-05 and 10-06 via `ledger-commit.sh` plus incident `2026-10-05-063000.md`.
- Before → after: 2 runner starts + 1 duplicate Quinn on 10-07 → read 10-14 (1 `owns` line per morning, 0 second Quinns). Root cause of the two missed days was the host, not the runner: lid closed on battery 10-05 03:31 MDT, no full wake until 10-07 06:50; the app also still reads the `30 6 * * *` schedule in Eastern (= 04:30 MDT). E148 read: 4/4 daily PRs got same-morning rows from Quinn's verify, but 10-04 was a false DID NOT FIRE — the step matches the subject exactly (`funnel: daily run DATE`) and #264 was scoped `funnel(quinn): …`.
- Verdict: E176 MORE DATA (read 2026-10-14); E148 MORE DATA (fix the subject match first).
- Next time: a "did not fire" row needs the host's power log before it blames the job — `pmset -g log` showed the sleep in one line; and a scheduler limit that counts live *sessions* will double-start a *runner* the moment a stale session ends.

## 2026-10-04 — E169-b
- Tried: bound on the guardrail's automatic rollback (amends #255, HELD-RED, T0): `rollback` only if in-window production deploys ≤ 24 AND the READY target is ≤ 48 h before the window start; else `investigate` + detail + a "rollback withheld" reason, `rollbackCandidate` in the JSON. Bound from the ledger: after-merge rows/day 09-21→10-03 median 8, p90 12, max 17, ×2 deploys per merge; real Vercel 09-28→10-02 = 42/21/29/22/22 deploys/day. 10 new tests, 9/28 red pre-change, 4 mutations each red.
- Before → after: live 10-04 read: #255 as written → `rollback` to 5qn2heb7w (94 deploys, 5 days, for a Mediavine-side drop); bounded → `investigate (in-window deploys 94 exceed rollback bound 24)`, 12 s. 10-03 early exit: #257's verify was the day's only `run_in_background` deploy-verify (07:26:38); Quinn `end_turn` 07:27:40 "as soon as it reports", CLI gone 07:27:46 → no row, no daily PR. The merge-gate lock that exit left (pid 39402) auto-broke 06:56:30 by TTL (84,604 s) — by design, no hand delete.
- Verdict: pending, read 10-10 with E169 (0 auto-rollbacks with > 24 in-window deploys; bound line printed 7/7 mornings).
- Next time: a verify launched in the background at the end of a turn is a row that never lands — the runner, not Quinn, must own "every PR merged today has its after-merge row" (E176).

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

_Older entries (up to 2026-09-29) live verbatim in `archive/playbooks/ops-2026-09.md`; nothing deleted._
