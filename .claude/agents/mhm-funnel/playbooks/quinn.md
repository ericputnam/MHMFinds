<!-- context budget: 10000 bytes, enforced by __tests__/unit/funnel-context-budget.test.ts; archive to mhm-funnel/archive/, don't append -->
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

## 2026-10-31 (Saturday, scheduled run)
- Tried: breaker green, BELOW LINE by directive (≈3.8k sessions/day short of the Nov line) → AUDIENCE re-weighting again; 7 specialists in parallel (Pip/Sage/Nova/Rio/Rowan fable, Cass/Ops opus); registry parked 23.3 → 17.0 KB before any row landed (6 rows + 1 graded + 5 index paragraphs to the archive).
- Before → after: 9 new rows landed under the 24 KB budget (17.0 → 22.8 KB) — without the park the day would have ended at ≈29 KB; experiments.md on origin/main also gained E308 directly from Ops (#415), so the daily PR has to reconcile two copies. First deploy-verify calls from two agents (Ops, Rio) exited 127 silently: macOS has no `timeout`; neither noticed until the ledger stayed empty. Inbox 12.5 → ≈9.7 KB and queue 17.5 → ≈15 KB by rotating 4 dropped Q-items, 3 status paragraphs and 11 closed/superseded lines verbatim.
- Verdict: KEEP the pre-dispatch park and the "agents land their own rows" rule only where `.claude/` edits are allowed — 5 of 7 agents were denied, so Quinn landed 9 rows by hand; the budget is a WARN-only check (exit 0 over budget), so `context-budget.ts` must be read, not just run.
- Next time: put `perl -e 'alarm(shift); exec(@ARGV)' 1500` in every brief's ship line (done in the playbook 10-31); grep the budget output for OVER before the daily PR, not after; when an agent's apply is Tier 1 with a date, write the veto phrase into the Tier 1 table the same hour, not into a Q-number (Nova's E304 apply arrived labelled "Q39", which Pip already held).

## 2026-10-30 (scheduled run, overlapping the 10-29 catch-up)
- Tried: the scheduled run started 11:08Z while the 10-29 catch-up Quinn (pid 13470, started 21:40 local) was still merging #398/#401/#402/#404; dispatched all 7 at 11:15Z anyway, each brief carrying the list of E281–E290 already shipped and a pre-assigned id (E291–E299), because the 2 h ceiling left no room to wait. merge-gate serialized both runs: 10 merges 11:09→11:46Z, one every ~4 min, 0 collisions, 0 duplicate moves.
- Before → after: concurrent-runner guard 0 → 1 (E297 #406, 6/11 tests red pre-fix); 8 code PRs merged with PASS rows, 2 paper-only PRs (#405, #407) lost every gate race (Rio 2 attempts / 1,180 s, Cass 2) and stayed open.
- Verdict: KEEP dispatching behind a live sibling run — the gate is the serializer; the GM's job is the "already shipped" list in each brief and non-overlapping experiment ids.
- Next time: merge paper-only PRs in one batch at the end of the run (or Ops queues the lock); opus agents write "Claude Opus 5.5" co-author lines whatever the brief says — the attribution follows the model.

## 2026-10-29 (evening re-run)
- Tried: morning run MISSED (preflight HANG), re-run at 21:44 EDT; breaker green, watch BELOW LINE by directive (96.6% ex-crawler) though history.json read 100.4% — honoured the directive and sent Pip/Sage two AUDIENCE moves each. 7 specialists in parallel (Pip/Sage/Rio/Ops fable, Nova/Cass/Rowan opus); stranded 10-27/10-28 digests, scoreboards and the operator queue (Q34) recovered into #398.
- Before → after: the host slept 03:03Z→06:01Z mid-run — 4 of 7 agents hit the 600 s stream watchdog and all 4 resumed by SendMessage with context intact (0 lost work, ~3 h wall). Two deploy-verifies hung in smoke-render (#392 3 h, #394 >40 min after READY) and neither wrote a row until killed/re-run. 10 team PRs merged (#375, #381, #394, #397, #399, #400, #403 + #401/#402/#404 in flight); experiments.md 18,260 → 20,598 B after 4 rows archived and 6 added. 0 of the ~16 rows for the 10-27/10-28 moves (E265–E280) exist anywhere — unlanded runs log nothing.
- Verdict: KEEP the re-run (it recovered two days of paper) and SendMessage-resume over respawn. The evening slot overlapping the operator's sleep window is the cost: every stall and both hung verifies happened while the lid was closed.
- Next time: wrap every background `deploy-verify.sh` in `timeout 1500` (CORRECTED 10-31: macOS has no `timeout`, exit 127 — use `perl -e 'alarm(shift); exec(@ARGV)' 1500 …`; E308 caps smoke at 600 s internally) (a hung verify is a silent lock on the ledger); have each owner land their experiments.md row in their own PR, never Quinn's end-of-day PR, so an unlanded daily run cannot strand 16 rows again; file `[ops]` for a smoke-render wall clock.

## 2026-10-23
- Tried: Friday loop after a MISSED 10-22 (CLI OAuth expired at preflight; nothing committed, no digest, issue 07 did not go out). Breaker green, ON LINE run 20 (102.5% / 98.1%). 7 specialists in parallel (Pip/Sage/Nova/Rio/Ops fable, Cass/Rowan opus) with E258–E264 pre-assigned; the stranded 10-22 scoreboard/guardrail/degraded digest ride today's PR; Ops's move is the class fix (a preflight failure must land its own MISSED row + degraded digest on `main`, not wait for the next successful morning).
- Before → after: owned-audience adds 7d read 258 = B1 "HIT" at 07:47; Nova's E260 showed 68 of the 87 `signup-optin` rows and 61 of 75 creator-flagged sign-ups in 7d are scripted-shaped (letters-only username, ≥6 case flips) → net of script the adds are ≈129 (accounts 163 → ≈102, email 95 → ≈27), so B1 (200/wk) is not met and the two rows that drove the "HIT" were ≈50% script. Cass's issue-07 tail (137) was already held by the draft's pre-committed ">30 recipient jump → stop" gate at 08:02, 20 min *before* Nova's read landed — the gate caught the contaminated cohort on size alone. 9 specialist merges (#362–#368 + Sage #367, Ops #366), 0 rollbacks, 1 Tier 1 (the send). Registry: experiments.md 17.0 KB, queue 13.6 KB, inbox 9.4 KB after parking 5 inbox lines and 6 queue rows.
- Verdict: KEEP the pre-committed send-size gate (it held a tail that turned out to be ≈50% script); KEEP dispatching with yesterday's reads marked "due today" after a MISSED morning — 11 overdue grades landed in one run with 0 ID collisions.
- Next time: a headline metric that counts rows a stranger can create (accounts, opt-ins) needs a human-shaped filter *in the scoreboard* before it can grade a bet — grade B1 on `human-shaped adds` from 10-24, and never ship a send to a cohort whose growth rate jumped without first asking who grew it.

