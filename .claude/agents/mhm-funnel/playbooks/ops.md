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

## 2026-10-20 — E250
- Tried: deploy-verify `--after-merge` classifies the merge commit's diff (`is_paper_path`, allowlist, unknown = build); all-paper → grade production as served at once, `PAPER PASS/INCONCLUSIVE/FAIL`, no wait/promote/rollback/incident; `--no-paper` escape. Scoreboard counts PAPER rows as paper-only and still credits the owner. E201 → EXTEND 10-27 (0 ERRORs in 77 window rows). (T0)
- Before → after: 10-19 #340 (.claude/** only) 25 min → TIMEOUT; test 38/39 red pre-fix (green = build-relevant control), stats 1/1 red.
- Verdict: MORE DATA (read 2026-10-27).
- Next time: a wait keyed to an artifact the change cannot produce measures the platform, not the change — classify what the change touches before choosing what to wait for.

## 2026-10-19 — E243
- Tried: `scripts/agents/conflict-markers.ts` walks every file under `.claude/agents/mhm-funnel/` (no list) for line-anchored `<<<<<<< `, `||||||| `, `=======`, `>>>>>>> ` (CRLF-safe); the budget test asserts 0 hits, >20 files scanned, archive/ and playbooks/ reached. Prose quoting a marker mid-line does not match.
- Before → after: #330's tree (4fc47b7) → 12 lines / 3 files, exit 1 (archive/experiments 6, archive/ideas-inbox 3, ideas-inbox 3); a temp archive/ file → test red with 3 lines; main → 0 of 37 files. E194 graded KEEP: 7/7 preflights rc=0, wall ≤8 s, 0 fails.
- Verdict: pending, read 10-26 (0 marker lines on main, 0 false positives).
- Next time: a gate that never reads a file type cannot protect it — list which suffixes each gate opens before trusting it.

## 2026-10-18 — E236
- Tried: scoreboard `direct_ex_sg_bot` Audience row + 28d "headline ex segment" bullet; segment = E216's rule via `segmentDimensionFilter` (imported), pure `scoreboard-segment-lib.ts`, GA4 fail → "unavailable" (T0). Graded E148/E187/E229 KEEP.
- Before → after: Direct 10,839 vs 5,904 (+83.6%) → ex segment 3,109 vs 3,202 (−2.9%); 28d 101.3% of line → 96.6% ex segment (09-18→10-15, segment 4.6% of GA4). Wiring test 3/3 red pre-fix.
- Verdict: MORE DATA (read 2026-10-25).
- Next time: in the runner the scoreboard reads yesterday's history.json (funnel-history runs after it), so its 28d window ends a day before the digest's — label the window, never silently mix.

## 2026-10-17 — E229
- Tried: moved the 10-15/16 dated compound block + the stale "Recent UI/UX Enhancements" narrative verbatim to docs/COMPOUND_LEARNINGS.md (T0, #321 e62e08d, verify PASS 07:03).
- Before → after: CLAUDE.md 60,372 → 55,878 B; context-budget exit 2 → 0; budget test red → 8/8. Dated block alone would have left 57,623 B (≈1 day of headroom).
- Verdict: MORE DATA (read 2026-10-18).
- Next time: dated blocks are now ~2.7 KB per two days, so one rotation buys about one day. The nightly compound script should rotate before it writes, with `wc -c` as its own exit gate.

## 2026-10-16 — E222
- Tried: liveness RAN-UNLANDED + runner digest-land + Quinn stdout to operator logs/ (T0, #318 38885f4).
- Before → after: 10-16 window 3 MISSED → 2 MISSED + 1 RAN-UNLANDED; tests 6/8 + 4/4 red pre-fix; Ops share 6/41 = 14.6%.
- Verdict: MORE DATA (read 2026-10-23).
- Next time: the stdout that explains why a session ended must outlive its worktree. (Entry written by Quinn from Ops's report: Edit was denied in Ops's run.)

_Seeded 2026-09-22 from Quinn's playbook: ledger/runner/monitor learnings
moved here because plumbing is now Ops's, not Quinn's. Full originals in
`archive/playbooks/quinn-2026-09.md` and the live `playbooks/quinn.md`._

## 2026-10-13 — E201
- Tried: deploy-verify grades an own-build ERROR/CANCELED only after waiting ≤20 m for a READY build that contains the sha (ancestry) with no app file changed (`same_code`: reports/, docs/, logs/, .claude/, *.md exempt); a `build-watch` row lands first so its ledger commit is the proving build on the day's last merge. Found → `BUILD ERROR (platform) → READY via <sha7> · <verdict>`, no incident; the path never rolls back or re-pushes functions.php. (T0)
- Before → after: 10-12 false BUILD ERROR incidents 2 of 2 ERRORs (4fd20fd, 817064a), each "No Tier 1 merges" until Quinn closed it by hand. New test 13 cases, 9 red on pre-fix main (4 green = old-behaviour controls). The first draft read `$PLATFORM_RES` bare and broke the E111 "positive evidence still rolls back" test under `set -u`. Caught by the existing suite, fixed with `${…:-}`.
- Verdict: MORE DATA (read 2026-10-20).
- Next time: grade on a READY build of the same code, never on the absence of a log. Every new global a helper reads needs `${X:-}`, because the tests extract helpers standalone.

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

_Older entries live verbatim in `archive/playbooks/ops-2026-09.md` (up to 09-29) and `archive/playbooks/ops-2026-10.md` (09-30→10-02, moved 10-18); nothing deleted._
