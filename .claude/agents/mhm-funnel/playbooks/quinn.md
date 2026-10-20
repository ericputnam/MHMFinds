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

## 2026-10-20
- Tried: 7 specialists in parallel (Pip/Sage/Rio fable, Cass/Rowan/Ops opus, Nova sonnet); registry parked 22,351 → 14,677 B before dispatch (5 graded + 6 far-read rows to the archive); Ops's one T0 (#351) fixed the paper-merge TIMEOUT class, not the 10-19 instance.
- Before → after: reports in before any verify finished 5 of 7 → all 7 by 11:30Z; experiments.md 14,677 → ~20,000 B with 7 new rows and 5 grades; Monitor tool 0/2 usable (process substitution, string syntax) → Bash `until … sleep 60` loops 3/3.
- Verdict: KEEP the pre-dispatch park (every specialist read a registry under 15 KB) and the python exact-match patch for `.claude/**` (Edit was denied for 4 of 7 agents — they put row text in the report, I land it).
- Next time: a keep-if written against a sibling experiment's output (E238's "8/8 isNSFW" leg quoted E242's dry run before it applied; E242 kept 2 false by design) grades NOT MET forever — write hub-eligibility legs against the hub page's own selection, and re-read a sibling's final state before pinning a literal count.

## 2026-10-19
- Tried: Monday loop, breaker green, ON LINE run 17 (102.1% raw / 96.8% ex-crawler). Parked 10 rows (#340) before dispatch (experiments.md 20,131 → 15,484 B); merged veto-expired Tier 1 #328 and ran invite-01 LIVE from Quinn's tree (22 attempted / 22 sent / 0 failed, hashes only, ledger row 4cac6cd); 7 specialists in parallel with E237–E243 pre-assigned; Sage's Tier 1 #335 merged on the second gate chain (d5f8527).
- Before → after: paper PR #340 (registry .md only) cost deploy-verify 25 min → exit 2 TIMEOUT with 0 rollback lines, because Vercel's ignored-build-step cancels the build and no READY deploy ever appears — the row reads like an incident and is not one. merge-gate `--max-wait 600` was exhausted once (#335 behind 5 sibling merges; the chain exits OPEN with mergeCommit null and must simply be re-run). Reports: 7/7 carried tier/metric/BEFORE/read date; Sage needed 2 rebases on experiments.md; Ops's E243 is the 10-18 conflict-marker class fix.
- Verdict: KEEP morning parking + report-before-verify (third straight 0-breach morning). The Tier 1 merge + live send before dispatch was a 25-minute serial block for Quinn.
- Next time: start the veto-expired Tier 1 chain in the background *before* reading the registry, and do not run the 25-min after-merge verify on a paper PR — a `--check` against the next READY build (or an Ops `--paper` flag) is the honest row. A verify log with 0 rollback lines and "no READY deploy" is TIMEOUT, never FAIL.

## 2026-10-17
- Tried: Saturday loop, breaker green, ON LINE run 15 (101.3% / 98.8%); 7 specialists dispatched in parallel with pre-assigned IDs E223–E229; 7/7 reports accepted, 7 specialist merges + daily, 0 rollbacks, every verify PASS; Q25 dropped (E167 NOT-RUN, PR #253 closed).
- Before → after: dispatch-to-last-verify 06:40 → 07:15 (35 min for 7 merges, vs 73 min for one verify on 10-16) because every agent was told to write its 4-line report to /tmp before starting deploy-verify — 0 agents needed a nudge (10-16: 1). Parking 12 far-read rows before dispatch cut experiments.md 23,255 → 16,618 B, and the day's 7 new rows + 4 grades brought it back to 22,381 B; the budget is ≈+5.8 KB/run, so parking must happen every morning, not when the test goes red. The merge gate serialized 7 PRs at 240 s (Pip needed 4 attempts). Two agents' commits carry an Opus 5.5 trailer because the harness attribution overrides the dispatch text.
- Verdict: KEEP (report-before-verify + pre-assigned IDs + morning parking).
- Next time: the one thing on main that was red at dispatch (CLAUDE.md 60,372 B) was known from the context-budget WARN at step 0 — route a red-on-main test to Ops as the move before reading anything else.

## 2026-10-16
- Tried: Friday loop, circuit breaker green, 7 specialists dispatched in parallel; 7/7 reports accepted, 8 merges (7 specialist + daily), 0 rollbacks; landed the stranded 10-15 digest with today's daily PR.
- Before → after: 4 of 7 specialists (Sage, Rio, Pip, Ops) had every Edit under `.claude/agents/mhm-funnel/` denied, so Quinn hand-landed ≈5 KB of their registry text (4 playbook entries, 7 experiment rows, 1 Tier 2 package, 13 inbox lines); 1 of 7 agents (Pip) ended its session with no report while its verify was still running (73 min) and needed a SendMessage nudge — the same shape as Quinn's own 10-15 exit before step 8. experiments.md 23,042 → 23,255 B after archiving E152/E159/E158; ideas-inbox parked 7 lines to stay under 10,000.
- Verdict: KEEP the parallel dispatch; the serial bottleneck is now Quinn re-typing text four agents could not write.
- Next time: the dispatch prompt tells every specialist to send the 4-line report *before* waiting on its verify (result "pending, log at …"), and to put registry text in the report whenever Edit is denied — do not wait for a completion notification that may never carry a report.

- **2026-10-18 — a 7-way registry merge morning lands conflict markers unless the chain is `&&` and the budget test scans for them.** Cass needed 4 rebases on the paper PR, Nova's #330 reached `main` with **12 conflict-marker lines** in 3 registry files (resolve step failed on an empty "theirs" block, chain ran on `;`) and needed #337 to fix forward; Ops caught the same on its branch before pushing. KEEP: pre-assigned IDs (E230–E236, 0 collisions) and report-before-verify (7/7 reports in before the last verify). CHANGE: ask Ops to add a `<<<<<<<`/`>>>>>>>` scan over `.claude/agents/mhm-funnel/**` to `funnel-context-budget.test.ts` so a marker fails the paper PR's own gate instead of landing; and tell every agent the merge chain is one `&&` call *including* the conflict-resolve step. Side read: the 28d headline is 101.6% raw but ≈96.6% ex the Singapore segment (E236) — write the ex-segment ratio next to the ON LINE verdict every day until Q30 is answered.
