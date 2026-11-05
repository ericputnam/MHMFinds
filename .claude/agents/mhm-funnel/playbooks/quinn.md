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

## 2026-11-04 (Wednesday)
- Tried: breaker 🟡 (3-day revenue −11.4%, day +3.4%) → Tier 0 only, #414 HELD; ramp BELOW LINE (sessions 78.0%, per-day line 99.0%). Dispatched 7 specialists per §7 (Pip/Sage/Rio/Rowan fable, Nova/Cass/Ops opus).
- Before → after: 4 of 4 fable agents died on their first call with HTTP 429 "out of usage credits" — the same error that MISSED 11-03 — and 4 of 4 re-spawned on opus finished. Parallel agents double-claimed an id: Nova (#450) and Cass (#451) both took E327 from `next-experiment-id.ts` minutes apart; Cass's row landed as E334 after Sage (E329/E330), Ops (E331) and Rio (E332) also hit collisions — 5 of 7 agents renumbered at least once.
- Verdict: KEEP the opus fallback; §7 routing is a preference, not a dependency. The id script is not a lock — it reads origin/main, which lags every in-flight PR.
- Next time: pre-assign experiment ids in each brief again (10-30 had 0 collisions that way), and check the preflight's model quota before dispatch rather than learning it from four dead agents.

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

## 2026-11-01 (Sunday, 1st of month)
- Tried: breaker green; the per-day line read 100.3% but the operator ramp read 79.7% / 83.1% (28d to 10-30) → BELOW LINE by directive, AUDIENCE re-weighting, #414 (E305, CAPTURE Tier 1) HELD rather than merged. Seven specialists + a competitor-intel sub-agent in parallel; October graded (B1 68%, B2 32%, B3 95.2%) and November bets rewritten in `targets.json` with Rio's $250/$155 non-ad line.
- Before → after: two paper merges (#425, #426) graded PAPER INCONCLUSIVE because `smoke-render` hit E308's 600 s cap; by hand the same 15 pages passed in 1,021 s of serial page renders (decor-cc 36 s, / 10 s) while seven agents were running `npm run build` on this host. `merge-gate` broke my own lock 4,009 s after the #425 merge landed and yesterday's at 89,222 s — the lock is released by TTL, not by the merge. Three of seven agents (opus ×2, fable ×1) hit the 600 s stream watchdog and resumed by SendMessage with context intact. experiments.md 23,616 → 10,114 B after 14 rows + 3 index paragraphs parked verbatim, then rows added.
- Verdict: KEEP holding non-AUDIENCE Tier 1 under the watch block (the rule is the operator's, the veto is not mine to spend); KEEP hand-running `smoke-render` after an INCONCLUSIVE paper merge — it is the only thing that turns "not judged" into a verdict.
- Next time: file the smoke cap as a function of host load, not a constant (600 s < 1,021 s whenever ≥5 agents build at once) — run Quinn's paper merges first, before the agents' builds start, or last, after they finish; and treat a merge-gate "stale lock" older than 240 s as the normal case after any merge, not a fault.

## 2026-10-29 (evening re-run)
- Tried: morning run MISSED (preflight HANG), re-run at 21:44 EDT; breaker green, watch BELOW LINE by directive (96.6% ex-crawler) though history.json read 100.4% — honoured the directive and sent Pip/Sage two AUDIENCE moves each. 7 specialists in parallel (Pip/Sage/Rio/Ops fable, Nova/Cass/Rowan opus); stranded 10-27/10-28 digests, scoreboards and the operator queue (Q34) recovered into #398.
- Before → after: the host slept 03:03Z→06:01Z mid-run — 4 of 7 agents hit the 600 s stream watchdog and all 4 resumed by SendMessage with context intact (0 lost work, ~3 h wall). Two deploy-verifies hung in smoke-render (#392 3 h, #394 >40 min after READY) and neither wrote a row until killed/re-run. 10 team PRs merged (#375, #381, #394, #397, #399, #400, #403 + #401/#402/#404 in flight); experiments.md 18,260 → 20,598 B after 4 rows archived and 6 added. 0 of the ~16 rows for the 10-27/10-28 moves (E265–E280) exist anywhere — unlanded runs log nothing.
- Verdict: KEEP the re-run (it recovered two days of paper) and SendMessage-resume over respawn. The evening slot overlapping the operator's sleep window is the cost: every stall and both hung verifies happened while the lid was closed.
- Next time: wrap every background `deploy-verify.sh` in `timeout 1500` (CORRECTED 10-31: macOS has no `timeout`, exit 127 — use `perl -e 'alarm(shift); exec(@ARGV)' 1500 …`; E308 caps smoke at 600 s internally) (a hung verify is a silent lock on the ledger); have each owner land their experiments.md row in their own PR, never Quinn's end-of-day PR, so an unlanded daily run cannot strand 16 rows again; file `[ops]` for a smoke-render wall clock.

## 2026-11-05
- Tried: pre-assigned E336–E344 in each spawn prompt (after 11-04's E327 ×4 / E329 ×3 collisions); all 7 on opus (Fable credits out, §7 fallback); breaker 🟡 so Tier 0 only.
- Before → after: 5/7 agents renumbered on 11-04 → 0 renumbered today; 9 PRs merged (7 site/data, #460 + Ops plumbing), 0 rollbacks, 5xx = 0. One ledger gap: Nova's E340 DB apply had no apply row until asked (0321b4ac).
- Verdict: KEEP pre-assigned ids until E344's reservation log has 7 clean runs; then mint with `next-experiment-id.ts --hold E<a>-E<b> --owner Quinn` instead of by hand.
- Next time: when an agent's report says "applied", grep `origin/main:reports/funnel/changelog.md` for its `apply` row before writing the digest — an after-merge PASS row is not an apply row.
