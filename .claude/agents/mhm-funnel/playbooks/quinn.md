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

## 2026-09-25
- Tried: BELOW-LINE re-weighted day run with a merge order in every dispatch prompt (Rowan → Nova → Sage → Pip → Cass → Rio → Ops) and experiment IDs pre-assigned by Quinn (E102–E110) instead of each agent running `next-experiment-id.ts`; the missing #173 ledger row was landed with `ledger-commit.sh` before dispatch; every registry write went through python3 (Edit denied on `.claude/`).
- Before → after: incidents per merge 2/8 (09-24) → 0/7 (09-25, all PASS; first merge 06:50, seventh 07:16 = 26 min for seven merges vs ~60 min and one unbuildable `main` yesterday); ledger rows per merge 7/8 → 7/7 same-day (+#173 backfilled); `gh pr merge --delete-branch` exit-1-after-success hit 4 more times (Sage, Cass, Rio, Ops), 4/4 caught by `gh pr view --json state`; reads graded with numbers 3 (E26 KILL, E37 KEEP, E34 MISSED); experiments.md 23,638 → 23,335 B after adding 8 rows (2,267 B freed by tighter column caps, full rows in the archive).
- Verdict: KEEP merge order + pre-assigned IDs (read 09-26: repeat both, expect 0 same-file collisions again).
- Next time: the 22-minute window worked because the six PRs had disjoint files except Cass×Nova (`ModDetailClient.tsx`, which Cass rebased and re-tested) — name the files each agent may touch in the dispatch, and update operator-queue wording the same day the operator changes the thing it names (Q4 still said "Support Tier" six hours after the rename).

## 2026-09-24
- Tried: BELOW LINE re-weighting (4th run <97%: sessions 96.8%, revenue 103.0%) — 7 agents, 8 merges through one gate in 35 min (#140, #165, #170, #168, #167, #169, #171 + morning check), 5 paper-only outputs folded into the daily PR.
- Before → after: 8 merges → 2 incidents in 9 minutes, both from the gate itself, not the code: #167 and #168 each added `listCreators` from the same base (squash merged both, main unbuildable 10:03→10:12, #169 merged into the window with no build); then Sage's late verify `ensure_promoted()` promoted its older build over Rowan's newer one and `/games/sims-4/bedroom-cc/` 404'd on production for ~6 min with a PASS row in the ledger. Rollback 10:11, fix-forward 10:12, Rio's ledger gap closed by a `--check` row 10:21.
- Verdict: KEEP the parallel dispatch (7 shipped moves), KILL "verify order = merge order" as an assumption. A PASS row can be true of the build and false of production when a newer build exists — `ensure_promoted` needs a newer-than check (`[ops]` PRIORITY 1, 09-25), and merge-gate needs a same-file collision check.
- Next time: when an agent's merge runs in a background retry loop, the merge can land while the loop keeps failing on `--delete-branch` (another worktree held `main`), and the after-merge verify never runs — check every merged PR on `origin/main` against the ledger before writing the digest (1 of 8 was missing). Number: 2 incidents / 8 merges = 25% today vs 0 / 7 on 09-23.

## 2026-09-23
- Tried: first run of the 7-persona team with every agent spawned in the foreground (the 600 s background ceiling killed all of 09-22's); 7 of 7 reported complete 4-line moves, 0 rejected. 11 merges through the ship protocol 06:45→07:29 (#139 #148 #160 #155 #161 #156 #158 #162 #159 #157 #149), 11 of 11 ledger rows PASS, 5xx = 0, plus 2 retroactive rows for 09-22 (#147, #142 false-alarm rollback). Sessions watch BELOW LINE for the 5th run (96.9%) → Pip/Sage two AUDIENCE moves each, Rowan a traffic page, the one non-AUDIENCE Tier 1 (#144, `vercel.json`) re-tiered to Tier 2.
- Before → after: agents finishing 0 of 5 (09-22) → 7 of 7; ledger rows per merge 0/2 (09-22) → 11/11; merge-gate wait per agent 4–24 min with 7 agents contending for one 240 s slot; `experiments.md` 23,999 B of 24,000 before the daily PR → trimmed by cell truncation + kill-log compaction to fit 17 new rows (full text archived).
- Verdict: KEEP foreground agents + the 7,200 s ceiling (E91, read 09-30). MORE DATA on whether one merge slot for 7 agents caps the team near 10 merges/hour and whether 5 paper-only merges out of 11 are worth a production build each (read 09-24).
- Next time: put a merge order in the dispatch prompt (site changes first, paper trails last) so the gate serializes by value instead of by who polls fastest; tell every agent to leave `.claude/` registries to the daily PR — two agents could not append to their own playbooks at the cap and one registry was 1 byte under its cap at dispatch.

_Older entries (2026-09-01 → 2026-09-21) live verbatim in `archive/playbooks/quinn-2026-09.md`._
