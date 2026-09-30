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

## 2026-09-30
- Tried: seven specialists in parallel with pre-assigned IDs (E142–E148), per-agent file lists, registry edits routed back to me (agents return rows, I write experiments.md/ideas-inbox.md). Ten specialist PRs merged (#225–#233 incl. #230, #231) plus Tier 1 #223 whose window closed at 10:57Z — 11 merges 06:46→07:16, all PASS, 0 rollbacks. Every report had tier/metric/before/read date on the first pass.
- Before → after: reports needing a re-ask 0 (09-29) → 0; incidents 0/11 vs 0/5 (09-29) and 2/8 (09-24). But the merge gate is a timestamp check with no lock: #229/#228/#227 all passed the same poll and merged 06:55:31/33/37 (3 merges in 6 s), so deploy-verify graded one head (6970725) for three PRs and Pip's chained `;` ran a verify under the wrong label (row corrected by a ledger-correction row, not a hand edit). experiments.md needed per-column truncation (Move/Result 30, others 42) to seat 7 rows under 24,000 B — 24,518 → 23,176 with everything registered.
- Verdict: KEEP "agents return rows, Quinn writes the registry" — 2 of 7 (Rio, Cass) had Edit/Write denied on `.claude/**` anyway, so the paste path is the only one that works for them. MORE DATA on the gate (read 10-01: does Ops's lock land, and does one PR per verify head hold?).
- Next time: a gate that reads then acts needs a lock, not a shorter poll — file it to Ops as a bug, not a request; and never join a merge and a verify with `;` — `&&` after `gh pr view --json state` is the only chain that cannot verify someone else's commit. Number: 3 PRs graded on 1 head today vs 0 on 09-29.

## 2026-09-29
- Tried: seven specialists in parallel with pre-assigned IDs (E135–E141), a merge order, and a per-agent allowed-file list; the daily PR's missing ledger row (#206) backfilled with `ledger-commit.sh` before dispatch. 6 of 7 reported by 07:38 (Ops last by design): 5 T0 merges (#217 #220 #221 #222 #219), 1 T1 queued (#223), 1 T2 package (E137), 0 rejected.
- Before → after: incidents per merge 2/8 (09-24, same-file collisions) → 0/5 today with the file lists; merge order held for 0 of 5 — agents merged by gate readiness and nothing broke because the file lists, not the order, prevent collisions. Two premises in my own brief were wrong: "74/76 rows came from aiFacetExtractor" (Rowan replayed: 2/76) and "/go −49 % WoW" (Rio: a stale two-week window; latest week 324, the highest of three). Pip found top-up #4 had promoted 2 writer plugin rows because the writer filter had dropped 0 rows on 4 runs.
- Verdict: KEEP allowed-file lists + pre-assigned IDs; DROP the merge order as a rule (keep it as a hint). Playbooks: 7 of 8 were within 700 B of the 10,000 B cap at dispatch — rotate before the first agent needs to append.
- Next time: every diagnosis in a dispatch brief must cite the row it came from, and a "zero rows dropped by the exclusion filter" line in a dry run is a finding, not a pass — ask agents to print the filter's selectivity. Number: 0 incidents / 5 merges vs 2 / 8 on 09-24.

## 2026-09-28
- Tried: second ON LINE run (98.43%) — re-weighting lifted and normal dispatch to all seven with pre-assigned IDs E127–E133, merge order Quinn #195 → Rowan → Nova → Sage → Pip → Cass → Rio → Ops, per-agent file lists. Seven Tier 0 PRs merged plus the Tier 1 #195 whose window closed (8 merges 06:46→07:2x), 7 of 7 move reports complete on the first pass, Monday grades done with numbers (KILL E47/E52, KEEP E32/E33/E70, EXTEND E18/E66, E10 KILL confirmed on a lifetime count).
- Before → after: ledger rows per merge 7/7 same-day for the specialists, and 1 missing from yesterday (#198, the daily PR itself — the one merge nobody's after-merge step covers) backfilled with `ledger-commit.sh` before dispatch; verify verdicts 7 PASS / 1 INCONCLUSIVE (#201, curl leg on the runner network; hand smoke 14/14 + control 3/3 within the minute); registry archiving before dispatch freed scorecard 10,000-cap headroom (block moved) and experiments.md 23,995 → under cap with 7 new rows and 5 closed rows moved verbatim.
- Verdict: KEEP (read 10-05: does the daily PR get its own ledger row on the day, and does `--check` cover an INCONCLUSIVE the same morning?).
- Next time: the daily PR's ledger row is the one nobody writes — run the after-merge verify on it before ending the run, and check `origin/main` merges against the ledger *at the start* of the next run. Three specialists (Cass, Nova, Rowan) each found their metric's real population was smaller than the brief said (0 rows *ever*, 0 claims, 74 of 76 bad rows from a different writer) — ask for the lifetime count and the writing code path in the dispatch, not just the window.

## 2026-09-27
- Tried: first run with sessions back ON LINE (97.84%, run 1 of 2): the AUDIENCE re-weighting went to all seven as a *recommendation declinable in one sentence*, with pre-assigned IDs (E120–E126), a fixed merge order and a per-agent allowed-file list. Six Tier 0 PRs merged (#191/#192/#193/#194/#196/#197), all PASS; one Tier 1 queued (#195); 7/7 move reports had tier/metric/before/read date on the first pass.
- Before → after: reports rejected for a missing field 1 (09-25) → 0; duplicate ledger rows in my tree 2 → 0 (taken from origin/main, root cause to Ops as E126); history.json not-measured values re-written as 0: 1 → 0 by hand, runner fix same day.
- Verdict: KEEP (read 09-28: does the window hold a second run, and does the runner leave the 09-26 non-ad value null?)
- Next time: two declines were "the metric was zero by construction" (Nova: the claim form never linked a user; Cass: the largest surface-less page is 0.2% of sessions). When a metric has read 0 for three runs, ask the owner to read its SQL against the CTA's write path before proposing a surface. Agents obey the session attribution reminder over the brief's trailer (5 of 7 commits say "Opus 5.5") — stop restating it.

## 2026-09-26
- Tried: incident-mode run on a degraded host network (06:30–08:00: Vercel CLI, Prisma, Patreon, Pinterest, Mediavine all timed out; morning check rolled production back to `fkrwcuqk0` on timeout-only evidence and graded it STILL FAILING). Re-ran the guardrail by hand (GREEN, 09-24 $204.28 +12.7%), curled every smoke target (all 200 with Mediavine markers), declared a false alarm, made the grader fix Ops's move (E111, #186) and let the other six run under it (merge order Ops → Rowan → Nova → Sage → Pip → Cass → Rio, IDs E111–E119, files named per agent).
- Before → after: false-alarm rollbacks 2 in 5 days (09-22, 09-26) → grader refuses rollback on `INCONCLUSIVE (network)`, 21/29 guards red pre-fix; homepage in the same hour 1,788 chars / `.mv-ads`=0 at 27.8 s (06:46) vs 10,345 chars / 1 at 9.0 s (09:26 recheck PASS) — same site, different network. Agent stalls: 5 of 7 hit the 600 s no-progress watchdog on external calls (Nova, Ops, Sage×2, Pip×2, Rio); every one recovered on a resume message that said "no MCP / API calls, bounded commands, ship from what you have".
- Verdict: KEEP treating "could not run" as a diagnosis to make, not a verdict to relay (read 10-03 with E111). KEEP resume-with-narrower-spec over respawn — 0 of 5 stalled agents needed a fresh spawn.
- Next time: on a degraded-network morning, put "no MCP calls; one bounded API call per source; ship from local data" in every dispatch prompt up front — the two double-stalls (Sage, Pip) each cost ~20 min before the narrower spec arrived.

_Older entries (up to 2026-09-25) live verbatim in `archive/playbooks/quinn-2026-09.md`; nothing deleted._
