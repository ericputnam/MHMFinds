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

## 2026-10-29 — E290
- Tried: runner preflight retries ONCE after a slept-through attempt (HANG with asleep/suspended > 0) on the awake host, after a bounded network wait (`pf_wait_net`, 90 s, like step 1's own wait); an awake hang (E194 shape) is never retried; a second slept-through attempt is HANG with both attempts in the excerpt; `attempt=N` on every preflight log line. (T0)
- Before → after: 10-24 killed at 977 s wall / 974 s asleep (3 s awake) and 10-29 at 1013 s / 998 s (15 s awake) — 2 of the 4 MISSED mornings 10-22→10-29 — against a preflight that answers in 4–6 s awake → read 11-05: 0 HANG rows whose first attempt was slept through; retry fires ≤1×/run. Test 3 new cases, 1 red pre-fix (the retry), 2 green controls.
- Verdict: MORE DATA (read 2026-11-05).
- Next time: a deadline measured on a clock that keeps running while the thing it bounds is frozen is a sleep detector, not a hang detector — act on the "slept" figure (retry) before grading the kill. Also: 10-26 was not "runner never started" — the day-lock line is there; the run was killed from outside during the morning check (10:25→10:27, no preflight) — the liveness grader should read the day-lock line before saying "never started".

## 2026-10-23 — E264
- Tried: runner `preflight-missed` block — on preflight failure the run that knows it failed lands a MISSED ledger row (`ledger-commit.sh`) and the degraded digest + scoreboard + guardrail (`digest-land.sh --allow-degraded --extra …`); every run logs `auth: access=… refresh=… refresh_days=N` from the keychain (dates only) and puts one ⚠️ line in the digest at refresh_days ≤ 5 (`FUNNEL_AUTH_WARN_DAYS`). Retro MISSED row for 10-22 landed by hand (a632c57). (T0, PR #366 b73e06a PASS)
- Before → after: 10-22 preflight rc=1 in 2 s ("OAuth session expired and could not be refreshed"), 0 rows, 0 artifacts on main, `token-expiry=unknown` → read 10-30: 0 MISSED mornings without a same-day row; warn fires ≥5 d before 2026-11-20 06:02 (today's refresh-token expiry; the 09-02 login lasted ~50 d). New test 6/6 red pre-fix; digest-land +1 red pre-fix (`--allow-degraded` was exit 64).
- Verdict: MORE DATA (read 2026-10-30).
- Next time: a credential has an expiry field — read it on every run before the thing that needs it dies; and under `pipefail`, judge a probe by its output, never by the pipeline's exit status (the first draft of `auth_expiry` emitted two lines for exactly that reason).

## 2026-10-21 — E257
- Tried: `withPageTimeoutRetry` in `_patreon-auth.ts` — a Members page that hits its own `AbortSignal.timeout` gets one re-attempt, each attempt re-bounded by `nextPageTimeoutMs`, so a retry cannot outlive the 180 s budget; wired into all 4 walks (scoreboard + q4-gate + churn + relaunch), scoreboard's copied constants dropped. E208 graded NOT MET → EXTEND 10-28 (rate leg 5/7, side-of-2.0 6/6). (T0)
- Before → after: Members COULD-NOT-RUN 1 of 13 Oct scoreboards (10-16, one 30 s page, ~150 s budget left) → read 10-28; test 9/9 red pre-fix; live walk 59/59 paid rows.
- Verdict: MORE DATA (read 2026-10-28).
- Next time: a retry belongs in the shared helper with the budget re-read per attempt — a retry at one call site leaves its three sibling walks with the bug.

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

_Older entries live verbatim in `archive/playbooks/ops-2026-09.md` (up to 09-29) and `archive/playbooks/ops-2026-10.md` (09-30→10-02 moved 10-18; 10-03/10-04 moved 10-21; 10-07/10-13 moved 10-23); nothing deleted._
